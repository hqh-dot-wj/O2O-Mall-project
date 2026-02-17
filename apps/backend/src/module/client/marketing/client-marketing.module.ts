import { Module } from '@nestjs/common';
import { ClientCouponModule } from './coupon/client-coupon.module';
import { ClientPointsModule } from './points/client-points.module';

@Module({
  imports: [ClientCouponModule, ClientPointsModule],
})
export class ClientMarketingModule {}
