import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { getErrorMessage, getErrorStack } from 'src/common/utils/error';
import { RedisService } from 'src/module/common/redis/redis.service';
import { UserCouponRepository } from '../distribution/user-coupon.repository';
import { MarketingEventEmitter } from '../../events/marketing-event.emitter';
import { MarketingEventType } from '../../events/marketing-event.types';

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
  private readonly batchSize = 500;

  constructor(
    private readonly userCouponRepo: UserCouponRepository,
    private readonly redisService: RedisService,
    private readonly eventEmitter: MarketingEventEmitter,
  ) {}

  /**
   * 清理过期优惠券
   * 每天凌晨 2 点执行
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanExpiredCoupons() {
    const lockToken = await this.redisService.tryLock(this.lockKey, this.lockTtlMs);
    if (!lockToken) {
      this.logger.log('跳过清理过期优惠券：已有实例正在执行');
      return;
    }

    this.logger.log('开始清理过期优惠券...');

    try {
      let totalCount = 0;

      while (true) {
        const ids = await this.userCouponRepo.findExpiredCouponIds(this.batchSize);
        if (ids.length === 0) {
          break;
        }

        const count = await this.userCouponRepo.markCouponsExpiredByIds(ids);
        const expiredCoupons = await this.userCouponRepo.findExpiredCouponsByIds(ids);
        await Promise.all(
          expiredCoupons.map((coupon) =>
            this.eventEmitter.emitAsync({
              type: MarketingEventType.COUPON_EXPIRED,
              tenantId: coupon.tenantId,
              instanceId: coupon.id,
              configId: coupon.templateId,
              memberId: coupon.memberId,
              payload: {
                templateId: coupon.templateId,
                endTime: coupon.endTime,
                source: 'scheduler',
              },
              timestamp: new Date(),
            }),
          ),
        );
        totalCount += count;

        this.logger.log(`过期优惠券批次处理完成: batch=${ids.length}, updated=${count}, total=${totalCount}`);

        if (ids.length < this.batchSize) {
          break;
        }
      }

      this.logger.log(`清理过期优惠券完成，共处理 ${totalCount} 张优惠券`);
    } catch (error) {
      this.logger.error(`清理过期优惠券失败: ${getErrorMessage(error)}`, getErrorStack(error));
    } finally {
      try {
        await this.redisService.unlock(this.lockKey, lockToken);
      } catch (error) {
        this.logger.warn(`释放清理过期优惠券锁失败: ${getErrorMessage(error)}`);
      }
    }
  }
}
