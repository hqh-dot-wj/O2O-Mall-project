import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Result } from 'src/common/response';
import { FormatDateFields } from 'src/common/utils';
import { ExportTable, ExportOptions } from 'src/common/utils/export';
import { Prisma, TransType } from '@prisma/client';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { ListLedgerDto } from './dto/store-finance.dto';
import { Response } from 'express';

/**
 * 店铺财务流水服务
 *
 * @description
 * 负责店铺财务流水的查询,使用 UNION ALL 合并多表数据
 */
@Injectable()
export class StoreLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 查询财务流水(使用数据库分页)
   */
  async getLedger(query: ListLedgerDto) {
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();

    const dateRange = query.getDateRange('createTime');
    const startTime = dateRange?.createTime?.gte;
    const endTime = dateRange?.createTime?.lte;

    const shouldIncludeOrders = !query.memberId;
    const shouldIncludeCommissions = !query.type || query.type === 'COMMISSION_IN';

    const unionQueries: Prisma.Sql[] = [];

    // 1. 订单收入
    if (shouldIncludeOrders) {
      const orderTenantFilter = isSuper && query.memberId ? Prisma.sql`1=1` : Prisma.sql`o.tenant_id = ${tenantId}`;
      unionQueries.push(Prisma.sql`
        SELECT 
          CONCAT('order-', o.id) as id,
          'ORDER_INCOME' as type,
          '订单收入' as type_name,
          o.pay_amount as amount,
          NULL as balance_after,
          o.order_sn as related_id,
          CONCAT('订单支付: ', o.order_sn) as remark,
          o.create_time,
          o.receiver_name as user_name,
          o.receiver_phone as user_phone,
          NULL as user_id,
          NULL as status
        FROM oms_order o
        WHERE ${orderTenantFilter}
          AND o.pay_status = '1'
          ${startTime ? Prisma.sql`AND o.create_time >= ${startTime}` : Prisma.empty}
          ${endTime ? Prisma.sql`AND o.create_time <= ${endTime}` : Prisma.empty}
          ${query.relatedId ? Prisma.sql`AND o.order_sn LIKE ${`%${query.relatedId}%`}` : Prisma.empty}
          ${query.keyword ? Prisma.sql`AND (o.receiver_name LIKE ${`%${query.keyword}%`} OR o.receiver_phone LIKE ${`%${query.keyword}%`})` : Prisma.empty}
          ${query.minAmount ? Prisma.sql`AND o.pay_amount >= ${query.minAmount}` : Prisma.empty}
          ${query.maxAmount ? Prisma.sql`AND o.pay_amount <= ${query.maxAmount}` : Prisma.empty}
      `);
    }

    // 2. 钱包流水
    if (!query.type || (query.type !== 'COMMISSION_IN' && query.type !== 'WITHDRAW_OUT')) {
      const transTenantFilter = isSuper && query.memberId ? Prisma.sql`1=1` : Prisma.sql`t.tenant_id = ${tenantId}`;
      unionQueries.push(Prisma.sql`
        SELECT 
          CONCAT('trans-', t.id) as id,
          t.type::text as type,
          CASE t.type
            WHEN 'WITHDRAW_OUT' THEN '提现扣款'
            WHEN 'REFUND_DEDUCT' THEN '退款扣减'
            ELSE t.type::text
          END as type_name,
          t.amount as amount,
          t."balanceAfter" as balance_after,
          t.related_id,
          t.remark,
          t.create_time,
          m.nickname as user_name,
          m.mobile as user_phone,
          m.member_id as user_id,
          NULL as status
        FROM fin_transaction t
        INNER JOIN fin_wallet w ON t.wallet_id = w.id
        INNER JOIN ums_member m ON w.member_id = m.member_id
        WHERE ${transTenantFilter}
          AND t.type != 'COMMISSION_IN'
          ${query.memberId ? Prisma.sql`AND m.member_id = ${query.memberId}` : Prisma.empty}
          ${query.type ? Prisma.sql`AND t.type = ${query.type}` : Prisma.empty}
          ${startTime ? Prisma.sql`AND t.create_time >= ${startTime}` : Prisma.empty}
          ${endTime ? Prisma.sql`AND t.create_time <= ${endTime}` : Prisma.empty}
          ${query.relatedId ? Prisma.sql`AND t.related_id LIKE ${`%${query.relatedId}%`}` : Prisma.empty}
          ${query.keyword ? Prisma.sql`AND (m.nickname LIKE ${`%${query.keyword}%`} OR m.mobile LIKE ${`%${query.keyword}%`})` : Prisma.empty}
          ${query.minAmount !== undefined ? Prisma.sql`AND ABS(t.amount) >= ${query.minAmount}` : Prisma.empty}
          ${query.maxAmount !== undefined ? Prisma.sql`AND ABS(t.amount) <= ${query.maxAmount}` : Prisma.empty}
      `);
    }

    // 3. 提现支出
    if (!query.type || query.type === 'WITHDRAW_OUT') {
      const withdrawalTenantFilter =
        isSuper && query.memberId ? Prisma.sql`1=1` : Prisma.sql`w.tenant_id = ${tenantId}`;
      unionQueries.push(Prisma.sql`
        SELECT 
          CONCAT('withdraw-', w.id) as id,
          'WITHDRAW_OUT' as type,
          '提现支出' as type_name,
          -w.amount as amount,
          COALESCE(
            (
              SELECT t."balanceAfter"
              FROM fin_transaction t
              INNER JOIN fin_wallet fw ON t.wallet_id = fw.id
              WHERE fw.member_id = w.member_id
                AND t.related_id = w.id
                AND t.type = 'WITHDRAW_OUT'
              ORDER BY t.create_time DESC
              LIMIT 1
            ),
            0
          ) as balance_after,
          w.id as related_id,
          '余额提现' as remark,
          w.create_time,
          COALESCE(m.nickname, w."realName") as user_name,
          COALESCE(m.mobile, '') as user_phone,
          w.member_id as user_id,
          NULL as status
        FROM fin_withdrawal w
        LEFT JOIN ums_member m ON w.member_id = m.member_id
        WHERE ${withdrawalTenantFilter}
          AND w.status = 'APPROVED'
          ${query.memberId ? Prisma.sql`AND w.member_id = ${query.memberId}` : Prisma.empty}
          ${startTime ? Prisma.sql`AND w.create_time >= ${startTime}` : Prisma.empty}
          ${endTime ? Prisma.sql`AND w.create_time <= ${endTime}` : Prisma.empty}
          ${query.relatedId ? Prisma.sql`AND w.id LIKE ${`%${query.relatedId}%`}` : Prisma.empty}
          ${query.keyword ? Prisma.sql`AND (m.nickname LIKE ${`%${query.keyword}%`} OR m.mobile LIKE ${`%${query.keyword}%`} OR w."realName" LIKE ${`%${query.keyword}%`})` : Prisma.empty}
          ${query.minAmount ? Prisma.sql`AND w.amount >= ${query.minAmount}` : Prisma.empty}
          ${query.maxAmount ? Prisma.sql`AND w.amount <= ${query.maxAmount}` : Prisma.empty}
      `);
    }

    // 4. 佣金记录
    if (shouldIncludeCommissions) {
      const commissionTenantFilter =
        isSuper && query.memberId ? Prisma.sql`1=1` : Prisma.sql`c.tenant_id = ${tenantId}`;
      unionQueries.push(Prisma.sql`
        SELECT 
          CONCAT('commission-', c.id) as id,
          'COMMISSION_IN' as type,
          CASE c.status
            WHEN 'FROZEN' THEN '佣金待结算'
            ELSE '佣金已入账'
          END as type_name,
          c.amount as amount,
          CASE c.status
            WHEN 'FROZEN' THEN NULL
            ELSE COALESCE(
              (
                SELECT t."balanceAfter"
                FROM fin_transaction t
                INNER JOIN fin_wallet fw ON t.wallet_id = fw.id
                WHERE fw.member_id = c.beneficiary_id
                  AND t.related_id = c.order_id
                  AND t.type = 'COMMISSION_IN'
                ORDER BY t.create_time DESC
                LIMIT 1
              ),
              0
            )
          END as balance_after,
          COALESCE(o.order_sn, c.order_id) as related_id,
          CASE c.status
            WHEN 'FROZEN' THEN CONCAT('订单', COALESCE(o.order_sn, c.order_id), '佣金（待结算）')
            ELSE CONCAT('订单', COALESCE(o.order_sn, c.order_id), '佣金已入账')
          END as remark,
          c.create_time,
          m.nickname as user_name,
          m.mobile as user_phone,
          c.beneficiary_id as user_id,
          c.status::text as status
        FROM fin_commission c
        LEFT JOIN oms_order o ON c.order_id = o.id
        LEFT JOIN ums_member m ON c.beneficiary_id = m.member_id
        WHERE ${commissionTenantFilter}
          ${query.memberId ? Prisma.sql`AND c.beneficiary_id = ${query.memberId}` : Prisma.empty}
          ${startTime ? Prisma.sql`AND c.create_time >= ${startTime}` : Prisma.empty}
          ${endTime ? Prisma.sql`AND c.create_time <= ${endTime}` : Prisma.empty}
          ${query.relatedId ? Prisma.sql`AND (c.order_id LIKE ${`%${query.relatedId}%`} OR o.order_sn LIKE ${`%${query.relatedId}%`})` : Prisma.empty}
          ${query.keyword ? Prisma.sql`AND (m.nickname LIKE ${`%${query.keyword}%`} OR m.mobile LIKE ${`%${query.keyword}%`})` : Prisma.empty}
          ${query.minAmount ? Prisma.sql`AND c.amount >= ${query.minAmount}` : Prisma.empty}
          ${query.maxAmount ? Prisma.sql`AND c.amount <= ${query.maxAmount}` : Prisma.empty}
      `);
    }

    if (unionQueries.length === 0) {
      return Result.page([], 0);
    }

    const finalQuery = Prisma.sql`
      SELECT * FROM (
        ${Prisma.join(unionQueries, ' UNION ALL ')}
      ) AS unified_ledger
      ORDER BY create_time DESC
      LIMIT ${query.take} OFFSET ${query.skip}
    `;

    const result = await this.prisma.$queryRaw<
      Array<{
        id: string;
        type: string;
        type_name: string;
        amount: any;
        balance_after: any;
        related_id: string;
        remark: string;
        create_time: Date;
        user_name: string;
        user_phone: string;
        user_id: string | null;
        status: string | null;
      }>
    >(finalQuery);

    const countQuery = Prisma.sql`
      SELECT COUNT(*) as total FROM (
        ${Prisma.join(unionQueries, ' UNION ALL ')}
      ) AS unified_ledger
    `;
    const countResult = await this.prisma.$queryRaw<Array<{ total: bigint }>>(countQuery);
    const total = Number(countResult[0]?.total || 0);

    // 只为 ORDER_INCOME 类型收集订单ID，用于查询分销信息
    // 其他类型（佣金、提现、退款倒扣）不显示C1/C2列
    const orderIncomeIds = new Set<string>();

    result.forEach((r) => {
      // 只处理订单收入类型
      if (r.type === 'ORDER_INCOME' && r.id.startsWith('order-')) {
        const orderId = r.id.replace('order-', '');
        orderIncomeIds.add(orderId);
      }
    });

    // 查询订单收入对应的佣金信息（L1和L2）
    const orderCommissionsMap = new Map<
      string,
      Array<{ level: number; beneficiary: any; amount: any; status: string }>
    >();

    if (orderIncomeIds.size > 0) {
      const commissions = await this.prisma.finCommission.findMany({
        where: {
          orderId: { in: Array.from(orderIncomeIds) },
          status: { not: 'CANCELLED' }, // 排除已取消的佣金
        },
        include: {
          beneficiary: {
            select: {
              memberId: true,
              nickname: true,
              mobile: true,
            },
          },
        },
        orderBy: [{ level: 'asc' }],
      });

      // 按订单ID分组
      commissions.forEach((comm) => {
        if (!orderCommissionsMap.has(comm.orderId)) {
          orderCommissionsMap.set(comm.orderId, []);
        }
        orderCommissionsMap.get(comm.orderId)!.push({
          level: comm.level,
          beneficiary: comm.beneficiary,
          amount: comm.amount,
          status: comm.status,
        });
      });
    }

    // 构建返回列表
    const list = result.map((r) => {
      // 只为 ORDER_INCOME 类型添加分销信息
      let distribution: any = undefined;

      if (r.type === 'ORDER_INCOME' && r.id.startsWith('order-')) {
        const orderId = r.id.replace('order-', '');
        const commissions = orderCommissionsMap.get(orderId) || [];
        const l1Commission = commissions.find((c) => c.level === 1);
        const l2Commission = commissions.find((c) => c.level === 2);

        // 构建分销信息
        if (l1Commission || l2Commission) {
          distribution = {};
          if (l1Commission && l1Commission.beneficiary) {
            distribution.referrer = {
              nickname: l1Commission.beneficiary.nickname || '未知',
              mobile: l1Commission.beneficiary.mobile || '',
              amount: Number(l1Commission.amount),
              status: l1Commission.status,
            };
          }
          if (l2Commission && l2Commission.beneficiary) {
            distribution.indirectReferrer = {
              nickname: l2Commission.beneficiary.nickname || '未知',
              mobile: l2Commission.beneficiary.mobile || '',
              amount: Number(l2Commission.amount),
              status: l2Commission.status,
            };
          }
        }
      }

      return {
        id: r.id,
        type: r.type,
        typeName: r.type_name,
        amount: Number(r.amount),
        balanceAfter: r.balance_after !== null && r.balance_after !== undefined ? Number(r.balance_after) : null,
        relatedId: r.related_id,
        remark: r.remark,
        createTime: r.create_time,
        status: r.status,
        user: {
          nickname: r.user_name || '未知',
          mobile: r.user_phone || '',
        },
        ...(distribution ? { distribution } : {}),
      };
    });

    return Result.page(FormatDateFields(list), total);
  }

  /**
   * 获取流水统计数据
   */
  async getLedgerStats(query: ListLedgerDto) {
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();

    const dateRange = query.getDateRange('createTime');
    const startTime = dateRange?.createTime?.gte;
    const endTime = dateRange?.createTime?.lte;

    const shouldIncludeOrders = !query.memberId;
    const shouldIncludeCommissions = !query.type || query.type === 'COMMISSION_IN';

    const unionQueries: Prisma.Sql[] = [];

    // 1. 订单收入
    if (shouldIncludeOrders) {
      const orderTenantFilter = isSuper && query.memberId ? Prisma.sql`1=1` : Prisma.sql`o.tenant_id = ${tenantId}`;
      unionQueries.push(Prisma.sql`
        SELECT 
          'ORDER_INCOME' as type,
          o.pay_amount as amount
        FROM oms_order o
        WHERE ${orderTenantFilter}
          AND o.pay_status = '1'
          ${startTime ? Prisma.sql`AND o.create_time >= ${startTime}` : Prisma.empty}
          ${endTime ? Prisma.sql`AND o.create_time <= ${endTime}` : Prisma.empty}
      `);
    }

    // 2. 钱包流水
    if (!query.type || (query.type !== 'COMMISSION_IN' && query.type !== 'WITHDRAW_OUT')) {
      const transTenantFilter = isSuper && query.memberId ? Prisma.sql`1=1` : Prisma.sql`t.tenant_id = ${tenantId}`;
      unionQueries.push(Prisma.sql`
        SELECT 
          t.type::text as type,
          t.amount as amount
        FROM fin_transaction t
        INNER JOIN fin_wallet w ON t.wallet_id = w.id
        INNER JOIN ums_member m ON w.member_id = m.member_id
        WHERE ${transTenantFilter}
          AND t.type != 'COMMISSION_IN'
          ${query.memberId ? Prisma.sql`AND m.member_id = ${query.memberId}` : Prisma.empty}
          ${query.type ? Prisma.sql`AND t.type = ${query.type}` : Prisma.empty}
          ${startTime ? Prisma.sql`AND t.create_time >= ${startTime}` : Prisma.empty}
          ${endTime ? Prisma.sql`AND t.create_time <= ${endTime}` : Prisma.empty}
      `);
    }

    // 3. 提现支出
    if (!query.type || query.type === 'WITHDRAW_OUT') {
      const withdrawalTenantFilter =
        isSuper && query.memberId ? Prisma.sql`1=1` : Prisma.sql`w.tenant_id = ${tenantId}`;
      unionQueries.push(Prisma.sql`
        SELECT 
          'WITHDRAW_OUT' as type,
          -w.amount as amount
        FROM fin_withdrawal w
        WHERE ${withdrawalTenantFilter}
          AND w.status = 'APPROVED'
          ${query.memberId ? Prisma.sql`AND w.member_id = ${query.memberId}` : Prisma.empty}
          ${startTime ? Prisma.sql`AND w.create_time >= ${startTime}` : Prisma.empty}
          ${endTime ? Prisma.sql`AND w.create_time <= ${endTime}` : Prisma.empty}
      `);
    }

    // 4. 佣金记录
    if (shouldIncludeCommissions) {
      const commissionTenantFilter =
        isSuper && query.memberId ? Prisma.sql`1=1` : Prisma.sql`c.tenant_id = ${tenantId}`;
      unionQueries.push(Prisma.sql`
        SELECT 
          CASE c.status
            WHEN 'FROZEN' THEN 'COMMISSION_FROZEN'
            ELSE 'COMMISSION_IN'
          END as type,
          c.amount as amount
        FROM fin_commission c
        WHERE ${commissionTenantFilter}
          ${query.memberId ? Prisma.sql`AND c.beneficiary_id = ${query.memberId}` : Prisma.empty}
          ${startTime ? Prisma.sql`AND c.create_time >= ${startTime}` : Prisma.empty}
          ${endTime ? Prisma.sql`AND c.create_time <= ${endTime}` : Prisma.empty}
      `);
    }

    if (unionQueries.length === 0) {
      return Result.ok({
        totalIncome: 0,
        totalExpense: 0,
        netProfit: 0,
        pendingCommission: 0,
      });
    }

    const statsQuery = Prisma.sql`
      SELECT 
        type,
        SUM(amount) as total
      FROM (
        ${Prisma.join(unionQueries, ' UNION ALL ')}
      ) AS unified_ledger
      GROUP BY type
    `;

    const statsResult = await this.prisma.$queryRaw<Array<{ type: string; total: any }>>(statsQuery);

    let totalIncome = 0;
    let totalExpense = 0;
    let pendingCommission = 0;

    statsResult.forEach((stat) => {
      const amount = Number(stat.total);
      if (amount > 0) {
        totalIncome += amount;
      } else {
        totalExpense += Math.abs(amount);
      }

      // 待结算佣金
      if (stat.type === 'COMMISSION_FROZEN') {
        pendingCommission += amount;
      }
    });

    return Result.ok({
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpense: Number(totalExpense.toFixed(2)),
      netProfit: Number((totalIncome - totalExpense).toFixed(2)),
      pendingCommission: Number(pendingCommission.toFixed(2)),
    });
  }

  /**
   * 导出流水数据
   */
  async exportLedger(res: Response, query: ListLedgerDto) {
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();

    const dateRange = query.getDateRange('createTime');
    const startTime = dateRange?.createTime?.gte;
    const endTime = dateRange?.createTime?.lte;

    const shouldIncludeOrders = !query.memberId;
    const shouldIncludeCommissions = !query.type || query.type === 'COMMISSION_IN';

    const unionQueries: Prisma.Sql[] = [];

    // 1. 订单收入
    if (shouldIncludeOrders) {
      const orderTenantFilter = isSuper && query.memberId ? Prisma.sql`1=1` : Prisma.sql`o.tenant_id = ${tenantId}`;
      unionQueries.push(Prisma.sql`
        SELECT 
          CONCAT('order-', o.id) as id,
          'ORDER_INCOME' as type,
          '订单收入' as type_name,
          o.pay_amount as amount,
          NULL as balance_after,
          o.order_sn as related_id,
          CONCAT('订单支付: ', o.order_sn) as remark,
          o.create_time,
          o.receiver_name as user_name,
          o.receiver_phone as user_phone
        FROM oms_order o
        WHERE ${orderTenantFilter}
          AND o.pay_status = '1'
          ${startTime ? Prisma.sql`AND o.create_time >= ${startTime}` : Prisma.empty}
          ${endTime ? Prisma.sql`AND o.create_time <= ${endTime}` : Prisma.empty}
          ${query.relatedId ? Prisma.sql`AND o.order_sn LIKE ${`%${query.relatedId}%`}` : Prisma.empty}
          ${query.keyword ? Prisma.sql`AND (o.receiver_name LIKE ${`%${query.keyword}%`} OR o.receiver_phone LIKE ${`%${query.keyword}%`})` : Prisma.empty}
          ${query.minAmount ? Prisma.sql`AND o.pay_amount >= ${query.minAmount}` : Prisma.empty}
          ${query.maxAmount ? Prisma.sql`AND o.pay_amount <= ${query.maxAmount}` : Prisma.empty}
      `);
    }

    // 2. 钱包流水
    if (!query.type || (query.type !== 'COMMISSION_IN' && query.type !== 'WITHDRAW_OUT')) {
      const transTenantFilter = isSuper && query.memberId ? Prisma.sql`1=1` : Prisma.sql`t.tenant_id = ${tenantId}`;
      unionQueries.push(Prisma.sql`
        SELECT 
          CONCAT('trans-', t.id) as id,
          t.type::text as type,
          CASE t.type
            WHEN 'WITHDRAW_OUT' THEN '提现扣款'
            WHEN 'REFUND_DEDUCT' THEN '退款扣减'
            ELSE t.type::text
          END as type_name,
          t.amount as amount,
          t."balanceAfter" as balance_after,
          t.related_id,
          t.remark,
          t.create_time,
          m.nickname as user_name,
          m.mobile as user_phone
        FROM fin_transaction t
        INNER JOIN fin_wallet w ON t.wallet_id = w.id
        INNER JOIN ums_member m ON w.member_id = m.member_id
        WHERE ${transTenantFilter}
          AND t.type != 'COMMISSION_IN'
          ${query.memberId ? Prisma.sql`AND m.member_id = ${query.memberId}` : Prisma.empty}
          ${query.type ? Prisma.sql`AND t.type = ${query.type}` : Prisma.empty}
          ${startTime ? Prisma.sql`AND t.create_time >= ${startTime}` : Prisma.empty}
          ${endTime ? Prisma.sql`AND t.create_time <= ${endTime}` : Prisma.empty}
          ${query.relatedId ? Prisma.sql`AND t.related_id LIKE ${`%${query.relatedId}%`}` : Prisma.empty}
          ${query.keyword ? Prisma.sql`AND (m.nickname LIKE ${`%${query.keyword}%`} OR m.mobile LIKE ${`%${query.keyword}%`})` : Prisma.empty}
          ${query.minAmount !== undefined ? Prisma.sql`AND ABS(t.amount) >= ${query.minAmount}` : Prisma.empty}
          ${query.maxAmount !== undefined ? Prisma.sql`AND ABS(t.amount) <= ${query.maxAmount}` : Prisma.empty}
      `);
    }

    // 3. 提现支出
    if (!query.type || query.type === 'WITHDRAW_OUT') {
      const withdrawalTenantFilter =
        isSuper && query.memberId ? Prisma.sql`1=1` : Prisma.sql`w.tenant_id = ${tenantId}`;
      unionQueries.push(Prisma.sql`
        SELECT 
          CONCAT('withdraw-', w.id) as id,
          'WITHDRAW_OUT' as type,
          '提现支出' as type_name,
          -w.amount as amount,
          0 as balance_after,
          w.id as related_id,
          '余额提现' as remark,
          w.create_time,
          COALESCE(m.nickname, w."realName") as user_name,
          COALESCE(m.mobile, '') as user_phone
        FROM fin_withdrawal w
        LEFT JOIN ums_member m ON w.member_id = m.member_id
        WHERE ${withdrawalTenantFilter}
          AND w.status = 'APPROVED'
          ${query.memberId ? Prisma.sql`AND w.member_id = ${query.memberId}` : Prisma.empty}
          ${startTime ? Prisma.sql`AND w.create_time >= ${startTime}` : Prisma.empty}
          ${endTime ? Prisma.sql`AND w.create_time <= ${endTime}` : Prisma.empty}
          ${query.relatedId ? Prisma.sql`AND w.id LIKE ${`%${query.relatedId}%`}` : Prisma.empty}
          ${query.keyword ? Prisma.sql`AND (m.nickname LIKE ${`%${query.keyword}%`} OR m.mobile LIKE ${`%${query.keyword}%`} OR w."realName" LIKE ${`%${query.keyword}%`})` : Prisma.empty}
          ${query.minAmount ? Prisma.sql`AND w.amount >= ${query.minAmount}` : Prisma.empty}
          ${query.maxAmount ? Prisma.sql`AND w.amount <= ${query.maxAmount}` : Prisma.empty}
      `);
    }

    // 4. 佣金记录
    if (shouldIncludeCommissions) {
      const commissionTenantFilter =
        isSuper && query.memberId ? Prisma.sql`1=1` : Prisma.sql`c.tenant_id = ${tenantId}`;
      unionQueries.push(Prisma.sql`
        SELECT 
          CONCAT('commission-', c.id) as id,
          'COMMISSION_IN' as type,
          CASE c.status
            WHEN 'FROZEN' THEN '佣金待结算'
            ELSE '佣金已入账'
          END as type_name,
          c.amount as amount,
          0 as balance_after,
          COALESCE(o.order_sn, c.order_id) as related_id,
          CASE c.status
            WHEN 'FROZEN' THEN CONCAT('订单', COALESCE(o.order_sn, c.order_id), '佣金（待结算）')
            ELSE CONCAT('订单', COALESCE(o.order_sn, c.order_id), '佣金已入账')
          END as remark,
          c.create_time,
          m.nickname as user_name,
          m.mobile as user_phone
        FROM fin_commission c
        LEFT JOIN oms_order o ON c.order_id = o.id
        LEFT JOIN ums_member m ON c.beneficiary_id = m.member_id
        WHERE ${commissionTenantFilter}
          ${query.memberId ? Prisma.sql`AND c.beneficiary_id = ${query.memberId}` : Prisma.empty}
          ${startTime ? Prisma.sql`AND c.create_time >= ${startTime}` : Prisma.empty}
          ${endTime ? Prisma.sql`AND c.create_time <= ${endTime}` : Prisma.empty}
          ${query.relatedId ? Prisma.sql`AND (c.order_id LIKE ${`%${query.relatedId}%`} OR o.order_sn LIKE ${`%${query.relatedId}%`})` : Prisma.empty}
          ${query.keyword ? Prisma.sql`AND (m.nickname LIKE ${`%${query.keyword}%`} OR m.mobile LIKE ${`%${query.keyword}%`})` : Prisma.empty}
          ${query.minAmount ? Prisma.sql`AND c.amount >= ${query.minAmount}` : Prisma.empty}
          ${query.maxAmount ? Prisma.sql`AND c.amount <= ${query.maxAmount}` : Prisma.empty}
      `);
    }

    if (unionQueries.length === 0) {
      const options: ExportOptions = {
        sheetName: '门店流水',
        data: [],
        header: [
          { title: '交易类型', dataIndex: 'type_name' },
          { title: '交易金额', dataIndex: 'amount', width: 15 },
          { title: '交易后余额', dataIndex: 'balance_after', width: 15 },
          { title: '用户姓名', dataIndex: 'user_name', width: 15 },
          { title: '用户手机号', dataIndex: 'user_phone', width: 15 },
          { title: '订单号/交易ID', dataIndex: 'related_id', width: 25 },
          { title: '备注', dataIndex: 'remark', width: 30 },
          { title: '交易时间', dataIndex: 'create_time', width: 20 },
        ],
      };
      return await ExportTable(options, res);
    }

    const finalQuery = Prisma.sql`
      SELECT * FROM (
        ${Prisma.join(unionQueries, ' UNION ALL ')}
      ) AS unified_ledger
      ORDER BY create_time DESC
    `;

    const result = await this.prisma.$queryRaw<
      Array<{
        id: string;
        type: string;
        type_name: string;
        amount: any;
        balance_after: any;
        related_id: string;
        remark: string;
        create_time: Date;
        user_name: string;
        user_phone: string;
      }>
    >(finalQuery);

    const list = result.map((r) => ({
      type_name: r.type_name,
      amount: Number(r.amount),
      balance_after: r.balance_after !== null && r.balance_after !== undefined ? Number(r.balance_after) : '',
      user_name: r.user_name || '未知',
      user_phone: r.user_phone || '',
      related_id: r.related_id,
      remark: r.remark,
      create_time: r.create_time,
    }));

    const options = {
      sheetName: '门店流水',
      data: FormatDateFields(list),
      header: [
        { title: '交易类型', dataIndex: 'type_name' },
        { title: '交易金额', dataIndex: 'amount', width: 15 },
        { title: '交易后余额', dataIndex: 'balance_after', width: 15 },
        { title: '用户姓名', dataIndex: 'user_name', width: 15 },
        { title: '用户手机号', dataIndex: 'user_phone', width: 15 },
        { title: '订单号/交易ID', dataIndex: 'related_id', width: 25 },
        { title: '备注', dataIndex: 'remark', width: 30 },
        { title: '交易时间', dataIndex: 'create_time', width: 20 },
      ],
    };

    return await ExportTable(options, res);
  }
}
