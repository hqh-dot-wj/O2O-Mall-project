import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { getErrorMessage, getErrorStack } from 'src/common/utils/error';
import { RedisService } from 'src/module/common/redis/redis.service';
import { UserCouponRepository } from '../distribution/user-coupon.repository';

/**
 * 优惠券定时任务服务
 * 
 * @description 处理优惠券的定时清理任务，如过期优惠券处理
 */
@Injectable()
export class CouponSchedulerService {
  private readonly logger = new Logger(CouponSchedulerService.name);
  private readonly lockKey = 'lock:marketing:coupon:scheduler:clean-expired-coupons';
  private readonly lockTtlMs = 5 * 60 * 1000;

  constructor(
    private readonly userCouponRepo: UserCouponRepository,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 清理过期优惠券
   * 每天凌晨 2 点执行
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanExpiredCoupons() {
    const lockAcquired = await this.redisService.tryLock(this.lockKey, this.lockTtlMs);
    if (!lockAcquired) {
      this.logger.log('跳过清理过期优惠券：已有实例正在执行');
      return;
    }

    this.logger.log('开始清理过期优惠券...');

    try {
      // 将过期的未使用优惠券状态更新为已过期
      const count = await this.userCouponRepo.expireCoupons();

      this.logger.log(`清理过期优惠券完成，共处理 ${count} 张优惠券`);
    } catch (error) {
      this.logger.error(`清理过期优惠券失败: ${getErrorMessage(error)}`, getErrorStack(error));
    } finally {
      try {
        await this.redisService.unlock(this.lockKey);
      } catch (error) {
        this.logger.warn(`释放清理过期优惠券锁失败: ${getErrorMessage(error)}`);
      }
    }
  }
}
