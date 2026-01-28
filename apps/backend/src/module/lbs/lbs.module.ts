import { Module } from '@nestjs/common';
import { GeoService } from './geo/geo.service';
import { RegionService } from './region/region.service';
import { RegionController } from './region/region.controller';
import { StationService } from './station/station.service';
import { StationController } from './station/station.controller';
import { RegionRepository } from './region/region.repository';
import { StationRepository } from './station/station.repository';

@Module({
  imports: [],
  controllers: [RegionController, StationController],
  providers: [GeoService, RegionService, StationService, RegionRepository, StationRepository],
  exports: [GeoService, RegionService, StationService], // Export GeoService for use in other modules if needed
})
export class LbsModule {}
