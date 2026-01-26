import { PlayInstance, StorePlayConfig } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * 营销玩法策略标准接口 (IMarketingStrategy)
 *
 * @description
 * 采用策略模式 (Strategy Pattern) 解耦具体的营销逻辑。
 * 所有的具体玩法实现 (如：拼团、秒杀、砍价等) 都必须严格实现此接口。
 * 核心引擎 PlayInstanceService 通过此接口与具体玩法交互，实现“插件化”扩展，无需修改核心流程即可增加新玩法。
 */
export interface IMarketingStrategy {
  /**
   * 策略唯一标识代码
   * @description 必须与系统内置的 templateCode 保持一致 (例如: 'GROUP_BUY', 'SECKILL')
   */
  readonly code: string;

  /**
   * 1. 准入与校验逻辑 (Join Validation)
   * @description 在用户参与活动前执行，用于校验：是否有参与资格、是否在活动有效期内、当前配置是否允许参与等。
   * @param config 活动配置实体
   * @param memberId 参与用户ID
   * @param params 附加参数 (可选)
   * @throws BusinessException 如果校验不通过，直接抛出业务异常中断流程
   */
  validateJoin(config: StorePlayConfig, memberId: string, params?: any): Promise<void>;

  /**
   * 1.1 配置校验逻辑 (Config Validation)
   * @description 在创建或更新活动配置时执行，用于校验配置参数的合法性。
   * @param dto 创建参数
   * @throws BusinessException 如果校验不通过
   */
  validateConfig?(dto: any): Promise<void>;

  /**
   * 2. 动态价格计算 (Price Calculation)
   * @description 根据玩法规则（如阶梯拼团、助力砍价等）计算用户当前应支付的真实金额。
   * @param config 活动配置实体
   * @param params 影响价格的动态参数
   * @returns 返回精确的 Decimal 类型金额
   */
  calculatePrice(config: StorePlayConfig, params?: any): Promise<Decimal>;

  /**
   * 3. 支付成功后置逻辑 (Payment Callback Hook)
   * @description 支付系统回调成功后执行。通常用于更新玩法内部状态，如拼团增加当前人数、生成分享令牌等。
   * @param instance 当前参与记录实例
   */
  onPaymentSuccess(instance: PlayInstance): Promise<void>;

  /**
   * 4. 状态变更监听钩子 (Status Transition Hook)
   * @description 实例状态发生流转时触发。通常用于处理核心状态逻辑，如“拼团满员”后由 PAID 流转为 SUCCESS 并自动发放权益。
   * @param instance 当前实例
   * @param oldStatus 流转前状态
   * @param newStatus 流转后状态
   */
  onStatusChange(instance: PlayInstance, oldStatus: string, newStatus: string): Promise<void>;

  /**
   * 5. 前端展示增强数据 (Display Data Enhancement)
   * @description 这是一个可选方法。用于将复杂的 JSON 配置格式化为 C 端前端易于渲染的组合对象或文案。
   * @param config 配置详情
   */
  getDisplayData?(config: StorePlayConfig): Promise<any>;
}
