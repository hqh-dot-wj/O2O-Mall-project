import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/module/common/redis/redis.service';
import { CacheEnum } from 'src/common/enum';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response';

/** 账号锁定配置 */
interface AccountLockConfig {
  /** 最大失败次数 */
  maxFailCount: number;
  /** 失败计数窗口（毫秒） */
  failWindowMs: number;
  /** 锁定时长（毫秒） */
  lockDurationMs: number;
}

/** 默认配置：5 次失败 / 30 分钟窗口 / 锁定 30 分钟 */
const DEFAULT_CONFIG: AccountLockConfig = {
  maxFailCount: 5,
  failWindowMs: 30 * 60 * 1000,
  lockDurationMs: 30 * 60 * 1000,
};

/**
 * 账号锁定服务
 *
 * @description 管理登录失败计数和账号锁定机制
 */
@Injectable()
export class AccountLockService {
  private readonly logger = new Logger(AccountLockService.name);
  private readonly config: AccountLockConfig = DEFAULT_CONFIG;

  constructor(private readonly redisService: RedisService) {}

  /**
   * 检查账号是否被锁定（登录前调用）
   *
   * @param tenantId 租户ID
   * @param username 用户名
   * @throws BusinessException 当账号被锁定时
   */
  async checkAccountLocked(tenantId: string, username: string): Promise<void> {
    const lockKey = this.buildLockKey(tenantId, username);
    const lockValue = await this.redisService.get(lockKey);

    if (lockValue) {
      const lockMinutes = Math.ceil(this.config.lockDurationMs / 60000);
      throw new BusinessException(
        ResponseCode.BUSINESS_ERROR,
        `账号已被锁定，请${lockMinutes}分钟后再试`,
      );
    }
  }

  /**
   * 记录登录失败（密码错误后调用）
   *
   * @param tenantId 租户ID
   * @param username 用户名
   * @returns 剩余可尝试次数
   */
  async recordLoginFail(tenantId: string, username: string): Promise<number> {
    const failKey = this.buildFailKey(tenantId, username);

    // INCR 原子递增，首次调用时 Redis 自动创建 key 并设为 1
    const failCount = await this.redisService.incr(failKey);

    // 首次失败时设置过期时间
    if (failCount === 1) {
      await this.redisService.expire(failKey, this.config.failWindowMs);
    }

    const remaining = this.config.maxFailCount - failCount;

    // 达到阈值，锁定账号
    if (failCount >= this.config.maxFailCount) {
      await this.lockAccount(tenantId, username);
      this.logger.warn(`账号锁定: tenant=${tenantId}, user=${username}, failCount=${failCount}`);
      return 0;
    }

    return remaining;
  }

  /**
   * 清除登录失败计数（登录成功后调用）
   *
   * @param tenantId 租户ID
   * @param username 用户名
   */
  async clearFailCount(tenantId: string, username: string): Promise<void> {
    const failKey = this.buildFailKey(tenantId, username);
    await this.redisService.del(failKey);
  }

  /**
   * 锁定账号
   */
  private async lockAccount(tenantId: string, username: string): Promise<void> {
    const lockKey = this.buildLockKey(tenantId, username);
    const failKey = this.buildFailKey(tenantId, username);

    await this.redisService.set(lockKey, 'locked', this.config.lockDurationMs);
    // 锁定后清除失败计数，解锁后重新计数
    await this.redisService.del(failKey);
  }

  private buildFailKey(tenantId: string, username: string): string {
    return `${CacheEnum.LOGIN_FAIL_KEY}${tenantId}:${username}`;
  }

  private buildLockKey(tenantId: string, username: string): string {
    return `${CacheEnum.ACCOUNT_LOCK_KEY}${tenantId}:${username}`;
  }
}
