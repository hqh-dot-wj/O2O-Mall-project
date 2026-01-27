import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { FormatDateFields } from 'src/common/utils';
import { ListWithdrawalDto } from './dto/list-withdrawal.dto';
import { Prisma, FinWithdrawal, WithdrawalStatus, TransType } from '@prisma/client';
import { WithdrawalRepository } from './withdrawal.repository';
import { Transactional } from 'src/common/decorators/transactional.decorator';

import { BusinessConstants } from 'src/common/constants/business.constants';

/**
 * 提现服务
 * 处理提现申请、审核、打款等逻辑
 */
@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);

  // 最小提现金额 (已移动至 BusinessConstants)
  private readonly MIN_WITHDRAWAL_AMOUNT = BusinessConstants.FINANCE.MIN_WITHDRAWAL_AMOUNT;

  // 审核策略映射
  private readonly auditStrategies = {
    APPROVE: this.handleApproveStrategy.bind(this),
    REJECT: this.handleRejectStrategy.bind(this),
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly withdrawalRepo: WithdrawalRepository,
    private readonly walletService: WalletService,
  ) { }

  /**
   * 申请提现
   */
  @Transactional()
  async apply(memberId: string, tenantId: string, amount: number, method: string) {
    const amountDecimal = new Decimal(amount);

    // 校验最小金额
    BusinessException.throwIf(
      amountDecimal.lt(this.MIN_WITHDRAWAL_AMOUNT),
      `最小提现金额为 ${this.MIN_WITHDRAWAL_AMOUNT} 元`,
    );

    // 获取钱包
    const wallet = await this.walletService.getWallet(memberId);
    BusinessException.throwIfNull(wallet, '钱包不存在');

    // 校验余额
    BusinessException.throwIf(wallet.balance.lt(amountDecimal), '余额不足');

    // 获取用户信息
    const member = await this.prisma.umsMember.findUnique({
      where: { memberId },
    });

    // 冻结余额
    await this.prisma.finWallet.update({
      where: { memberId },
      data: {
        balance: { decrement: amountDecimal },
        frozen: { increment: amountDecimal },
        version: { increment: 1 },
      },
    });

    // 创建提现记录
    const withdrawal = await this.withdrawalRepo.create({
      tenantId,
      member: { connect: { memberId } },
      amount: amountDecimal,
      method,
      realName: member?.nickname || '',
      status: WithdrawalStatus.PENDING,
    });

    this.logger.log(`Withdrawal application created: ${withdrawal.id}`);
    return Result.ok(FormatDateFields(withdrawal));
  }

  /**
   * 审核提现
   */
  async audit(withdrawalId: string, tenantId: string, action: 'APPROVE' | 'REJECT', auditBy: string, remark?: string) {
    // 1. 基础查询与校验 (Guard Clauses)
    const withdrawal = await this.withdrawalRepo.findOne(
      { id: withdrawalId, tenantId, status: WithdrawalStatus.PENDING },
      { include: { member: true } },
    );

    BusinessException.throwIfNull(withdrawal, '提现申请不存在或已处理');

    // 2. 策略分发 (Strategy Pattern)
    const strategy = this.auditStrategies[action];
    BusinessException.throwIf(!strategy, '不支持的审核操作');

    return await strategy(withdrawal, auditBy, remark);
  }

  /**
   * 策略：处理驳回 (Rejection Strategy)
   * 纯数据库操作，直接开启事务
   */
  @Transactional()
  private async handleRejectStrategy(withdrawal: FinWithdrawal, auditBy: string, remark?: string) {
    // 更新提现状态
    await this.withdrawalRepo.update(withdrawal.id, {
      status: WithdrawalStatus.REJECTED,
      auditTime: new Date(),
      auditBy,
      auditRemark: remark,
    });

    // 资金退回余额
    await this.prisma.finWallet.update({
      where: { memberId: withdrawal.memberId },
      data: {
        balance: { increment: withdrawal.amount },
        frozen: { decrement: withdrawal.amount },
        version: { increment: 1 },
      },
    });

    this.logger.log(`Withdrawal ${withdrawal.id} rejected`);
    return Result.ok(null, '已驳回');
  }

  /**
   * 策略：处理通过 (Approval Strategy)
   * 混合操作：HTTP请求（不可回滚） + 数据库操作（可回滚）
   * 注意：HTTP请求不应在 @Transactional 方法内，防止长时间占用连接
   */
  private async handleApproveStrategy(withdrawal: FinWithdrawal, auditBy: string, remark?: string) {
    try {
      // 1. 执行外部支付 (Outside Transaction)
      const paymentResult = await this.transferToWechat(withdrawal);

      // 2. 执行内部账务变更 (Inside Transaction)
      await this.completeApproval(withdrawal, paymentResult.paymentNo, auditBy);

      this.logger.log(`Withdrawal ${withdrawal.id} approved`);
      return Result.ok({ paymentNo: paymentResult.paymentNo }, '打款成功');
    } catch (error: any) {
      // 支付失败或入账失败的处理
      await this.handlePaymentFailure(withdrawal.id, error.message);

      this.logger.error(`Withdrawal ${withdrawal.id} payment failed`, error);
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, `打款失败: ${error.message}`);
    }
  }

  /**
   * 完成提现入账 (事务方法)
   */
  @Transactional()
  private async completeApproval(withdrawal: FinWithdrawal, paymentNo: string, auditBy: string) {
    if (!withdrawal.memberId) {
      // memberId check derived from logic
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '提现申请会员信息异常');
    }

    // 更新提现状态
    await this.withdrawalRepo.update(withdrawal.id, {
      status: WithdrawalStatus.APPROVED,
      auditTime: new Date(),
      auditBy,
      paymentNo,
    });

    // 扣减冻结余额
    await this.prisma.finWallet.update({
      where: { memberId: withdrawal.memberId },
      data: {
        frozen: { decrement: withdrawal.amount },
        version: { increment: 1 },
      },
    });

    // 获取钱包ID
    const wallet = await this.prisma.finWallet.findUnique({
      where: { memberId: withdrawal.memberId },
    });

    if (wallet) {
      // 写入流水
      await this.prisma.finTransaction.create({
        data: {
          walletId: wallet.id,
          tenantId: withdrawal.tenantId,
          type: TransType.WITHDRAW_OUT,
          amount: new Decimal(0).minus(withdrawal.amount),
          balanceAfter: wallet.balance,
          relatedId: withdrawal.id,
          remark: '余额提现成功',
        },
      });
    }
  }

  /**
   * 处理打款失败
   */
  @Transactional()
  private async handlePaymentFailure(withdrawalId: string, failReason: string) {
    await this.withdrawalRepo.update(withdrawalId, {
      status: WithdrawalStatus.FAILED,
      failReason,
    });
  }

  /**
   * 微信打款 (调用微信支付接口)
   */
  private async transferToWechat(withdrawal: any): Promise<{ paymentNo: string }> {
    // 这里需要对接微信支付企业付款接口
    // 目前返回模拟数据
    this.logger.log(`Transferring ${withdrawal.amount} to member ${withdrawal.memberId}`);

    // 模拟打款成功
    return {
      paymentNo: `WX${Date.now()}`,
    };
  }

  /**
   * 获取提现列表 (Store端)
   */
  async getList(query: ListWithdrawalDto, tenantId: string | null) {
    const where: Prisma.FinWithdrawalWhereInput = {};

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.keyword) {
      where.member = {
        OR: [{ nickname: { contains: query.keyword } }, { mobile: { contains: query.keyword } }],
      };
    }

    if (query.memberId) {
      where.memberId = query.memberId;
    }

    const result = await this.withdrawalRepo.findPage({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      where,
      include: {
        member: {
          select: {
            memberId: true,
            nickname: true,
            mobile: true,
            avatar: true,
          },
        },
      },
      orderBy: 'createTime',
      order: 'desc',
    });

    // 扁平化处理
    const rows = result.rows.map((item: any) => {
      const flatItem: any = { ...item };
      if (item.member) {
        flatItem.memberName = item.member.nickname;
        flatItem.memberMobile = item.member.mobile;
        flatItem.memberAvatar = item.member.avatar;
      }
      return flatItem;
    });

    return Result.page(FormatDateFields(rows), result.total);
  }

  /**
   * 获取用户提现记录 (C端)
   */
  async getMemberWithdrawals(memberId: string, page: number = 1, size: number = 20) {
    const result = await this.withdrawalRepo.findPage({
      pageNum: page,
      pageSize: size,
      where: { memberId },
      orderBy: 'createTime',
      order: 'desc',
    });

    return Result.page(FormatDateFields(result.rows), result.total);
  }
}
