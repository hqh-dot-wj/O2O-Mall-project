import { Test, TestingModule } from '@nestjs/testing';
import { RuleValidatorService } from './rule-validator.service';
import { PlayStrategyFactory } from '../play/play.factory';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

// Mock class-validator
jest.mock('class-validator');
jest.mock('class-transformer');

/**
 * 规则校验服务单元测试
 * 
 * @description
 * 测试规则校验服务的核心功能：
 * - DTO 校验（基于 class-validator）
 * - 业务逻辑校验（调用 Strategy.validateConfig）
 * - 表单 Schema 生成
 * - 错误信息格式化
 * 
 * @验证需求 FR-2.1, FR-2.2, FR-2.3, FR-2.4, US-1
 */
describe('RuleValidatorService', () => {
  let service: RuleValidatorService;
  let mockFactory: jest.Mocked<PlayStrategyFactory>;

  beforeEach(async () => {
    // 创建 PlayStrategyFactory mock
    mockFactory = {
      getMetadata: jest.fn(),
      getStrategy: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuleValidatorService,
        {
          provide: PlayStrategyFactory,
          useValue: mockFactory,
        },
      ],
    }).compile();

    service = module.get<RuleValidatorService>(RuleValidatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功创建服务实例', () => {
    expect(service).toBeDefined();
  });

  describe('validate - 统一规则校验', () => {
    it('应该通过合法的规则校验', async () => {
      const rules = {
        minUsers: 3,
        maxUsers: 10,
        price: 199,
      };

      // Mock metadata
      mockFactory.getMetadata.mockReturnValue({
        code: 'GROUP_BUY',
        name: '普通拼团',
        ruleSchema: class {},
      } as any);

      // Mock plainToInstance
      (plainToInstance as jest.Mock).mockReturnValue(rules);

      // Mock validate - 返回空数组表示没有错误
      (validate as jest.Mock).mockResolvedValue([]);

      // Mock strategy
      const mockStrategy = {
        validateConfig: jest.fn().mockResolvedValue(undefined),
      };
      mockFactory.getStrategy.mockReturnValue(mockStrategy as any);

      const result = await service.validate('GROUP_BUY', rules);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('应该拒绝不合法的规则（DTO 校验失败）', async () => {
      const rules = {
        minUsers: -1, // 非法值
        maxUsers: 10,
        price: 199,
      };

      mockFactory.getMetadata.mockReturnValue({
        code: 'GROUP_BUY',
        name: '普通拼团',
        ruleSchema: class {},
      } as any);

      (plainToInstance as jest.Mock).mockReturnValue(rules);

      // Mock validate - 返回错误
      (validate as jest.Mock).mockResolvedValue([
        {
          property: 'minUsers',
          constraints: {
            min: 'minUsers must not be less than 2',
          },
        },
      ]);

      const result = await service.validate('GROUP_BUY', rules);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝不合法的规则（业务逻辑校验失败）', async () => {
      const rules = {
        minUsers: 3,
        maxUsers: 2, // maxUsers < minUsers
        price: 199,
      };

      mockFactory.getMetadata.mockReturnValue({
        code: 'GROUP_BUY',
        name: '普通拼团',
        ruleSchema: class {},
      } as any);

      (plainToInstance as jest.Mock).mockReturnValue(rules);
      (validate as jest.Mock).mockResolvedValue([]);

      // Mock strategy - 业务逻辑校验失败
      const mockStrategy = {
        validateConfig: jest.fn().mockRejectedValue(
          new Error('maxUsers 必须大于等于 minUsers'),
        ),
      };
      mockFactory.getStrategy.mockReturnValue(mockStrategy as any);

      const result = await service.validate('GROUP_BUY', rules);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该处理不存在的玩法代码', async () => {
      mockFactory.getMetadata.mockImplementation(() => {
        throw new Error('玩法不存在');
      });

      await expect(service.validate('NON_EXISTENT', {})).rejects.toThrow(
        '玩法不存在',
      );
    });

    it('应该处理 null 规则', async () => {
      mockFactory.getMetadata.mockReturnValue({
        code: 'GROUP_BUY',
        name: '普通拼团',
        ruleSchema: class {},
      } as any);

      (plainToInstance as jest.Mock).mockReturnValue(null);
      (validate as jest.Mock).mockResolvedValue([]);

      await expect(service.validate('GROUP_BUY', null as any)).resolves.toBeDefined();
    });

    it('应该处理 undefined 规则', async () => {
      mockFactory.getMetadata.mockReturnValue({
        code: 'GROUP_BUY',
        name: '普通拼团',
        ruleSchema: class {},
      } as any);

      (plainToInstance as jest.Mock).mockReturnValue(undefined);
      (validate as jest.Mock).mockResolvedValue([]);

      await expect(
        service.validate('GROUP_BUY', undefined as any),
      ).resolves.toBeDefined();
    });
  });

  describe('getRuleFormSchema - 获取规则表单 Schema', () => {
    it('应该返回 GROUP_BUY 的表单 Schema', () => {
      mockFactory.getMetadata.mockReturnValue({
        code: 'GROUP_BUY',
        name: '普通拼团',
        ruleSchema: class {
          minUsers: number;
          maxUsers: number;
          price: number;
        },
      } as any);

      const schema = service.getRuleFormSchema('GROUP_BUY');

      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
    });

    it('应该返回 COURSE_GROUP_BUY 的表单 Schema', () => {
      mockFactory.getMetadata.mockReturnValue({
        code: 'COURSE_GROUP_BUY',
        name: '拼班课程',
        ruleSchema: class {
          minUsers: number;
          maxUsers: number;
          price: number;
          joinDeadline: Date;
        },
      } as any);

      const schema = service.getRuleFormSchema('COURSE_GROUP_BUY');

      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
    });

    it('应该处理不存在的玩法代码', () => {
      mockFactory.getMetadata.mockImplementation(() => {
        throw new Error('玩法不存在');
      });

      expect(() => service.getRuleFormSchema('NON_EXISTENT')).toThrow(
        '玩法不存在',
      );
    });

    it('Schema 应该包含必需字段标记', () => {
      mockFactory.getMetadata.mockReturnValue({
        code: 'GROUP_BUY',
        name: '普通拼团',
        ruleSchema: class {
          minUsers: number;
          maxUsers: number;
          price: number;
        },
      } as any);

      const schema = service.getRuleFormSchema('GROUP_BUY');

      expect(schema.required).toBeDefined();
      expect(Array.isArray(schema.required)).toBe(true);
    });

    it('Schema 应该包含字段类型信息', () => {
      mockFactory.getMetadata.mockReturnValue({
        code: 'GROUP_BUY',
        name: '普通拼团',
        ruleSchema: class {
          minUsers: number;
          maxUsers: number;
          price: number;
        },
      } as any);

      const schema = service.getRuleFormSchema('GROUP_BUY');

      expect(schema.properties).toBeDefined();
      Object.values(schema.properties).forEach((prop: any) => {
        expect(prop.type).toBeDefined();
      });
    });
  });

  describe('formatErrors - 格式化错误信息', () => {
    it('应该格式化单个错误', () => {
      const validationErrors = [
        {
          property: 'minUsers',
          constraints: {
            min: 'minUsers must not be less than 2',
          },
        },
      ];

      const formatted = service['formatErrors'](validationErrors);

      expect(formatted.length).toBe(1);
      expect(formatted[0].field).toBe('minUsers');
      expect(formatted[0].message).toBeDefined();
    });

    it('应该格式化多个错误', () => {
      const validationErrors = [
        {
          property: 'minUsers',
          constraints: {
            min: 'minUsers must not be less than 2',
          },
        },
        {
          property: 'price',
          constraints: {
            min: 'price must not be less than 0',
          },
        },
      ];

      const formatted = service['formatErrors'](validationErrors);

      expect(formatted.length).toBe(2);
      expect(formatted[0].field).toBe('minUsers');
      expect(formatted[1].field).toBe('price');
    });

    it('应该处理多个约束的错误', () => {
      const validationErrors = [
        {
          property: 'minUsers',
          constraints: {
            min: 'minUsers must not be less than 2',
            max: 'minUsers must not be greater than 100',
            isInt: 'minUsers must be an integer',
          },
        },
      ];

      const formatted = service['formatErrors'](validationErrors);

      expect(formatted.length).toBeGreaterThan(0);
      expect(formatted[0].field).toBe('minUsers');
    });

    it('应该处理嵌套字段的错误', () => {
      const validationErrors = [
        {
          property: 'rules.minUsers',
          constraints: {
            min: 'minUsers must not be less than 2',
          },
        },
      ];

      const formatted = service['formatErrors'](validationErrors);

      expect(formatted.length).toBe(1);
      expect(formatted[0].field).toBe('rules.minUsers');
    });

    it('应该处理空错误数组', () => {
      const formatted = service['formatErrors']([]);

      expect(formatted).toEqual([]);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空字符串玩法代码', async () => {
      mockFactory.getMetadata.mockImplementation(() => {
        throw new Error('玩法代码不能为空');
      });

      await expect(service.validate('', {})).rejects.toThrow();
    });

    it('应该处理特殊字符的玩法代码', async () => {
      mockFactory.getMetadata.mockImplementation(() => {
        throw new Error('玩法不存在');
      });

      await expect(service.validate('GROUP-BUY', {})).rejects.toThrow();
    });

    it('应该处理超大规则对象', async () => {
      const largeRules = {
        ...Array(1000)
          .fill(null)
          .reduce((acc, _, i) => ({ ...acc, [`field${i}`]: i }), {}),
      };

      mockFactory.getMetadata.mockReturnValue({
        code: 'GROUP_BUY',
        name: '普通拼团',
        ruleSchema: class {},
      } as any);

      (plainToInstance as jest.Mock).mockReturnValue(largeRules);
      (validate as jest.Mock).mockResolvedValue([]);

      const mockStrategy = {
        validateConfig: jest.fn().mockResolvedValue(undefined),
      };
      mockFactory.getStrategy.mockReturnValue(mockStrategy as any);

      await expect(
        service.validate('GROUP_BUY', largeRules),
      ).resolves.toBeDefined();
    });

    it('应该处理循环引用的规则对象', async () => {
      const circularRules: any = { a: 1 };
      circularRules.self = circularRules;

      mockFactory.getMetadata.mockReturnValue({
        code: 'GROUP_BUY',
        name: '普通拼团',
        ruleSchema: class {},
      } as any);

      (plainToInstance as jest.Mock).mockReturnValue(circularRules);
      (validate as jest.Mock).mockResolvedValue([]);

      const mockStrategy = {
        validateConfig: jest.fn().mockResolvedValue(undefined),
      };
      mockFactory.getStrategy.mockReturnValue(mockStrategy as any);

      // 应该能处理循环引用而不抛出异常
      await expect(
        service.validate('GROUP_BUY', circularRules),
      ).resolves.toBeDefined();
    });
  });

  describe('性能测试', () => {
    it('校验应该在 100ms 内完成', async () => {
      const rules = {
        minUsers: 3,
        maxUsers: 10,
        price: 199,
      };

      mockFactory.getMetadata.mockReturnValue({
        code: 'GROUP_BUY',
        name: '普通拼团',
        ruleSchema: class {},
      } as any);

      (plainToInstance as jest.Mock).mockReturnValue(rules);
      (validate as jest.Mock).mockResolvedValue([]);

      const mockStrategy = {
        validateConfig: jest.fn().mockResolvedValue(undefined),
      };
      mockFactory.getStrategy.mockReturnValue(mockStrategy as any);

      const startTime = Date.now();
      await service.validate('GROUP_BUY', rules);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });

    it('获取表单 Schema 应该很快', () => {
      mockFactory.getMetadata.mockReturnValue({
        code: 'GROUP_BUY',
        name: '普通拼团',
        ruleSchema: class {
          minUsers: number;
          maxUsers: number;
          price: number;
        },
      } as any);

      const startTime = Date.now();
      service.getRuleFormSchema('GROUP_BUY');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10);
    });
  });

  describe('集成测试', () => {
    it('应该支持所有注册的玩法类型', async () => {
      const playTypes = [
        'GROUP_BUY',
        'COURSE_GROUP_BUY',
        'FLASH_SALE',
        'FULL_REDUCTION',
        'MEMBER_UPGRADE',
      ];

      for (const playType of playTypes) {
        mockFactory.getMetadata.mockReturnValue({
          code: playType,
          name: '测试玩法',
          ruleSchema: class {},
        } as any);

        (plainToInstance as jest.Mock).mockReturnValue({});
        (validate as jest.Mock).mockResolvedValue([]);

        const mockStrategy = {
          validateConfig: jest.fn().mockResolvedValue(undefined),
        };
        mockFactory.getStrategy.mockReturnValue(mockStrategy as any);

        await expect(service.validate(playType, {})).resolves.toBeDefined();
      }
    });

    it('DTO 校验和业务逻辑校验应该都执行', async () => {
      const rules = {
        minUsers: 3,
        maxUsers: 10,
        price: 199,
      };

      mockFactory.getMetadata.mockReturnValue({
        code: 'GROUP_BUY',
        name: '普通拼团',
        ruleSchema: class {},
      } as any);

      (plainToInstance as jest.Mock).mockReturnValue(rules);
      (validate as jest.Mock).mockResolvedValue([]);

      const mockStrategy = {
        validateConfig: jest.fn().mockResolvedValue(undefined),
      };
      mockFactory.getStrategy.mockReturnValue(mockStrategy as any);

      await service.validate('GROUP_BUY', rules);

      // 验证两种校验都被调用
      expect(validate).toHaveBeenCalled();
      expect(mockStrategy.validateConfig).toHaveBeenCalled();
    });

    it('DTO 校验失败应该跳过业务逻辑校验', async () => {
      const rules = {
        minUsers: -1,
        maxUsers: 10,
        price: 199,
      };

      mockFactory.getMetadata.mockReturnValue({
        code: 'GROUP_BUY',
        name: '普通拼团',
        ruleSchema: class {},
      } as any);

      (plainToInstance as jest.Mock).mockReturnValue(rules);
      (validate as jest.Mock).mockResolvedValue([
        {
          property: 'minUsers',
          constraints: { min: 'error' },
        },
      ]);

      const mockStrategy = {
        validateConfig: jest.fn().mockResolvedValue(undefined),
      };
      mockFactory.getStrategy.mockReturnValue(mockStrategy as any);

      await service.validate('GROUP_BUY', rules);

      // DTO 校验失败，业务逻辑校验不应该被调用
      expect(mockStrategy.validateConfig).not.toHaveBeenCalled();
    });
  });
});
