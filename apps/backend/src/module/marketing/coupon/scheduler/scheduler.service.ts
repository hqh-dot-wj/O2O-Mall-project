import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserCouponRepository } from '../distribution/user-coupon.repository';

/**
 * 优惠券定时任务服务
 * 
 * @description 处理优惠券的定时清理任务，如过期优惠券处理
 */
@Injectable()
export class CouponSchedulerService {
  private readonly logger = new Logger(CouponSchedulerService.name);

  constructor(private readonly userCouponRepo: UserCouponRepository) {}

  /**
   * 清理过期优惠券
   * 每天凌晨 2 点执行
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanExpiredCoupons() {
    this.logger.log('开始清理过期优惠券...');

    try {
      // 将过期的未使用优惠券状态更新为已过期
      const count = await this.userCouponRepo.expireCoupons();

      this.logger.log(`清理过期优惠券完成，共处理 ${count} 张优惠券`);
    } catch (error) {
      this.logger.error('清理过期优惠券失败', error);
    }
  }
}
