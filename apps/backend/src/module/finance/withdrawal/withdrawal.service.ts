import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { FormatDateFields } from 'src/common/utils';
import { ListWithdrawalDto } from './dto/list-withdrawal.dto';
import { Prisma, WithdrawalStatus } from '@prisma/client';
import { WithdrawalRepository } from './withdrawal.repository';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { BusinessConstants } from 'src/common/constants/business.constants';
import { WithdrawalAuditService } from './withdrawal-audit.service';
import { WithdrawalWithMember, WithdrawalListItem } from 'src/common/types/finance.types';
import { RedisService } from 'src/module/common/redis/redis.service';
import { FinanceEventEmitter } from '../events/finance-event.emitter';
import { MemberQueryPort } from '../ports/member-query.port';

/**
 * 提现服务
 *
 * @description
 * 处理提现申请、审核、打款等逻辑
 * WD-T4: 增加单日提现限额控制（次数 + 金额）
 * WD-T5: 增加提现手续费配置
 *
 * @architecture A-T2: 通过 MemberQueryPort 获取会员数据
 */
@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);

  // 配置常量
  private readonly MIN_WITHDRAWAL_AMOUNT = BusinessConstants.FINANCE.MIN_WITHDRAWAL_AMOUNT;
  private readonly MAX_SINGLE_AMOUNT = BusinessConstants.FINANCE.MAX_SINGLE_AMOUNT;
  private readonly MAX_DAILY_COUNT = BusinessConstants.FINANCE.MAX_DAILY_WITHDRAWAL_COUNT;
  private readonly MAX_DAILY_AMOUNT = BusinessConstants.FINANCE.MAX_DAILY_WITHDRAWAL_AMOUNT;
  private readonly FEE_RATE = BusinessConstants.FINANCE.WITHDRAWAL_FEE_RATE;
  private readonly FEE_MIN = BusinessConstants.FINANCE.WITHDRAWAL_FEE_MIN;
  private readonly APPLY_LOCK_TTL = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly withdrawalRepo: WithdrawalRepository,
    private readonly walletService: WalletService,
    private readonly auditService: WithdrawalAuditService,
    private readonly redis: RedisService,
    private readonly eventEmitter: FinanceEventEmitter,
    private readonly memberQueryPort: MemberQueryPort,
  ) {}

  // ========== 输入校验方法 ==========

  /**
   * 校验提现金额
   * 
   * @description
   * R-IN-WD-01: 金额范围校验
   */
  private validateAmount(amount: Decimal): void {
    BusinessException.throwIf(
      amount.lt(this.MIN_WITHDRAWAL_AMOUNT),
      `最小提现金额为 ${this.MIN_WITHDRAWAL_AMOUNT} 元`,
    );
    BusinessException.throwIf(
      amount.gt(this.MAX_SINGLE_AMOUNT),
      `单笔提现金额不能超过 ${this.MAX_SINGLE_AMOUNT} 元`,
    );
  }

  /**
   * 校验单日提现限额
   * 
   * @description
   * WD-T4: 单日提现次数和金额限制
   * R-PRE-WD-01: 单日限额校验
   */
  private async checkDailyLimit(memberId: string, amount: Decimal): Promise<void> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayStats = await this.prisma.finWithdrawal.aggregate({
      where: {
        memberId,
        createTime: { gte: todayStart },
        status: { not: WithdrawalStatus.REJECTED },
      },
      _count: true,
      _sum: { amount: true },
    });

    const todayCount = todayStats._count;
    const todayAmount = todayStats._sum.amount ?? new Decimal(0);

    // 校验次数
    BusinessException.throwIf(
      todayCount >= this.MAX_DAILY_COUNT,
      `每日最多提现 ${this.MAX_DAILY_COUNT} 次`,
    );

    // 校验金额
    BusinessException.throwIf(
      todayAmount.add(amount).gt(this.MAX_DAILY_AMOUNT),
      `每日提现金额不能超过 ${this.MAX_DAILY_AMOUNT} 元，今日已提现 ${todayAmount} 元`,
    );
  }

  /**
   * 计算提现手续费
   * 
   * @description
   * WD-T5: 提现手续费计算
   * 手续费 = max(金额 * 费率, 最低手续费)
   */
  calculateFee(amount: Decimal): Decimal {
    if (this.FEE_RATE <= 0 && this.FEE_MIN <= 0) {
      return new Decimal(0);
    }
    const rateFee = amount.mul(this.FEE_RATE);
    return Decimal.max(rateFee, new Decimal(this.FEE_MIN));
  }

  // ========== 业务方法 ==========

  /**
   * 申请提现
   * 
   * @description
   * WD-T4: 增加单日提现限额控制
   * WD-T5: 增加提现手续费
   */
  @Transactional()
  async apply(memberId: string, tenantId: string, amount: number, method: string) {
    // R-CONCUR-WD-01: 防重提交校验
    const lockKey = `withdrawal:apply:${memberId}`;
    const locked = await this.redis.getClient().set(lockKey, '1', 'EX', this.APPLY_LOCK_TTL, 'NX');
    BusinessException.throwIf(locked !== 'OK', '请勿重复提交，请稍后再试');

    try {
      const amountDecimal = new Decimal(amount);

      // R-IN-WD-01: 金额校验
      this.validateAmount(amountDecimal);

      // R-PRE-WD-01: 单日限额校验
      await this.checkDailyLimit(memberId, amountDecimal);

      // WD-T5: 计算手续费
      const fee = this.calculateFee(amountDecimal);
      const actualAmount = amountDecimal.minus(fee);

      // 获取钱包
      const wallet = await this.walletService.getOrCreateWallet(memberId, tenantId);
      BusinessException.throwIfNull(wallet, '钱包不存在');

      // 校验余额
      BusinessException.throwIf(wallet.balance.lt(amountDecimal), '余额不足');

      // 获取用户信息（A-T2: 通过 Port 获取）
      const member = await this.memberQueryPort.findMemberBrief(memberId);

      // 冻结余额（冻结全额，包含手续费）
      await this.walletService.freezeBalance(memberId, amountDecimal);

      // 创建提现记录
      const withdrawal = await this.withdrawalRepo.create({
        tenantId,
        member: { connect: { memberId } },
        amount: amountDecimal,
        fee,
        actualAmount,
        method,
        realName: member?.nickname || '',
        status: WithdrawalStatus.PENDING,
      });

      this.logger.log(
        `Withdrawal application created: ${withdrawal.id}, amount=${amountDecimal}, fee=${fee}, actual=${actualAmount}`,
      );

      // 发送提现申请事件
      await this.eventEmitter.emitWithdrawalApplied(tenantId, memberId, {
        withdrawalId: withdrawal.id,
        amount: amountDecimal.toString(),
        fee: fee.toString(),
        actualAmount: actualAmount.toString(),
        method,
      });

      return Result.ok(FormatDateFields(withdrawal));
    } catch (error) {
      await this.redis.getClient().del(lockKey);
      throw error;
    }
  }

  /**
   * 审核提现
   */
  async audit(
    withdrawalId: string,
    action: 'APPROVE' | 'REJECT',
    auditBy: string,
    tenantId?: string,
    remark?: string,
  ) {
    const withdrawal = await this.withdrawalRepo.findOne(
      { id: withdrawalId, status: WithdrawalStatus.PENDING },
      { include: { member: true } },
    );

    BusinessException.throwIfNull(withdrawal, '提现申请不存在或已处理');

    if (tenantId && withdrawal.tenantId !== tenantId) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '无权审核其他租户的提现申请');
    }

    if (action === 'APPROVE') {
      return this.auditService.approve(withdrawal, auditBy);
    } else if (action === 'REJECT') {
      return this.auditService.reject(withdrawal, auditBy, remark);
    } else {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '不支持的审核操作');
    }
  }

  /**
   * 获取提现列表 (Store端)
   */
  async getList(query: ListWithdrawalDto) {
    const where: Prisma.FinWithdrawalWhereInput = {};

    if (query.status) {
      where.status = query.status as WithdrawalStatus;
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

    const rows = result.rows.map((item: WithdrawalWithMember): WithdrawalListItem => {
      const flatItem: WithdrawalListItem = { ...item };
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

  /**
   * 获取提现配置（供前端展示）
   */
  getWithdrawalConfig() {
    return {
      minAmount: this.MIN_WITHDRAWAL_AMOUNT,
      maxSingleAmount: this.MAX_SINGLE_AMOUNT,
      maxDailyCount: this.MAX_DAILY_COUNT,
      maxDailyAmount: this.MAX_DAILY_AMOUNT,
      feeRate: this.FEE_RATE,
      feeMin: this.FEE_MIN,
    };
  }
}
