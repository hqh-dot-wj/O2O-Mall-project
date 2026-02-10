import { Test, TestingModule } from '@nestjs/testing';
import { PointsRuleService } from '../../src/module/marketing/points/rule/rule.service';
import { PointsRuleRepository } from '../../src/module/marketing/points/rule/rule.repository';
import { ClsService } from 'nestjs-cls';
import { Decimal } from '@prisma/client/runtime/library';
import * as fc from 'fast-check';

/**
 * 积分规则属性测试
 * 
 * 使用 fast-check 进行基于属性的测试，验证积分规则的正确性属性
 */
describe('PointsRuleService - Property-Based Tests', () => {
  let service: PointsRuleService;
  let repo: PointsRuleRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsRuleService,
        {
          provide: PointsRuleRepository,
          useValue: {
            findByTenantId: jest.fn(),
            create: jest.fn(),
            upsert: jest.fn(),
          },
        },
        {
          provide: ClsService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'tenantId') return '00000';
              if (key === 'userId') return 'test-user-001';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PointsRuleService>(PointsRuleService);
    repo = module.get<PointsRuleRepository>(PointsRuleRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 13: 积分计算正确性
   * 
   * **Validates: Requirements 6.2**
   * 
   * 对于任何订单支付成功事件，根据消费积分规则计算的积分数量应该等于
   * 订单实付金额除以基数乘以比例
   * 
   * 公式: floor(orderAmount / orderPointsBase) * orderPointsRatio
   */
  describe('Property 13: 积分计算正确性', () => {
    it('should calculate order points correctly based on the formula', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            orderAmount: fc.integer({ min: 1, max: 100000 }),
            orderPointsBase: fc.integer({ min: 1, max: 1000 }),
            orderPointsRatio: fc.integer({ min: 1, max: 100 }),
          }),
          async ({ orderAmount, orderPointsBase, orderPointsRatio }) => {
            // 模拟积分规则
            const mockRule = {
              tenantId: '00000',
              orderPointsEnabled: true,
              systemEnabled: true,
              orderPointsBase: new Decimal(orderPointsBase),
              orderPointsRatio: new Decimal(orderPointsRatio),
            };

            jest.spyOn(repo, 'findByTenantId').mockResolvedValue(mockRule as any);

            // 计算积分
            const result = await service.calculateOrderPoints(new Decimal(orderAmount));

            // 验证计算正确性
            // 公式: floor(orderAmount / orderPointsBase) * orderPointsRatio
            const expectedPoints = Math.floor(orderAmount / orderPointsBase) * orderPointsRatio;

            expect(result).toBe(Math.max(0, expectedPoints));
            expect(result).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 points when order points are disabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            orderAmount: fc.integer({ min: 1, max: 100000 }),
            orderPointsBase: fc.integer({ min: 1, max: 1000 }),
            orderPointsRatio: fc.integer({ min: 1, max: 100 }),
          }),
          async ({ orderAmount, orderPointsBase, orderPointsRatio }) => {
            // 模拟积分规则（消费积分功能已禁用）
            const mockRule = {
              tenantId: '00000',
              orderPointsEnabled: false,
              systemEnabled: true,
              orderPointsBase: new Decimal(orderPointsBase),
              orderPointsRatio: new Decimal(orderPointsRatio),
            };

            jest.spyOn(repo, 'findByTenantId').mockResolvedValue(mockRule as any);

            // 计算积分
            const result = await service.calculateOrderPoints(new Decimal(orderAmount));

            // 功能禁用时应返回0
            expect(result).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 points when system is disabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            orderAmount: fc.integer({ min: 1, max: 100000 }),
            orderPointsBase: fc.integer({ min: 1, max: 1000 }),
            orderPointsRatio: fc.integer({ min: 1, max: 100 }),
          }),
          async ({ orderAmount, orderPointsBase, orderPointsRatio }) => {
            // 模拟积分规则（系统已禁用）
            const mockRule = {
              tenantId: '00000',
              orderPointsEnabled: true,
              systemEnabled: false,
              orderPointsBase: new Decimal(orderPointsBase),
              orderPointsRatio: new Decimal(orderPointsRatio),
            };

            jest.spyOn(repo, 'findByTenantId').mockResolvedValue(mockRule as any);

            // 计算积分
            const result = await service.calculateOrderPoints(new Decimal(orderAmount));

            // 系统禁用时应返回0
            expect(result).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle zero order amount correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            orderPointsBase: fc.integer({ min: 1, max: 1000 }),
            orderPointsRatio: fc.integer({ min: 1, max: 100 }),
          }),
          async ({ orderPointsBase, orderPointsRatio }) => {
            const mockRule = {
              tenantId: '00000',
              orderPointsEnabled: true,
              systemEnabled: true,
              orderPointsBase: new Decimal(orderPointsBase),
              orderPointsRatio: new Decimal(orderPointsRatio),
            };

            jest.spyOn(repo, 'findByTenantId').mockResolvedValue(mockRule as any);

            // 订单金额为0
            const result = await service.calculateOrderPoints(new Decimal(0));

            // 应返回0积分
            expect(result).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 14: 积分抵扣计算正确性
   * 
   * **Validates: Requirements 7.6**
   * 
   * 对于任何积分抵扣操作，抵扣金额应该等于使用积分数量除以兑换比例乘以兑换基数
   * 
   * 公式: floor(points / pointsRedemptionRatio) * pointsRedemptionBase
   */
  describe('Property 14: 积分抵扣计算正确性', () => {
    it('should calculate points discount correctly based on the formula', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            points: fc.integer({ min: 1, max: 100000 }),
            pointsRedemptionRatio: fc.integer({ min: 1, max: 1000 }),
            pointsRedemptionBase: fc.integer({ min: 1, max: 100 }),
          }),
          async ({ points, pointsRedemptionRatio, pointsRedemptionBase }) => {
            // 模拟积分规则
            const mockRule = {
              tenantId: '00000',
              pointsRedemptionEnabled: true,
              systemEnabled: true,
              pointsRedemptionRatio: new Decimal(pointsRedemptionRatio),
              pointsRedemptionBase: new Decimal(pointsRedemptionBase),
            };

            jest.spyOn(repo, 'findByTenantId').mockResolvedValue(mockRule as any);

            // 计算抵扣金额
            const result = await service.calculatePointsDiscount(points);

            // 验证计算正确性
            // 公式: floor(points / pointsRedemptionRatio) * pointsRedemptionBase
            const expectedDiscount = Math.floor(points / pointsRedemptionRatio) * pointsRedemptionBase;

            expect(Number(result)).toBe(Math.max(0, expectedDiscount));
            expect(Number(result)).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 discount when redemption is disabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            points: fc.integer({ min: 1, max: 100000 }),
            pointsRedemptionRatio: fc.integer({ min: 1, max: 1000 }),
            pointsRedemptionBase: fc.integer({ min: 1, max: 100 }),
          }),
          async ({ points, pointsRedemptionRatio, pointsRedemptionBase }) => {
            // 模拟积分规则（抵扣功能已禁用）
            const mockRule = {
              tenantId: '00000',
              pointsRedemptionEnabled: false,
              systemEnabled: true,
              pointsRedemptionRatio: new Decimal(pointsRedemptionRatio),
              pointsRedemptionBase: new Decimal(pointsRedemptionBase),
            };

            jest.spyOn(repo, 'findByTenantId').mockResolvedValue(mockRule as any);

            // 计算抵扣金额
            const result = await service.calculatePointsDiscount(points);

            // 功能禁用时应返回0
            expect(Number(result)).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 discount when system is disabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            points: fc.integer({ min: 1, max: 100000 }),
            pointsRedemptionRatio: fc.integer({ min: 1, max: 1000 }),
            pointsRedemptionBase: fc.integer({ min: 1, max: 100 }),
          }),
          async ({ points, pointsRedemptionRatio, pointsRedemptionBase }) => {
            // 模拟积分规则（系统已禁用）
            const mockRule = {
              tenantId: '00000',
              pointsRedemptionEnabled: true,
              systemEnabled: false,
              pointsRedemptionRatio: new Decimal(pointsRedemptionRatio),
              pointsRedemptionBase: new Decimal(pointsRedemptionBase),
            };

            jest.spyOn(repo, 'findByTenantId').mockResolvedValue(mockRule as any);

            // 计算抵扣金额
            const result = await service.calculatePointsDiscount(points);

            // 系统禁用时应返回0
            expect(Number(result)).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle zero points correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            pointsRedemptionRatio: fc.integer({ min: 1, max: 1000 }),
            pointsRedemptionBase: fc.integer({ min: 1, max: 100 }),
          }),
          async ({ pointsRedemptionRatio, pointsRedemptionBase }) => {
            const mockRule = {
              tenantId: '00000',
              pointsRedemptionEnabled: true,
              systemEnabled: true,
              pointsRedemptionRatio: new Decimal(pointsRedemptionRatio),
              pointsRedemptionBase: new Decimal(pointsRedemptionBase),
            };

            jest.spyOn(repo, 'findByTenantId').mockResolvedValue(mockRule as any);

            // 使用0积分
            const result = await service.calculatePointsDiscount(0);

            // 应返回0抵扣金额
            expect(Number(result)).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle points less than redemption ratio correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            points: fc.integer({ min: 1, max: 99 }),
            pointsRedemptionRatio: fc.integer({ min: 100, max: 1000 }),
            pointsRedemptionBase: fc.integer({ min: 1, max: 100 }),
          }),
          async ({ points, pointsRedemptionRatio, pointsRedemptionBase }) => {
            // 确保积分数量小于兑换比例
            fc.pre(points < pointsRedemptionRatio);

            const mockRule = {
              tenantId: '00000',
              pointsRedemptionEnabled: true,
              systemEnabled: true,
              pointsRedemptionRatio: new Decimal(pointsRedemptionRatio),
              pointsRedemptionBase: new Decimal(pointsRedemptionBase),
            };

            jest.spyOn(repo, 'findByTenantId').mockResolvedValue(mockRule as any);

            // 计算抵扣金额
            const result = await service.calculatePointsDiscount(points);

            // 积分不足一个兑换单位时应返回0
            expect(Number(result)).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 18: 积分使用限制验证
   * 
   * **Validates: Requirements 7.5**
   * 
   * 对于任何订单，使用的积分数量不应超过单笔订单最大可使用积分数量，
   * 且抵扣金额不应超过订单金额的最大抵扣百分比
   */
  describe('Property 18: 积分使用限制验证', () => {
    it('should reject points usage exceeding max points per order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            maxPointsPerOrder: fc.integer({ min: 100, max: 10000 }),
            points: fc.integer({ min: 10001, max: 100000 }),
            orderAmount: fc.integer({ min: 100, max: 10000 }),
          }),
          async ({ maxPointsPerOrder, points, orderAmount }) => {
            // 确保使用的积分超过限制
            fc.pre(points > maxPointsPerOrder);

            const mockRule = {
              tenantId: '00000',
              pointsRedemptionEnabled: true,
              systemEnabled: true,
              maxPointsPerOrder,
              maxDiscountPercentOrder: 100,
              pointsRedemptionRatio: new Decimal(100),
              pointsRedemptionBase: new Decimal(1),
            };

            jest.spyOn(repo, 'findByTenantId').mockResolvedValue(mockRule as any);

            // 验证积分使用应该失败
            await expect(
              service.validatePointsUsage(points, new Decimal(orderAmount))
            ).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept points usage within max points per order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            maxPointsPerOrder: fc.integer({ min: 1000, max: 10000 }),
            points: fc.integer({ min: 1, max: 999 }),
            orderAmount: fc.integer({ min: 100, max: 10000 }),
          }),
          async ({ maxPointsPerOrder, points, orderAmount }) => {
            // 确保使用的积分在限制内
            fc.pre(points <= maxPointsPerOrder);

            const mockRule = {
              tenantId: '00000',
              pointsRedemptionEnabled: true,
              systemEnabled: true,
              maxPointsPerOrder,
              maxDiscountPercentOrder: 100,
              pointsRedemptionRatio: new Decimal(100),
              pointsRedemptionBase: new Decimal(1),
            };

            jest.spyOn(repo, 'findByTenantId').mockResolvedValue(mockRule as any);

            // 验证积分使用应该成功
            await expect(
              service.validatePointsUsage(points, new Decimal(orderAmount))
            ).resolves.not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject points usage exceeding max discount percent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            maxDiscountPercent: fc.integer({ min: 10, max: 50 }),
            orderAmount: fc.integer({ min: 1000, max: 10000 }),
            pointsRedemptionRatio: fc.integer({ min: 1, max: 100 }),
            pointsRedemptionBase: fc.integer({ min: 1, max: 10 }),
          }),
          async ({ maxDiscountPercent, orderAmount, pointsRedemptionRatio, pointsRedemptionBase }) => {
            const mockRule = {
              tenantId: '00000',
              pointsRedemptionEnabled: true,
              systemEnabled: true,
              maxPointsPerOrder: null as number | null,
              maxDiscountPercentOrder: maxDiscountPercent,
              pointsRedemptionRatio: new Decimal(pointsRedemptionRatio),
              pointsRedemptionBase: new Decimal(pointsRedemptionBase),
            };

            jest.spyOn(repo, 'findByTenantId').mockResolvedValue(mockRule as any);

            // 计算会超过最大抵扣比例的积分数量
            const maxDiscount = orderAmount * (maxDiscountPercent / 100);
            // 计算需要多少积分才能达到超过限制的抵扣金额
            const excessDiscount = maxDiscount * 1.5;
            const excessPoints = Math.ceil((excessDiscount / pointsRedemptionBase) * pointsRedemptionRatio);

            // 验证积分使用应该失败
            await expect(
              service.validatePointsUsage(excessPoints, new Decimal(orderAmount))
            ).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept points usage within max discount percent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            maxDiscountPercent: fc.integer({ min: 50, max: 100 }),
            orderAmount: fc.integer({ min: 1000, max: 10000 }),
            pointsRedemptionRatio: fc.integer({ min: 100, max: 1000 }),
            pointsRedemptionBase: fc.integer({ min: 1, max: 10 }),
          }),
          async ({ maxDiscountPercent, orderAmount, pointsRedemptionRatio, pointsRedemptionBase }) => {
            const mockRule = {
              tenantId: '00000',
              pointsRedemptionEnabled: true,
              systemEnabled: true,
              maxPointsPerOrder: null as number | null,
              maxDiscountPercentOrder: maxDiscountPercent,
              pointsRedemptionRatio: new Decimal(pointsRedemptionRatio),
              pointsRedemptionBase: new Decimal(pointsRedemptionBase),
            };

            jest.spyOn(repo, 'findByTenantId').mockResolvedValue(mockRule as any);

            // 计算不会超过最大抵扣比例的积分数量
            const maxDiscount = orderAmount * (maxDiscountPercent / 100);
            const safeDiscount = maxDiscount * 0.5;
            const safePoints = Math.floor((safeDiscount / pointsRedemptionBase) * pointsRedemptionRatio);

            // 验证积分使用应该成功
            await expect(
              service.validatePointsUsage(safePoints, new Decimal(orderAmount))
            ).resolves.not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject when redemption is disabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            points: fc.integer({ min: 1, max: 10000 }),
            orderAmount: fc.integer({ min: 100, max: 10000 }),
          }),
          async ({ points, orderAmount }) => {
            const mockRule = {
              tenantId: '00000',
              pointsRedemptionEnabled: false,
              systemEnabled: true,
              maxPointsPerOrder: null as number | null,
              maxDiscountPercentOrder: 50,
              pointsRedemptionRatio: new Decimal(100),
              pointsRedemptionBase: new Decimal(1),
            };

            jest.spyOn(repo, 'findByTenantId').mockResolvedValue(mockRule as any);

            // 功能禁用时应该拒绝
            await expect(
              service.validatePointsUsage(points, new Decimal(orderAmount))
            ).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject when system is disabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            points: fc.integer({ min: 1, max: 10000 }),
            orderAmount: fc.integer({ min: 100, max: 10000 }),
          }),
          async ({ points, orderAmount }) => {
            const mockRule = {
              tenantId: '00000',
              pointsRedemptionEnabled: true,
              systemEnabled: false,
              maxPointsPerOrder: null as number | null,
              maxDiscountPercentOrder: 50,
              pointsRedemptionRatio: new Decimal(100),
              pointsRedemptionBase: new Decimal(1),
            };

            jest.spyOn(repo, 'findByTenantId').mockResolvedValue(mockRule as any);

            // 系统禁用时应该拒绝
            await expect(
              service.validatePointsUsage(points, new Decimal(orderAmount))
            ).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
