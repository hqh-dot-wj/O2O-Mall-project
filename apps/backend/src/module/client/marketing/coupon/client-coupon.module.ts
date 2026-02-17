import { Module } from '@nestjs/common';
import { CouponDistributionModule } from 'src/module/marketing/coupon/distribution/distribution.module';
import { ClientCouponController } from './client-coupon.controller';

@Module({
  imports: [CouponDistributionModule],
  controllers: [ClientCouponController],
})
export class ClientCouponModule {}
