import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommissionStatus, Prisma } from '@prisma/client';
import { Result } from 'src/common/response';
import { FormatDateFields } from 'src/common/utils';
import { TenantContext } from 'src/common/tenant/tenant.context';

/**
 * 佣金管理服务（Admin端）
 * 
 * @description
 * C-T9: 新增佣金查询接口
 * C-T10: 新增佣金统计功能
 */
@Injectable()
export class CommissionAdminService {
  private readonly logger = new Logger(CommissionAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ========== C-T9: 佣金查询接口 ==========

  /**
   * 查询佣金列表
   * 
   * @description
   * R-FLOW-COMMISSION-LIST-01: 分页查询佣金记录
   */
  async getCommissionList(query: {
    pageNum?: number;
    pageSize?: number;
    status?: CommissionStatus;
    orderId?: string;
    orderSn?: string;
    beneficiaryId?: string;
    keyword?: string;
    level?: number;
    startTime?: Date;
    endTime?: Date;
  }) {
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();
    const page = query.pageNum ?? 1;
    const size = query.pageSize ?? 20;

    const where: Prisma.FinCommissionWhereInput = {
      ...(isSuper ? {} : { tenantId }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.orderId ? { orderId: query.orderId } : {}),
      ...(query.beneficiaryId ? { beneficiaryId: query.beneficiaryId } : {}),
      ...(query.level ? { level: query.level } : {}),
    };

    // 时间范围
    if (query.startTime || query.endTime) {
      where.createTime = {};
      if (query.startTime) where.createTime.gte = query.startTime;
      if (query.endTime) where.createTime.lte = query.endTime;
    }

    // 订单号模糊搜索
    if (query.orderSn) {
      where.order = { orderSn: { contains: query.orderSn } };
    }

    // 用户关键字搜索
    if (query.keyword) {
      where.beneficiary = {
        OR: [
          { nickname: { contains: query.keyword } },
          { mobile: { contains: query.keyword } },
        ],
      };
    }

    const [list, total] = await Promise.all([
      this.prisma.finCommission.findMany({
        where,
        include: {
          beneficiary: {
            select: {
              memberId: true,
              nickname: true,
              mobile: true,
              avatar: true,
            },
          },
          order: {
            select: {
              id: true,
              orderSn: true,
              payAmount: true,
              status: true,
            },
          },
        },
        orderBy: { createTime: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.finCommission.count({ where }),
    ]);

    const formattedList = list.map((commission) => ({
      id: commission.id.toString(),
      orderId: commission.orderId,
      orderSn: commission.order?.orderSn ?? '',
      orderPayAmount: Number(commission.order?.payAmount ?? 0),
      beneficiaryId: commission.beneficiaryId,
      beneficiaryName: commission.beneficiary?.nickname ?? '未知',
      beneficiaryMobile: commission.beneficiary?.mobile ?? '',
      beneficiaryAvatar: commission.beneficiary?.avatar ?? '',
      level: commission.level,
      levelName: commission.level === 1 ? '一级佣金' : '二级佣金',
      amount: Number(commission.amount),
      rateSnapshot: Number(commission.rateSnapshot),
      commissionBase: Number(commission.commissionBase),
      commissionBaseType: commission.commissionBaseType,
      isCapped: commission.isCapped,
      isCrossTenant: commission.isCrossTenant,
      status: commission.status,
      statusName: this.getStatusName(commission.status),
      planSettleTime: commission.planSettleTime,
      settleTime: commission.settleTime,
      createTime: commission.createTime,
    }));

    return Result.page(FormatDateFields(formattedList), total);
  }

  /**
   * 获取佣金详情
   */
  async getCommissionDetail(commissionId: string) {
    const commission = await this.prisma.finCommission.findUnique({
      where: { id: BigInt(commissionId) },
      include: {
        beneficiary: {
          select: {
            memberId: true,
            nickname: true,
            mobile: true,
            avatar: true,
          },
        },
        order: {
          select: {
            id: true,
            orderSn: true,
            payAmount: true,
            status: true,
            createTime: true,
          },
        },
      },
    });

    if (!commission) {
      return Result.fail(404, '佣金记录不存在');
    }

    return Result.ok(FormatDateFields({
      id: commission.id.toString(),
      orderId: commission.orderId,
      orderSn: commission.order?.orderSn ?? '',
      orderPayAmount: Number(commission.order?.payAmount ?? 0),
      orderStatus: commission.order?.status,
      orderCreateTime: commission.order?.createTime,
      beneficiaryId: commission.beneficiaryId,
      beneficiaryName: commission.beneficiary?.nickname ?? '未知',
      beneficiaryMobile: commission.beneficiary?.mobile ?? '',
      level: commission.level,
      levelName: commission.level === 1 ? '一级佣金' : '二级佣金',
      amount: Number(commission.amount),
      rateSnapshot: Number(commission.rateSnapshot),
      commissionBase: Number(commission.commissionBase),
      commissionBaseType: commission.commissionBaseType,
      orderOriginalPrice: Number(commission.orderOriginalPrice ?? 0),
      orderActualPaid: Number(commission.orderActualPaid ?? 0),
      couponDiscount: Number(commission.couponDiscount ?? 0),
      pointsDiscount: Number(commission.pointsDiscount ?? 0),
      isCapped: commission.isCapped,
      isCrossTenant: commission.isCrossTenant,
      status: commission.status,
      statusName: this.getStatusName(commission.status),
      planSettleTime: commission.planSettleTime,
      settleTime: commission.settleTime,
      createTime: commission.createTime,
    }));
  }

  // ========== C-T10: 佣金统计功能 ==========

  /**
   * 获取佣金统计数据
   * 
   * @description
   * R-FLOW-COMMISSION-STATS-01: 统计佣金总览数据
   */
  async getCommissionStats() {
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();
    const baseWhere = isSuper ? {} : { tenantId };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const yearStart = new Date(today.getFullYear(), 0, 1);

    const [
      totalStats,
      statusStats,
      todayStats,
      monthStats,
      yearStats,
      levelStats,
    ] = await Promise.all([
      // 总体统计
      this.prisma.finCommission.aggregate({
        where: { ...baseWhere, status: { not: CommissionStatus.CANCELLED } },
        _count: true,
        _sum: { amount: true },
      }),
      // 按状态统计
      this.prisma.finCommission.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: true,
        _sum: { amount: true },
      }),
      // 今日统计
      this.prisma.finCommission.aggregate({
        where: {
          ...baseWhere,
          createTime: { gte: today },
          status: { not: CommissionStatus.CANCELLED },
        },
        _count: true,
        _sum: { amount: true },
      }),
      // 本月统计
      this.prisma.finCommission.aggregate({
        where: {
          ...baseWhere,
          createTime: { gte: monthStart },
          status: { not: CommissionStatus.CANCELLED },
        },
        _count: true,
        _sum: { amount: true },
      }),
      // 本年统计
      this.prisma.finCommission.aggregate({
        where: {
          ...baseWhere,
          createTime: { gte: yearStart },
          status: { not: CommissionStatus.CANCELLED },
        },
        _count: true,
        _sum: { amount: true },
      }),
      // 按层级统计
      this.prisma.finCommission.groupBy({
        by: ['level'],
        where: { ...baseWhere, status: { not: CommissionStatus.CANCELLED } },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    const statusMap = new Map(
      statusStats.map((s) => [s.status, { count: s._count, amount: Number(s._sum.amount ?? 0) }]),
    );
    const levelMap = new Map(
      levelStats.map((l) => [l.level, { count: l._count, amount: Number(l._sum.amount ?? 0) }]),
    );

    return Result.ok({
      // 总体
      totalCount: totalStats._count,
      totalAmount: Number(totalStats._sum.amount ?? 0),
      // 按状态
      frozenCount: statusMap.get(CommissionStatus.FROZEN)?.count ?? 0,
      frozenAmount: statusMap.get(CommissionStatus.FROZEN)?.amount ?? 0,
      settledCount: statusMap.get(CommissionStatus.SETTLED)?.count ?? 0,
      settledAmount: statusMap.get(CommissionStatus.SETTLED)?.amount ?? 0,
      cancelledCount: statusMap.get(CommissionStatus.CANCELLED)?.count ?? 0,
      cancelledAmount: statusMap.get(CommissionStatus.CANCELLED)?.amount ?? 0,
      // 按时间
      todayCount: todayStats._count,
      todayAmount: Number(todayStats._sum.amount ?? 0),
      monthCount: monthStats._count,
      monthAmount: Number(monthStats._sum.amount ?? 0),
      yearCount: yearStats._count,
      yearAmount: Number(yearStats._sum.amount ?? 0),
      // 按层级
      level1Count: levelMap.get(1)?.count ?? 0,
      level1Amount: levelMap.get(1)?.amount ?? 0,
      level2Count: levelMap.get(2)?.count ?? 0,
      level2Amount: levelMap.get(2)?.amount ?? 0,
    });
  }

  /**
   * 获取佣金趋势数据（最近30天）
   */
  async getCommissionTrend(days: number = 30) {
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();
    const baseWhere = isSuper ? Prisma.sql`1=1` : Prisma.sql`tenant_id = ${tenantId}`;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const result = await this.prisma.$queryRaw<
      Array<{ date: Date; count: bigint; amount: number }>
    >`
      SELECT 
        DATE(create_time) as date,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as amount
      FROM fin_commission
      WHERE ${baseWhere}
        AND create_time >= ${startDate}
        AND status != 'CANCELLED'
      GROUP BY DATE(create_time)
      ORDER BY date ASC
    `;

    const trend = result.map((r) => ({
      date: r.date,
      count: Number(r.count),
      amount: Number(r.amount),
    }));

    return Result.ok(FormatDateFields(trend));
  }

  /**
   * 获取状态名称
   */
  private getStatusName(status: CommissionStatus): string {
    const statusNames: Record<CommissionStatus, string> = {
      [CommissionStatus.FROZEN]: '待结算',
      [CommissionStatus.SETTLED]: '已结算',
      [CommissionStatus.CANCELLED]: '已取消',
    };
    return statusNames[status] ?? status;
  }
}
