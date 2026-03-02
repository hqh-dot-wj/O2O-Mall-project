import { Module, forwardRef } from '@nestjs/common';
import { CouponDistributionController } from './distribution.controller';
import { CouponDistributionService } from './distribution.service';
import { UserCouponRepository } from './user-coupon.repository';
import { RedisLockService } from './redis-lock.service';
import { CouponTemplateModule } from '../template/template.module';
import { ClientOrderModule } from 'src/module/client/order/order.module';
import { MarketingEventsModule } from '../../events/events.module';

/**
 * 优惠券发放模块
 * 提供优惠券的发放、领取、赠送功能
 */
@Module({
  imports: [CouponTemplateModule, forwardRef(() => ClientOrderModule), MarketingEventsModule],
  controllers: [CouponDistributionController],
  providers: [CouponDistributionService, UserCouponRepository, RedisLockService],
  exports: [CouponDistributionService, UserCouponRepository],
})
export class CouponDistributionModule {}
