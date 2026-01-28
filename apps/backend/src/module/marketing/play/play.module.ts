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

import { MemberModule } from 'src/module/admin/member/member.module';
import { AdminUpgradeModule } from 'src/module/admin/upgrade/admin-upgrade.module';

import { ClientOrderModule } from 'src/module/client/order/order.module';
import { MarketingConfigModule } from '../config/config.module';

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
  providers: [GroupBuyService, CourseGroupBuyService, MemberUpgradeService, PlayStrategyFactory],
  exports: [GroupBuyService, CourseGroupBuyService, MemberUpgradeService, PlayStrategyFactory],
})
export class MarketingPlayModule { }
