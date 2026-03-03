import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { WithdrawalStatus, Prisma } from '@prisma/client';
import { Result } from 'src/common/response';
import { FormatDateFields } from 'src/common/utils';
import { ExportTable } from 'src/common/utils/export';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { BusinessException } from 'src/common/exceptions';
import { FinanceEventEmitter } from '../events/finance-event.emitter';
import { FinanceEventType } from '../events/finance-event.types';

/**
 * 提现管理服务（Admin端）
 * 
 * @description
 * WD-T8: 新增提现统计功能
 * WD-T9: 新增提现导出功能
 * WD-T10: 新增提现到账通知
 * WD-T11: 新增提现详情接口
 */
@Injectable()
export class WithdrawalAdminService {
  private readonly logger = new Logger(WithdrawalAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: FinanceEventEmitter,
  ) {}

  // ========== WD-T8: 提现统计功能 ==========

  /**
   * 获取提现统计数据
   * 
   * @description
   * R-FLOW-WITHDRAWAL-STATS-01: 统计提现总览数据
   */
  async getWithdrawalStats() {
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();
    const baseWhere = isSuper ? {} : { tenantId };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalStats, statusStats, todayStats, monthStats, methodStats] = await Promise.all([
      // 总体统计
      this.prisma.finWithdrawal.aggregate({
        where: baseWhere,
        _count: true,
        _sum: { amount: true, fee: true, actualAmount: true },
      }),
      // 按状态统计
      this.prisma.finWithdrawal.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: true,
        _sum: { amount: true },
      }),
      // 今日统计
      this.prisma.finWithdrawal.aggregate({
        where: { ...baseWhere, createTime: { gte: today } },
        _count: true,
        _sum: { amount: true },
      }),
      // 本月统计
      this.prisma.finWithdrawal.aggregate({
        where: { ...baseWhere, createTime: { gte: monthStart } },
        _count: true,
        _sum: { amount: true },
      }),
      // 按提现方式统计
      this.prisma.finWithdrawal.groupBy({
        by: ['method'],
        where: { ...baseWhere, status: WithdrawalStatus.APPROVED },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    const statusMap = new Map(
      statusStats.map((s) => [s.status, { count: s._count, amount: Number(s._sum.amount ?? 0) }]),
    );

    return Result.ok({
      // 总体
      totalCount: totalStats._count,
      totalAmount: Number(totalStats._sum.amount ?? 0),
      totalFee: Number(totalStats._sum.fee ?? 0),
      totalActualAmount: Number(totalStats._sum.actualAmount ?? 0),
      // 按状态
      pendingCount: statusMap.get(WithdrawalStatus.PENDING)?.count ?? 0,
      pendingAmount: statusMap.get(WithdrawalStatus.PENDING)?.amount ?? 0,
      approvedCount: statusMap.get(WithdrawalStatus.APPROVED)?.count ?? 0,
      approvedAmount: statusMap.get(WithdrawalStatus.APPROVED)?.amount ?? 0,
      rejectedCount: statusMap.get(WithdrawalStatus.REJECTED)?.count ?? 0,
      rejectedAmount: statusMap.get(WithdrawalStatus.REJECTED)?.amount ?? 0,
      failedCount: statusMap.get(WithdrawalStatus.FAILED)?.count ?? 0,
      failedAmount: statusMap.get(WithdrawalStatus.FAILED)?.amount ?? 0,
      // 按时间
      todayCount: todayStats._count,
      todayAmount: Number(todayStats._sum.amount ?? 0),
      monthCount: monthStats._count,
      monthAmount: Number(monthStats._sum.amount ?? 0),
      // 按方式
      methodStats: methodStats.map((m) => ({
        method: m.method,
        methodName: this.getMethodName(m.method),
        count: m._count,
        amount: Number(m._sum.amount ?? 0),
      })),
    });
  }

  /**
   * 获取提现趋势数据（最近30天）
   */
  async getWithdrawalTrend(days: number = 30) {
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();
    const baseWhere = isSuper ? Prisma.sql`1=1` : Prisma.sql`tenant_id = ${tenantId}`;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const result = await this.prisma.$queryRaw<
      Array<{ date: Date; count: bigint; amount: number; approved_count: bigint; approved_amount: number }>
    >`
      SELECT 
        DATE(create_time) as date,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as amount,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count,
        COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END), 0) as approved_amount
      FROM fin_withdrawal
      WHERE ${baseWhere}
        AND create_time >= ${startDate}
      GROUP BY DATE(create_time)
      ORDER BY date ASC
    `;

    const trend = result.map((r) => ({
      date: r.date,
      count: Number(r.count),
      amount: Number(r.amount),
      approvedCount: Number(r.approved_count),
      approvedAmount: Number(r.approved_amount),
    }));

    return Result.ok(FormatDateFields(trend));
  }

  // ========== WD-T9: 提现导出功能 ==========

  /**
   * 导出提现数据
   * 
   * @description
   * R-FLOW-WITHDRAWAL-EXPORT-01: 导出提现记录为 Excel
   */
  async exportWithdrawals(res: Response, query: {
    status?: WithdrawalStatus;
    startTime?: Date;
    endTime?: Date;
    keyword?: string;
  }) {
    const MAX_EXPORT_LIMIT = 10000;
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();

    const where: Prisma.FinWithdrawalWhereInput = {
      ...(isSuper ? {} : { tenantId }),
      ...(query.status ? { status: query.status } : {}),
    };

    if (query.startTime || query.endTime) {
      where.createTime = {};
      if (query.startTime) where.createTime.gte = query.startTime;
      if (query.endTime) where.createTime.lte = query.endTime;
    }

    if (query.keyword) {
      where.member = {
        OR: [
          { nickname: { contains: query.keyword } },
          { mobile: { contains: query.keyword } },
        ],
      };
    }

    // 检查数量限制
    const total = await this.prisma.finWithdrawal.count({ where });
    BusinessException.throwIf(
      total > MAX_EXPORT_LIMIT,
      `导出数据量过大（${total}条），单次最多导出${MAX_EXPORT_LIMIT}条，请缩小查询范围`,
    );

    const list = await this.prisma.finWithdrawal.findMany({
      where,
      include: {
        member: {
          select: {
            nickname: true,
            mobile: true,
          },
        },
      },
      orderBy: { createTime: 'desc' },
    });

    const exportData = list.map((item) => ({
      id: item.id,
      memberName: item.member?.nickname ?? item.realName ?? '未知',
      memberMobile: item.member?.mobile ?? '',
      amount: Number(item.amount),
      fee: Number(item.fee),
      actualAmount: Number(item.actualAmount ?? 0),
      method: this.getMethodName(item.method),
      status: this.getStatusName(item.status),
      auditBy: item.auditBy ?? '',
      auditTime: item.auditTime,
      auditRemark: item.auditRemark ?? '',
      paymentNo: item.paymentNo ?? '',
      failReason: item.failReason ?? '',
      createTime: item.createTime,
    }));

    const options = {
      sheetName: '提现记录',
      data: FormatDateFields(exportData),
      header: [
        { title: '提现ID', dataIndex: 'id', width: 36 },
        { title: '用户姓名', dataIndex: 'memberName', width: 15 },
        { title: '用户手机', dataIndex: 'memberMobile', width: 15 },
        { title: '申请金额', dataIndex: 'amount', width: 12 },
        { title: '手续费', dataIndex: 'fee', width: 10 },
        { title: '实际到账', dataIndex: 'actualAmount', width: 12 },
        { title: '提现方式', dataIndex: 'method', width: 12 },
        { title: '状态', dataIndex: 'status', width: 10 },
        { title: '审核人', dataIndex: 'auditBy', width: 12 },
        { title: '审核时间', dataIndex: 'auditTime', width: 20 },
        { title: '审核备注', dataIndex: 'auditRemark', width: 20 },
        { title: '支付单号', dataIndex: 'paymentNo', width: 30 },
        { title: '失败原因', dataIndex: 'failReason', width: 20 },
        { title: '申请时间', dataIndex: 'createTime', width: 20 },
      ],
    };

    return await ExportTable(options, res);
  }

  // ========== WD-T10: 提现到账通知 ==========

  /**
   * 发送提现到账通知
   * 
   * @description
   * R-FLOW-WITHDRAWAL-NOTIFY-01: 提现成功后通知用户
   */
  async sendArrivalNotification(withdrawalId: string) {
    const withdrawal = await this.prisma.finWithdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        member: {
          select: {
            memberId: true,
            nickname: true,
            mobile: true,
          },
        },
      },
    });

    BusinessException.throwIfNull(withdrawal, '提现记录不存在');
    BusinessException.throwIf(
      withdrawal.status !== WithdrawalStatus.APPROVED,
      '只能通知已到账的提现',
    );

    // 发送到账通知事件
    await this.eventEmitter.emit({
      type: FinanceEventType.WITHDRAWAL_APPROVED,
      tenantId: withdrawal.tenantId,
      memberId: withdrawal.memberId,
      payload: {
        withdrawalId: withdrawal.id,
        amount: withdrawal.amount.toString(),
        actualAmount: withdrawal.actualAmount?.toString() ?? '0',
        method: withdrawal.method,
        paymentNo: withdrawal.paymentNo,
        memberName: withdrawal.member?.nickname ?? withdrawal.realName,
        memberMobile: withdrawal.member?.mobile,
      },
      timestamp: new Date(),
    });

    this.logger.log(`[提现通知] 已发送到账通知: ${withdrawalId}`);

    return Result.ok(null, '通知已发送');
  }

  // ========== WD-T11: 提现详情接口 ==========

  /**
   * 获取提现详情
   * 
   * @description
   * R-FLOW-WITHDRAWAL-DETAIL-01: 查询提现详情
   */
  async getWithdrawalDetail(withdrawalId: string) {
    const withdrawal = await this.prisma.finWithdrawal.findUnique({
      where: { id: withdrawalId },
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
    });

    if (!withdrawal) {
      return Result.fail(404, '提现记录不存在');
    }

    // 查询相关流水
    const transactions = await this.prisma.finTransaction.findMany({
      where: { relatedId: withdrawalId },
      orderBy: { createTime: 'desc' },
      take: 10,
    });

    return Result.ok(FormatDateFields({
      id: withdrawal.id,
      tenantId: withdrawal.tenantId,
      memberId: withdrawal.memberId,
      memberName: withdrawal.member?.nickname ?? withdrawal.realName ?? '未知',
      memberMobile: withdrawal.member?.mobile ?? '',
      memberAvatar: withdrawal.member?.avatar ?? '',
      amount: Number(withdrawal.amount),
      fee: Number(withdrawal.fee),
      actualAmount: Number(withdrawal.actualAmount ?? 0),
      method: withdrawal.method,
      methodName: this.getMethodName(withdrawal.method),
      accountNo: withdrawal.accountNo,
      realName: withdrawal.realName,
      status: withdrawal.status,
      statusName: this.getStatusName(withdrawal.status),
      retryCount: withdrawal.retryCount,
      auditTime: withdrawal.auditTime,
      auditBy: withdrawal.auditBy,
      auditRemark: withdrawal.auditRemark,
      paymentNo: withdrawal.paymentNo,
      failReason: withdrawal.failReason,
      createTime: withdrawal.createTime,
      // 相关流水
      transactions: transactions.map((t) => ({
        id: t.id.toString(),
        type: t.type,
        amount: Number(t.amount),
        balanceAfter: Number(t.balanceAfter),
        remark: t.remark,
        createTime: t.createTime,
      })),
    }));
  }

  /**
   * 获取提现方式名称
   */
  private getMethodName(method: string): string {
    const methodNames: Record<string, string> = {
      WECHAT_WALLET: '微信钱包',
      BANK_CARD: '银行卡',
      ALIPAY: '支付宝',
    };
    return methodNames[method] ?? method;
  }

  /**
   * 获取状态名称
   */
  private getStatusName(status: WithdrawalStatus): string {
    const statusNames: Record<WithdrawalStatus, string> = {
      [WithdrawalStatus.PENDING]: '待审核',
      [WithdrawalStatus.APPROVED]: '已到账',
      [WithdrawalStatus.REJECTED]: '已驳回',
      [WithdrawalStatus.FAILED]: '打款失败',
    };
    return statusNames[status] ?? status;
  }
}
