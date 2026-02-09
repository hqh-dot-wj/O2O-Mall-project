import { Module, forwardRef } from '@nestjs/common';
import { MarketingTemplateModule } from './template/template.module';
import { MarketingConfigModule } from './config/config.module';
import { PlayInstanceModule } from './instance/instance.module';
import { MarketingStockModule } from './stock/stock.module';
import { UserAssetModule } from './asset/asset.module';
import { MarketingSchedulerModule } from './scheduler/scheduler.module';
import { MarketingEventsModule } from './events/events.module';
import { RuleModule } from './rule/rule.module';
import { CouponModule } from './coupon/coupon.module';
import { PointsModule } from './points/points.module';
import { OrderIntegrationModule } from './integration/integration.module';

import { MarketingPlayModule } from './play/play.module';

/**
 * 营销大模块聚合器 (MaaS Core)
 * 
 * @description
 * 聚合了营销引擎的所有核心模块：
 * - 玩法模板（Template）：定义"有什么"
 * - 活动配置（Config）：定义"怎么卖"
 * - 实例管理（Instance）：定义"谁参与"
 * - 库存控制（Stock）：防止超卖
 * - 资产履约（Asset）：定义"得什么"
 * - 玩法策略（Play）：具体业务逻辑
 * - 生命周期调度（Scheduler）：自动化管理
 * - 事件驱动（Events）：解耦模块依赖
 * - 规则校验（Rule）：运营配置校验
 * - 优惠券（Coupon）：优惠券系统
 * - 积分（Points）：积分系统
 * - 订单集成（Integration）：订单与优惠券、积分集成
 */
@Module({
  imports: [
    MarketingTemplateModule,
    MarketingConfigModule,
    PlayInstanceModule,
    MarketingStockModule,
    UserAssetModule,
    MarketingSchedulerModule, // ✅ P0: 生命周期调度器
    MarketingEventsModule,    // ✅ P1: 事件驱动机制
    RuleModule,               // ✅ P2: 规则校验服务
    CouponModule,             // ✅ 优惠券模块
    PointsModule,             // ✅ 积分模块
    OrderIntegrationModule,   // ✅ 订单集成模块

    forwardRef(() => MarketingPlayModule),
  ],
  exports: [
    MarketingTemplateModule,
    MarketingConfigModule,
    PlayInstanceModule,
    MarketingStockModule,
    UserAssetModule,
    MarketingSchedulerModule, // ✅ 导出调度器
    MarketingEventsModule,    // ✅ 导出事件模块
    RuleModule,               // ✅ 导出规则模块
    CouponModule,             // ✅ 导出优惠券模块
    PointsModule,             // ✅ 导出积分模块
    OrderIntegrationModule,   // ✅ 导出订单集成模块

    forwardRef(() => MarketingPlayModule),
  ],
})
export class MarketingModule {}
