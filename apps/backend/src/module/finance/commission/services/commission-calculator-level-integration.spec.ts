// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { CommissionCalculatorService } from './commission-calculator.service';
import { L1CalculatorService } from './l1-calculator.service';
import { L2CalculatorService } from './l2-calculator.service';
import { BaseCalculatorService } from './base-calculator.service';
import { DistConfigService } from './dist-config.service';
import { CommissionValidatorService } from './commission-validator.service';
import { CommissionRepository } from '../commission.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductConfigService } from 'src/module/store/distribution/services/product-config.service';
import { LevelService } from 'src/module/store/distribution/services/level.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('CommissionCalculatorService - Level Integration', () => {
  let service: CommissionCalculatorService;
  let l1Calculator: L1CalculatorService;
  let l2Calculator: L2CalculatorService;
  let levelService: LevelService;
  let productConfigService: ProductConfigService;

  const mockPrismaService = {
    omsOrder: {
      findUnique: jest.fn(),
    },
    umsMember: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockCommissionRepo = {
    upsert: jest.fn(),
  };

  const mockDistConfigService = {
    getDistConfig: jest.fn(),
  };

  const mockValidator = {
    checkSelfPurchase: jest.fn(),
    isUserBlacklisted: jest.fn(),
    checkDailyLimit: jest.fn(),
  };

  const mockBaseCalculator = {
    calculateCommissionBase: jest.fn(),
  };

  const mockProductConfigService = {
    getEffectiveConfig: jest.fn(),
  };

  const mockLevelService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionCalculatorService,
        L1CalculatorService,
        L2CalculatorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CommissionRepository,
          useValue: mockCommissionRepo,
        },
        {
          provide: DistConfigService,
          useValue: mockDistConfigService,
        },
        {
          provide: CommissionValidatorService,
          useValue: mockValidator,
        },
        {
          provide: BaseCalculatorService,
          useValue: mockBaseCalculator,
        },
        {
          provide: ProductConfigService,
          useValue: mockProductConfigService,
        },
        {
          provide: LevelService,
          useValue: mockLevelService,
        },
      ],
    }).compile();

    service = module.get<CommissionCalculatorService>(CommissionCalculatorService);
    l1Calculator = module.get<L1CalculatorService>(L1CalculatorService);
    l2Calculator = module.get<L2CalculatorService>(L2CalculatorService);
    levelService = module.get<LevelService>(LevelService);
    productConfigService = module.get<ProductConfigService>(ProductConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(l1Calculator).toBeDefined();
    expect(l2Calculator).toBeDefined();
  });

  describe('配置优先级：会员等级 > 商品级 > 租户默认', () => {
    it('应该优先使用会员等级配置计算L1佣金', async () => {
      const order = {
        id: 'ORDER001',
        tenantId: 'T001',
        memberId: 'M001',
        shareUserId: 'M002',
        payAmount: new Decimal(100),
        totalAmount: new Decimal(100),
        orderType: 'PRODUCT',
        items: [
          {
            skuId: 'SKU001',
            quantity: 1,
            price: new Decimal(100),
            tenantSku: {
              globalSku: {
                productId: 'P001',
                product: { categoryId: 'C001' },
              },
            },
          },
        ],
      };

      const member = {
        memberId: 'M001',
        parentId: 'M002',
        indirectParentId: null,
        levelId: 0,
      };

      const beneficiary = {
        tenantId: 'T001',
        levelId: 2, // C2会员
        parentId: 'M003', // 有上级，不是C2全拿场景
      };

      const distConfig = {
        level1Rate: 0.1, // 租户默认10%
        level2Rate: 0.05,
        enableCrossTenant: false,
        crossTenantRate: 1,
        commissionBaseType: 'ORIGINAL_PRICE',
        maxCommissionRate: 0.5,
      };

      // 会员等级配置：15% (高于租户默认的10%)
      const memberLevelConfig = {
        levelId: 2,
        levelName: '高级分销员',
        level1Rate: 0.15, // 15%
        level2Rate: 0.08,
        isActive: true,
      };

      // 商品级配置：12% (介于会员等级和租户默认之间)
      const productConfig = {
        level1Rate: 0.12,
        level2Rate: 0.06,
        commissionBaseType: 'ORIGINAL_PRICE',
      };

      mockPrismaService.umsMember.findUnique.mockResolvedValue(beneficiary);
      mockValidator.checkSelfPurchase.mockReturnValue(false);
      mockValidator.isUserBlacklisted.mockResolvedValue(false);
      mockLevelService.findOne.mockResolvedValue(memberLevelConfig);
      mockProductConfigService.getEffectiveConfig.mockResolvedValue(productConfig);

      const orderItems = [
        {
          skuId: 'SKU001',
          productId: 'P001',
          categoryId: 'C001',
          quantity: 1,
          price: new Decimal(100),
        },
      ];

      const result = await l1Calculator.calculateL1(
        order,
        member,
        distConfig,
        new Decimal(100),
        new Date(),
        orderItems,
        productConfigService,
      );

      // 应该使用会员等级配置的15%，而不是商品级的12%或租户默认的10%
      expect(result).not.toBeNull();
      expect(result.record.amount.toNumber()).toBe(15); // 100 * 0.15 = 15
      expect(mockLevelService.findOne).toHaveBeenCalledWith('T001', 2);
    });

    it('应该在没有会员等级配置时使用商品级配置', async () => {
      const order = {
        id: 'ORDER002',
        tenantId: 'T001',
        memberId: 'M001',
        shareUserId: 'M002',
        payAmount: new Decimal(100),
        totalAmount: new Decimal(100),
        orderType: 'PRODUCT',
        items: [],
      };

      const member = {
        memberId: 'M001',
        parentId: 'M002',
        indirectParentId: null,
        levelId: 0,
      };

      const beneficiary = {
        tenantId: 'T001',
        levelId: 1, // C1会员
        parentId: null,
      };

      const distConfig = {
        level1Rate: 0.1,
        level2Rate: 0.05,
        enableCrossTenant: false,
        crossTenantRate: 1,
        commissionBaseType: 'ORIGINAL_PRICE',
        maxCommissionRate: 0.5,
      };

      // 没有会员等级配置
      const memberLevelConfig = null;

      // 商品级配置：12%
      const productConfig = {
        level1Rate: 0.12,
        level2Rate: 0.06,
        commissionBaseType: 'ORIGINAL_PRICE',
      };

      mockPrismaService.umsMember.findUnique.mockResolvedValue(beneficiary);
      mockValidator.checkSelfPurchase.mockReturnValue(false);
      mockValidator.isUserBlacklisted.mockResolvedValue(false);
      mockLevelService.findOne.mockResolvedValue(memberLevelConfig);
      mockProductConfigService.getEffectiveConfig.mockResolvedValue(productConfig);

      const orderItems = [
        {
          skuId: 'SKU001',
          productId: 'P001',
          categoryId: 'C001',
          quantity: 1,
          price: new Decimal(100),
        },
      ];

      const result = await l1Calculator.calculateL1(
        order,
        member,
        distConfig,
        new Decimal(100),
        new Date(),
        orderItems,
        productConfigService,
      );

      // 应该使用商品级配置的12%
      expect(result).not.toBeNull();
      expect(result.record.amount.toNumber()).toBe(12); // 100 * 0.12 = 12
    });

    it('应该优先使用会员等级配置计算L2佣金', async () => {
      const order = {
        id: 'ORDER003',
        tenantId: 'T001',
        memberId: 'M001',
        shareUserId: null,
        payAmount: new Decimal(100),
        totalAmount: new Decimal(100),
        orderType: 'PRODUCT',
        items: [],
      };

      const member = {
        memberId: 'M001',
        parentId: 'M002',
        indirectParentId: 'M003',
        levelId: 0,
      };

      const beneficiary = {
        tenantId: 'T001',
        levelId: 2, // C2会员
      };

      const distConfig = {
        level1Rate: 0.1,
        level2Rate: 0.05, // 租户默认5%
        enableCrossTenant: false,
        crossTenantRate: 1,
        commissionBaseType: 'ORIGINAL_PRICE',
        maxCommissionRate: 0.5,
      };

      // 会员等级配置：8% (高于租户默认的5%)
      const memberLevelConfig = {
        levelId: 2,
        levelName: '高级分销员',
        level1Rate: 0.15,
        level2Rate: 0.08, // 8%
        isActive: true,
      };

      // 商品级配置：6%
      const productConfig = {
        level1Rate: 0.12,
        level2Rate: 0.06,
        commissionBaseType: 'ORIGINAL_PRICE',
      };

      mockPrismaService.umsMember.findUnique.mockResolvedValue(beneficiary);
      mockValidator.isUserBlacklisted.mockResolvedValue(false);
      mockLevelService.findOne.mockResolvedValue(memberLevelConfig);
      mockProductConfigService.getEffectiveConfig.mockResolvedValue(productConfig);

      const orderItems = [
        {
          skuId: 'SKU001',
          productId: 'P001',
          categoryId: 'C001',
          quantity: 1,
          price: new Decimal(100),
        },
      ];

      const result = await l2Calculator.calculateL2(
        order,
        member,
        distConfig,
        new Decimal(100),
        new Date(),
        'M002',
        1,
        false,
        orderItems,
        productConfigService,
      );

      // 应该使用会员等级配置的8%
      expect(result).not.toBeNull();
      expect(result.amount.toNumber()).toBe(8); // 100 * 0.08 = 8
      expect(mockLevelService.findOne).toHaveBeenCalledWith('T001', 2);
    });

    it('应该在C2全拿场景下使用会员等级配置计算L1+L2', async () => {
      const order = {
        id: 'ORDER004',
        tenantId: 'T001',
        memberId: 'M001',
        shareUserId: 'M002',
        payAmount: new Decimal(100),
        totalAmount: new Decimal(100),
        orderType: 'PRODUCT',
        items: [],
      };

      const member = {
        memberId: 'M001',
        parentId: 'M002',
        indirectParentId: null,
        levelId: 0,
      };

      const beneficiary = {
        tenantId: 'T001',
        levelId: 2, // C2会员
        parentId: null, // 无上级，C2全拿
      };

      const distConfig = {
        level1Rate: 0.1,
        level2Rate: 0.05,
        enableCrossTenant: false,
        crossTenantRate: 1,
        commissionBaseType: 'ORIGINAL_PRICE',
        maxCommissionRate: 0.5,
      };

      // 会员等级配置
      const memberLevelConfig = {
        levelId: 2,
        levelName: '高级分销员',
        level1Rate: 0.15, // 15%
        level2Rate: 0.08, // 8%
        isActive: true,
      };

      const productConfig = {
        level1Rate: 0.12,
        level2Rate: 0.06,
        commissionBaseType: 'ORIGINAL_PRICE',
      };

      mockPrismaService.umsMember.findUnique.mockResolvedValue(beneficiary);
      mockValidator.checkSelfPurchase.mockReturnValue(false);
      mockValidator.isUserBlacklisted.mockResolvedValue(false);
      mockLevelService.findOne.mockResolvedValue(memberLevelConfig);
      mockProductConfigService.getEffectiveConfig.mockResolvedValue(productConfig);

      const orderItems = [
        {
          skuId: 'SKU001',
          productId: 'P001',
          categoryId: 'C001',
          quantity: 1,
          price: new Decimal(100),
        },
      ];

      const result = await l1Calculator.calculateL1(
        order,
        member,
        distConfig,
        new Decimal(100),
        new Date(),
        orderItems,
        productConfigService,
      );

      // C2全拿：L1 + L2 = 15% + 8% = 23%
      expect(result).not.toBeNull();
      expect(result.record.amount.toNumber()).toBe(23); // 100 * (0.15 + 0.08) = 23
      expect(result.noL2Available).toBe(true);
    });
  });

  describe('多商品场景下的会员等级配置', () => {
    it('应该对所有商品统一使用会员等级配置', async () => {
      const order = {
        id: 'ORDER005',
        tenantId: 'T001',
        memberId: 'M001',
        shareUserId: 'M002',
        payAmount: new Decimal(300), // 3个商品总价
        totalAmount: new Decimal(300),
        orderType: 'PRODUCT',
        items: [],
      };

      const member = {
        memberId: 'M001',
        parentId: 'M002',
        indirectParentId: null,
        levelId: 0,
      };

      const beneficiary = {
        tenantId: 'T001',
        levelId: 2,
        parentId: 'M003', // 有上级，不是C2全拿场景
      };

      const distConfig = {
        level1Rate: 0.1,
        level2Rate: 0.05,
        enableCrossTenant: false,
        crossTenantRate: 1,
        commissionBaseType: 'ORIGINAL_PRICE',
        maxCommissionRate: 0.5,
      };

      // 会员等级配置：统一15%
      const memberLevelConfig = {
        levelId: 2,
        level1Rate: 0.15,
        level2Rate: 0.08,
        isActive: true,
      };

      // 不同商品有不同的商品级配置
      const productConfigs = {
        P001: { level1Rate: 0.12, level2Rate: 0.06, commissionBaseType: 'ORIGINAL_PRICE' },
        P002: { level1Rate: 0.10, level2Rate: 0.05, commissionBaseType: 'ORIGINAL_PRICE' },
        P003: { level1Rate: 0.08, level2Rate: 0.04, commissionBaseType: 'ORIGINAL_PRICE' },
      };

      mockPrismaService.umsMember.findUnique.mockResolvedValue(beneficiary);
      mockValidator.checkSelfPurchase.mockReturnValue(false);
      mockValidator.isUserBlacklisted.mockResolvedValue(false);
      mockLevelService.findOne.mockResolvedValue(memberLevelConfig);
      mockProductConfigService.getEffectiveConfig.mockImplementation((tenantId, productId) => {
        return Promise.resolve(productConfigs[productId]);
      });

      const orderItems = [
        { skuId: 'SKU001', productId: 'P001', categoryId: 'C001', quantity: 1, price: new Decimal(100) },
        { skuId: 'SKU002', productId: 'P002', categoryId: 'C001', quantity: 1, price: new Decimal(100) },
        { skuId: 'SKU003', productId: 'P003', categoryId: 'C002', quantity: 1, price: new Decimal(100) },
      ];

      const result = await l1Calculator.calculateL1(
        order,
        member,
        distConfig,
        new Decimal(300),
        new Date(),
        orderItems,
        productConfigService,
      );

      // 所有商品都应该使用会员等级配置的15%
      // 总佣金 = 300 * 0.15 = 45
      expect(result).not.toBeNull();
      expect(result.record.amount.toNumber()).toBe(45);
    });
  });

  describe('降级场景：无商品信息时使用会员等级配置', () => {
    it('L2计算在无商品信息时应该使用会员等级配置', async () => {
      const order = {
        id: 'ORDER006',
        tenantId: 'T001',
        memberId: 'M001',
        shareUserId: null,
        payAmount: new Decimal(100),
        totalAmount: new Decimal(100),
        orderType: 'PRODUCT',
        items: [],
      };

      const member = {
        memberId: 'M001',
        parentId: 'M002',
        indirectParentId: 'M003',
        levelId: 0,
      };

      const beneficiary = {
        tenantId: 'T001',
        levelId: 2,
      };

      const distConfig = {
        level1Rate: 0.1,
        level2Rate: 0.05, // 租户默认5%
        enableCrossTenant: false,
        crossTenantRate: 1,
        commissionBaseType: 'ORIGINAL_PRICE',
        maxCommissionRate: 0.5,
      };

      // 会员等级配置：8%
      const memberLevelConfig = {
        levelId: 2,
        level1Rate: 0.15,
        level2Rate: 0.08, // 8%
        isActive: true,
      };

      mockPrismaService.umsMember.findUnique.mockResolvedValue(beneficiary);
      mockValidator.isUserBlacklisted.mockResolvedValue(false);
      mockLevelService.findOne.mockResolvedValue(memberLevelConfig);

      // 无商品信息
      const result = await l2Calculator.calculateL2(
        order,
        member,
        distConfig,
        new Decimal(100),
        new Date(),
        'M002',
        1,
        false,
        undefined, // 无orderItems
        undefined, // 无productConfigService
      );

      // 应该使用会员等级配置的8%，而不是租户默认的5%
      expect(result).not.toBeNull();
      expect(result.amount.toNumber()).toBe(8); // 100 * 0.08 = 8
    });
  });
});

