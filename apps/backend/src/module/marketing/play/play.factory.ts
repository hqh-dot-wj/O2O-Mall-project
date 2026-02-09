import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IMarketingStrategy } from './strategy.interface';
import { GroupBuyService } from './group-buy.service';
import { CourseGroupBuyService } from './course-group-buy.service';
import { MemberUpgradeService } from './member-upgrade.service';
import { FlashSaleService } from './flash-sale.service';
import { FullReductionService } from './full-reduction.service';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ResponseCode } from 'src/common/response/response.interface';
import { PLAY_REGISTRY, PlayMetadata, getAllPlayMetadata } from './play.registry';

/**
 * 玩法策略工厂类
 *
 * @description
 * 负责管理和提供所有营销玩法策略实例。
 * 在模块初始化时自动注册所有策略服务,并提供统一的访问接口。
 *
 * 核心功能:
 * 1. 策略实例管理 - 注册和获取策略实例
 * 2. 元数据查询 - 获取玩法的元数据信息
 * 3. 特性判断 - 判断玩法是否有实例、是否可失败等
 */
@Injectable()
export class PlayStrategyFactory implements OnModuleInit {
  private strategies = new Map<string, IMarketingStrategy>();

  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleInit() {
    // 在模块初始化时注册所有策略
    // 注意：这里需要手动注册所有已实现的策略服务
    // 也可以通过装饰器自动扫描，但手动注册更显式且易于调试
    this.register(GroupBuyService);
    this.register(CourseGroupBuyService);
    this.register(MemberUpgradeService);
    this.register(FlashSaleService);
    this.register(FullReductionService);
  }

  /**
   * 注册策略实例
   *
   * @param strategyClass 策略类
   * @private
   */
  private register(strategyClass: any) {
    const instance = this.moduleRef.get(strategyClass, { strict: false });
    if (instance && instance.code) {
      this.strategies.set(instance.code, instance);
    }
  }

  /**
   * 获取策略实例
   *
   * @param code 玩法代码
   * @returns 策略实例
   * @throws {BusinessException} 如果策略不存在
   *
   * @example
   * ```typescript
   * const strategy = factory.getStrategy('GROUP_BUY');
   * await strategy.validateJoin(config, memberId, params);
   * ```
   */
  getStrategy(code: string): IMarketingStrategy {
    const strategy = this.strategies.get(code);
    if (!strategy) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, `未找到玩法策略: ${code}`);
    }
    return strategy;
  }

  /**
   * 获取玩法元数据
   *
   * @param code 玩法代码
   * @returns 玩法元数据
   * @throws {BusinessException} 如果玩法不存在
   *
   * @example
   * ```typescript
   * const metadata = factory.getMetadata('GROUP_BUY');
   * console.log(metadata.name); // "普通拼团"
   * console.log(metadata.hasInstance); // true
   * ```
   */
  getMetadata(code: string): PlayMetadata {
    const metadata = PLAY_REGISTRY[code];
    if (!metadata) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, `未找到玩法元数据: ${code}`);
    }
    return metadata;
  }

  /**
   * 获取所有玩法类型列表
   *
   * @returns 所有玩法的元数据数组
   *
   * @example
   * ```typescript
   * const allPlays = factory.getAllPlayTypes();
   * allPlays.forEach(play => {
   *   console.log(`${play.code}: ${play.name}`);
   * });
   * ```
   */
  getAllPlayTypes(): PlayMetadata[] {
    return getAllPlayMetadata();
  }

  /**
   * 判断玩法是否有实例
   *
   * @param code 玩法代码
   * @returns 是否有实例
   *
   * @example
   * ```typescript
   * if (factory.hasInstance('GROUP_BUY')) {
   *   // 需要创建 PlayInstance 记录
   * }
   * ```
   */
  hasInstance(code: string): boolean {
    const metadata = PLAY_REGISTRY[code];
    return metadata?.hasInstance || false;
  }

  /**
   * 判断玩法是否可失败
   *
   * @param code 玩法代码
   * @returns 是否可失败
   *
   * @example
   * ```typescript
   * if (factory.canFail('GROUP_BUY')) {
   *   // 需要处理失败场景（如拼团人数不足）
   * }
   * ```
   */
  canFail(code: string): boolean {
    const metadata = PLAY_REGISTRY[code];
    return metadata?.canFail || false;
  }

  /**
   * 判断玩法是否有状态流转
   *
   * @param code 玩法代码
   * @returns 是否有状态流转
   *
   * @example
   * ```typescript
   * if (factory.hasState('GROUP_BUY')) {
   *   // 需要处理状态机逻辑
   * }
   * ```
   */
  hasState(code: string): boolean {
    const metadata = PLAY_REGISTRY[code];
    return metadata?.hasState || false;
  }

  /**
   * 判断玩法是否可并行
   *
   * @param code 玩法代码
   * @returns 是否可并行
   *
   * @example
   * ```typescript
   * if (factory.canParallel('FULL_REDUCTION')) {
   *   // 用户可以同时参与多个该类型活动
   * }
   * ```
   */
  canParallel(code: string): boolean {
    const metadata = PLAY_REGISTRY[code];
    return metadata?.canParallel || false;
  }

  /**
   * 检查策略是否已注册
   *
   * @param code 玩法代码
   * @returns 是否已注册
   *
   * @example
   * ```typescript
   * if (factory.hasStrategy('GROUP_BUY')) {
   *   const strategy = factory.getStrategy('GROUP_BUY');
   * }
   * ```
   */
  hasStrategy(code: string): boolean {
    return this.strategies.has(code);
  }

  /**
   * 获取所有已注册的策略代码列表
   *
   * @returns 策略代码数组
   *
   * @example
   * ```typescript
   * const codes = factory.getAllStrategyCodes();
   * // ['GROUP_BUY', 'COURSE_GROUP_BUY', 'FLASH_SALE', 'FULL_REDUCTION', 'MEMBER_UPGRADE']
   * ```
   */
  getAllStrategyCodes(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * 获取玩法的默认库存模式
   *
   * @description
   * 返回指定玩法的默认库存模式。
   * - STRONG_LOCK: 强锁定，扣减库存时加锁（适用于实物商品，如秒杀）
   * - LAZY_CHECK: 懒检查，不加锁，依靠后续流程保障（适用于虚拟商品，如课程）
   *
   * @param code 玩法代码
   * @returns 默认库存模式
   * @throws {BusinessException} 如果玩法不存在
   *
   * @example
   * ```typescript
   * const stockMode = factory.getDefaultStockMode('FLASH_SALE');
   * // 返回 MarketingStockMode.STRONG_LOCK
   *
   * const stockMode2 = factory.getDefaultStockMode('COURSE_GROUP_BUY');
   * // 返回 MarketingStockMode.LAZY_CHECK
   * ```
   */
  getDefaultStockMode(code: string): import('@prisma/client').MarketingStockMode {
    const metadata = this.getMetadata(code);
    return metadata.defaultStockMode;
  }
}
