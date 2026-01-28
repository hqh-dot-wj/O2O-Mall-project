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

/**
 * 提现服务
 * 处理提现申请、审核、打款等逻辑
 */
@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);

  // 最小提现金额
  private readonly MIN_WITHDRAWAL_AMOUNT = BusinessConstants.FINANCE.MIN_WITHDRAWAL_AMOUNT;

  constructor(
    private readonly prisma: PrismaService,
    private readonly withdrawalRepo: WithdrawalRepository,
    private readonly walletService: WalletService,
    private readonly auditService: WithdrawalAuditService,
  ) {}

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
    const wallet = await this.walletService.getOrCreateWallet(memberId, tenantId);
    BusinessException.throwIfNull(wallet, '钱包不存在');

    // 校验余额
    BusinessException.throwIf(wallet.balance.lt(amountDecimal), '余额不足');

    // 获取用户信息 (TODO: use MemberRepository)
    const member = await this.prisma.umsMember.findUnique({
      where: { memberId },
    });

    // 冻结余额 (Use WalletService)
    await this.walletService.freezeBalance(memberId, amountDecimal);

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
  async audit(withdrawalId: string, action: 'APPROVE' | 'REJECT', auditBy: string, remark?: string) {
    // 1. 基础查询与校验
    const withdrawal = await this.withdrawalRepo.findOne(
      { id: withdrawalId, status: WithdrawalStatus.PENDING },
      { include: { member: true } },
    );

    BusinessException.throwIfNull(withdrawal, '提现申请不存在或已处理');

    // 2. 委托给 AuditService 处理
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
