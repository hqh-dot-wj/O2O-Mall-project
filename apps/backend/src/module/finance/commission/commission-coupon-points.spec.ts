import { Test, TestingModule } from '@nestjs/testing';
import { CommissionService } from './commission.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommissionRepository } from './commission.repository';
import { WalletRepository } from '../wallet/wallet.repository';
import { TransactionRepository } from '../wallet/transaction.repository';
import { WalletService } from '../wallet/wallet.service';
import { Decimal } from '@prisma/client/runtime/library';
import { OrderType } from '@prisma/client';
// Import sub-services
import { DistConfigService } from './services/dist-config.service';
import { CommissionValidatorService } from './services/commission-validator.service';
import { BaseCalculatorService } from './services/base-calculator.service';
import { L1CalculatorService } from './services/l1-calculator.service';
import { L2CalculatorService } from './services/l2-calculator.service';
import { CommissionCalculatorService } from './services/commission-calculator.service';
import { CommissionSettlerService } from './services/commission-settler.service';
import { ProductConfigService } from 'src/module/store/distribution/services/product-config.service';
import { LevelService } from 'src/module/store/distribution/services/level.service';
import { OrderQueryPort } from '../ports/order-query.port';
import { MemberQueryPort } from '../ports/member-query.port';

/**
 * 优惠券和积分分佣计算测试套件
 *
 * 测试场景：
 * 1. 基于原价分佣（ORIGINAL_PRICE）
 * 2. 兑换商品不分佣（ZERO）
 * 3. 边界情况测试
 */
describe('CommissionService - Coupon & Points Integration', () => {
  let service: CommissionService;
  let prismaService: PrismaService;
  let commissionRepo: CommissionRepository;

  const mockPrismaService: any = {
    sysDistConfig: {
      findUnique: jest.fn(),
    },
    omsOrder: {
      findUnique: jest.fn(),
    },
    umsMember: {
      findUnique: jest.fn(),
    },
    pmsTenantSku: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    sysDistBlacklist: {
      findUnique: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn((callback: any) => callback(mockPrismaService)),
  };

  const mockCommissionRepo = {
    upsert: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };

  const mockWalletService = {
    getOrCreateWallet: jest.fn(),
    addBalance: jest.fn(),
    deductBalance: jest.fn(),
  };

  const mockCommissionQueue = {
    add: jest.fn(),
  };

  const mockProductConfigService = {
    getEffectiveConfig: jest.fn().mockResolvedValue({
      level1Rate: new Decimal(0.1),
      level2Rate: new Decimal(0.05),
    }),
  };

  const mockLevelService = {
    findOne: jest.fn().mockResolvedValue(null),
    findByLevelId: jest.fn().mockResolvedValue(null),
  };

  // A-T1: OrderQueryPort mock
  const mockOrderQueryPort = {
    findOrderForCommission: jest.fn(),
    findOrdersForCommission: jest.fn(),
  };

  // A-T2: MemberQueryPort mock
  const mockMemberQueryPort = {
    findMemberForCommission: jest.fn(),
    findMemberBrief: jest.fn(),
    findMembersBrief: jest.fn(),
    checkCircularReferral: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionService,
        CommissionCalculatorService,
        CommissionSettlerService,
        CommissionValidatorService,
        DistConfigService,
        BaseCalculatorService,
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
          provide: WalletRepository,
          useValue: {},
        },
        {
          provide: TransactionRepository,
          useValue: {},
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
        {
          provide: ProductConfigService,
          useValue: mockProductConfigService,
        },
        {
          provide: LevelService,
          useValue: mockLevelService,
        },
        {
          provide: 'BullQueue_CALC_COMMISSION',
          useValue: mockCommissionQueue,
        },
        {
          provide: OrderQueryPort,
          useValue: mockOrderQueryPort,
        },
        {
          provide: MemberQueryPort,
          useValue: mockMemberQueryPort,
        },
      ],
    }).compile();

    service = module.get<CommissionService>(CommissionService);
    prismaService = module.get<PrismaService>(PrismaService);
    commissionRepo = module.get<CommissionRepository>(CommissionRepository);

    // 重置所有 mock
    jest.clearAllMocks();
  });

  describe('场景1: 兑换商品不分佣', () => {
    it('应该识别兑换商品并跳过分佣', async () => {
      const orderId = 'order_001';
      const tenantId = 'tenant_001';

      const order = {
        id: orderId,
        tenantId,
        memberId: 'member_001',
        orderType: OrderType.PRODUCT,
        totalAmount: new Decimal(50),
        payAmount: new Decimal(0),
        couponDiscount: new Decimal(50),
        pointsDiscount: new Decimal(0),
        shareUserId: 'member_002',
        items: [
          {
            skuId: 'sku_exchange',
            productId: 'prod_001',
            totalAmount: new Decimal(50),
            quantity: 1,
            price: new Decimal(50),
          },
        ],
      };

      const member = {
        memberId: 'member_001',
        tenantId: 'tenant_001',
        parentId: 'member_002',
        indirectParentId: null as string | null,
        levelId: 0,
      };

      const distConfig = {
        level1Rate: new Decimal(0.1),
        level2Rate: new Decimal(0.05),
        commissionBaseType: 'ORIGINAL_PRICE',
        maxCommissionRate: new Decimal(0.5),
        enableCrossTenant: false,
      };

      // A-T1/A-T2: 使用 Port mocks
      mockOrderQueryPort.findOrderForCommission.mockResolvedValue(order);
      mockMemberQueryPort.findMemberForCommission.mockResolvedValue(member);
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(distConfig);
      mockPrismaService.pmsTenantSku.findMany.mockResolvedValue([
        {
          id: 'sku_exchange',
          distMode: 'NONE',
          distRate: new Decimal(0),
          isExchangeProduct: true, // 兑换商品
        },
      ]);

      await service.calculateCommission(orderId, tenantId);

      // 验证：不应该产生佣金记录
      expect(mockCommissionRepo.upsert).not.toHaveBeenCalled();
    });
  });

  describe('场景2: 边界情况测试', () => {
    it('应该处理自购订单（不分佣）', async () => {
      const orderId = 'order_002';
      const tenantId = 'tenant_001';

      const order = {
        id: orderId,
        tenantId,
        memberId: 'member_001',
        orderType: OrderType.PRODUCT,
        totalAmount: new Decimal(100),
        payAmount: new Decimal(80),
        couponDiscount: new Decimal(20),
        pointsDiscount: new Decimal(0),
        shareUserId: 'member_001', // 自己推荐自己
        items: [
          {
            skuId: 'sku_001',
            productId: 'prod_001',
            totalAmount: new Decimal(100),
            quantity: 1,
            price: new Decimal(100),
          },
        ],
      };

      const member = {
        memberId: 'member_001',
        tenantId: 'tenant_001',
        parentId: null as string | null,
        indirectParentId: null as string | null,
        levelId: 1,
      };

      // A-T1/A-T2: 使用 Port mocks
      mockOrderQueryPort.findOrderForCommission.mockResolvedValue(order);
      mockMemberQueryPort.findMemberForCommission.mockResolvedValue(member);

      await service.calculateCommission(orderId, tenantId);

      // 验证：自购不分佣
      expect(mockCommissionRepo.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getDistConfig - 配置获取测试', () => {
    it('应该返回数据库中的配置', async () => {
      const tenantId = 'tenant_001';
      const dbConfig = {
        tenantId,
        level1Rate: new Decimal(0.1),
        level2Rate: new Decimal(0.05),
        enableLV0: true,
        enableCrossTenant: false,
        crossTenantRate: new Decimal(1.0),
        crossMaxDaily: new Decimal(500),
        commissionBaseType: 'ORIGINAL_PRICE',
        maxCommissionRate: new Decimal(0.5),
      };

      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(dbConfig);

      const result = await service.getDistConfig(tenantId);

      expect(result.commissionBaseType).toBe('ORIGINAL_PRICE');
      expect(result.maxCommissionRate.toNumber()).toBe(0.5);
    });

    it('应该返回默认配置（当数据库无配置时）', async () => {
      const tenantId = 'tenant_new';

      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(null);

      const result = await service.getDistConfig(tenantId);

      expect(result.commissionBaseType).toBe('ORIGINAL_PRICE');
      expect(result.maxCommissionRate.toNumber()).toBe(0.5);
    });
  });
});
