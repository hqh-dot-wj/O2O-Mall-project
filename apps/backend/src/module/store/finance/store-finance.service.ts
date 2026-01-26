import { Injectable, Logger } from '@nestjs/common';
import { Result } from 'src/common/response';
import { FormatDateFields } from 'src/common/utils';
import { Prisma, CommissionStatus, TransType } from '@prisma/client';
import { WithdrawalService } from 'src/module/finance/withdrawal/withdrawal.service';
import { ListCommissionDto, ListWithdrawalDto, AuditWithdrawalDto, ListLedgerDto } from './dto/store-finance.dto';
import { ListWithdrawalDto as FinListWithdrawalDto } from 'src/module/finance/withdrawal/dto/list-withdrawal.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { StoreOrderRepository } from 'src/module/store/order/store-order.repository';
import { CommissionRepository } from 'src/module/finance/commission/commission.repository';
import { WithdrawalRepository } from 'src/module/finance/withdrawal/withdrawal.repository';
import { TransactionRepository } from 'src/module/finance/wallet/transaction.repository';

/**
 * Store端财务服务
 * 提供租户后台的财务管理功能
 */
@Injectable()
export class StoreFinanceService {
  private readonly logger = new Logger(StoreFinanceService.name);

  constructor(
    private readonly withdrawalService: WithdrawalService,
    private readonly storeOrderRepo: StoreOrderRepository,
    private readonly commissionRepo: CommissionRepository,
    private readonly withdrawalRepo: WithdrawalRepository,
    private readonly transactionRepo: TransactionRepository,
  ) {}

  /**
   * 获取资金看板数据
   */
  async getDashboard() {
    const tenantId = TenantContext.getTenantId();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // 并行查询各项统计
    const [todayOrders, monthOrders, pendingCommissions, settledCommissions, pendingWithdrawals] = await Promise.all([
      // 今日订单GMV
      this.storeOrderRepo.aggregate({
        where: {
          tenantId,
          payStatus: 'PAID',
          createTime: { gte: today },
        },
        _sum: { payAmount: true },
        _count: true,
      }),
      // 本月订单GMV
      this.storeOrderRepo.aggregate({
        where: {
          tenantId,
          payStatus: 'PAID',
          createTime: { gte: monthStart },
        },
        _sum: { payAmount: true },
      }),
      // 待结算佣金
      this.commissionRepo.aggregate({
        where: {
          tenantId,
          status: 'FROZEN',
        },
        _sum: { amount: true },
      }),
      // 已结算佣金
      this.commissionRepo.aggregate({
        where: {
          tenantId,
          status: 'SETTLED',
        },
        _sum: { amount: true },
      }),
      // 待审核提现
      this.withdrawalRepo.count({
        tenantId,
        status: 'PENDING',
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
   * 查询佣金明细列表
   * @param query 查询参数
   */
  async getCommissionList(query: ListCommissionDto) {
    const tenantId = TenantContext.getTenantId();
    const where: Prisma.FinCommissionWhereInput = { tenantId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.memberId) {
      where.beneficiaryId = query.memberId;
    }

    // 时间范围
    const dateRange = query.getDateRange('createTime');
    if (dateRange) {
      Object.assign(where, dateRange);
    }

    // 如果有订单号或手机号筛选，需要关联查询
    if (query.orderSn || query.phone) {
      where.order = {};
      if (query.orderSn) {
        where.order.orderSn = { contains: query.orderSn };
      }
    }

    const result = await this.commissionRepo.findPage({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
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
            orderSn: true,
            payAmount: true,
          },
        },
      },
      orderBy: query.orderByColumn || 'createTime',
      order: query.isAsc || 'desc',
    });

    return Result.page(FormatDateFields(result.rows), result.total);
  }

  /**
   * 获取佣金统计数据
   */
  async getCommissionStats() {
    const tenantId = TenantContext.getTenantId();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayStats, monthStats, pendingStats] = await Promise.all([
      // 今日佣金
      this.commissionRepo.aggregate({
        where: {
          tenantId,
          createTime: { gte: today },
        },
        _sum: { amount: true },
      }),
      // 本月累计
      this.commissionRepo.aggregate({
        where: {
          tenantId,
          createTime: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      // 待结算
      this.commissionRepo.aggregate({
        where: {
          tenantId,
          status: 'FROZEN',
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

  /**
   * 查询提现列表
   * @param query 查询参数
   */
  async getWithdrawalList(query: ListWithdrawalDto) {
    const tenantId = TenantContext.getTenantId();
    const searchParams = new FinListWithdrawalDto();
    searchParams.pageNum = query.pageNum;
    searchParams.pageSize = query.pageSize;
    searchParams.status = query.status;
    searchParams.memberId = query.memberId;

    return await this.withdrawalService.getList(searchParams, tenantId);
  }

  /**
   * 审核提现
   */
  async auditWithdrawal(dto: AuditWithdrawalDto, auditBy: string) {
    const tenantId = TenantContext.getTenantId();
    return await this.withdrawalService.audit(dto.withdrawalId, tenantId, dto.action, auditBy, dto.remark);
  }

  /**
   * 查询门店流水
   * @param query 查询参数
   */
  async getLedger(query: ListLedgerDto) {
    const tenantId = TenantContext.getTenantId();
    // 构建时间范围条件
    const timeFilter: any = {};
    const dateRange = query.getDateRange('createTime');
    if (dateRange) {
      Object.assign(timeFilter, dateRange.createTime);
    }

    // 1. 查询订单收入 (OmsOrder)
    const orderWhere: Prisma.OmsOrderWhereInput = {
      tenantId,
      payStatus: 'PAID',
      createTime: timeFilter,
    };

    if (query.memberId) {
      orderWhere.memberId = query.memberId;
    }

    // 2. 查询钱包流水 (FinTransaction)
    const transWhere: Prisma.FinTransactionWhereInput = {
      tenantId,
      createTime: timeFilter,
    };

    if (query.memberId) {
      transWhere.wallet = { memberId: query.memberId };
    }
    if (query.type) {
      transWhere.type = query.type as TransType;
    }

    // 3. 查询提现支出 (FinWithdrawal) - 仅查询已打款
    const withdrawWhere: Prisma.FinWithdrawalWhereInput = {
      tenantId,
      status: { in: ['APPROVED'] },
      createTime: timeFilter,
    };

    if (query.memberId) {
      withdrawWhere.memberId = query.memberId;
    }

    // 获取所需数量 (为了做内存排序分页，需获取 skip + take 的数据量)
    const fetchCount = query.skip + query.take;

    const [orders, transactions, withdrawals, orderCount, transCount, withdrawCount] = await Promise.all([
      // 订单
      this.storeOrderRepo.findMany({
        where: orderWhere,
        select: {
          id: true,
          orderSn: true,
          payAmount: true,
          createTime: true,
          receiverName: true,
          receiverPhone: true,
        },
        take: fetchCount,
        orderBy: { createTime: 'desc' },
      }),
      // 钱包流水
      this.transactionRepo.findMany({
        where: transWhere,
        include: {
          wallet: {
            include: {
              member: { select: { nickname: true, mobile: true } },
            },
          },
        },
        take: fetchCount,
        orderBy: { createTime: 'desc' },
      }),
      // 提现
      this.withdrawalRepo.findMany({
        where: withdrawWhere,
        select: {
          id: true,
          amount: true,
          createTime: true,
          realName: true,
          member: { select: { nickname: true, mobile: true } },
        },
        take: fetchCount,
        orderBy: { createTime: 'desc' },
      }),
      // 计数
      this.storeOrderRepo.count(orderWhere),
      this.transactionRepo.count(transWhere),
      this.withdrawalRepo.count(withdrawWhere),
    ]);

    // --- 数据增强：查询订单的分佣信息 ---
    const orderIds = orders.map((o) => o.id);
    const commissionMap = new Map<string, any>(); // orderId -> { referrer: {...}, indirectReferrer: {...} }

    if (orderIds.length > 0) {
      const commissions = await this.commissionRepo.findMany({
        where: {
          orderId: { in: orderIds },
          tenantId,
        },
        include: {
          beneficiary: {
            select: { nickname: true, mobile: true },
          },
        },
      });

      // 组装分佣信息
      commissions.forEach((c: any) => {
        const orderId = c.orderId;
        if (!commissionMap.has(orderId)) {
          commissionMap.set(orderId, {});
        }
        const distInfo = commissionMap.get(orderId);
        const info = {
          nickname: c.beneficiary?.nickname || '未知用户',
          mobile: c.beneficiary?.mobile || '',
          amount: Number(c.amount),
        };

        if (c.level === 1) {
          distInfo.referrer = info;
        } else if (c.level === 2) {
          distInfo.indirectReferrer = info;
        }
      });
    }

    // 统一数据格式
    const unifiedList = [
      ...orders.map((o) => {
        const dist = commissionMap.get(o.id);
        return {
          id: o.id,
          type: 'ORDER_INCOME',
          typeName: '订单收入',
          amount: Number(o.payAmount),
          balanceAfter: 0, // 暂无余额快照
          relatedId: o.orderSn,
          remark: `订单支付: ${o.orderSn}`,
          createTime: o.createTime,
          user: {
            nickname: o.receiverName || '匿名',
            mobile: o.receiverPhone || '',
          },
          distribution: dist, // 附加分销信息
        };
      }),
      ...transactions.map((t: any) => ({
        id: t.id.toString(),
        type: t.type,
        typeName: this.getTransTypeName(t.type),
        amount: Number(t.amount),
        balanceAfter: Number(t.balanceAfter),
        relatedId: t.relatedId,
        remark: t.remark,
        createTime: t.createTime,
        user: {
          nickname: t.wallet?.member?.nickname || '未知',
          mobile: t.wallet?.member?.mobile || '',
        },
      })),
      ...withdrawals.map((w: any) => ({
        id: w.id,
        type: 'WITHDRAW_OUT',
        typeName: '提现支出',
        amount: -Number(w.amount),
        balanceAfter: 0, // 暂无余额快照
        relatedId: w.id,
        remark: '余额提现',
        createTime: w.createTime,
        user: {
          nickname: w.member?.nickname || w.realName || '未知',
          mobile: w.member?.mobile || '',
        },
      })),
    ];

    // 内存排序
    unifiedList.sort((a, b) => b.createTime.getTime() - a.createTime.getTime());

    // 分页切片
    const pagedList = unifiedList.slice(query.skip, query.skip + query.take);

    return Result.page(FormatDateFields(pagedList), orderCount + transCount + withdrawCount);
  }

  private getTransTypeName(type: string): string {
    const map: Record<string, string> = {
      COMMISSION_IN: '佣金入账',
      WITHDRAW_OUT: '提现扣款',
      REFUND_DEDUCT: '退款扣减',
      CONSUME_PAY: '余额支付',
      RECHARGE_IN: '充值入账',
    };
    return map[type] || type;
  }
}
