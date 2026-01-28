import { Module } from '@nestjs/common';
import { StorePlayConfigController } from './config.controller';
import { StorePlayConfigService } from './config.service';
import { StorePlayConfigRepository } from './config.repository';
import { MarketingPlayModule } from '../play/play.module';
import { MarketingTemplateModule } from '../template/template.module';
import { PmsModule } from 'src/module/pms/pms.module';

@Module({
  imports: [MarketingTemplateModule, PmsModule, MarketingPlayModule],
  controllers: [StorePlayConfigController],
  providers: [StorePlayConfigService, StorePlayConfigRepository],
  exports: [StorePlayConfigService, StorePlayConfigRepository],
})
export class MarketingConfigModule { }
