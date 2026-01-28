import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Result } from 'src/common/response';
import { FormatDateFields } from 'src/common/utils';
import { Prisma, TransType } from '@prisma/client';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { ListLedgerDto } from './dto/store-finance.dto';

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
      const orderTenantFilter = isSuper && query.memberId ? Prisma.empty : Prisma.sql`o.tenant_id = ${tenantId}`;
      unionQueries.push(Prisma.sql`
        SELECT 
          CONCAT('order-', o.id) as id,
          'ORDER_INCOME' as type,
          '订单收入' as type_name,
          o.pay_amount as amount,
          0 as balance_after,
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
      `);
    }

    // 2. 钱包流水
    if (!query.type || (query.type !== 'COMMISSION_IN' && query.type !== 'WITHDRAW_OUT')) {
      const transTenantFilter = isSuper && query.memberId ? Prisma.empty : Prisma.sql`t.tenant_id = ${tenantId}`;
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
      `);
    }

    // 3. 提现支出
    if (!query.type || query.type === 'WITHDRAW_OUT') {
      const withdrawalTenantFilter = isSuper && query.memberId ? Prisma.empty : Prisma.sql`w.tenant_id = ${tenantId}`;
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
      `);
    }

    // 4. 佣金记录
    if (shouldIncludeCommissions) {
      const commissionTenantFilter = isSuper && query.memberId ? Prisma.empty : Prisma.sql`c.tenant_id = ${tenantId}`;
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

    const list = result.map((r) => ({
      id: r.id,
      type: r.type,
      typeName: r.type_name,
      amount: Number(r.amount),
      balanceAfter: Number(r.balance_after),
      relatedId: r.related_id,
      remark: r.remark,
      createTime: r.create_time,
      status: r.status,
      user: {
        nickname: r.user_name || '未知',
        mobile: r.user_phone || '',
      },
    }));

    return Result.page(FormatDateFields(list), total);
  }
}
