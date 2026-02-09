import { Module } from '@nestjs/common';
import { GroupBuyService } from './group-buy.service';
import { PlayInstanceModule } from '../instance/instance.module';
import { MarketingStockModule } from '../stock/stock.module';
import { UserAssetModule } from '../asset/asset.module';

/**
 * 具体玩法逻辑模块聚合
 */
import { forwardRef } from '@nestjs/common';
import { PlayStrategyFactory } from './play.factory';
import { CourseGroupBuyService } from './course-group-buy.service';
import { MemberUpgradeService } from './member-upgrade.service';
import { FlashSaleService } from './flash-sale.service';
import { FullReductionService } from './full-reduction.service';
import { PlayController } from './play.controller';

import { MemberModule } from 'src/module/admin/member/member.module';
import { AdminUpgradeModule } from 'src/module/admin/upgrade/admin-upgrade.module';

import { ClientOrderModule } from 'src/module/client/order/order.module';
import { MarketingConfigModule } from '../config/config.module';
import { CourseGroupBuyExtensionRepository } from './course-group-buy-extension.repository';

@Module({
  imports: [
    forwardRef(() => PlayInstanceModule),
    MarketingStockModule,
    UserAssetModule,
    MemberModule,
    AdminUpgradeModule,
    ClientOrderModule,
    forwardRef(() => MarketingConfigModule),
  ],
  controllers: [PlayController],
  providers: [
    GroupBuyService,
    CourseGroupBuyService,
    MemberUpgradeService,
    FlashSaleService,
    FullReductionService,
    PlayStrategyFactory,
    CourseGroupBuyExtensionRepository,
  ],
  exports: [
    GroupBuyService,
    CourseGroupBuyService,
    MemberUpgradeService,
    FlashSaleService,
    FullReductionService,
    PlayStrategyFactory,
    CourseGroupBuyExtensionRepository,
  ],
})
export class MarketingPlayModule {}
