import { Module } from '@nestjs/common';
import { PlayInstanceController } from './instance.controller';
import { PlayInstanceService } from './instance.service';
import { PlayInstanceRepository } from './instance.repository';

/**
 * 营销实例模块
 */
import { UserAssetModule } from '../asset/asset.module';
import { FinanceModule } from 'src/module/finance/finance.module';

import { MarketingPlayModule } from '../play/play.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [UserAssetModule, FinanceModule, forwardRef(() => MarketingPlayModule)],
  controllers: [PlayInstanceController],
  providers: [PlayInstanceService, PlayInstanceRepository],
  exports: [PlayInstanceService],
})
export class PlayInstanceModule {}
