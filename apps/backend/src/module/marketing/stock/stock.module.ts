import { Module } from '@nestjs/common';
import { MarketingStockService } from './stock.service';
import { InventoryStrategyFactory } from './stock-strategy';

/**
 * 营销库存引擎模块
 */
@Module({
  providers: [MarketingStockService, InventoryStrategyFactory],
  exports: [MarketingStockService, InventoryStrategyFactory],
})
export class MarketingStockModule {}
