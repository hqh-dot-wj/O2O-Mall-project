import { Test, TestingModule } from '@nestjs/testing';
import { CommissionService } from './commission.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommissionRepository } from './commission.repository';
import { WalletRepository } from '../wallet/wallet.repository';
import { TransactionRepository } from '../wallet/transaction.repository';
import { WalletService } from '../wallet/wallet.service';
import { Queue } from 'bull';
import { Decimal } from '@prisma/client/runtime/library';
import { CommissionStatus, OrderType } from '@prisma/client';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionService,
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
          provide: 'BullQueue_CALC_COMMISSION',
          useValue: mockCommissionQueue,
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
            totalAmount: new Decimal(50),
            quantity: 1,
          },
        ],
      };

      const member = {
        memberId: 'member_001',
        parentId: 'member_002',
        indirectParentId: null as string | null,
        levelId: 0,
      };

      const distConfig = {
        level1Rate: new Decimal(0.10),
        level2Rate: new Decimal(0.05),
        commissionBaseType: 'ORIGINAL_PRICE',
        maxCommissionRate: new Decimal(0.50),
        enableCrossTenant: false,
      };

      const tenantSku = {
        id: 'sku_exchange',
        distMode: 'NONE',
        distRate: new Decimal(0),
        isExchangeProduct: true, // 兑换商品
      };

      mockPrismaService.omsOrder.findUnique.mockResolvedValue(order);
      mockPrismaService.umsMember.findUnique.mockResolvedValue(member);
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(distConfig);
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue(tenantSku);

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
            totalAmount: new Decimal(100),
            quantity: 1,
          },
        ],
      };

      const member = {
        memberId: 'member_001',
        parentId: null as string | null,
        indirectParentId: null as string | null,
        levelId: 1,
      };

      mockPrismaService.omsOrder.findUnique.mockResolvedValue(order);
      mockPrismaService.umsMember.findUnique.mockResolvedValue(member);

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
        level1Rate: new Decimal(0.10),
        level2Rate: new Decimal(0.05),
        enableLV0: true,
        enableCrossTenant: false,
        crossTenantRate: new Decimal(1.0),
        crossMaxDaily: new Decimal(500),
        commissionBaseType: 'ORIGINAL_PRICE',
        maxCommissionRate: new Decimal(0.50),
      };

      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(dbConfig);

      const result = await service.getDistConfig(tenantId);

      expect(result.commissionBaseType).toBe('ORIGINAL_PRICE');
      expect(result.maxCommissionRate.toNumber()).toBe(0.50);
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
