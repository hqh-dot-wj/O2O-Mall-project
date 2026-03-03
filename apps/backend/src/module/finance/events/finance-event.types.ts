/**
 * Finance 事件类型定义
 *
 * @description
 * 定义财务系统中所有的事件类型和事件数据结构。
 * 事件驱动机制用于解耦模块依赖，提升系统可扩展性。
 */

import { Prisma } from '@prisma/client';

/**
 * 财务事件类型枚举
 */
export enum FinanceEventType {
  // ========== 钱包事件 ==========

  /**
   * 余额增加事件
   * - 触发时机：佣金结算、退款返还等导致余额增加
   * - 用途：通知用户、数据统计、触发后续业务
   */
  WALLET_BALANCE_INCREASED = 'wallet.balance.increased',

  /**
   * 余额扣减事件
   * - 触发时机：提现、佣金回滚等导致余额减少
   * - 用途：风控监控、异常检测
   */
  WALLET_BALANCE_DECREASED = 'wallet.balance.decreased',

  /**
   * 余额冻结事件
   * - 触发时机：申请提现时冻结余额
   * - 用途：资金流转追踪
   */
  WALLET_BALANCE_FROZEN = 'wallet.balance.frozen',

  /**
   * 余额解冻事件
   * - 触发时机：提现驳回时解冻余额
   * - 用途：资金流转追踪
   */
  WALLET_BALANCE_UNFROZEN = 'wallet.balance.unfrozen',

  /**
   * 待回收余额增加事件
   * - 触发时机：佣金回滚时余额不足，记入待回收
   * - 用途：财务对账、催收提醒
   */
  WALLET_PENDING_RECOVERY_INCREASED = 'wallet.pending_recovery.increased',

  // ========== 佣金事件 ==========

  /**
   * 佣金创建事件
   * - 触发时机：订单支付后计算佣金
   * - 用途：佣金统计、通知受益人
   */
  COMMISSION_CREATED = 'commission.created',

  /**
   * 佣金结算事件
   * - 触发时机：佣金从冻结变为已结算
   * - 用途：通知用户、财务统计
   */
  COMMISSION_SETTLED = 'commission.settled',

  /**
   * 佣金取消事件
   * - 触发时机：订单退款导致佣金取消
   * - 用途：佣金回滚追踪
   */
  COMMISSION_CANCELLED = 'commission.cancelled',

  // ========== 提现事件 ==========

  /**
   * 提现申请事件
   * - 触发时机：用户提交提现申请
   * - 用途：通知审核人员
   */
  WITHDRAWAL_APPLIED = 'withdrawal.applied',

  /**
   * 提现通过事件
   * - 触发时机：审核通过并打款成功
   * - 用途：通知用户
   */
  WITHDRAWAL_APPROVED = 'withdrawal.approved',

  /**
   * 提现驳回事件
   * - 触发时机：审核驳回
   * - 用途：通知用户
   */
  WITHDRAWAL_REJECTED = 'withdrawal.rejected',

  /**
   * 提现失败事件
   * - 触发时机：打款失败
   * - 用途：通知用户、触发重试
   */
  WITHDRAWAL_FAILED = 'withdrawal.failed',

  // ========== 结算事件 ==========

  /**
   * 结算批次完成事件
   * - 触发时机：一批佣金结算完成
   * - 用途：统计、监控
   */
  SETTLEMENT_BATCH_COMPLETED = 'settlement.batch.completed',
}

/**
 * 财务事件基础数据结构
 */
export interface FinanceEvent {
  /** 事件类型 */
  type: FinanceEventType;
  /** 租户ID */
  tenantId: string;
  /** 会员ID */
  memberId: string;
  /** 事件负载数据 */
  payload: Record<string, unknown>;
  /** 事件时间戳 */
  timestamp: Date;
}

/**
 * 钱包余额变动事件负载
 */
export interface WalletBalanceChangePayload {
  /** 钱包ID */
  walletId: string;
  /** 变动金额 */
  amount: Prisma.Decimal;
  /** 变动后余额 */
  balanceAfter: Prisma.Decimal;
  /** 关联业务ID */
  relatedId: string;
  /** 变动类型 */
  transType: string;
  /** 备注 */
  remark: string;
}

/**
 * 待回收余额变动事件负载
 */
export interface PendingRecoveryPayload {
  /** 钱包ID */
  walletId: string;
  /** 待回收金额 */
  amount: Prisma.Decimal;
  /** 待回收后总额 */
  pendingRecoveryAfter: Prisma.Decimal;
  /** 关联业务ID */
  relatedId: string;
  /** 原因 */
  reason: string;
}

/**
 * 佣金事件负载
 */
export interface CommissionEventPayload {
  /** 佣金ID */
  commissionId: string | bigint;
  /** 订单ID */
  orderId: string;
  /** 佣金金额 */
  amount: Prisma.Decimal;
  /** 佣金层级 */
  level: number;
}

/**
 * 提现事件负载
 */
export interface WithdrawalEventPayload {
  /** 提现ID */
  withdrawalId: string;
  /** 提现金额 */
  amount: Prisma.Decimal;
  /** 提现方式 */
  method: string;
  /** 审核人 */
  auditBy?: string;
  /** 审核备注 */
  auditRemark?: string;
  /** 失败原因 */
  failReason?: string;
}

/**
 * 结算批次事件负载
 */
export interface SettlementBatchPayload {
  /** 结算数量 */
  settledCount: number;
  /** 结算总金额 */
  totalAmount: Prisma.Decimal;
  /** 失败数量 */
  failedCount: number;
}
