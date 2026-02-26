import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DistributionController } from './distribution.controller';
import { DistributionService } from './distribution.service';
import { ProductConfigService } from './services/product-config.service';
import { DashboardService } from './services/dashboard.service';
import { LevelService } from './services/level.service';
import { LevelConditionService } from './services/level-condition.service';
import { ApplicationService } from './services/application.service';
import { LevelScheduler } from './scheduler/level.scheduler';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [DistributionController],
  providers: [
    DistributionService,
    ProductConfigService,
    DashboardService,
    LevelService,
    LevelConditionService,
    ApplicationService,
    LevelScheduler,
  ],
  exports: [DistributionService, ProductConfigService, LevelService, ApplicationService],
})
export class DistributionModule {}
