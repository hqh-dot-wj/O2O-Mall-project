import { Module } from '@nestjs/common';
import { CouponTemplateModule } from './template/template.module';
import { CouponDistributionModule } from './distribution/distribution.module';
import { CouponUsageModule } from './usage/usage.module';
import { CouponManagementModule } from './management/management.module';

/**
 * 优惠券聚合模块
 * 聚合所有优惠券相关子模块
 */
@Module({
  imports: [
    CouponTemplateModule,
    CouponDistributionModule,
    CouponUsageModule,
    CouponManagementModule,
  ],
  exports: [
    CouponTemplateModule,
    CouponDistributionModule,
    CouponUsageModule,
    CouponManagementModule,
  ],
})
export class CouponModule {}
