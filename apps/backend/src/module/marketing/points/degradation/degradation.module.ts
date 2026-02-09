import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PointsGracefulDegradationService } from './degradation.service';
import { PointsRetryProcessor } from './degradation.processor';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PointsAccountModule } from '../account/account.module';

/**
 * 积分降级模块
 * 
 * @description 提供积分发放失败的降级策略，包括重试队列和失败日志
 */
@Module({
  imports: [
    PrismaModule,
    PointsAccountModule,
    BullModule.registerQueue({
      name: 'points-retry',
    }),
  ],
  providers: [PointsGracefulDegradationService, PointsRetryProcessor],
  exports: [PointsGracefulDegradationService],
})
export class PointsDegradationModule {}
