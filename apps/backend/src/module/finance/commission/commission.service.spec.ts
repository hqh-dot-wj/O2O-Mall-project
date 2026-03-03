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
// Import new sub-services
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

describe('CommissionService', () => {
  let service: CommissionService;
  let prismaService: PrismaService;
  let commissionRepo: CommissionRepository;
  let walletService: WalletService;
  let commissionQueue: Queue;
  let calculatorService: CommissionCalculatorService;
  let settlerService: CommissionSettlerService;
  let validatorService: CommissionValidatorService;
  let configService: DistConfigService;

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
      findMany: jest.fn(),
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

  const mockWalletRepo = {
    findByMemberId: jest.fn(),
    updateByMemberId: jest.fn(),
  };

  const mockTransactionRepo = {
    create: jest.fn(),
  };

  const mockWalletService = {
    getOrCreateWallet: jest.fn(),
    addBalance: jest.fn(),
    deductBalance: jest.fn(),
    deductBalanceOrPendingRecovery: jest.fn().mockResolvedValue({
      deducted: new Decimal(10),
      pendingRecovery: new Decimal(0),
    }),
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
    findOne: jest.fn().mockResolvedValue(null), // 默认无会员等级配置，使用商品级配置
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
          useValue: mockWalletRepo,
        },
        {
          provide: TransactionRepository,
          useValue: mockTransactionRepo,
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
    walletService = module.get<WalletService>(WalletService);
    commissionQueue = module.get<Queue>('BullQueue_CALC_COMMISSION');
    calculatorService = module.get<CommissionCalculatorService>(CommissionCalculatorService);
    settlerService = module.get<CommissionSettlerService>(CommissionSettlerService);
    validatorService = module.get<CommissionValidatorService>(CommissionValidatorService);
    configService = module.get<DistConfigService>(DistConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('triggerCalculation', () => {
    it('应该成功触发佣金计算任务', async () => {
      await service.triggerCalculation('order1', 'tenant1');

      expect(mockCommissionQueue.add).toHaveBeenCalledWith(
        { orderId: 'order1', tenantId: 'tenant1' },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );
    });
  });

  describe('getDistConfig', () => {
    it('应该返回租户的分销配置', async () => {
      const mockConfig = {
        tenantId: 'tenant1',
        level1Rate: new Decimal(0.1),
        level2Rate: new Decimal(0.05),
        enableLV0: true,
        enableCrossTenant: true,
        crossTenantRate: new Decimal(0.5),
        crossMaxDaily: new Decimal(1000),
        commissionBaseType: 'ORIGINAL_PRICE',
        maxCommissionRate: new Decimal(0.5),
      };

      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(mockConfig);

      const result = await service.getDistConfig('tenant1');

      expect(result).toEqual(mockConfig);
      expect(mockPrismaService.sysDistConfig.findUnique).toHaveBeenCalledWith({
        where: { tenantId: 'tenant1' },
      });
    });

    it('应该返回默认配置 - 租户无配置', async () => {
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(null);

      const result = await service.getDistConfig('tenant1');

      expect(result.level1Rate).toBeInstanceOf(Decimal);
      expect(result.level2Rate).toBeInstanceOf(Decimal);
      expect(result.enableCrossTenant).toBe(false);
    });
  });

  describe('checkSelfPurchase', () => {
    it('应该检测到自购 - 订单会员等于分享人', () => {
      const result = service.checkSelfPurchase('member1', 'member1', null);
      expect(result).toBe(true);
    });

    it('应该检测到自购 - 订单会员等于上级', () => {
      const result = service.checkSelfPurchase('member1', null, 'member1');
      expect(result).toBe(true);
    });

    it('应该返回false - 非自购', () => {
      const result = service.checkSelfPurchase('member1', 'member2', 'member3');
      expect(result).toBe(false);
    });
  });

  describe('calculateCommission', () => {
    const mockOrder = {
      id: 'order1',
      tenantId: 'tenant1',
      memberId: 'member1',
      shareUserId: null as string | null,
      orderType: OrderType.PRODUCT,
      totalAmount: new Decimal(100),
      payAmount: new Decimal(100),
      couponDiscount: new Decimal(0),
      pointsDiscount: new Decimal(0),
      items: [
        {
          skuId: 'sku1',
          totalAmount: new Decimal(100),
          quantity: 1,
          price: new Decimal(100),
        },
      ],
    };

    const mockMember = {
      memberId: 'member1',
      parentId: 'member2',
      indirectParentId: 'member3',
      levelId: 0,
    };

    const mockDistConfig = {
      level1Rate: new Decimal(0.1),
      level2Rate: new Decimal(0.05),
      enableLV0: true,
      enableCrossTenant: false,
      crossTenantRate: new Decimal(0.5),
      crossMaxDaily: new Decimal(1000),
    };

    it('应该跳过计算 - 订单不存在', async () => {
      mockOrderQueryPort.findOrderForCommission.mockResolvedValue(null);

      await service.calculateCommission('order1', 'tenant1');

      expect(mockCommissionRepo.upsert).not.toHaveBeenCalled();
    });

    it('应该跳过计算 - 会员不存在', async () => {
      mockOrderQueryPort.findOrderForCommission.mockResolvedValue(mockOrder);
      mockMemberQueryPort.findMemberForCommission.mockResolvedValue(null);

      await service.calculateCommission('order1', 'tenant1');

      expect(mockCommissionRepo.upsert).not.toHaveBeenCalled();
    });

    it('应该跳过计算 - 自购订单', async () => {
      const selfPurchaseOrder = {
        ...mockOrder,
        shareUserId: 'member1' as string | null,
      };

      mockOrderQueryPort.findOrderForCommission.mockResolvedValue(selfPurchaseOrder);
      mockMemberQueryPort.findMemberForCommission.mockResolvedValue(mockMember);

      await service.calculateCommission('order1', 'tenant1');

      expect(mockCommissionRepo.upsert).not.toHaveBeenCalled();
    });

    it('应该跳过计算 - 佣金基数为0', async () => {
      mockOrderQueryPort.findOrderForCommission.mockResolvedValue(mockOrder);
      mockMemberQueryPort.findMemberForCommission.mockResolvedValue(mockMember);
      mockPrismaService.pmsTenantSku.findMany.mockResolvedValue([
        {
          id: 'sku1',
          distMode: 'NONE',
        },
      ]);

      await service.calculateCommission('order1', 'tenant1');

      expect(mockCommissionRepo.upsert).not.toHaveBeenCalled();
    });

    it('应该成功计算L1佣金 - C1直推', async () => {
      const beneficiary = {
        memberId: 'member2',
        tenantId: 'tenant1',
        levelId: 1,
        parentId: 'member3',
      };

      mockOrderQueryPort.findOrderForCommission.mockResolvedValue(mockOrder);
      mockMemberQueryPort.findMemberForCommission.mockResolvedValue(mockMember);
      mockMemberQueryPort.findMemberBrief
        .mockResolvedValueOnce(beneficiary)
        .mockResolvedValueOnce({ memberId: 'member3', tenantId: 'tenant1', levelId: 2 });
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(mockDistConfig);
      mockPrismaService.pmsTenantSku.findMany.mockResolvedValue([
        {
          id: 'sku1',
          distMode: 'RATIO',
          distRate: new Decimal(1),
          globalSku: {},
        },
      ]);
      mockPrismaService.sysDistBlacklist.findUnique.mockResolvedValue(null);

      await service.calculateCommission('order1', 'tenant1');

      expect(mockCommissionRepo.upsert).toHaveBeenCalled();
    });

    it('应该成功计算L1+L2佣金 - C2全拿场景', async () => {
      const beneficiary = {
        memberId: 'member2',
        tenantId: 'tenant1',
        levelId: 2,
        parentId: null as string | null, // C2无上级
      };

      mockOrderQueryPort.findOrderForCommission.mockResolvedValue(mockOrder);
      mockMemberQueryPort.findMemberForCommission.mockResolvedValue(mockMember);
      mockMemberQueryPort.findMemberBrief.mockResolvedValue(beneficiary);
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(mockDistConfig);
      mockPrismaService.pmsTenantSku.findMany.mockResolvedValue([
        {
          id: 'sku1',
          distMode: 'RATIO',
          distRate: new Decimal(1),
          globalSku: {},
        },
      ]);
      mockPrismaService.sysDistBlacklist.findUnique.mockResolvedValue(null);

      await service.calculateCommission('order1', 'tenant1');

      expect(mockCommissionRepo.upsert).toHaveBeenCalledTimes(1);
      const call = mockCommissionRepo.upsert.mock.calls[0][0];
      // L1全拿场景，金额应该是L1+L2
      expect(call.create.amount.toNumber()).toBeGreaterThan(10); // 100 * 0.1 + 100 * 0.05 = 15
    });

    it('应该跳过L1 - 受益人在黑名单', async () => {
      const beneficiary = {
        memberId: 'member2',
        tenantId: 'tenant1',
        levelId: 1,
        parentId: 'member3',
      };

      mockOrderQueryPort.findOrderForCommission.mockResolvedValue(mockOrder);
      mockMemberQueryPort.findMemberForCommission.mockResolvedValue(mockMember);
      mockMemberQueryPort.findMemberBrief.mockResolvedValue(beneficiary);
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(mockDistConfig);
      mockPrismaService.pmsTenantSku.findMany.mockResolvedValue([
        {
          id: 'sku1',
          distMode: 'RATIO',
          distRate: new Decimal(1),
          globalSku: {},
        },
      ]);
      mockPrismaService.sysDistBlacklist.findUnique.mockResolvedValue({
        tenantId: 'tenant1',
        userId: 'member2',
      });

      await service.calculateCommission('order1', 'tenant1');

      expect(mockCommissionRepo.upsert).not.toHaveBeenCalled();
    });

    it('应该跳过L1 - 受益人不是C1/C2', async () => {
      const beneficiary = {
        memberId: 'member2',
        tenantId: 'tenant1',
        levelId: 0, // 普通会员
        parentId: 'member3',
      };

      mockOrderQueryPort.findOrderForCommission.mockResolvedValue(mockOrder);
      mockMemberQueryPort.findMemberForCommission.mockResolvedValue(mockMember);
      mockMemberQueryPort.findMemberBrief.mockResolvedValue(beneficiary);
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(mockDistConfig);
      mockPrismaService.pmsTenantSku.findMany.mockResolvedValue([
        {
          id: 'sku1',
          distMode: 'RATIO',
          distRate: new Decimal(1),
          globalSku: {},
        },
      ]);
      mockPrismaService.sysDistBlacklist.findUnique.mockResolvedValue(null);

      await service.calculateCommission('order1', 'tenant1');

      expect(mockCommissionRepo.upsert).not.toHaveBeenCalled();
    });
  });

  describe('cancelCommissions', () => {
    it('应该取消冻结中的佣金 - 全额退款', async () => {
      const mockCommissions = [
        {
          id: 'comm1',
          status: CommissionStatus.FROZEN,
          amount: new Decimal(10),
        },
      ];

      mockCommissionRepo.findMany.mockResolvedValue(mockCommissions);

      await service.cancelCommissions('order1');

      expect(mockCommissionRepo.findMany).toHaveBeenCalledWith({
        where: { orderId: 'order1' },
      });
      expect(mockCommissionRepo.update).toHaveBeenCalledWith('comm1', {
        status: CommissionStatus.CANCELLED,
      });
    });

    it('应该取消冻结中的佣金 - 部分退款', async () => {
      const mockCommissions = [
        {
          id: 'comm1',
          status: CommissionStatus.FROZEN,
          amount: new Decimal(10),
          orderItemId: 1,
        },
      ];

      mockCommissionRepo.findMany.mockResolvedValue(mockCommissions);

      await service.cancelCommissions('order1', [1, 2]);

      expect(mockCommissionRepo.findMany).toHaveBeenCalledWith({
        where: { orderId: 'order1', orderItemId: { in: [1, 2] } },
      });
      expect(mockCommissionRepo.update).toHaveBeenCalledWith('comm1', {
        status: CommissionStatus.CANCELLED,
      });
    });

    it('应该回滚已结算的佣金 - 全额退款', async () => {
      const mockCommissions = [
        {
          id: 'comm1',
          status: CommissionStatus.SETTLED,
          amount: new Decimal(10),
          beneficiaryId: 'member1',
          orderId: 'order1',
        },
      ];

      mockCommissionRepo.findMany.mockResolvedValue(mockCommissions);
      mockWalletService.deductBalanceOrPendingRecovery.mockResolvedValue({
        deducted: new Decimal(10),
        pendingRecovery: new Decimal(0),
      });
      mockCommissionRepo.update.mockResolvedValue({});

      await service.cancelCommissions('order1');

      expect(mockWalletService.deductBalanceOrPendingRecovery).toHaveBeenCalled();
      expect(mockCommissionRepo.update).toHaveBeenCalledWith('comm1', {
        status: CommissionStatus.CANCELLED,
      });
    });

    it('应该回滚已结算的佣金 - 部分退款', async () => {
      const mockCommissions = [
        {
          id: 'comm1',
          status: CommissionStatus.SETTLED,
          amount: new Decimal(5),
          beneficiaryId: 'member1',
          orderId: 'order1',
          orderItemId: 1,
        },
      ];

      mockCommissionRepo.findMany.mockResolvedValue(mockCommissions);
      mockWalletService.deductBalanceOrPendingRecovery.mockResolvedValue({
        deducted: new Decimal(5),
        pendingRecovery: new Decimal(0),
      });
      mockCommissionRepo.update.mockResolvedValue({});

      await service.cancelCommissions('order1', [1]);

      expect(mockCommissionRepo.findMany).toHaveBeenCalledWith({
        where: { orderId: 'order1', orderItemId: { in: [1] } },
      });
      expect(mockWalletService.deductBalanceOrPendingRecovery).toHaveBeenCalledWith(
        'member1',
        new Decimal(5),
        'order1',
        '订单退款，佣金回收',
        expect.anything(),
      );
      expect(mockCommissionRepo.update).toHaveBeenCalledWith('comm1', {
        status: CommissionStatus.CANCELLED,
      });
    });

    it('应该处理无佣金记录的情况', async () => {
      mockCommissionRepo.findMany.mockResolvedValue([]);

      await service.cancelCommissions('order1');

      expect(mockCommissionRepo.update).not.toHaveBeenCalled();
      expect(mockWalletService.deductBalanceOrPendingRecovery).not.toHaveBeenCalled();
    });
  });

  describe('updatePlanSettleTime', () => {
    it('应该更新结算时间 - 服务核销', async () => {
      const mockCommissions = [
        {
          id: 'comm1',
          orderId: 'order1',
          status: CommissionStatus.FROZEN,
        },
      ];

      mockCommissionRepo.findMany.mockResolvedValue(mockCommissions);

      await service.updatePlanSettleTime('order1', 'VERIFY');

      expect(mockCommissionRepo.updateMany).toHaveBeenCalled();
      const call = mockCommissionRepo.updateMany.mock.calls[0];
      expect(call[0]).toEqual({
        orderId: 'order1',
        status: CommissionStatus.FROZEN,
      });
    });

    it('应该更新结算时间 - 实物确认收货', async () => {
      const mockCommissions = [
        {
          id: 'comm1',
          orderId: 'order1',
          status: CommissionStatus.FROZEN,
        },
      ];

      mockCommissionRepo.findMany.mockResolvedValue(mockCommissions);

      await service.updatePlanSettleTime('order1', 'CONFIRM');

      expect(mockCommissionRepo.updateMany).toHaveBeenCalled();
    });

    it('应该跳过更新 - 无冻结佣金', async () => {
      mockCommissionRepo.findMany.mockResolvedValue([]);

      await service.updatePlanSettleTime('order1', 'CONFIRM');

      expect(mockCommissionRepo.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('checkCircularReferral', () => {
    beforeEach(() => {
      mockMemberQueryPort.checkCircularReferral.mockReset();
    });

    it('应该检测到循环推荐', async () => {
      // A-T2: 通过 MemberQueryPort 检测循环推荐
      mockMemberQueryPort.checkCircularReferral.mockResolvedValue(true);

      const result = await service.checkCircularReferral('member1', 'member2');

      expect(result).toBe(true);
      expect(mockMemberQueryPort.checkCircularReferral).toHaveBeenCalledWith('member1', 'member2');
    });

    it('应该返回false - 无循环推荐', async () => {
      mockMemberQueryPort.checkCircularReferral.mockResolvedValue(false);

      const result = await service.checkCircularReferral('member1', 'member2');

      expect(result).toBe(false);
      expect(mockMemberQueryPort.checkCircularReferral).toHaveBeenCalledWith('member1', 'member2');
    });

    it('应该返回false - 达到最大深度', async () => {
      // Port 内部处理最大深度逻辑，返回 false
      mockMemberQueryPort.checkCircularReferral.mockResolvedValue(false);

      const result = await service.checkCircularReferral('member1', 'member2');

      expect(result).toBe(false);
    });
  });

  describe('getCommissionsByOrder', () => {
    it('应该返回订单的佣金列表', async () => {
      const mockCommissions = [
        {
          id: 'comm1',
          orderId: 'order1',
          beneficiaryId: 'member1',
          level: 1,
          amount: new Decimal(10),
          beneficiary: {
            memberId: 'member1',
            nickname: '用户1',
            avatar: 'avatar.jpg',
            mobile: '13800138000',
          },
        },
      ];

      mockCommissionRepo.findMany.mockResolvedValue(mockCommissions);

      const result = await service.getCommissionsByOrder('order1');

      expect(result).toEqual(mockCommissions);
      expect(mockCommissionRepo.findMany).toHaveBeenCalledWith({
        where: { orderId: 'order1' },
        include: {
          beneficiary: {
            select: {
              memberId: true,
              nickname: true,
              avatar: true,
              mobile: true,
            },
          },
        },
      });
    });
  });
});
