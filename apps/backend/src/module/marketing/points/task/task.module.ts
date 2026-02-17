import { Module } from '@nestjs/common';
import { PointsTaskAdminController } from './task.controller';
import { PointsTaskService } from './task.service';
import { PointsTaskRepository } from './task.repository';
import { UserTaskCompletionRepository } from './completion.repository';
import { PointsAccountModule } from '../account/account.module';

/**
 * 积分任务模块
 * 
 * @description 提供积分任务的创建、管理和完成功能
 */
@Module({
  imports: [PointsAccountModule],
  controllers: [PointsTaskAdminController],
  providers: [PointsTaskService, PointsTaskRepository, UserTaskCompletionRepository],
  exports: [PointsTaskService],
})
export class PointsTaskModule {}
