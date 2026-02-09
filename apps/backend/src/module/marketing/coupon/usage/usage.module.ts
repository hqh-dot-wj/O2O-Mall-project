import { Module } from '@nestjs/common';
import { CouponUsageService } from './usage.service';
import { CouponUsageRepository } from './usage.repository';
import { CouponDistributionModule } from '../distribution/distribution.module';

/**
 * 优惠券使用模块
 * 提供优惠券的验证、计算、锁定、使用、解锁、退还功能
 */
@Module({
  imports: [CouponDistributionModule],
  providers: [CouponUsageService, CouponUsageRepository],
  exports: [CouponUsageService, CouponUsageRepository],
})
export class CouponUsageModule {}
