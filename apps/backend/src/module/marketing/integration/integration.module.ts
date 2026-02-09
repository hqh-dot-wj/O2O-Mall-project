import { Module } from '@nestjs/common';
import { CouponModule } from '../coupon/coupon.module';
import { PointsModule } from '../points/points.module';
import { PointsDegradationModule } from '../points/degradation/degradation.module';
import { OrderIntegrationController } from './integration.controller';
import { OrderIntegrationService } from './integration.service';

/**
 * 订单集成模块
 * 
 * @description 处理订单与优惠券、积分的集成
 */
@Module({
  imports: [CouponModule, PointsModule, PointsDegradationModule],
  controllers: [OrderIntegrationController],
  providers: [OrderIntegrationService],
  exports: [OrderIntegrationService],
})
export class OrderIntegrationModule {}
