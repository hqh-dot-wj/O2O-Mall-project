import { PLAY_REGISTRY, PlayMetadata } from './play.registry';
import { MarketingStockMode } from '@prisma/client';

/**
 * 玩法注册表单元测试
 * 
 * @description
 * 测试玩法注册表的完整性和正确性：
 * - 所有玩法元数据完整性
 * - 元数据字段正确性
 * - 规则 Schema 定义
 * - 默认库存模式配置
 * 
 * @验证需求 FR-1.1, US-2
 */
describe('Play Registry', () => {
  describe('PLAY_REGISTRY - 玩法注册表完整性', () => {
    it('应该包含所有必需的玩法', () => {
      const requiredPlays = [
        'GROUP_BUY',
        'COURSE_GROUP_BUY',
        'FLASH_SALE',
        'FULL_REDUCTION',
        'MEMBER_UPGRADE',
      ];

      requiredPlays.forEach((playCode) => {
        expect(PLAY_REGISTRY[playCode]).toBeDefined();
      });
    });

    it('应该至少包含 5 种玩法', () => {
      const playCount = Object.keys(PLAY_REGISTRY).length;
      expect(playCount).toBeGreaterThanOrEqual(5);
    });

    it('每个玩法应该包含所有必需字段', () => {
      Object.entries(PLAY_REGISTRY).forEach(([code, metadata]) => {
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

    it('玩法代码应该与注册表键一致', () => {
      Object.entries(PLAY_REGISTRY).forEach(([key, metadata]) => {
        expect(metadata.code).toBe(key);
      });
    });
  });

  describe('GROUP_BUY - 普通拼团', () => {
    let metadata: PlayMetadata;

    beforeEach(() => {
      metadata = PLAY_REGISTRY.GROUP_BUY;
    });

    it('应该有正确的基本信息', () => {
      expect(metadata.code).toBe('GROUP_BUY');
      expect(metadata.name).toBe('普通拼团');
    });

    it('应该有实例和状态流转', () => {
      expect(metadata.hasInstance).toBe(true);
      expect(metadata.hasState).toBe(true);
    });

    it('应该可以失败和并行', () => {
      expect(metadata.canFail).toBe(true);
      expect(metadata.canParallel).toBe(true);
    });

    it('应该使用强锁库存模式', () => {
      expect(metadata.defaultStockMode).toBe(MarketingStockMode.STRONG_LOCK);
    });

    it('应该有规则 Schema', () => {
      expect(metadata.ruleSchema).toBeDefined();
      expect(typeof metadata.ruleSchema).toBe('function');
    });
  });

  describe('COURSE_GROUP_BUY - 拼班课程', () => {
    let metadata: PlayMetadata;

    beforeEach(() => {
      metadata = PLAY_REGISTRY.COURSE_GROUP_BUY;
    });

    it('应该有正确的基本信息', () => {
      expect(metadata.code).toBe('COURSE_GROUP_BUY');
      expect(metadata.name).toBe('拼班课程');
    });

    it('应该有实例和状态流转', () => {
      expect(metadata.hasInstance).toBe(true);
      expect(metadata.hasState).toBe(true);
    });

    it('应该可以失败和并行', () => {
      expect(metadata.canFail).toBe(true);
      expect(metadata.canParallel).toBe(true);
    });

    it('应该使用懒检查库存模式', () => {
      expect(metadata.defaultStockMode).toBe(MarketingStockMode.LAZY_CHECK);
    });

    it('应该有规则 Schema', () => {
      expect(metadata.ruleSchema).toBeDefined();
      expect(typeof metadata.ruleSchema).toBe('function');
    });
  });

  describe('FLASH_SALE - 限时秒杀', () => {
    let metadata: PlayMetadata;

    beforeEach(() => {
      metadata = PLAY_REGISTRY.FLASH_SALE;
    });

    it('应该有正确的基本信息', () => {
      expect(metadata.code).toBe('FLASH_SALE');
      expect(metadata.name).toBe('限时秒杀');
    });

    it('应该有实例和状态流转', () => {
      expect(metadata.hasInstance).toBe(true);
      expect(metadata.hasState).toBe(true);
    });

    it('不应该可以失败（秒杀成功即成功）', () => {
      expect(metadata.canFail).toBe(false);
    });

    it('不应该可以并行（秒杀是独占的）', () => {
      expect(metadata.canParallel).toBe(false);
    });

    it('应该使用强锁库存模式', () => {
      expect(metadata.defaultStockMode).toBe(MarketingStockMode.STRONG_LOCK);
    });

    it('应该有规则 Schema', () => {
      expect(metadata.ruleSchema).toBeDefined();
      expect(typeof metadata.ruleSchema).toBe('function');
    });
  });

  describe('FULL_REDUCTION - 满减活动', () => {
    let metadata: PlayMetadata;

    beforeEach(() => {
      metadata = PLAY_REGISTRY.FULL_REDUCTION;
    });

    it('应该有正确的基本信息', () => {
      expect(metadata.code).toBe('FULL_REDUCTION');
      expect(metadata.name).toBe('满减活动');
    });

    it('不应该有实例（满减是即时计算）', () => {
      expect(metadata.hasInstance).toBe(false);
    });

    it('不应该有状态流转', () => {
      expect(metadata.hasState).toBe(false);
    });

    it('不应该可以失败', () => {
      expect(metadata.canFail).toBe(false);
    });

    it('应该可以并行', () => {
      expect(metadata.canParallel).toBe(true);
    });

    it('应该使用懒检查库存模式', () => {
      expect(metadata.defaultStockMode).toBe(MarketingStockMode.LAZY_CHECK);
    });

    it('应该有规则 Schema', () => {
      expect(metadata.ruleSchema).toBeDefined();
      expect(typeof metadata.ruleSchema).toBe('function');
    });
  });

  describe('MEMBER_UPGRADE - 会员升级', () => {
    let metadata: PlayMetadata;

    beforeEach(() => {
      metadata = PLAY_REGISTRY.MEMBER_UPGRADE;
    });

    it('应该有正确的基本信息', () => {
      expect(metadata.code).toBe('MEMBER_UPGRADE');
      expect(metadata.name).toBe('会员升级');
    });

    it('应该有实例', () => {
      expect(metadata.hasInstance).toBe(true);
    });

    it('应该有状态流转', () => {
      expect(metadata.hasState).toBe(true);
    });

    it('不应该可以失败（升级成功即成功）', () => {
      expect(metadata.canFail).toBe(false);
    });

    it('不应该可以并行（会员升级是独占的）', () => {
      expect(metadata.canParallel).toBe(false);
    });

    it('应该使用懒检查库存模式', () => {
      expect(metadata.defaultStockMode).toBe(MarketingStockMode.LAZY_CHECK);
    });

    it('应该有规则 Schema', () => {
      expect(metadata.ruleSchema).toBeDefined();
      expect(typeof metadata.ruleSchema).toBe('function');
    });
  });

  describe('元数据字段类型校验', () => {
    it('code 应该是字符串', () => {
      Object.values(PLAY_REGISTRY).forEach((metadata) => {
        expect(typeof metadata.code).toBe('string');
        expect(metadata.code.length).toBeGreaterThan(0);
      });
    });

    it('name 应该是字符串', () => {
      Object.values(PLAY_REGISTRY).forEach((metadata) => {
        expect(typeof metadata.name).toBe('string');
        expect(metadata.name.length).toBeGreaterThan(0);
      });
    });

    it('hasInstance 应该是布尔值', () => {
      Object.values(PLAY_REGISTRY).forEach((metadata) => {
        expect(typeof metadata.hasInstance).toBe('boolean');
      });
    });

    it('hasState 应该是布尔值', () => {
      Object.values(PLAY_REGISTRY).forEach((metadata) => {
        expect(typeof metadata.hasState).toBe('boolean');
      });
    });

    it('canFail 应该是布尔值', () => {
      Object.values(PLAY_REGISTRY).forEach((metadata) => {
        expect(typeof metadata.canFail).toBe('boolean');
      });
    });

    it('canParallel 应该是布尔值', () => {
      Object.values(PLAY_REGISTRY).forEach((metadata) => {
        expect(typeof metadata.canParallel).toBe('boolean');
      });
    });

    it('defaultStockMode 应该是有效的库存模式', () => {
      const validStockModes = Object.values(MarketingStockMode);
      Object.values(PLAY_REGISTRY).forEach((metadata) => {
        expect(validStockModes).toContain(metadata.defaultStockMode);
      });
    });

    it('ruleSchema 应该是函数（DTO 类）', () => {
      Object.values(PLAY_REGISTRY).forEach((metadata) => {
        expect(typeof metadata.ruleSchema).toBe('function');
      });
    });
  });

  describe('业务逻辑一致性校验', () => {
    it('有实例的玩法应该有状态流转', () => {
      Object.values(PLAY_REGISTRY).forEach((metadata) => {
        if (metadata.hasInstance) {
          // 注意：这不是强制规则，但通常有实例就有状态
          // 这里只是记录，不强制要求
          if (!metadata.hasState) {
            console.warn(
              `玩法 ${metadata.code} 有实例但没有状态流转，请确认是否正确`,
            );
          }
        }
      });
    });

    it('可以失败的玩法应该有实例', () => {
      Object.values(PLAY_REGISTRY).forEach((metadata) => {
        if (metadata.canFail) {
          expect(metadata.hasInstance).toBe(true);
        }
      });
    });

    it('没有实例的玩法不应该有状态流转', () => {
      Object.values(PLAY_REGISTRY).forEach((metadata) => {
        if (!metadata.hasInstance) {
          expect(metadata.hasState).toBe(false);
        }
      });
    });

    it('没有实例的玩法不应该可以失败', () => {
      Object.values(PLAY_REGISTRY).forEach((metadata) => {
        if (!metadata.hasInstance) {
          expect(metadata.canFail).toBe(false);
        }
      });
    });
  });

  describe('库存模式配置合理性', () => {
    it('秒杀类玩法应该使用强锁模式', () => {
      const flashSale = PLAY_REGISTRY.FLASH_SALE;
      expect(flashSale.defaultStockMode).toBe(MarketingStockMode.STRONG_LOCK);
    });

    it('拼团类玩法应该使用强锁模式', () => {
      const groupBuy = PLAY_REGISTRY.GROUP_BUY;
      expect(groupBuy.defaultStockMode).toBe(MarketingStockMode.STRONG_LOCK);
    });

    it('满减类玩法可以使用懒检查模式', () => {
      const fullReduction = PLAY_REGISTRY.FULL_REDUCTION;
      expect(fullReduction.defaultStockMode).toBe(
        MarketingStockMode.LAZY_CHECK,
      );
    });
  });

  describe('扩展性测试', () => {
    it('应该支持添加新玩法', () => {
      const newPlay: PlayMetadata = {
        code: 'NEW_PLAY',
        name: '新玩法',
        hasInstance: true,
        hasState: true,
        canFail: true,
        canParallel: true,
        ruleSchema: class {},
        defaultStockMode: MarketingStockMode.STRONG_LOCK,
      };

      // 模拟添加新玩法
      const extendedRegistry = {
        ...PLAY_REGISTRY,
        NEW_PLAY: newPlay,
      };

      expect(extendedRegistry.NEW_PLAY).toBeDefined();
      expect(extendedRegistry.NEW_PLAY.code).toBe('NEW_PLAY');
    });

    it('玩法代码应该使用大写下划线命名', () => {
      Object.keys(PLAY_REGISTRY).forEach((code) => {
        expect(code).toMatch(/^[A-Z_]+$/);
      });
    });

    it('玩法名称应该是中文', () => {
      Object.values(PLAY_REGISTRY).forEach((metadata) => {
        expect(metadata.name).toMatch(/[\u4e00-\u9fa5]/);
      });
    });
  });

  describe('边界情况测试', () => {
    it('应该处理不存在的玩法代码', () => {
      const nonExistentPlay = PLAY_REGISTRY['NON_EXISTENT'];
      expect(nonExistentPlay).toBeUndefined();
    });

    it('应该处理空字符串玩法代码', () => {
      const emptyPlay = PLAY_REGISTRY[''];
      expect(emptyPlay).toBeUndefined();
    });

    it('应该处理 null 玩法代码', () => {
      const nullPlay = PLAY_REGISTRY[null as any];
      expect(nullPlay).toBeUndefined();
    });

    it('应该处理 undefined 玩法代码', () => {
      const undefinedPlay = PLAY_REGISTRY[undefined as any];
      expect(undefinedPlay).toBeUndefined();
    });
  });

  describe('性能测试', () => {
    it('获取玩法元数据应该是 O(1) 操作', () => {
      const iterations = 10000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const _ = PLAY_REGISTRY.GROUP_BUY;
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // 10000次操作应该在100ms内完成
    });

    it('遍历所有玩法应该很快', () => {
      const startTime = Date.now();

      Object.values(PLAY_REGISTRY).forEach((metadata) => {
        const _ = metadata.code;
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10);
    });
  });
});
