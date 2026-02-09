import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { ClsService } from 'nestjs-cls';
import { PointsRuleService } from './rule.service';
import { PointsRuleRepository } from './rule.repository';

describe('PointsRuleService - Anti-Arbitrage', () => {
  let service: PointsRuleService;
  let mockRepo: jest.Mocked<PointsRuleRepository>;
  let mockCls: jest.Mocked<ClsService>;

  const mockRules = {
    tenantId: 'tenant1',
    orderPointsEnabled: true,
    orderPointsRatio: new Decimal(1),
    orderPointsBase: new Decimal(1),
    systemEnabled: true,
  };

  beforeEach(async () => {
    mockRepo = {
      findByTenantId: jest.fn(),
    } as any;

    mockCls = {
      get: jest.fn((key: string) => {
        if (key === 'tenantId') return 'tenant1';
        return null;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsRuleService,
        { provide: PointsRuleRepository, useValue: mockRepo },
        { provide: ClsService, useValue: mockCls },
      ],
    }).compile();

    service = module.get<PointsRuleService>(PointsRuleService);
  });

  describe('calculateOrderPointsByItems - 防止积分套利', () => {
    beforeEach(() => {
      mockRepo.findByTenantId.mockResolvedValue(mockRules as any);
    });

    it('应该基于"原价 - 优惠券抵扣"计算积分，不包括积分抵扣', async () => {
      const items = [
        {
          skuId: 'sku1',
          price: new Decimal(1000),
          quantity: 1,
          pointsRatio: 100,
        },
      ];

      const baseAmount = new Decimal(900);
      const totalAmount = new Decimal(1000);

      const result = await service.calculateOrderPointsByItems(items, baseAmount, totalAmount);

      expect(result).toHaveLength(1);
      expect(result[0].skuId).toBe('sku1');
      expect(result[0].earnedPoints).toBe(900);
    });

    it('应该支持商品级别的积分比例配置', async () => {
      const items = [
        {
          skuId: 'sku1',
          price: new Decimal(500),
          quantity: 1,
          pointsRatio: 100,
        },
        {
          skuId: 'sku2',
          price: new Decimal(500),
          quantity: 1,
          pointsRatio: 50,
        },
      ];

      const baseAmount = new Decimal(1000);
      const totalAmount = new Decimal(1000);

      const result = await service.calculateOrderPointsByItems(items, baseAmount, totalAmount);

      expect(result).toHaveLength(2);
      expect(result[0].earnedPoints).toBe(500);
      expect(result[1].earnedPoints).toBe(250);
    });

    it('营销活动商品应该不产生积分', async () => {
      const items = [
        {
          skuId: 'sku1',
          price: new Decimal(1000),
          quantity: 1,
          pointsRatio: 0,
        },
      ];

      const baseAmount = new Decimal(1000);
      const totalAmount = new Decimal(1000);

      const result = await service.calculateOrderPointsByItems(items, baseAmount, totalAmount);

      expect(result).toHaveLength(1);
      expect(result[0].earnedPoints).toBe(0);
    });

    it('当积分计算基数为0时，不应产生积分', async () => {
      const items = [
        {
          skuId: 'sku1',
          price: new Decimal(100),
          quantity: 1,
          pointsRatio: 100,
        },
      ];

      const baseAmount = new Decimal(0);
      const totalAmount = new Decimal(100);

      const result = await service.calculateOrderPointsByItems(items, baseAmount, totalAmount);

      expect(result).toHaveLength(1);
      expect(result[0].earnedPoints).toBe(0);
    });
  });
});
