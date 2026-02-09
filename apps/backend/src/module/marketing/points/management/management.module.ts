import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PointsManagementController } from './management.controller';
import { PointsStatisticsService } from '../statistics/statistics.service';
import { PointsSchedulerService } from '../scheduler/scheduler.service';

/**
 * 积分管理模块
 * 
 * @description 提供积分的统计、定时任务、管理接口
 */
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [PointsManagementController],
  providers: [PointsStatisticsService, PointsSchedulerService],
  exports: [PointsStatisticsService],
})
export class PointsManagementModule {}
