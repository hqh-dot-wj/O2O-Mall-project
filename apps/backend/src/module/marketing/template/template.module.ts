import { Module } from '@nestjs/common';
import { PlayTemplateController } from './template.controller';
import { PlayTemplateService } from './template.service';
import { PlayTemplateRepository } from './template.repository';

@Module({
  controllers: [PlayTemplateController],
  providers: [PlayTemplateService, PlayTemplateRepository],
  exports: [PlayTemplateService, PlayTemplateRepository],
})
export class MarketingTemplateModule {}
