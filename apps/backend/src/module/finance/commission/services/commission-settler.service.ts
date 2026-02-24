import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { CommissionStatus, TransType } from '@prisma/client';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { CommissionRepository } from '../commission.repository';
import { WalletService } from '../../wallet/wallet.service';

/**
 * 佣金结算服务
 * 职责：佣金取消、回滚、结算时间更新
 */
@Injectable()
export class CommissionSettlerService {
  private readonly logger = new Logger(CommissionSettlerService.name);

  constructor(
    private readonly commissionRepo: CommissionRepository,
    private readonly walletService: WalletService,
  ) {}

  /**
   * 查询订单佣金列表
   */
  async getCommissionsByOrder(orderId: string) {
    return this.commissionRepo.findMany({
      where: { orderId },
      include: {
        beneficiary: {
          select: {
            memberId: true,
            nickname: true,
            avatar: true,
            mobile: true,
          },
        },
      },
    });
  }

  /**
   * 取消订单佣金 (退款时调用)
   * 
   * @param orderId 订单ID
   * @param itemIds 可选,指定要退款的商品ID列表,支持部分退款
   * 
   * @description
   * - 全额退款: 不传 itemIds,取消所有佣金
   * - 部分退款: 传入 itemIds,仅取消对应商品的佣金
   */
  @Transactional()
  async cancelCommissions(orderId: string, itemIds?: number[]) {
    // 构建查询条件
    type WhereCondition = {
      orderId: string;
      orderItemId?: { in: number[] };
    };
    
    const where: WhereCondition = { orderId };
    if (itemIds && itemIds.length > 0) {
      // 部分退款: 仅查询指定商品的佣金
      where.orderItemId = { in: itemIds };
    }

    const commissions = await this.commissionRepo.findMany({ where });

    if (commissions.length === 0) {
      this.logger.warn(`No commissions found for order ${orderId}${itemIds ? ` with items ${itemIds.join(',')}` : ''}`);
      return;
    }

    for (const comm of commissions) {
      if (comm.status === CommissionStatus.FROZEN) {
        // 冻结中: 直接取消
        await this.commissionRepo.update(comm.id, { status: CommissionStatus.CANCELLED });
      } else if (comm.status === CommissionStatus.SETTLED) {
        // 已结算: 需要倒扣
        await this.rollbackCommission(comm);
      }
    }

    this.logger.log(
      `Cancelled ${commissions.length} commissions for order ${orderId}${itemIds ? ` (items: ${itemIds.join(',')})` : ' (full refund)'}`,
    );
  }

  /**
   * 回滚已结算佣金
   */
  @Transactional()
  private async rollbackCommission(commission: { beneficiaryId: string; amount: Decimal; orderId: string; id: string | bigint }) {
    // 扣减余额 (可能变负)
    await this.walletService.deductBalance(
      commission.beneficiaryId,
      commission.amount,
      commission.orderId,
      `订单退款，佣金回收`,
      TransType.REFUND_DEDUCT,
    );

    // 更新佣金状态
    await this.commissionRepo.update(commission.id, { status: CommissionStatus.CANCELLED });
  }

  /**
   * 更新计划结算时间 (订单确认收货/核销时调用)
   */
  async updatePlanSettleTime(orderId: string, eventType: 'CONFIRM' | 'VERIFY') {
    const commissions = await this.commissionRepo.findMany({
      where: {
        orderId,
        status: 'FROZEN',
      },
    });

    if (commissions.length === 0) return;

    const now = new Date();
    let planSettleTime: Date;

    if (eventType === 'VERIFY') {
      // 服务核销: T+1 (24小时后)
      planSettleTime = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    } else {
      // 实物确认收货: T+7 (7天后)
      planSettleTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    // 批量更新
    await this.commissionRepo.updateMany(
      {
        orderId,
        status: CommissionStatus.FROZEN,
      },
      {
        planSettleTime,
      },
    );

    this.logger.log(`Updated settlement time for order ${orderId} to ${planSettleTime.toISOString()}`);
  }
}
