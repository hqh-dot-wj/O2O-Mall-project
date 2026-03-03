import { Module } from '@nestjs/common';
import { GeoService } from './geo/geo.service';
import { RegionService } from './region/region.service';
import { RegionController } from './region/region.controller';
import { StationService } from './station/station.service';
import { StationController } from './station/station.controller';
import { RegionRepository } from './region/region.repository';
import { StationRepository } from './station/station.repository';
import { AdmissionService } from './admission/admission.service';
import { LbsMetricsService } from './monitoring/lbs-metrics.service';
import { LbsMetricsController } from './monitoring/lbs-metrics.controller';
import { RedisModule } from 'src/module/common/redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [RegionController, StationController, LbsMetricsController],
  providers: [
    GeoService,
    RegionService,
    StationService,
    RegionRepository,
    StationRepository,
    AdmissionService,
    LbsMetricsService,
  ],
  exports: [GeoService, RegionService, StationService, AdmissionService, LbsMetricsService],
})
export class LbsModule {}
