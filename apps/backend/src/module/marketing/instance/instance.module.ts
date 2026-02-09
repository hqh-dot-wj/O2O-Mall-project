import { Module } from '@nestjs/common';
import { PlayInstanceController } from './instance.controller';
import { PlayInstanceService } from './instance.service';
import { PlayInstanceRepository } from './instance.repository';
import { IdempotencyService } from './idempotency.service';

/**
 * 营销实例模块
 */
import { UserAssetModule } from '../asset/asset.module';
import { FinanceModule } from 'src/module/finance/finance.module';

import { MarketingPlayModule } from '../play/play.module';
import { MarketingEventsModule } from '../events/events.module';
import { GrayModule } from '../gray/gray.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    UserAssetModule,
    FinanceModule,
    forwardRef(() => MarketingPlayModule),
    MarketingEventsModule, // 导入事件模块
    GrayModule, // 导入灰度发布模块
  ],
  controllers: [PlayInstanceController],
  providers: [PlayInstanceService, PlayInstanceRepository, IdempotencyService],
  exports: [PlayInstanceService, PlayInstanceRepository, IdempotencyService],
})
export class PlayInstanceModule {}
