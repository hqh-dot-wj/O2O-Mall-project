/**
 * Finance API 类型
 * 请求参数来自 OpenAPI operations，响应类型优先使用 components schemas
 */
import type { components, operations } from './api';

// ─── 请求参数（来自 operations）────────

export type CommissionSearchParams =
  NonNullable<operations['StoreFinanceController_getCommissionList']['parameters']['query']>;

export type WithdrawalSearchParams =
  NonNullable<operations['StoreFinanceController_getWithdrawalList']['parameters']['query']>;

export type LedgerSearchParams =
  NonNullable<operations['StoreFinanceController_getLedger']['parameters']['query']>;

// ─── 响应类型（优先 schema，缺失时与后端 VO 对齐）────────

/** 佣金状态 */
export type CommissionStatus = 'FROZEN' | 'SETTLED' | 'CANCELLED';

/** 提现状态 */
export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED';

/** 交易类型 */
export type TransType =
  | 'COMMISSION_IN'
  | 'WITHDRAW_OUT'
  | 'REFUND_DEDUCT'
  | 'CONSUME_PAY'
  | 'RECHARGE_IN'
  | 'ORDER_INCOME';

/** 资金看板 - Store 端 dashboard */
export interface FinanceDashboardVo {
  todayGMV: number;
  todayOrderCount: number;
  monthGMV: number;
  pendingCommission: number;
  settledCommission: number;
  pendingWithdrawals: number;
}

/** 佣金记录 - 待后端 @Api(type: CommissionRecordVo) 后切换至 schema */
export interface CommissionRecordVo {
  id: string;
  orderId: string;
  order?: { orderSn: string; payAmount?: number };
  beneficiaryId: string;
  beneficiary?: { nickname: string; avatar?: string; mobile?: string };
  level: 1 | 2;
  amount: number;
  rateSnapshot: number;
  status: CommissionStatus;
  planSettleTime: string;
  actualSettleTime?: string;
  createTime: string;
  commissionBaseType?: 'ORIGINAL_PRICE' | 'ACTUAL_PAID' | 'ZERO';
  couponDiscount?: number;
  pointsDiscount?: number;
  isCapped?: boolean;
}

/** 提现记录 - 使用 OpenAPI WithdrawalVo 并扩展可选字段 */
export type WithdrawalRecordVo = components['schemas']['WithdrawalVo'] & {
  member?: { nickname: string; mobile?: string; avatar?: string };
  accountInfo?: string;
  paymentTime?: string;
};

/** 佣金统计 - Store 端 getCommissionStats 返回（今日/本月/待结算） */
export interface StoreCommissionStatsVo {
  todayCommission: number;
  monthCommission: number;
  pendingCommission: number;
}

/** 流水记录 - 与后端 StoreLedgerRecordVo 对齐 */
export interface LedgerRecordVo {
  id: string;
  type: string;
  typeName: string;
  amount: number;
  balanceAfter?: number | null;
  relatedId?: string;
  remark?: string;
  createTime: string;
  status?: string | null;
  user?: { nickname: string; mobile: string };
  distribution?: {
    referrer?: { nickname: string; mobile: string; amount: number; status?: string };
    indirectReferrer?: { nickname: string; mobile: string; amount: number; status?: string };
  };
}

/** 流水统计 */
export interface LedgerStatsVo {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  pendingCommission: number;
}
