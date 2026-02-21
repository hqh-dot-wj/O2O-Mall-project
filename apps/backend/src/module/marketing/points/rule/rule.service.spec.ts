import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { ClsService } from 'nestjs-cls';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { PointsRuleRepository } from './rule.repository';
import { PointsRuleService } from './rule.service';

describe('PointsRuleService', () => {
  let service: PointsRuleService;
  let repo: PointsRuleRepository;

  const mockRepo = {
    findByTenantId: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  };

  const mockCls = {
    get: jest.fn().mockReturnValue('user1'),
  };

  beforeEach(async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('00000');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsRuleService,
        { provide: PointsRuleRepository, useValue: mockRepo },
        { provide: ClsService, useValue: mockCls },
      ],
    }).compile();

    service = module.get<PointsRuleService>(PointsRuleService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRules', () => {
    it('应返回已有规则', async () => {
      const rules = {
        id: 'r1',
        tenantId: '00000',
        orderPointsEnabled: true,
        orderPointsRatio: new Decimal(1),
        orderPointsBase: new Decimal(1),
      };
      mockRepo.findByTenantId.mockResolvedValue(rules);

      const result = await service.getRules();

      expect(result.data).toBeDefined();
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('不存在规则时应创建默认规则', async () => {
      mockRepo.findByTenantId.mockResolvedValue(null);
      const defaultRules = {
        id: 'r1',
        tenantId: '00000',
        orderPointsEnabled: true,
      };
      mockRepo.create.mockResolvedValue(defaultRules);

      const result = await service.getRules();

      expect(mockRepo.create).toHaveBeenCalled();
      expect(result.data).toBeDefined();
    });
  });

  describe('updateRules', () => {
    it('应调用 upsert 并返回规则', async () => {
      const updated = {
        id: 'r1',
        tenantId: '00000',
        orderPointsEnabled: true,
      };
      mockRepo.upsert.mockResolvedValue(updated);

      const result = await service.updateRules({
        orderPointsEnabled: true,
      } as any);

      expect(mockRepo.upsert).toHaveBeenCalled();
      expect(result.data).toBeDefined();
    });

    it('orderPointsBase 小于等于 0 应抛异常', async () => {
      await expect(
        service.updateRules({
          orderPointsEnabled: true,
          orderPointsBase: 0,
        } as any),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('calculateOrderPoints', () => {
    it('未启用消费积分应返回 0', async () => {
      mockRepo.findByTenantId.mockResolvedValue({
        orderPointsEnabled: false,
        systemEnabled: true,
      });

      const points = await service.calculateOrderPoints(new Decimal(100));
      expect(points).toBe(0);
    });

    it('应按基数与比例计算积分', async () => {
      mockRepo.findByTenantId.mockResolvedValue({
        orderPointsEnabled: true,
        systemEnabled: true,
        orderPointsBase: new Decimal(10),
        orderPointsRatio: new Decimal(1),
      });

      const points = await service.calculateOrderPoints(new Decimal(99));
      expect(points).toBe(9); // floor(99/10) * 1
    });
  });

  describe('calculateOrderPointsByItems', () => {
    it('未启用时应返回各商品 0 积分', async () => {
      mockRepo.findByTenantId.mockResolvedValue({
        orderPointsEnabled: false,
        systemEnabled: true,
      });

      const result = await service.calculateOrderPointsByItems(
        [{ skuId: 's1', price: new Decimal(50), quantity: 2, pointsRatio: 100 }],
        new Decimal(100),
        new Decimal(100),
      );
      expect(result).toEqual([{ skuId: 's1', earnedPoints: 0 }]);
    });

    it('应按商品占比分摊并应用积分比例', async () => {
      mockRepo.findByTenantId.mockResolvedValue({
        orderPointsEnabled: true,
        systemEnabled: true,
        orderPointsBase: new Decimal(1),
        orderPointsRatio: new Decimal(1),
      });

      const result = await service.calculateOrderPointsByItems(
        [
          { skuId: 's1', price: new Decimal(60), quantity: 1, pointsRatio: 100 },
          { skuId: 's2', price: new Decimal(40), quantity: 1, pointsRatio: 50 },
        ],
        new Decimal(100),
        new Decimal(100),
      );
      expect(result.length).toBe(2);
      expect(result[0].skuId).toBe('s1');
      expect(result[1].skuId).toBe('s2');
    });
  });

  describe('calculatePointsDiscount', () => {
    it('未启用积分抵扣应返回 0', async () => {
      mockRepo.findByTenantId.mockResolvedValue({
        pointsRedemptionEnabled: false,
        systemEnabled: true,
      });

      const discount = await service.calculatePointsDiscount(100);
      expect(Number(discount)).toBe(0);
    });

    it('应按比例计算抵扣金额', async () => {
      mockRepo.findByTenantId.mockResolvedValue({
        pointsRedemptionEnabled: true,
        systemEnabled: true,
        pointsRedemptionRatio: new Decimal(100),
        pointsRedemptionBase: new Decimal(1),
      });

      const discount = await service.calculatePointsDiscount(250);
      expect(Number(discount)).toBe(2); // floor(250/100)*1
    });
  });

  describe('validatePointsUsage', () => {
    it('未启用积分抵扣应抛异常', async () => {
      mockRepo.findByTenantId.mockResolvedValue({
        pointsRedemptionEnabled: false,
        systemEnabled: true,
      });

      await expect(
        service.validatePointsUsage(100, new Decimal(200)),
      ).rejects.toThrow(BusinessException);
    });

    it('超过单笔最大积分应抛异常', async () => {
      mockRepo.findByTenantId.mockResolvedValue({
        pointsRedemptionEnabled: true,
        systemEnabled: true,
        maxPointsPerOrder: 50,
        pointsRedemptionRatio: new Decimal(100),
        pointsRedemptionBase: new Decimal(1),
        maxDiscountPercentOrder: 50,
      });

      await expect(
        service.validatePointsUsage(100, new Decimal(200)),
      ).rejects.toThrow(BusinessException);
    });

    it('抵扣超过订单比例应抛异常', async () => {
      mockRepo.findByTenantId.mockResolvedValue({
        pointsRedemptionEnabled: true,
        systemEnabled: true,
        maxPointsPerOrder: 10000,
        pointsRedemptionRatio: new Decimal(1),
        pointsRedemptionBase: new Decimal(100),
        maxDiscountPercentOrder: 10,
      });

      await expect(
        service.validatePointsUsage(1000, new Decimal(100)),
      ).rejects.toThrow(BusinessException);
    });

    it('合法积分应通过校验', async () => {
      // 100 积分 -> 抵扣 1 元，订单 100 元最多 50% 即 50 元，1 <= 50 通过
      mockRepo.findByTenantId.mockResolvedValue({
        pointsRedemptionEnabled: true,
        systemEnabled: true,
        maxPointsPerOrder: 500,
        pointsRedemptionRatio: new Decimal(100),
        pointsRedemptionBase: new Decimal(1),
        maxDiscountPercentOrder: 50,
      });

      await expect(
        service.validatePointsUsage(100, new Decimal(100)),
      ).resolves.not.toThrow();
    });
  });
});
