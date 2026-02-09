import { Test, TestingModule } from '@nestjs/testing';
import { PlayStrategyFactory } from './play.factory';
import { PLAY_REGISTRY } from './play.registry';
import { MarketingStockMode } from '@prisma/client';
import { GroupBuyService } from './group-buy.service';
import { CourseGroupBuyService } from './course-group-buy.service';
import { FlashSaleService } from './flash-sale.service';
import { FullReductionService } from './full-reduction.service';
import { MemberUpgradeService } from './member-upgrade.service';

/**
 * 玩法工厂类单元测试
 * 
 * @description
 * 测试玩法工厂的核心功能：
 * - 元数据查询方法
 * - 策略获取方法
 * - 不存在的玩法代码处理
 * - 装饰器自动注册
 * 
 * @验证需求 FR-1.3, FR-1.4, US-2
 */
describe('PlayStrategyFactory', () => {
  let factory: PlayStrategyFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayStrategyFactory,
        GroupBuyService,
        CourseGroupBuyService,
        FlashSaleService,
        FullReductionService,
        MemberUpgradeService,
      ],
    }).compile();

    factory = module.get<PlayStrategyFactory>(PlayStrategyFactory);
  });

  it('应该成功创建工厂实例', () => {
    expect(factory).toBeDefined();
  });

  describe('getMetadata - 获取玩法元数据', () => {
    it('应该返回 GROUP_BUY 的元数据', () => {
      const metadata = factory.getMetadata('GROUP_BUY');

      expect(metadata).toBeDefined();
      expect(metadata.code).toBe('GROUP_BUY');
      expect(metadata.name).toBe('普通拼团');
      expect(metadata.hasInstance).toBe(true);
      expect(metadata.hasState).toBe(true);
    });

    it('应该返回 COURSE_GROUP_BUY 的元数据', () => {
      const metadata = factory.getMetadata('COURSE_GROUP_BUY');

      expect(metadata).toBeDefined();
      expect(metadata.code).toBe('COURSE_GROUP_BUY');
      expect(metadata.name).toBe('拼班课程');
    });

    it('应该返回 FLASH_SALE 的元数据', () => {
      const metadata = factory.getMetadata('FLASH_SALE');

      expect(metadata).toBeDefined();
      expect(metadata.code).toBe('FLASH_SALE');
      expect(metadata.name).toBe('限时秒杀');
    });

    it('应该返回 FULL_REDUCTION 的元数据', () => {
      const metadata = factory.getMetadata('FULL_REDUCTION');

      expect(metadata).toBeDefined();
      expect(metadata.code).toBe('FULL_REDUCTION');
      expect(metadata.name).toBe('满减活动');
    });

    it('应该返回 MEMBER_UPGRADE 的元数据', () => {
      const metadata = factory.getMetadata('MEMBER_UPGRADE');

      expect(metadata).toBeDefined();
      expect(metadata.code).toBe('MEMBER_UPGRADE');
      expect(metadata.name).toBe('会员升级');
    });

    it('不存在的玩法代码应该抛出异常', () => {
      expect(() => factory.getMetadata('NON_EXISTENT')).toThrow();
    });

    it('空字符串应该抛出异常', () => {
      expect(() => factory.getMetadata('')).toThrow();
    });

    it('null 应该抛出异常', () => {
      expect(() => factory.getMetadata(null as any)).toThrow();
    });

    it('undefined 应该抛出异常', () => {
      expect(() => factory.getMetadata(undefined as any)).toThrow();
    });
  });

  describe('getAllPlayTypes - 获取所有玩法类型', () => {
    it('应该返回所有玩法的元数据数组', () => {
      const allPlays = factory.getAllPlayTypes();

      expect(Array.isArray(allPlays)).toBe(true);
      expect(allPlays.length).toBeGreaterThanOrEqual(5);
    });

    it('返回的数组应该包含所有必需的玩法', () => {
      const allPlays = factory.getAllPlayTypes();
      const playCodes = allPlays.map((play) => play.code);

      expect(playCodes).toContain('GROUP_BUY');
      expect(playCodes).toContain('COURSE_GROUP_BUY');
      expect(playCodes).toContain('FLASH_SALE');
      expect(playCodes).toContain('FULL_REDUCTION');
      expect(playCodes).toContain('MEMBER_UPGRADE');
    });

    it('每个元数据应该包含所有必需字段', () => {
      const allPlays = factory.getAllPlayTypes();

      allPlays.forEach((metadata) => {
        expect(metadata.code).toBeDefined();
        expect(metadata.name).toBeDefined();
        expect(metadata.hasInstance).toBeDefined();
        expect(metadata.hasState).toBeDefined();
        expect(metadata.canFail).toBeDefined();
        expect(metadata.canParallel).toBeDefined();
        expect(metadata.ruleSchema).toBeDefined();
        expect(metadata.defaultStockMode).toBeDefined();
      });
    });

    it('返回的数组应该与 PLAY_REGISTRY 一致', () => {
      const allPlays = factory.getAllPlayTypes();
      const registryPlays = Object.values(PLAY_REGISTRY);

      expect(allPlays.length).toBe(registryPlays.length);
    });

    it('多次调用应该返回相同的结果', () => {
      const result1 = factory.getAllPlayTypes();
      const result2 = factory.getAllPlayTypes();

      expect(result1.length).toBe(result2.length);
      expect(result1.map((p) => p.code).sort()).toEqual(
        result2.map((p) => p.code).sort(),
      );
    });
  });

  describe('hasInstance - 检查是否有实例', () => {
    it('GROUP_BUY 应该有实例', () => {
      expect(factory.hasInstance('GROUP_BUY')).toBe(true);
    });

    it('COURSE_GROUP_BUY 应该有实例', () => {
      expect(factory.hasInstance('COURSE_GROUP_BUY')).toBe(true);
    });

    it('FLASH_SALE 应该有实例', () => {
      expect(factory.hasInstance('FLASH_SALE')).toBe(true);
    });

    it('FULL_REDUCTION 不应该有实例', () => {
      expect(factory.hasInstance('FULL_REDUCTION')).toBe(false);
    });

    it('MEMBER_UPGRADE 应该有实例', () => {
      expect(factory.hasInstance('MEMBER_UPGRADE')).toBe(true);
    });

    it('不存在的玩法代码应该抛出异常', () => {
      expect(() => factory.hasInstance('NON_EXISTENT')).toThrow();
    });
  });

  describe('canFail - 检查是否可以失败', () => {
    it('GROUP_BUY 应该可以失败', () => {
      expect(factory.canFail('GROUP_BUY')).toBe(true);
    });

    it('COURSE_GROUP_BUY 应该可以失败', () => {
      expect(factory.canFail('COURSE_GROUP_BUY')).toBe(true);
    });

    it('FLASH_SALE 不应该可以失败', () => {
      expect(factory.canFail('FLASH_SALE')).toBe(false);
    });

    it('FULL_REDUCTION 不应该可以失败', () => {
      expect(factory.canFail('FULL_REDUCTION')).toBe(false);
    });

    it('MEMBER_UPGRADE 不应该可以失败', () => {
      expect(factory.canFail('MEMBER_UPGRADE')).toBe(false);
    });

    it('不存在的玩法代码应该抛出异常', () => {
      expect(() => factory.canFail('NON_EXISTENT')).toThrow();
    });
  });

  describe('getDefaultStockMode - 获取默认库存模式', () => {
    it('GROUP_BUY 应该使用强锁模式', () => {
      expect(factory.getDefaultStockMode('GROUP_BUY')).toBe(
        MarketingStockMode.STRONG_LOCK,
      );
    });

    it('COURSE_GROUP_BUY 应该使用懒检查模式', () => {
      expect(factory.getDefaultStockMode('COURSE_GROUP_BUY')).toBe(
        MarketingStockMode.LAZY_CHECK,
      );
    });

    it('FLASH_SALE 应该使用强锁模式', () => {
      expect(factory.getDefaultStockMode('FLASH_SALE')).toBe(
        MarketingStockMode.STRONG_LOCK,
      );
    });

    it('FULL_REDUCTION 应该使用懒检查模式', () => {
      expect(factory.getDefaultStockMode('FULL_REDUCTION')).toBe(
        MarketingStockMode.LAZY_CHECK,
      );
    });

    it('MEMBER_UPGRADE 应该使用懒检查模式', () => {
      expect(factory.getDefaultStockMode('MEMBER_UPGRADE')).toBe(
        MarketingStockMode.LAZY_CHECK,
      );
    });

    it('不存在的玩法代码应该抛出异常', () => {
      expect(() => factory.getDefaultStockMode('NON_EXISTENT')).toThrow();
    });
  });

  describe('getStrategy - 获取策略实例', () => {
    it('应该返回 GROUP_BUY 的策略实例', () => {
      const strategy = factory.getStrategy('GROUP_BUY');

      expect(strategy).toBeDefined();
      expect(strategy.code).toBe('GROUP_BUY');
    });

    it('应该返回 COURSE_GROUP_BUY 的策略实例', () => {
      const strategy = factory.getStrategy('COURSE_GROUP_BUY');

      expect(strategy).toBeDefined();
      expect(strategy.code).toBe('COURSE_GROUP_BUY');
    });

    it('应该返回 FLASH_SALE 的策略实例', () => {
      const strategy = factory.getStrategy('FLASH_SALE');

      expect(strategy).toBeDefined();
      expect(strategy.code).toBe('FLASH_SALE');
    });

    it('应该返回 FULL_REDUCTION 的策略实例', () => {
      const strategy = factory.getStrategy('FULL_REDUCTION');

      expect(strategy).toBeDefined();
      expect(strategy.code).toBe('FULL_REDUCTION');
    });

    it('应该返回 MEMBER_UPGRADE 的策略实例', () => {
      const strategy = factory.getStrategy('MEMBER_UPGRADE');

      expect(strategy).toBeDefined();
      expect(strategy.code).toBe('MEMBER_UPGRADE');
    });

    it('不存在的玩法代码应该抛出异常', () => {
      expect(() => factory.getStrategy('NON_EXISTENT')).toThrow();
    });

    it('多次获取同一策略应该返回相同实例', () => {
      const strategy1 = factory.getStrategy('GROUP_BUY');
      const strategy2 = factory.getStrategy('GROUP_BUY');

      expect(strategy1).toBe(strategy2);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理大小写敏感的玩法代码', () => {
      expect(() => factory.getMetadata('group_buy')).toThrow();
      expect(() => factory.getMetadata('Group_Buy')).toThrow();
    });

    it('应该处理带空格的玩法代码', () => {
      expect(() => factory.getMetadata(' GROUP_BUY ')).toThrow();
      expect(() => factory.getMetadata('GROUP BUY')).toThrow();
    });

    it('应该处理特殊字符的玩法代码', () => {
      expect(() => factory.getMetadata('GROUP-BUY')).toThrow();
      expect(() => factory.getMetadata('GROUP.BUY')).toThrow();
    });
  });

  describe('性能测试', () => {
    it('获取元数据应该很快', () => {
      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        factory.getMetadata('GROUP_BUY');
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // 1000次操作应该在100ms内完成
    });

    it('获取所有玩法类型应该很快', () => {
      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        factory.getAllPlayTypes();
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });

    it('获取策略实例应该很快', () => {
      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        factory.getStrategy('GROUP_BUY');
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });
  });

  describe('集成测试', () => {
    it('所有注册的玩法都应该有对应的策略实例', () => {
      const allPlays = factory.getAllPlayTypes();

      allPlays.forEach((metadata) => {
        expect(() => factory.getStrategy(metadata.code)).not.toThrow();
      });
    });

    it('所有策略实例的 code 应该与元数据一致', () => {
      const allPlays = factory.getAllPlayTypes();

      allPlays.forEach((metadata) => {
        const strategy = factory.getStrategy(metadata.code);
        expect(strategy.code).toBe(metadata.code);
      });
    });

    it('元数据的 hasInstance 应该与策略实现一致', () => {
      const allPlays = factory.getAllPlayTypes();

      allPlays.forEach((metadata) => {
        const hasInstance = factory.hasInstance(metadata.code);
        expect(hasInstance).toBe(metadata.hasInstance);
      });
    });

    it('元数据的 canFail 应该与策略实现一致', () => {
      const allPlays = factory.getAllPlayTypes();

      allPlays.forEach((metadata) => {
        const canFail = factory.canFail(metadata.code);
        expect(canFail).toBe(metadata.canFail);
      });
    });

    it('元数据的 defaultStockMode 应该与策略实现一致', () => {
      const allPlays = factory.getAllPlayTypes();

      allPlays.forEach((metadata) => {
        const stockMode = factory.getDefaultStockMode(metadata.code);
        expect(stockMode).toBe(metadata.defaultStockMode);
      });
    });
  });
});
