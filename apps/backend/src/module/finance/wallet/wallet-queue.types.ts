/**
 * 钱包队列任务类型定义
 *
 * @description
 * A-T4: 引入消息队列解耦钱包服务
 * 定义钱包异步操作的任务类型和数据结构
 */

import { Decimal } from '@prisma/client/runtime/library';
import { TransType } from '@prisma/client';

/**
 * 钱包队列任务类型
 */
export enum WalletJobType {
  /** 增加余额 */
  INCREASE_BALANCE = 'INCREASE_BALANCE',
  /** 扣减余额 */
  DECREASE_BALANCE = 'DECREASE_BALANCE',
  /** 冻结余额 */
  FREEZE_BALANCE = 'FREEZE_BALANCE',
  /** 解冻余额 */
  UNFREEZE_BALANCE = 'UNFREEZE_BALANCE',
  /** 批量结算 */
  BATCH_SETTLE = 'BATCH_SETTLE',
}

/**
 * 钱包任务基础数据
 */
export interface WalletJobBase {
  /** 任务类型 */
  type: WalletJobType;
  /** 会员ID */
  memberId: string;
  /** 租户ID */
  tenantId: string;
  /** 幂等键（防重复处理） */
  idempotencyKey: string;
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 余额变动任务数据
 */
export interface BalanceChangeJobData extends WalletJobBase {
  type: WalletJobType.INCREASE_BALANCE | WalletJobType.DECREASE_BALANCE;
  /** 变动金额（字符串，避免序列化问题） */
  amount: string;
  /** 交易类型 */
  transType: TransType;
  /** 关联业务ID */
  relatedId: string;
  /** 备注 */
  remark: string;
}

/**
 * 冻结/解冻任务数据
 */
export interface FreezeJobData extends WalletJobBase {
  type: WalletJobType.FREEZE_BALANCE | WalletJobType.UNFREEZE_BALANCE;
  /** 冻结/解冻金额 */
  amount: string;
  /** 关联业务ID */
  relatedId: string;
}

/**
 * 批量结算任务数据
 */
export interface BatchSettleJobData extends WalletJobBase {
  type: WalletJobType.BATCH_SETTLE;
  /** 结算项列表 */
  items: Array<{
    memberId: string;
    amount: string;
    commissionId: string;
  }>;
}

/**
 * 钱包任务数据联合类型
 */
export type WalletJobData = BalanceChangeJobData | FreezeJobData | BatchSettleJobData;

/**
 * 钱包任务结果
 */
export interface WalletJobResult {
  success: boolean;
  memberId: string;
  balanceAfter?: string;
  error?: string;
}
