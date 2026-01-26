import { MarketingStockMode } from '@prisma/client';
import { MarketingStockService } from './stock.service';
import { Injectable } from '@nestjs/common';

/**
 * 库存策略接口
 */
export interface IInventoryStrategy {
  /**
   * 锁定名额/库存
   */
  lock(configId: string, amount: number): Promise<boolean>;

  /**
   * 释放名额/库存
   */
  release(configId: string, amount: number): Promise<void>;
}

/**
 * 强互斥策略 (实物): 下单立即占用，防超卖
 */
export class StrongLockStrategy implements IInventoryStrategy {
  constructor(private readonly service: MarketingStockService) {}
  async lock(configId: string, amount: number) {
    return this.service.decrement(configId, amount, MarketingStockMode.STRONG_LOCK);
  }
  async release(configId: string, amount: number) {
    return this.service.increment(configId, amount);
  }
}

/**
 * 懒校验策略 (服务): 仅校验，不锁定，适合服务类产能
 */
export class LazyCheckStrategy implements IInventoryStrategy {
  constructor(private readonly service: MarketingStockService) {}
  async lock(configId: string, amount: number) {
    // 逻辑：仅在支付后真实扣减，下单时不锁定
    return true;
  }
  async release(configId: string, amount: number) {
    // 懒校验模式无需归还，因为下单没扣
  }
}

/**
 * 库存策略工厂
 */
@Injectable()
export class InventoryStrategyFactory {
  constructor(private readonly stockService: MarketingStockService) {}

  getStrategy(mode: MarketingStockMode): IInventoryStrategy {
    if (mode === MarketingStockMode.STRONG_LOCK) {
      return new StrongLockStrategy(this.stockService);
    }
    return new LazyCheckStrategy(this.stockService);
  }
}
