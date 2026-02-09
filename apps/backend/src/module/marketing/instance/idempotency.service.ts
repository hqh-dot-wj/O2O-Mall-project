import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/module/common/redis/redis.service';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ResponseCode } from 'src/common/response/response.interface';

/**
 * 幂等性保障服务
 *
 * @description
 * 防止用户重复操作导致的业务问题：
 * 1. 重复参与活动（用户多次点击"参与"按钮）
 * 2. 重复支付回调（支付平台重试机制）
 * 3. 重复状态变更（并发请求）
 *
 * 核心机制：
 * - 基于 Redis 的分布式锁
 * - 基于 Redis 的结果缓存
 * - 基于数据库的乐观锁
 */
@Injectable()
export class IdempotencyService {
  constructor(private readonly redis: RedisService) {}

  /**
   * 幂等性键前缀
   */
  private readonly PREFIX = {
    JOIN: 'idempotency:join:', // 参与活动幂等键
    PAYMENT: 'idempotency:payment:', // 支付回调幂等键
    STATE: 'idempotency:state:', // 状态变更幂等键
  };

  /**
   * 默认缓存时间（秒）
   */
  private readonly DEFAULT_TTL = {
    JOIN: 300, // 5分钟（参与活动）
    PAYMENT: 600, // 10分钟（支付回调）
    STATE: 60, // 1分钟（状态变更）
  };

  /**
   * 参与活动幂等性检查
   *
   * @description
   * 防止用户在短时间内重复参与同一活动
   *
   * @param configId 活动配置ID
   * @param memberId 用户ID
   * @param params 参与参数（用于生成唯一键）
   * @returns 如果已存在，返回缓存的结果；否则返回 null
   *
   * @example
   * const cached = await idempotencyService.checkJoinIdempotency(configId, memberId, params);
   * if (cached) {
   *   return cached; // 返回缓存结果，避免重复创建
   * }
   */
  async checkJoinIdempotency(
    configId: string,
    memberId: string,
    params?: any,
  ): Promise<any | null> {
    // 生成幂等键：活动ID + 用户ID + 参数哈希
    const key = this.generateJoinKey(configId, memberId, params);

    // 检查是否已存在
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    return null;
  }

  /**
   * 缓存参与活动结果
   *
   * @description
   * 将参与活动的结果缓存起来，用于幂等性返回
   *
   * @param configId 活动配置ID
   * @param memberId 用户ID
   * @param params 参与参数
   * @param result 参与结果
   */
  async cacheJoinResult(
    configId: string,
    memberId: string,
    params: any,
    result: any,
  ): Promise<void> {
    const key = this.generateJoinKey(configId, memberId, params);
    await this.redis.set(key, JSON.stringify(result), this.DEFAULT_TTL.JOIN);
  }

  /**
   * 支付回调幂等性检查
   *
   * @description
   * 防止支付平台重复回调导致的重复处理
   *
   * @param orderSn 订单号
   * @returns 如果已处理，返回 true；否则返回 false
   *
   * @example
   * const processed = await idempotencyService.checkPaymentIdempotency(orderSn);
   * if (processed) {
   *   return; // 已处理，直接返回
   * }
   */
  async checkPaymentIdempotency(orderSn: string): Promise<boolean> {
    const key = `${this.PREFIX.PAYMENT}${orderSn}`;
    const exists = await this.redis.get(key);
    return exists !== null;
  }

  /**
   * 标记支付回调已处理
   *
   * @param orderSn 订单号
   */
  async markPaymentProcessed(orderSn: string): Promise<void> {
    const key = `${this.PREFIX.PAYMENT}${orderSn}`;
    await this.redis.set(key, '1', this.DEFAULT_TTL.PAYMENT);
  }

  /**
   * 状态变更分布式锁
   *
   * @description
   * 防止并发状态变更导致的数据不一致
   *
   * @param instanceId 实例ID
   * @param callback 需要加锁执行的回调函数
   * @param timeout 锁超时时间（毫秒），默认 5000ms
   * @returns 回调函数的返回值
   *
   * @example
   * await idempotencyService.withStateLock(instanceId, async () => {
   *   // 执行状态变更逻辑
   *   await this.transitStatus(instanceId, nextStatus);
   * });
   */
  async withStateLock<T>(
    instanceId: string,
    callback: () => Promise<T>,
    timeout: number = 5000,
  ): Promise<T> {
    const lockKey = `${this.PREFIX.STATE}${instanceId}`;

    // 尝试获取锁（使用 SET NX EX 原子操作）
    const lockValue = `${Date.now()}`; // 锁的值（用于验证）
    const acquired = await this.redis.getClient().set(lockKey, lockValue, 'PX', timeout, 'NX');

    if (!acquired) {
      // 获取锁失败，说明有其他请求正在处理
      throw new BusinessException(
        ResponseCode.BUSINESS_ERROR,
        '操作正在处理中，请稍后重试',
      );
    }

    try {
      // 执行回调函数
      return await callback();
    } finally {
      // 释放锁（使用 Lua 脚本确保只删除自己的锁）
      const releaseLua = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      await this.redis.getClient().eval(releaseLua, 1, lockKey, lockValue);
    }
  }

  /**
   * 生成参与活动的幂等键
   *
   * @description
   * 根据活动ID、用户ID和参与参数生成唯一键
   * 对于拼团等需要区分"开团"和"参团"的场景，参数中的 groupId 会影响幂等键
   *
   * @param configId 活动配置ID
   * @param memberId 用户ID
   * @param params 参与参数
   * @returns 幂等键
   */
  private generateJoinKey(configId: string, memberId: string, params?: any): string {
    let key = `${this.PREFIX.JOIN}${configId}:${memberId}`;

    // 如果有参团ID，加入到幂等键中（允许同一用户参与多个不同的团）
    if (params?.groupId) {
      key += `:${params.groupId}`;
    }

    // 如果有 SKU ID，加入到幂等键中（允许同一用户购买不同规格）
    if (params?.skuId) {
      key += `:${params.skuId}`;
    }

    return key;
  }

  /**
   * 清除幂等性缓存（用于测试或异常恢复）
   *
   * @param pattern 键模式
   */
  async clearIdempotencyCache(pattern: string): Promise<void> {
    const keys = await this.redis.getClient().keys(pattern);
    if (keys.length > 0) {
      await this.redis.getClient().del(...keys);
    }
  }
}
