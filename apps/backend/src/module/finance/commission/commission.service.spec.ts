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

describe('CommissionService', () => {
  let service: CommissionService;
  let prismaService: PrismaService;
  let commissionRepo: CommissionRepository;
  let walletService: WalletService;
  let commissionQueue: Queue;

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
          provide: 'BullQueue_CALC_COMMISSION',
          useValue: mockCommissionQueue,
        },
      ],
    }).compile();

    service = module.get<CommissionService>(CommissionService);
    prismaService = module.get<PrismaService>(PrismaService);
    commissionRepo = module.get<CommissionRepository>(CommissionRepository);
    walletService = module.get<WalletService>(WalletService);
    commissionQueue = module.get<Queue>('BullQueue_CALC_COMMISSION');
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
      items: [
        {
          skuId: 'sku1',
          totalAmount: new Decimal(100),
          quantity: 1,
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
      mockPrismaService.omsOrder.findUnique.mockResolvedValue(null);

      await service.calculateCommission('order1', 'tenant1');

      expect(mockCommissionRepo.upsert).not.toHaveBeenCalled();
    });

    it('应该跳过计算 - 会员不存在', async () => {
      mockPrismaService.omsOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.umsMember.findUnique.mockResolvedValue(null);

      await service.calculateCommission('order1', 'tenant1');

      expect(mockCommissionRepo.upsert).not.toHaveBeenCalled();
    });

    it('应该跳过计算 - 自购订单', async () => {
      const selfPurchaseOrder = {
        ...mockOrder,
        shareUserId: 'member1' as string | null,
      };

      mockPrismaService.omsOrder.findUnique.mockResolvedValue(selfPurchaseOrder);
      mockPrismaService.umsMember.findUnique.mockResolvedValue(mockMember);

      await service.calculateCommission('order1', 'tenant1');

      expect(mockCommissionRepo.upsert).not.toHaveBeenCalled();
    });

    it('应该跳过计算 - 佣金基数为0', async () => {
      mockPrismaService.omsOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.umsMember.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue({
        distMode: 'NONE',
      });

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

      mockPrismaService.omsOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.umsMember.findUnique
        .mockResolvedValueOnce(mockMember)
        .mockResolvedValueOnce(beneficiary)
        .mockResolvedValueOnce({ memberId: 'member3', tenantId: 'tenant1', levelId: 2 });
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(mockDistConfig);
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue({
        distMode: 'RATIO',
        distRate: new Decimal(1),
        globalSku: {},
      });
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

      mockPrismaService.omsOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.umsMember.findUnique.mockResolvedValueOnce(mockMember).mockResolvedValueOnce(beneficiary);
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(mockDistConfig);
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue({
        distMode: 'RATIO',
        distRate: new Decimal(1),
        globalSku: {},
      });
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

      mockPrismaService.omsOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.umsMember.findUnique.mockResolvedValueOnce(mockMember).mockResolvedValueOnce(beneficiary);
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(mockDistConfig);
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue({
        distMode: 'RATIO',
        distRate: new Decimal(1),
        globalSku: {},
      });
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

      mockPrismaService.omsOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.umsMember.findUnique.mockResolvedValueOnce(mockMember).mockResolvedValueOnce(beneficiary);
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(mockDistConfig);
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue({
        distMode: 'RATIO',
        distRate: new Decimal(1),
        globalSku: {},
      });
      mockPrismaService.sysDistBlacklist.findUnique.mockResolvedValue(null);

      await service.calculateCommission('order1', 'tenant1');

      expect(mockCommissionRepo.upsert).not.toHaveBeenCalled();
    });
  });

  describe('cancelCommissions', () => {
    it('应该取消冻结中的佣金', async () => {
      const mockCommissions = [
        {
          id: 'comm1',
          status: CommissionStatus.FROZEN,
          amount: new Decimal(10),
        },
      ];

      mockCommissionRepo.findMany.mockResolvedValue(mockCommissions);

      await service.cancelCommissions('order1');

      expect(mockCommissionRepo.update).toHaveBeenCalledWith('comm1', {
        status: CommissionStatus.CANCELLED,
      });
    });

    it('应该回滚已结算的佣金', async () => {
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
      mockWalletService.deductBalance.mockResolvedValue({});
      mockCommissionRepo.update.mockResolvedValue({});

      await service.cancelCommissions('order1');

      expect(mockWalletService.deductBalance).toHaveBeenCalled();
      expect(mockCommissionRepo.update).toHaveBeenCalledWith('comm1', {
        status: CommissionStatus.CANCELLED,
      });
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
    it('应该检测到循环推荐', async () => {
      mockPrismaService.umsMember.findUnique
        .mockResolvedValueOnce({ memberId: 'member2', parentId: 'member3' })
        .mockResolvedValueOnce({ memberId: 'member3', parentId: 'member1' });

      const result = await service.checkCircularReferral('member1', 'member2');

      expect(result).toBe(true);
    });

    it('应该返回false - 无循环推荐', async () => {
      mockPrismaService.umsMember.findUnique
        .mockResolvedValueOnce({ memberId: 'member2', parentId: 'member3' })
        .mockResolvedValueOnce({ memberId: 'member3', parentId: null });

      const result = await service.checkCircularReferral('member1', 'member2');

      expect(result).toBe(false);
    });

    it('应该返回false - 达到最大深度', async () => {
      mockPrismaService.umsMember.findUnique.mockResolvedValue({
        memberId: 'memberX',
        parentId: 'memberY',
      });

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
