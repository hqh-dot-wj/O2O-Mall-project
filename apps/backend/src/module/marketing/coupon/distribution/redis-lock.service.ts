import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/module/common/redis/redis.service';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response';

/**
 * Redis 分布式锁服务
 * 
 * @description 封装 Redis 分布式锁操作，用于优惠券库存扣减等并发场景
 */
@Injectable()
export class RedisLockService {
  private readonly logger = new Logger(RedisLockService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * 执行带锁的操作
   * 
   * @param lockKey 锁键
   * @param callback 需要执行的回调函数
   * @param ttl 锁过期时间（毫秒），默认10秒
   * @param maxRetries 最大重试次数，默认3次
   * @param retryDelay 重试延迟（毫秒），默认100ms
   * @returns 回调函数的返回值
   */
  async executeWithLock<T>(
    lockKey: string,
    callback: () => Promise<T>,
    ttl: number = 10000,
    maxRetries: number = 3,
    retryDelay: number = 100,
  ): Promise<T> {
    let retries = 0;
    let lockAcquired = false;

    // 尝试获取锁
    while (retries < maxRetries && !lockAcquired) {
      lockAcquired = await this.redis.tryLock(lockKey, ttl);

      if (!lockAcquired) {
        retries++;
        if (retries < maxRetries) {
          // 等待一段时间后重试
          await this.sleep(retryDelay);
        }
      }
    }

    // 如果获取锁失败，抛出异常
    if (!lockAcquired) {
      this.logger.warn(`Failed to acquire lock: ${lockKey} after ${maxRetries} retries`);
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '系统繁忙，请稍后重试');
    }

    try {
      // 执行回调函数
      this.logger.debug(`Lock acquired: ${lockKey}`);
      return await callback();
    } finally {
      // 释放锁
      await this.redis.unlock(lockKey);
      this.logger.debug(`Lock released: ${lockKey}`);
    }
  }

  /**
   * 尝试获取锁
   * 
   * @param lockKey 锁键
   * @param ttl 锁过期时间（毫秒）
   * @returns 是否获取成功
   */
  async tryLock(lockKey: string, ttl: number = 10000): Promise<boolean> {
    return await this.redis.tryLock(lockKey, ttl);
  }

  /**
   * 释放锁
   * 
   * @param lockKey 锁键
   */
  async unlock(lockKey: string): Promise<void> {
    await this.redis.unlock(lockKey);
  }

  /**
   * 生成优惠券库存锁键
   * 
   * @param templateId 模板ID
   * @returns 锁键
   */
  getCouponStockLockKey(templateId: string): string {
    return `lock:coupon:stock:${templateId}`;
  }

  /**
   * 生成用户领取优惠券锁键
   * 
   * @param memberId 用户ID
   * @param templateId 模板ID
   * @returns 锁键
   */
  getUserClaimLockKey(memberId: string, templateId: string): string {
    return `lock:coupon:claim:${memberId}:${templateId}`;
  }

  /**
   * 延迟函数
   * 
   * @param ms 延迟时间（毫秒）
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
