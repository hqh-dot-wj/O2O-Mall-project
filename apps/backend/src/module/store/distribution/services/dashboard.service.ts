import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Result } from 'src/common/response';
import { GetDashboardDto } from '../dto/get-dashboard.dto';
import { DashboardVo, DistributorStatsVo, OrderStatsVo, CommissionStatsVo } from '../vo/dashboard.vo';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取分销数据看板
   */
  async getDashboard(tenantId: string, query: GetDashboardDto): Promise<Result<DashboardVo>> {
    const { startDate, endDate } = this.getDateRange(query);

    // 并行查询所有统计数据
    const [distributorStats, orderStats, commissionStats] = await Promise.all([
      this.getDistributorStats(tenantId, startDate, endDate),
      this.getOrderStats(tenantId, startDate, endDate),
      this.getCommissionStats(tenantId, startDate, endDate),
    ]);

    const dashboard: DashboardVo = {
      distributorStats,
      orderStats,
      commissionStats,
    };

    return Result.ok(dashboard);
  }

  /**
   * 获取分销员统计
   */
  private async getDistributorStats(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DistributorStatsVo> {
    // 总分销员数（levelId >= 1）
    const total = await this.prisma.umsMember.count({
      where: {
        tenantId,
        levelId: { gte: 1 },
      },
    });

    // 新增分销员数（时间范围内升级为C1/C2的）
    const newCount = await this.prisma.umsMember.count({
      where: {
        tenantId,
        levelId: { gte: 1 },
        updateTime: { gte: startDate, lte: endDate },
      },
    });

    // 活跃分销员数（时间范围内有佣金记录的）
    const activeDistributors = await this.prisma.finCommission.groupBy({
      by: ['beneficiaryId'],
      where: {
        tenantId,
        createTime: { gte: startDate, lte: endDate },
      },
    });

    return {
      total,
      newCount,
      activeCount: activeDistributors.length,
    };
  }

  /**
   * 获取订单统计
   */
  private async getOrderStats(tenantId: string, startDate: Date, endDate: Date): Promise<OrderStatsVo> {
    // 分销订单统计
    const distributionOrders = await this.prisma.omsOrder.aggregate({
      where: {
        tenantId,
        shareUserId: { not: null },
        createTime: { gte: startDate, lte: endDate },
      },
      _count: true,
      _sum: { payAmount: true },
    });

    // 总订单统计（用于计算占比）
    const totalOrders = await this.prisma.omsOrder.aggregate({
      where: {
        tenantId,
        createTime: { gte: startDate, lte: endDate },
      },
      _count: true,
    });

    const totalCount = distributionOrders._count || 0;
    const totalAmount = distributionOrders._sum.payAmount
      ? Number(distributionOrders._sum.payAmount)
      : 0;
    const percentage =
      totalOrders._count > 0 ? (totalCount / totalOrders._count) * 100 : 0;

    return {
      totalCount,
      totalAmount,
      percentage: Number(percentage.toFixed(2)),
    };
  }

  /**
   * 获取佣金统计
   */
  private async getCommissionStats(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CommissionStatsVo> {
    // 佣金总额
    const totalCommission = await this.prisma.finCommission.aggregate({
      where: {
        tenantId,
        createTime: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    // 待结算佣金
    const pendingCommission = await this.prisma.finCommission.aggregate({
      where: {
        tenantId,
        status: 'FROZEN',
        createTime: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    // 已结算佣金
    const settledCommission = await this.prisma.finCommission.aggregate({
      where: {
        tenantId,
        status: 'SETTLED',
        createTime: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    // 佣金趋势（按日分组）
    const trend = await this.getCommissionTrend(tenantId, startDate, endDate);

    return {
      totalAmount: totalCommission._sum.amount ? Number(totalCommission._sum.amount) : 0,
      pendingAmount: pendingCommission._sum.amount ? Number(pendingCommission._sum.amount) : 0,
      settledAmount: settledCommission._sum.amount ? Number(settledCommission._sum.amount) : 0,
      trend,
    };
  }

  /**
   * 获取佣金趋势（按日）
   */
  private async getCommissionTrend(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ date: string; amount: number }>> {
    const result = await this.prisma.$queryRaw<Array<{ date: Date; amount: Decimal }>>`
      SELECT 
        DATE(create_time) as date,
        SUM(amount) as amount
      FROM fin_commission
      WHERE tenant_id = ${tenantId}
        AND create_time >= ${startDate}
        AND create_time <= ${endDate}
      GROUP BY DATE(create_time)
      ORDER BY date ASC
    `;

    return result.map((item) => ({
      date: item.date.toISOString().split('T')[0],
      amount: Number(item.amount),
    }));
  }

  /**
   * 获取日期范围
   */
  private getDateRange(query: GetDashboardDto): { startDate: Date; endDate: Date } {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 默认最近30天
    startDate.setHours(0, 0, 0, 0);

    return { startDate, endDate };
  }
}
