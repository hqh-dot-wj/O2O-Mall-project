import { PlayInstanceStatus } from '@prisma/client';

/**
 * 营销实例状态机配置
 *
 * @description
 * 定义所有合法的状态跃迁路径，防止非法状态流转导致的业务混乱。
 * 这是营销引擎的核心约束机制，确保实例生命周期的严格管理。
 *
 * @example
 * // 合法跃迁
 * PENDING_PAY -> PAID ✅
 * PAID -> SUCCESS ✅
 *
 * // 非法跃迁
 * PENDING_PAY -> SUCCESS ❌ (必须先支付)
 * SUCCESS -> ACTIVE ❌ (成功是终态)
 */
export const PLAY_INSTANCE_STATE_MACHINE: Record<
  PlayInstanceStatus,
  {
    allowedNext: PlayInstanceStatus[]; // 允许跃迁到的状态列表
    description: string; // 当前状态的业务含义
    isFinal: boolean; // 是否为终态（终态不允许再跃迁）
  }
> = {
  /**
   * 待支付状态
   * - 用户刚创建实例，尚未完成支付
   * - 可能的结果：支付成功 / 超时关闭
   */
  [PlayInstanceStatus.PENDING_PAY]: {
    allowedNext: [
      PlayInstanceStatus.PAID, // 支付成功
      PlayInstanceStatus.TIMEOUT, // 超时未支付
      PlayInstanceStatus.FAILED, // 创建失败（如库存不足）
    ],
    description: '待支付：用户已创建实例，等待支付完成',
    isFinal: false,
  },

  /**
   * 已支付状态
   * - 支付成功，但活动尚未达成条件（如拼团未满员）
   * - 可能的结果：活动成功 / 活动失败 / 用户退款
   */
  [PlayInstanceStatus.PAID]: {
    allowedNext: [
      PlayInstanceStatus.ACTIVE, // 进入活动中（如拼团进行中）
      PlayInstanceStatus.SUCCESS, // 直接成功（如秒杀）
      PlayInstanceStatus.REFUNDED, // 用户申请退款
    ],
    description: '已支付：等待活动条件达成',
    isFinal: false,
  },

  /**
   * 活动进行中
   * - 活动正在进行，等待最终结果（如拼团进行中）
   * - 可能的结果：活动成功 / 活动失败 / 超时失败 / 用户退款
   */
  [PlayInstanceStatus.ACTIVE]: {
    allowedNext: [
      PlayInstanceStatus.SUCCESS, // 活动成功（如拼团满员）
      PlayInstanceStatus.FAILED, // 活动失败（如拼团人数不足）
      PlayInstanceStatus.TIMEOUT, // 活动超时
      PlayInstanceStatus.REFUNDED, // 用户申请退款
    ],
    description: '活动中：等待活动最终结果',
    isFinal: false,
  },

  /**
   * 活动成功（终态）
   * - 活动条件已达成，权益已发放
   * - 理论上不应再跃迁，但保留退款通道用于售后
   */
  [PlayInstanceStatus.SUCCESS]: {
    allowedNext: [
      PlayInstanceStatus.REFUNDED, // 售后退款（特殊情况）
    ],
    description: '活动成功：权益已发放，资金已结算',
    isFinal: true, // 标记为终态，但允许退款
  },

  /**
   * 超时关闭（终态）
   * - 用户未在规定时间内完成操作
   * - 不允许任何跃迁
   */
  [PlayInstanceStatus.TIMEOUT]: {
    allowedNext: [],
    description: '超时关闭：用户未在规定时间内完成操作',
    isFinal: true,
  },

  /**
   * 活动失败（终态）
   * - 活动条件未达成（如拼团人数不足）
   * - 允许退款
   */
  [PlayInstanceStatus.FAILED]: {
    allowedNext: [
      PlayInstanceStatus.REFUNDED, // 失败后退款
    ],
    description: '活动失败：活动条件未达成',
    isFinal: true, // 标记为终态，但允许退款
  },

  /**
   * 已退款（终态）
   * - 资金已退还给用户
   * - 不允许任何跃迁
   */
  [PlayInstanceStatus.REFUNDED]: {
    allowedNext: [],
    description: '已退款：资金已退还给用户',
    isFinal: true,
  },
};

/**
 * 状态机辅助函数：检查状态跃迁是否合法
 *
 * @param currentStatus 当前状态
 * @param nextStatus 目标状态
 * @returns 是否允许跃迁
 *
 * @example
 * isValidTransition(PlayInstanceStatus.PENDING_PAY, PlayInstanceStatus.PAID) // true
 * isValidTransition(PlayInstanceStatus.PENDING_PAY, PlayInstanceStatus.SUCCESS) // false
 */
export function isValidTransition(
  currentStatus: PlayInstanceStatus,
  nextStatus: PlayInstanceStatus,
): boolean {
  const config = PLAY_INSTANCE_STATE_MACHINE[currentStatus];
  if (!config) {
    return false; // 未知状态，拒绝跃迁
  }

  return config.allowedNext.includes(nextStatus);
}

/**
 * 状态机辅助函数：获取状态的业务描述
 *
 * @param status 状态
 * @returns 业务描述
 */
export function getStatusDescription(status: PlayInstanceStatus): string {
  return PLAY_INSTANCE_STATE_MACHINE[status]?.description || '未知状态';
}

/**
 * 状态机辅助函数：检查是否为终态
 *
 * @param status 状态
 * @returns 是否为终态
 */
export function isFinalStatus(status: PlayInstanceStatus): boolean {
  return PLAY_INSTANCE_STATE_MACHINE[status]?.isFinal || false;
}

/**
 * 状态机辅助函数：获取所有允许的下一状态
 *
 * @param currentStatus 当前状态
 * @returns 允许跃迁到的状态列表
 */
export function getAllowedNextStatuses(currentStatus: PlayInstanceStatus): PlayInstanceStatus[] {
  return PLAY_INSTANCE_STATE_MACHINE[currentStatus]?.allowedNext || [];
}

/**
 * 状态机可视化：生成 Mermaid 状态图
 *
 * @description
 * 用于文档和调试，可以在 Markdown 中渲染状态机流程图
 *
 * @returns Mermaid 格式的状态图代码
 */
export function generateStateMachineDiagram(): string {
  let diagram = 'stateDiagram-v2\n';
  diagram += '  [*] --> PENDING_PAY: 创建实例\n\n';

  for (const [status, config] of Object.entries(PLAY_INSTANCE_STATE_MACHINE)) {
    if (config.allowedNext.length === 0) {
      diagram += `  ${status} --> [*]: 终态\n`;
    } else {
      for (const nextStatus of config.allowedNext) {
        diagram += `  ${status} --> ${nextStatus}\n`;
      }
    }
  }

  return diagram;
}
