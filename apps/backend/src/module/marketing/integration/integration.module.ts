import { Module } from '@nestjs/common';
import { CouponModule } from '../coupon/coupon.module';
import { PointsModule } from '../points/points.module';
import { PointsDegradationModule } from '../points/degradation/degradation.module';
import { OrderIntegrationService } from './integration.service';

/**
 * 订单集成模块
 * C 端 calculate-discount Controller 已迁移至 module/client/order
 */
@Module({
  imports: [CouponModule, PointsModule, PointsDegradationModule],
  controllers: [],
  providers: [OrderIntegrationService],
  exports: [OrderIntegrationService],
})
export class OrderIntegrationModule {}
