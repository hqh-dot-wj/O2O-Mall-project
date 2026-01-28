import { Module, forwardRef } from '@nestjs/common';
import { MarketingTemplateModule } from './template/template.module';
import { MarketingConfigModule } from './config/config.module';
import { PlayInstanceModule } from './instance/instance.module';
import { MarketingStockModule } from './stock/stock.module';
import { UserAssetModule } from './asset/asset.module';

import { MarketingPlayModule } from './play/play.module';

/**
 * 营销大模块聚合器 (MaaS Core)
 * 聚合了玩法预览、配置生产、交易实例、库存锁、履约资产、财务结算以及具体玩法逻辑 (拼团等)
 */
@Module({
  imports: [
    MarketingTemplateModule,
    MarketingConfigModule,
    PlayInstanceModule,
    MarketingStockModule,
    UserAssetModule,

    forwardRef(() => MarketingPlayModule),
  ],
  exports: [
    MarketingTemplateModule,
    MarketingConfigModule,
    PlayInstanceModule,
    MarketingStockModule,
    UserAssetModule,

    forwardRef(() => MarketingPlayModule),
  ],
})
export class MarketingModule {}
