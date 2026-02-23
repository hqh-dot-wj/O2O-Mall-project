/**
 * Finance 模块相关类型定义
 * 用于替代 Finance 模块中的 any 类型
 */

import { Prisma } from '@prisma/client';

/**
 * 佣金查询结果
 * 用于 $queryRaw 查询佣金数据
 * 
 * @example
 * ```typescript
 * const commissions = await prisma.$queryRaw<CommissionQueryResult[]>`
 *   SELECT order_id as "orderId", amount, status::text as status
 *   FROM fin_commission
 *   WHERE order_id = ${orderId}
 * `;
 * ```
 */
export interface CommissionQueryResult {
  /** 订单ID */
  orderId: string;
  /** 佣金金额 */
  amount: Prisma.Decimal;
  /** 佣金状态 */
  status: string;
  /** 租户ID（可选） */
  tenantId?: string;
}

/**
 * 佣金汇总查询结果
 * 用于 GROUP BY 聚合查询
 * 
 * @example
 * ```typescript
 * const sums = await prisma.$queryRaw<CommissionSumResult[]>`
 *   SELECT order_id as "orderId", SUM(amount) as total
 *   FROM fin_commission
 *   WHERE order_id IN (${Prisma.join(orderIds)})
 *   GROUP BY order_id
 * `;
 * ```
 */
export interface CommissionSumResult {
  /** 订单ID */
  orderId: string;
  /** 佣金总额（可能为 null） */
  total: string | null;
}

/**
 * 流水查询结果
 * 用于统一流水查询
 */
export interface LedgerQueryResult {
  /** 流水ID */
  id: string;
  /** 流水类型 */
  type: string;
  /** 流水类型名称 */
  type_name: string;
  /** 金额 */
  amount: Prisma.Decimal;
  /** 变动后余额 */
  balance_after: Prisma.Decimal;
  /** 关联ID */
  related_id: string;
  /** 备注 */
  remark: string;
  /** 创建时间 */
  create_time: Date;
  /** 用户名称 */
  user_name: string;
  /** 用户手机号 */
  user_phone: string;
  /** 用户ID */
  user_id: string | null;
  /** 状态 */
  status: string | null;
}

/**
 * 流水统计结果
 * 用于流水类型统计
 * 
 * @example
 * ```typescript
 * const stats = await prisma.$queryRaw<LedgerStatsResult[]>`
 *   SELECT type, SUM(amount) as total
 *   FROM ledger
 *   GROUP BY type
 * `;
 * ```
 */
export interface LedgerStatsResult {
  /** 流水类型 */
  type: string;
  /** 总额 */
  total: Prisma.Decimal;
}

/**
 * 佣金分销信息
 * 用于订单佣金详情
 */
export interface CommissionDistribution {
  /** 分销层级 */
  level: number;
  /** 受益人信息 */
  beneficiary: {
    /** 会员ID */
    memberId: string;
    /** 用户名称 */
    nickname: string;
    /** 手机号 */
    mobile?: string;
  };
  /** 佣金金额 */
  amount: Prisma.Decimal;
  /** 佣金状态 */
  status: string;
}

/**
 * 订单佣金映射
 * key: 订单ID
 * value: 佣金分销列表
 */
export type OrderCommissionsMap = Map<string, CommissionDistribution[]>;

/**
 * 计数查询结果
 * 用于 COUNT 查询
 */
export interface CountResult {
  /** 总数 */
  total: bigint;
}

/**
 * 订单列表项类型
 * 用于订单列表查询结果
 */
export interface OrderListItem {
  /** 订单ID */
  id: string;
  /** 订单号 */
  orderSn: string;
  /** 支付金额 */
  payAmount: Prisma.Decimal | string;
  /** 其他订单字段 */
  [key: string]: unknown;
}

/**
 * 类型守卫：检查是否为有效的 CommissionQueryResult
 */
export function isCommissionQueryResult(value: unknown): value is CommissionQueryResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.orderId === 'string' &&
    (obj.amount instanceof Prisma.Decimal || typeof obj.amount === 'string' || typeof obj.amount === 'number') &&
    typeof obj.status === 'string'
  );
}

/**
 * 类型守卫：检查是否为有效的 LedgerQueryResult
 */
export function isLedgerQueryResult(value: unknown): value is LedgerQueryResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    (obj.amount instanceof Prisma.Decimal || typeof obj.amount === 'string' || typeof obj.amount === 'number')
  );
}

/**
 * 会员信息（用于佣金计算）
 */
export interface MemberForCommission {
  /** 会员ID */
  memberId: string;
  /** 直接上级ID */
  parentId: string | null;
  /** 间接上级ID */
  indirectParentId: string | null;
  /** 会员等级ID */
  levelId: number;
}

/**
 * 分销配置
 */
export interface DistributionConfig {
  /** L1 佣金比例 */
  level1Rate: Prisma.Decimal;
  /** L2 佣金比例 */
  level2Rate: Prisma.Decimal;
  /** 是否启用 L0 */
  enableLV0: boolean;
  /** 是否启用跨店 */
  enableCrossTenant: boolean;
  /** 跨店佣金比例 */
  crossTenantRate: Prisma.Decimal;
  /** 跨店日限额 */
  crossMaxDaily: Prisma.Decimal;
  /** 佣金基数类型 */
  commissionBaseType: string;
  /** 最大佣金比例 */
  maxCommissionRate: Prisma.Decimal;
}

/**
 * 佣金记录（用于批量创建）
 */
export interface CommissionRecord {
  /** 订单ID */
  orderId: string;
  /** 租户ID */
  tenantId: string;
  /** 受益人ID */
  beneficiaryId: string;
  /** 佣金层级 */
  level: number;
  /** 佣金金额 */
  amount: Prisma.Decimal;
  /** 费率快照 */
  rateSnapshot: Prisma.Decimal;
  /** 佣金状态 */
  status: string;
  /** 计划结算时间 */
  planSettleTime: Date;
  /** 是否跨店 */
  isCrossTenant: boolean;
  /** 是否被限额 */
  isCapped?: boolean;
  /** 佣金基数 */
  commissionBase?: Prisma.Decimal;
  /** 佣金基数类型 */
  commissionBaseType?: string;
  /** 订单原价 */
  orderOriginalPrice?: Prisma.Decimal;
  /** 订单实付 */
  orderActualPaid?: Prisma.Decimal;
  /** 优惠券折扣 */
  couponDiscount?: Prisma.Decimal;
  /** 积分折扣 */
  pointsDiscount?: Prisma.Decimal;
}

/**
 * 提现记录（包含会员信息）
 */
export interface WithdrawalWithMember {
  /** 提现ID */
  id: string;
  /** 会员信息 */
  member?: {
    /** 会员ID */
    memberId: string;
    /** 昵称 */
    nickname: string;
    /** 手机号 */
    mobile?: string;
    /** 头像 */
    avatar?: string;
  };
  /** 其他提现字段 */
  [key: string]: unknown;
}

/**
 * 提现列表项（扁平化后）
 */
export interface WithdrawalListItem {
  /** 提现ID */
  id: string;
  /** 会员名称 */
  memberName?: string;
  /** 会员手机号 */
  memberMobile?: string;
  /** 会员头像 */
  memberAvatar?: string;
  /** 其他提现字段 */
  [key: string]: unknown;
}
