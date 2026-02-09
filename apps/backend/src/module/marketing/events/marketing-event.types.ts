/**
 * 营销事件类型定义
 *
 * @description
 * 定义营销系统中所有的事件类型和事件数据结构。
 * 事件驱动机制用于解耦模块依赖，提升系统可扩展性。
 *
 * @example
 * // 发送实例成功事件
 * await eventEmitter.emit({
 *   type: MarketingEventType.INSTANCE_SUCCESS,
 *   instanceId: 'xxx',
 *   configId: 'yyy',
 *   memberId: 'zzz',
 *   payload: { ... },
 *   timestamp: new Date(),
 * });
 */

/**
 * 营销事件类型枚举
 *
 * @description
 * 包含两大类事件：
 * 1. 实例事件：与营销实例生命周期相关的事件
 * 2. 玩法事件：与特定玩法业务逻辑相关的事件
 */
export enum MarketingEventType {
  // ========== 实例事件 ==========

  /**
   * 实例创建事件
   * - 触发时机：用户参与活动，创建实例成功后
   * - 用途：记录用户参与行为、触发数据分析
   */
  INSTANCE_CREATED = 'instance.created',

  /**
   * 实例支付成功事件
   * - 触发时机：用户完成支付，实例状态从 PENDING_PAY 变为 PAID
   * - 用途：触发后续业务逻辑（如拼团检查、权益发放准备）
   */
  INSTANCE_PAID = 'instance.paid',

  /**
   * 实例成功事件
   * - 触发时机：活动条件达成，实例状态变为 SUCCESS
   * - 用途：发放权益、结算资金、发送通知、记录成功数据
   */
  INSTANCE_SUCCESS = 'instance.success',

  /**
   * 实例失败事件
   * - 触发时机：活动条件未达成，实例状态变为 FAILED
   * - 用途：触发退款流程、发送失败通知、记录失败原因
   */
  INSTANCE_FAILED = 'instance.failed',

  /**
   * 实例超时事件
   * - 触发时机：实例超过有效期，状态变为 TIMEOUT
   * - 用途：释放库存、触发退款、发送超时通知
   */
  INSTANCE_TIMEOUT = 'instance.timeout',

  /**
   * 实例退款事件
   * - 触发时机：用户申请退款或系统自动退款，状态变为 REFUNDED
   * - 用途：处理退款逻辑、发送退款通知、更新财务数据
   */
  INSTANCE_REFUNDED = 'instance.refunded',

  // ========== 玩法事件 ==========

  /**
   * 拼团满员事件
   * - 触发时机：拼团人数达到要求
   * - 用途：触发拼团成功逻辑、通知所有参团用户
   */
  GROUP_FULL = 'group.full',

  /**
   * 拼团失败事件
   * - 触发时机：拼团超时未满员
   * - 用途：触发退款流程、通知所有参团用户
   */
  GROUP_FAILED = 'group.failed',

  /**
   * 秒杀售罄事件
   * - 触发时机：秒杀商品库存为0
   * - 用途：关闭秒杀活动、更新前端展示
   */
  FLASH_SALE_SOLD_OUT = 'flash_sale.sold_out',

  /**
   * 课程开班事件
   * - 触发时机：拼班课程人数达到开班要求
   * - 用途：通知所有学员、安排课程、发放学习资料
   */
  COURSE_OPEN = 'course.open',
}

/**
 * 营销事件数据结构
 *
 * @description
 * 所有营销事件都遵循此数据结构，确保事件数据的完整性和一致性。
 */
export interface MarketingEvent {
  /**
   * 事件类型
   * @see MarketingEventType
   */
  type: MarketingEventType;

  /**
   * 实例ID
   * - 关联的营销实例ID
   * - 用于追踪事件来源
   */
  instanceId: string;

  /**
   * 配置ID
   * - 关联的活动配置ID
   * - 用于查询活动规则和设置
   */
  configId: string;

  /**
   * 用户ID
   * - 触发事件的用户ID
   * - 用于用户行为分析和通知
   */
  memberId: string;

  /**
   * 事件负载数据
   * - 包含事件相关的业务数据
   * - 不同事件类型的 payload 结构可能不同
   *
   * @example
   * // 拼团满员事件
   * {
   *   groupId: 'xxx',
   *   participants: ['user1', 'user2', 'user3'],
   *   totalAmount: 597
   * }
   *
   * // 实例成功事件
   * {
   *   orderSn: 'xxx',
   *   amount: 199,
   *   assetType: 'COURSE',
   *   assetId: 'yyy'
   * }
   */
  payload: any;

  /**
   * 事件时间戳
   * - 事件发生的时间
   * - 用于事件排序和时间分析
   */
  timestamp: Date;
}

/**
 * 事件监听器选项
 *
 * @description
 * 用于配置事件监听器的行为
 */
export interface EventListenerOptions {
  /**
   * 是否异步处理
   * - true: 异步处理，不阻塞事件发送
   * - false: 同步处理，等待处理完成
   */
  async?: boolean;

  /**
   * 重试次数
   * - 监听器处理失败时的重试次数
   * - 默认不重试
   */
  retries?: number;

  /**
   * 超时时间（毫秒）
   * - 监听器处理的最大时间
   * - 超时后视为失败
   */
  timeout?: number;
}

