import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CouponManagementController } from './management.controller';
import { CouponStatisticsService } from '../statistics/statistics.service';
import { CouponSchedulerService } from '../scheduler/scheduler.service';
import { CouponDistributionModule } from '../distribution/distribution.module';
import { CouponUsageModule } from '../usage/usage.module';
import { CouponTemplateModule } from '../template/template.module';

/**
 * 优惠券管理模块
 * 提供优惠券的统计、定时任务、管理接口
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    CouponTemplateModule,
    CouponDistributionModule,
    CouponUsageModule,
  ],
  controllers: [CouponManagementController],
  providers: [CouponStatisticsService, CouponSchedulerService],
  exports: [CouponStatisticsService],
})
export class CouponManagementModule {}
