import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ActivityLifecycleScheduler } from './lifecycle.scheduler';
import { PlayInstanceModule } from '../instance/instance.module';
import { MarketingStockModule } from '../stock/stock.module';

/**
 * 营销调度器模块
 *
 * @description
 * 管理所有营销相关的定时任务，包括：
 * - 超时实例自动处理
 * - 活动自动上下架
 * - 过期数据清理
 * - 系统健康检查
 */
@Module({
  imports: [
    ScheduleModule.forRoot(), // 启用定时任务
    PlayInstanceModule,
    MarketingStockModule,
  ],
  providers: [ActivityLifecycleScheduler],
  exports: [ActivityLifecycleScheduler],
})
export class MarketingSchedulerModule {}
