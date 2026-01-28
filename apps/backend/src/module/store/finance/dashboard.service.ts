import { Injectable } from '@nestjs/common';
import { Result } from 'src/common/response';
import { FormatDateFields } from 'src/common/utils';
import { CommissionStatus, WithdrawalStatus, PayStatus } from '@prisma/client';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { StoreOrderRepository } from 'src/module/store/order/store-order.repository';
import { CommissionRepository } from 'src/module/finance/commission/commission.repository';
import { WithdrawalRepository } from 'src/module/finance/withdrawal/withdrawal.repository';

/**
 * 店铺财务看板服务
 * 
 * @description
 * 负责店铺财务看板数据的统计和聚合
 */
@Injectable()
export class StoreDashboardService {
  constructor(
    private readonly storeOrderRepo: StoreOrderRepository,
    private readonly commissionRepo: CommissionRepository,
    private readonly withdrawalRepo: WithdrawalRepository,
  ) {}

  /**
   * 获取资金看板数据
   */
  async getDashboard() {
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const baseWhere = isSuper ? {} : { tenantId };

    const [todayOrders, monthOrders, pendingCommissions, settledCommissions, pendingWithdrawals] = await Promise.all([
      this.storeOrderRepo.aggregate({
        where: {
          ...baseWhere,
          payStatus: PayStatus.PAID,
          createTime: { gte: today },
        },
        _sum: { payAmount: true },
        _count: true,
      }),
      this.storeOrderRepo.aggregate({
        where: {
          ...baseWhere,
          payStatus: PayStatus.PAID,
          createTime: { gte: monthStart },
        },
        _sum: { payAmount: true },
      }),
      this.commissionRepo.aggregate({
        where: {
          ...baseWhere,
          status: CommissionStatus.FROZEN,
        },
        _sum: { amount: true },
      }),
      this.commissionRepo.aggregate({
        where: {
          ...baseWhere,
          status: CommissionStatus.SETTLED,
        },
        _sum: { amount: true },
      }),
      this.withdrawalRepo.count({
        ...baseWhere,
        status: WithdrawalStatus.PENDING,
      }),
    ]);

    return Result.ok(
      FormatDateFields({
        todayGMV: todayOrders._sum.payAmount || 0,
        todayOrderCount: todayOrders._count || 0,
        monthGMV: monthOrders._sum.payAmount || 0,
        pendingCommission: pendingCommissions._sum.amount || 0,
        settledCommission: settledCommissions._sum.amount || 0,
        pendingWithdrawals,
      }),
    );
  }

  /**
   * 获取佣金统计数据
   */
  async getCommissionStats() {
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const baseWhere = isSuper ? {} : { tenantId };

    const [todayStats, monthStats, pendingStats] = await Promise.all([
      this.commissionRepo.aggregate({
        where: {
          ...baseWhere,
          createTime: { gte: today },
        },
        _sum: { amount: true },
      }),
      this.commissionRepo.aggregate({
        where: {
          ...baseWhere,
          createTime: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      this.commissionRepo.aggregate({
        where: {
          ...baseWhere,
          status: CommissionStatus.FROZEN,
        },
        _sum: { amount: true },
      }),
    ]);

    return Result.ok(
      FormatDateFields({
        todayCommission: todayStats._sum.amount || 0,
        monthCommission: monthStats._sum.amount || 0,
        pendingCommission: pendingStats._sum.amount || 0,
      }),
    );
  }
}
