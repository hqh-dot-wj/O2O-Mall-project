import 'reflect-metadata';
import { PLAY_REGISTRY, PlayMetadata } from './play.registry';

/**
 * 玩法策略元数据键
 * - 用于存储和读取装饰器元数据
 */
export const PLAY_CODE_METADATA_KEY = 'play:code';
export const PLAY_METADATA_KEY = 'play:metadata';

/**
 * 玩法策略装饰器
 *
 * @description
 * 用于标记营销玩法策略类，实现自动注册和元数据管理。
 * 这是营销引擎的核心机制之一，支持"新增玩法不改核心代码"的设计目标。
 *
 * **工作原理**:
 * 1. 装饰器在类定义时执行
 * 2. 使用 Reflect.defineMetadata 将玩法代码和元数据存储到类的元数据中
 * 3. 工厂类在初始化时扫描所有带此装饰器的类
 * 4. 自动注册到策略映射表中
 *
 * **元数据存储**:
 * - `play:code`: 玩法代码（如 'GROUP_BUY'）
 * - `play:metadata`: 完整的玩法元数据（从 PLAY_REGISTRY 读取）
 *
 * **验证需求**: FR-1.2, US-2
 *
 * @param code 玩法代码，必须在 PLAY_REGISTRY 中已注册
 * @returns 类装饰器函数
 *
 * @throws {Error} 如果玩法代码未在 PLAY_REGISTRY 中注册
 *
 * @example
 * // 基本使用
 * @PlayStrategy('GROUP_BUY')
 * export class GroupBuyService implements IMarketingStrategy {
 *   readonly code = 'GROUP_BUY';
 *
 *   async join(dto: JoinActivityDto): Promise<any> {
 *     // 拼团逻辑
 *   }
 * }
 *
 * @example
 * // 秒杀玩法
 * @PlayStrategy('FLASH_SALE')
 * export class FlashSaleService implements IMarketingStrategy {
 *   readonly code = 'FLASH_SALE';
 *
 *   async join(dto: JoinActivityDto): Promise<any> {
 *     // 秒杀逻辑
 *   }
 * }
 *
 * @example
 * // 满减活动（无实例）
 * @PlayStrategy('FULL_REDUCTION')
 * export class FullReductionService implements IMarketingStrategy {
 *   readonly code = 'FULL_REDUCTION';
 *
 *   async calculateDiscount(orderAmount: number): Promise<number> {
 *     // 满减计算逻辑
 *   }
 * }
 */
export function PlayStrategy(code: string) {
  return function <T extends { new (...args: any[]): {} }>(target: T) {
    // 验证玩法代码是否已在注册表中
    const metadata = PLAY_REGISTRY[code];
    if (!metadata) {
      throw new Error(
        `玩法代码 "${code}" 未在 PLAY_REGISTRY 中注册。` +
          `请先在 play.registry.ts 中添加该玩法的元数据。`,
      );
    }

    // 存储玩法代码到类的元数据中
    Reflect.defineMetadata(PLAY_CODE_METADATA_KEY, code, target);

    // 存储完整的玩法元数据到类的元数据中
    Reflect.defineMetadata(PLAY_METADATA_KEY, metadata, target);

    // 返回原始类（装饰器不修改类本身）
    return target;
  };
}

/**
 * 从类中读取玩法代码
 *
 * @description
 * 工具函数，用于从带有 @PlayStrategy 装饰器的类中读取玩法代码。
 * 主要供工厂类在自动注册时使用。
 *
 * @param target 目标类
 * @returns 玩法代码，如果未找到返回 undefined
 *
 * @example
 * const code = getPlayCode(GroupBuyService);
 * console.log(code); // 'GROUP_BUY'
 */
export function getPlayCode(target: any): string | undefined {
  return Reflect.getMetadata(PLAY_CODE_METADATA_KEY, target);
}

/**
 * 从类中读取玩法元数据
 *
 * @description
 * 工具函数，用于从带有 @PlayStrategy 装饰器的类中读取完整的玩法元数据。
 * 主要供工厂类在查询玩法信息时使用。
 *
 * @param target 目标类
 * @returns 玩法元数据，如果未找到返回 undefined
 *
 * @example
 * const metadata = getPlayMetadata(GroupBuyService);
 * console.log(metadata.name); // "普通拼团"
 * console.log(metadata.hasInstance); // true
 */
export function getPlayMetadata(target: any): PlayMetadata | undefined {
  return Reflect.getMetadata(PLAY_METADATA_KEY, target);
}

/**
 * 检查类是否带有 @PlayStrategy 装饰器
 *
 * @description
 * 工具函数，用于检查一个类是否是玩法策略类。
 * 主要供工厂类在自动扫描时使用。
 *
 * @param target 目标类
 * @returns 是否为玩法策略类
 *
 * @example
 * if (isPlayStrategy(GroupBuyService)) {
 *   console.log('这是一个玩法策略类');
 * }
 */
export function isPlayStrategy(target: any): boolean {
  return Reflect.hasMetadata(PLAY_CODE_METADATA_KEY, target);
}

/**
 * 使用示例和最佳实践
 *
 * @example
 * // ============================================
 * // 示例 1: 创建新的拼团玩法
 * // ============================================
 *
 * // 步骤 1: 在 play.registry.ts 中注册玩法元数据
 * export const PLAY_REGISTRY = {
 *   GROUP_BUY: {
 *     code: 'GROUP_BUY',
 *     name: '普通拼团',
 *     hasInstance: true,
 *     hasState: true,
 *     canFail: true,
 *     canParallel: true,
 *     ruleSchema: GroupBuyRulesDto,
 *     defaultStockMode: MarketingStockMode.STRONG_LOCK,
 *   },
 * };
 *
 * // 步骤 2: 创建服务类并添加装饰器
 * @PlayStrategy('GROUP_BUY')
 * @Injectable()
 * export class GroupBuyService implements IMarketingStrategy {
 *   readonly code = 'GROUP_BUY';
 *
 *   constructor(
 *     private readonly instanceService: PlayInstanceService,
 *     private readonly stockService: StockService,
 *   ) {}
 *
 *   async join(dto: JoinActivityDto): Promise<any> {
 *     // 1. 检查库存
 *     await this.stockService.checkStock(dto.configId);
 *
 *     // 2. 创建实例
 *     const instance = await this.instanceService.create({
 *       configId: dto.configId,
 *       memberId: dto.memberId,
 *       instanceData: { groupId: dto.groupId },
 *     });
 *
 *     // 3. 扣减库存
 *     await this.stockService.deductStock(dto.configId, 1);
 *
 *     return instance;
 *   }
 * }
 *
 * // 步骤 3: 在模块中注册服务
 * @Module({
 *   providers: [GroupBuyService],
 *   exports: [GroupBuyService],
 * })
 * export class PlayModule {}
 *
 * // 步骤 4: 工厂类自动识别（无需修改工厂类代码）
 * // 工厂类会在初始化时自动扫描并注册 GroupBuyService
 *
 * @example
 * // ============================================
 * // 示例 2: 创建无实例的满减玩法
 * // ============================================
 *
 * @PlayStrategy('FULL_REDUCTION')
 * @Injectable()
 * export class FullReductionService implements IMarketingStrategy {
 *   readonly code = 'FULL_REDUCTION';
 *
 *   // 满减活动不需要创建实例，直接计算折扣
 *   async calculateDiscount(
 *     config: StorePlayConfig,
 *     orderAmount: number,
 *   ): Promise<number> {
 *     const rules = config.rules as FullReductionRules;
 *
 *     // 找到符合条件的最大档位
 *     let discount = 0;
 *     for (const tier of rules.tiers) {
 *       if (orderAmount >= tier.threshold) {
 *         discount = Math.max(discount, tier.discount);
 *       }
 *     }
 *
 *     return discount;
 *   }
 * }
 *
 * @example
 * // ============================================
 * // 示例 3: 在工厂类中使用元数据
 * // ============================================
 *
 * @Injectable()
 * export class PlayStrategyFactory {
 *   private strategies = new Map<string, IMarketingStrategy>();
 *
 *   constructor(
 *     private readonly moduleRef: ModuleRef,
 *   ) {}
 *
 *   onModuleInit() {
 *     // 自动扫描所有带 @PlayStrategy 装饰器的服务
 *     this.autoRegisterStrategies();
 *   }
 *
 *   private autoRegisterStrategies() {
 *     // 获取所有服务实例
 *     const services = [
 *       this.moduleRef.get(GroupBuyService, { strict: false }),
 *       this.moduleRef.get(FlashSaleService, { strict: false }),
 *       // ... 其他服务
 *     ];
 *
 *     for (const service of services) {
 *       if (service && isPlayStrategy(service.constructor)) {
 *         const code = getPlayCode(service.constructor);
 *         if (code) {
 *           this.strategies.set(code, service);
 *           console.log(`[玩法注册] ${code} 注册成功`);
 *         }
 *       }
 *     }
 *   }
 *
 *   getStrategy(code: string): IMarketingStrategy {
 *     const strategy = this.strategies.get(code);
 *     if (!strategy) {
 *       throw new Error(`玩法策略 "${code}" 未注册`);
 *     }
 *     return strategy;
 *   }
 *
 *   getMetadata(code: string): PlayMetadata {
 *     const strategy = this.getStrategy(code);
 *     return getPlayMetadata(strategy.constructor);
 *   }
 * }
 *
 * @example
 * // ============================================
 * // 示例 4: 错误处理
 * // ============================================
 *
 * // ❌ 错误：玩法代码未在注册表中
 * @PlayStrategy('UNKNOWN_PLAY')  // 抛出错误
 * export class UnknownService {}
 *
 * // ✅ 正确：先在注册表中添加
 * // 1. 在 play.registry.ts 中添加
 * export const PLAY_REGISTRY = {
 *   NEW_PLAY: { ... },
 * };
 *
 * // 2. 然后使用装饰器
 * @PlayStrategy('NEW_PLAY')
 * export class NewPlayService {}
 */
