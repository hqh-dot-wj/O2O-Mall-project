import { Test, TestingModule } from '@nestjs/testing';
import { CommissionService } from './commission.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommissionRepository } from './commission.repository';
import { WalletRepository } from '../wallet/wallet.repository';
import { TransactionRepository } from '../wallet/transaction.repository';
import { WalletService } from '../wallet/wallet.service';
import { Decimal } from '@prisma/client/runtime/library';
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
 * CommissionService 高级测试用例
 * 使用 TestDataFactory 简化测试数据创建
 */
describe('CommissionService - Advanced Tests', () => {
  let service: CommissionService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    sysDistConfig: { findUnique: jest.fn() },
    omsOrder: { findUnique: jest.fn() },
    umsMember: { findUnique: jest.fn() },
    pmsTenantSku: { findUnique: jest.fn(), findMany: jest.fn() },
    sysDistBlacklist: { findUnique: jest.fn() },
    finUserDailyQuota: { upsert: jest.fn(), update: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) => callback(mockPrismaService)),
  };

  const mockCommissionRepo = {
    upsert: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };

  const mockWalletRepo = {};
  const mockTransactionRepo = {};
  const mockWalletService = {
    deductBalance: jest.fn(),
    addBalance: jest.fn(),
    getOrCreateWallet: jest.fn(),
    deductBalanceOrPendingRecovery: jest.fn().mockResolvedValue({
      deducted: new Decimal(10),
      pendingRecovery: new Decimal(0),
    }),
  };
  const mockCommissionQueue = { add: jest.fn() };

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
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CommissionRepository, useValue: mockCommissionRepo },
        { provide: WalletRepository, useValue: mockWalletRepo },
        { provide: TransactionRepository, useValue: mockTransactionRepo },
        { provide: WalletService, useValue: mockWalletService },
        { provide: ProductConfigService, useValue: mockProductConfigService },
        { provide: LevelService, useValue: mockLevelService },
        { provide: 'BullQueue_CALC_COMMISSION', useValue: mockCommissionQueue },
        { provide: OrderQueryPort, useValue: mockOrderQueryPort },
        { provide: MemberQueryPort, useValue: mockMemberQueryPort },
      ],
    }).compile();

    service = module.get<CommissionService>(CommissionService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('推荐关系链测试', () => {
    it('Given 三级推荐关系链, When 计算佣金, Then 应该创建L1和L2佣金记录', async () => {
      // C0 下单，C1 是直推人，C2 是间推人
      const c0 = { memberId: 'member-c0', tenantId: 'tenant1', parentId: 'member-c1', indirectParentId: 'member-c2', levelId: 0 };
      const c1 = { memberId: 'member-c1', tenantId: 'tenant1', parentId: 'member-c2', levelId: 1 };
      const c2 = { memberId: 'member-c2', tenantId: 'tenant1', parentId: null, levelId: 2 };

      const order = {
        id: 'order-chain',
        tenantId: 'tenant1',
        memberId: 'member-c0',
        shareUserId: null,
        orderType: 'PRODUCT',
        totalAmount: new Decimal(100),
        payAmount: new Decimal(100),
        couponDiscount: new Decimal(0),
        pointsDiscount: new Decimal(0),
        items: [{ skuId: 'sku1', productId: 'prod1', totalAmount: new Decimal(100), quantity: 1, price: new Decimal(100) }],
      };

      const config = {
        level1Rate: new Decimal(0.1),
        level2Rate: new Decimal(0.05),
        enableLV0: true,
        enableCrossTenant: false,
        crossTenantRate: new Decimal(0.5),
        crossMaxDaily: new Decimal(1000),
      };

      const sku = {
        id: 'sku1',
        distMode: 'RATIO',
        distRate: new Decimal(1),
        globalSku: {},
      };

      // A-T1/A-T2: 使用 Port mocks
      mockOrderQueryPort.findOrderForCommission.mockResolvedValue(order);
      mockMemberQueryPort.findMemberForCommission.mockResolvedValue(c0);
      mockMemberQueryPort.findMemberBrief
        .mockResolvedValueOnce(c1)
        .mockResolvedValueOnce(c2);
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(config);
      mockPrismaService.pmsTenantSku.findMany.mockResolvedValue([sku]);
      mockPrismaService.sysDistBlacklist.findUnique.mockResolvedValue(null);

      await service.calculateCommission(order.id, order.tenantId);

      // 应该创建 L1 和 L2 两条佣金记录
      expect(mockCommissionRepo.upsert).toHaveBeenCalledTimes(2);

      // L1 给 C1
      const l1Call = mockCommissionRepo.upsert.mock.calls[0][0];
      expect(l1Call.create.beneficiaryId).toBe(c1.memberId);
      expect(l1Call.create.level).toBe(1);

      // L2 给 C2
      const l2Call = mockCommissionRepo.upsert.mock.calls[1][0];
      expect(l2Call.create.beneficiaryId).toBe(c2.memberId);
      expect(l2Call.create.level).toBe(2);
    });
  });

  describe('跨店佣金测试', () => {
    it('Given 启用跨店, When 计算跨店佣金, Then 应该标记isCrossTenant为true', async () => {
      const member = { memberId: 'member1', tenantId: 'tenant1', parentId: 'member2', indirectParentId: null, levelId: 0 };
      const beneficiary = { memberId: 'member2', tenantId: 'tenant2', parentId: null, levelId: 1 }; // 不同租户

      const order = {
        id: 'order-cross',
        tenantId: 'tenant1',
        memberId: 'member1',
        shareUserId: null,
        orderType: 'PRODUCT',
        totalAmount: new Decimal(100),
        payAmount: new Decimal(100),
        couponDiscount: new Decimal(0),
        pointsDiscount: new Decimal(0),
        items: [{ skuId: 'sku1', productId: 'prod1', totalAmount: new Decimal(100), quantity: 1, price: new Decimal(100) }],
      };

      const config = {
        level1Rate: new Decimal(0.1),
        level2Rate: new Decimal(0.05),
        enableLV0: true,
        enableCrossTenant: true, // 启用跨店
        crossTenantRate: new Decimal(0.5),
        crossMaxDaily: new Decimal(1000),
      };

      const sku = { id: 'sku1', distMode: 'RATIO', distRate: new Decimal(1), globalSku: {} };

      // A-T1/A-T2: 使用 Port mocks
      mockOrderQueryPort.findOrderForCommission.mockResolvedValue(order);
      mockMemberQueryPort.findMemberForCommission.mockResolvedValue(member);
      mockMemberQueryPort.findMemberBrief.mockResolvedValue(beneficiary);
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(config);
      mockPrismaService.pmsTenantSku.findMany.mockResolvedValue([sku]);
      mockPrismaService.sysDistBlacklist.findUnique.mockResolvedValue(null);
      // Mock daily quota check - 返回在限额内
      mockPrismaService.finUserDailyQuota.upsert.mockResolvedValue({
        usedAmount: new Decimal(10),
        limitAmount: new Decimal(1000),
      });

      await service.calculateCommission(order.id, order.tenantId);

      expect(mockCommissionRepo.upsert).toHaveBeenCalled();
      const call = mockCommissionRepo.upsert.mock.calls[0][0];
      expect(call.create.isCrossTenant).toBe(true);
    });

    it('Given 未启用跨店, When 计算跨店佣金, Then 应该跳过佣金创建', async () => {
      const member = { memberId: 'member1', tenantId: 'tenant1', parentId: 'member2', indirectParentId: null, levelId: 0 };
      const beneficiary = { memberId: 'member2', tenantId: 'tenant2', parentId: null, levelId: 1 }; // 不同租户

      const order = {
        id: 'order-cross2',
        tenantId: 'tenant1',
        memberId: 'member1',
        shareUserId: null,
        orderType: 'PRODUCT',
        totalAmount: new Decimal(100),
        payAmount: new Decimal(100),
        couponDiscount: new Decimal(0),
        pointsDiscount: new Decimal(0),
        items: [{ skuId: 'sku1', productId: 'prod1', totalAmount: new Decimal(100), quantity: 1, price: new Decimal(100) }],
      };

      const config = {
        level1Rate: new Decimal(0.1),
        level2Rate: new Decimal(0.05),
        enableLV0: true,
        enableCrossTenant: false, // 未启用
        crossTenantRate: new Decimal(0.5),
        crossMaxDaily: new Decimal(1000),
      };

      const sku = { id: 'sku1', distMode: 'RATIO', distRate: new Decimal(1), globalSku: {} };

      // A-T1/A-T2: 使用 Port mocks
      mockOrderQueryPort.findOrderForCommission.mockResolvedValue(order);
      mockMemberQueryPort.findMemberForCommission.mockResolvedValue(member);
      mockMemberQueryPort.findMemberBrief.mockResolvedValue(beneficiary);
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(config);
      mockPrismaService.pmsTenantSku.findMany.mockResolvedValue([sku]);
      mockPrismaService.sysDistBlacklist.findUnique.mockResolvedValue(null);

      await service.calculateCommission(order.id, order.tenantId);

      expect(mockCommissionRepo.upsert).not.toHaveBeenCalled();
    });

    it('Given 跨店日限额已达上限, When 计算跨店佣金, Then 应该跳过佣金创建', async () => {
      const member = { memberId: 'member1', tenantId: 'tenant1', parentId: 'member2', indirectParentId: null, levelId: 0 };
      const beneficiary = { memberId: 'member2', tenantId: 'tenant2', parentId: null, levelId: 1 };

      const order = {
        id: 'order-cross3',
        tenantId: 'tenant1',
        memberId: 'member1',
        shareUserId: null,
        orderType: 'PRODUCT',
        totalAmount: new Decimal(100),
        payAmount: new Decimal(100),
        couponDiscount: new Decimal(0),
        pointsDiscount: new Decimal(0),
        items: [{ skuId: 'sku1', productId: 'prod1', totalAmount: new Decimal(100), quantity: 1, price: new Decimal(100) }],
      };

      const config = {
        level1Rate: new Decimal(0.1),
        level2Rate: new Decimal(0.05),
        enableLV0: true,
        enableCrossTenant: true,
        crossTenantRate: new Decimal(0.5),
        crossMaxDaily: new Decimal(1000),
      };

      const sku = { id: 'sku1', distMode: 'RATIO', distRate: new Decimal(1), globalSku: {} };

      // A-T1/A-T2: 使用 Port mocks
      mockOrderQueryPort.findOrderForCommission.mockResolvedValue(order);
      mockMemberQueryPort.findMemberForCommission.mockResolvedValue(member);
      mockMemberQueryPort.findMemberBrief.mockResolvedValue(beneficiary);
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(config);
      mockPrismaService.pmsTenantSku.findMany.mockResolvedValue([sku]);
      mockPrismaService.sysDistBlacklist.findUnique.mockResolvedValue(null);

      // 模拟已达到限额 - upsert 返回超限的金额，然后回滚
      mockPrismaService.finUserDailyQuota.upsert.mockResolvedValue({
        usedAmount: new Decimal(1010), // 超过限额
        limitAmount: new Decimal(1000),
      });
      mockPrismaService.finUserDailyQuota.update.mockResolvedValue({});

      await service.calculateCommission(order.id, order.tenantId);

      // 应该跳过佣金创建
      expect(mockCommissionRepo.upsert).not.toHaveBeenCalled();
    });
  });

  describe('自购场景测试', () => {
    it('Given 自购订单, When 计算佣金, Then 应该跳过佣金计算', async () => {
      const member = { memberId: 'member1', tenantId: 'tenant1', parentId: null, indirectParentId: null, levelId: 1 };

      const order = {
        id: 'order-self',
        tenantId: 'tenant1',
        memberId: 'member1',
        shareUserId: 'member1', // 自己分享自己购买
        orderType: 'PRODUCT',
        totalAmount: new Decimal(100),
        payAmount: new Decimal(100),
        couponDiscount: new Decimal(0),
        pointsDiscount: new Decimal(0),
        items: [{ skuId: 'sku1', productId: 'prod1', totalAmount: new Decimal(100), quantity: 1, price: new Decimal(100) }],
      };

      // A-T1/A-T2: 使用 Port mocks
      mockOrderQueryPort.findOrderForCommission.mockResolvedValue(order);
      mockMemberQueryPort.findMemberForCommission.mockResolvedValue(member);

      await service.calculateCommission(order.id, order.tenantId);

      expect(mockCommissionRepo.upsert).not.toHaveBeenCalled();
    });
  });

  describe('C2 全拿场景测试', () => {
    it('Given C2无上级, When 计算佣金, Then C2应该获得L1+L2全部佣金', async () => {
      const c0 = { memberId: 'member-c0', tenantId: 'tenant1', parentId: 'member-c2', indirectParentId: null, levelId: 0 };
      const c2 = { memberId: 'member-c2', tenantId: 'tenant1', parentId: null, levelId: 2 }; // C2 无上级

      const order = {
        id: 'order-c2full',
        tenantId: 'tenant1',
        memberId: 'member-c0',
        shareUserId: null,
        orderType: 'PRODUCT',
        totalAmount: new Decimal(100),
        payAmount: new Decimal(100),
        couponDiscount: new Decimal(0),
        pointsDiscount: new Decimal(0),
        items: [{ skuId: 'sku1', productId: 'prod1', totalAmount: new Decimal(100), quantity: 1, price: new Decimal(100) }],
      };

      const config = {
        level1Rate: new Decimal(0.1),
        level2Rate: new Decimal(0.05),
        enableLV0: true,
        enableCrossTenant: false,
        crossTenantRate: new Decimal(0.5),
        crossMaxDaily: new Decimal(1000),
      };

      const sku = { id: 'sku1', distMode: 'RATIO', distRate: new Decimal(1), globalSku: {} };

      // A-T1/A-T2: 使用 Port mocks
      mockOrderQueryPort.findOrderForCommission.mockResolvedValue(order);
      mockMemberQueryPort.findMemberForCommission.mockResolvedValue(c0);
      mockMemberQueryPort.findMemberBrief.mockResolvedValue(c2);
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(config);
      mockPrismaService.pmsTenantSku.findMany.mockResolvedValue([sku]);
      mockPrismaService.sysDistBlacklist.findUnique.mockResolvedValue(null);

      await service.calculateCommission(order.id, order.tenantId);

      // 只创建一条佣金记录
      expect(mockCommissionRepo.upsert).toHaveBeenCalledTimes(1);

      const call = mockCommissionRepo.upsert.mock.calls[0][0];
      expect(call.create.beneficiaryId).toBe(c2.memberId);
      expect(call.create.level).toBe(1);

      // 金额应该是 L1 + L2
      const expectedAmount = new Decimal(100).mul(config.level1Rate).add(new Decimal(100).mul(config.level2Rate));
      expect(call.create.amount.toNumber()).toBeCloseTo(expectedAmount.toNumber(), 2);
    });
  });

  describe('黑名单测试', () => {
    it('Given 受益人在黑名单, When 计算佣金, Then 应该跳过佣金创建', async () => {
      const member = { memberId: 'member1', tenantId: 'tenant1', parentId: 'member-blacklist', indirectParentId: null, levelId: 0 };
      const beneficiary = { memberId: 'member-blacklist', tenantId: 'tenant1', parentId: null, levelId: 1 };

      const order = {
        id: 'order-blacklist',
        tenantId: 'tenant1',
        memberId: 'member1',
        shareUserId: null,
        orderType: 'PRODUCT',
        totalAmount: new Decimal(100),
        payAmount: new Decimal(100),
        couponDiscount: new Decimal(0),
        pointsDiscount: new Decimal(0),
        items: [{ skuId: 'sku1', productId: 'prod1', totalAmount: new Decimal(100), quantity: 1, price: new Decimal(100) }],
      };

      const config = {
        level1Rate: new Decimal(0.1),
        level2Rate: new Decimal(0.05),
        enableLV0: true,
        enableCrossTenant: false,
        crossTenantRate: new Decimal(0.5),
        crossMaxDaily: new Decimal(1000),
      };

      const sku = { id: 'sku1', distMode: 'RATIO', distRate: new Decimal(1), globalSku: {} };
      const blacklist = { tenantId: 'tenant1', userId: 'member-blacklist' };

      // A-T1/A-T2: 使用 Port mocks
      mockOrderQueryPort.findOrderForCommission.mockResolvedValue(order);
      mockMemberQueryPort.findMemberForCommission.mockResolvedValue(member);
      mockMemberQueryPort.findMemberBrief.mockResolvedValue(beneficiary);
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(config);
      mockPrismaService.pmsTenantSku.findMany.mockResolvedValue([sku]);
      mockPrismaService.sysDistBlacklist.findUnique.mockResolvedValue(blacklist);

      await service.calculateCommission(order.id, order.tenantId);

      expect(mockCommissionRepo.upsert).not.toHaveBeenCalled();
    });
  });

  describe('佣金取消测试', () => {
    it('Given 冻结中的佣金, When 取消佣金, Then 应该更新状态为CANCELLED', async () => {
      const commissions = [
        { id: BigInt(1), orderId: 'order1', status: 'FROZEN', amount: new Decimal(10), beneficiaryId: 'member1' },
        { id: BigInt(2), orderId: 'order1', status: 'FROZEN', amount: new Decimal(5), beneficiaryId: 'member2' },
      ];

      mockCommissionRepo.findMany.mockResolvedValue(commissions);

      await service.cancelCommissions('order1');

      expect(mockCommissionRepo.update).toHaveBeenCalledTimes(2);
    });

    it('Given 已结算的佣金, When 取消佣金, Then 应该回滚钱包余额', async () => {
      const commission = {
        id: BigInt(1),
        orderId: 'order1',
        status: 'SETTLED',
        amount: new Decimal(10),
        beneficiaryId: 'member1',
      };

      mockCommissionRepo.findMany.mockResolvedValue([commission]);
      mockWalletService.deductBalanceOrPendingRecovery.mockResolvedValue({
        deducted: new Decimal(10),
        pendingRecovery: new Decimal(0),
      });

      await service.cancelCommissions('order1');

      expect(mockWalletService.deductBalanceOrPendingRecovery).toHaveBeenCalledWith(
        commission.beneficiaryId,
        commission.amount,
        commission.orderId,
        expect.any(String),
        expect.any(String),
      );
    });
  });

  describe('循环推荐检测', () => {
    beforeEach(() => {
      // A-T2: 重置 MemberQueryPort mock
      mockMemberQueryPort.checkCircularReferral.mockReset();
    });

    it('Given A->B->C->A循环, When 检测循环推荐, Then 应该返回true', async () => {
      // A-T2: 通过 MemberQueryPort 检测循环推荐
      mockMemberQueryPort.checkCircularReferral.mockResolvedValue(true);

      const result = await service.checkCircularReferral('A', 'B');

      expect(result).toBe(true);
      expect(mockMemberQueryPort.checkCircularReferral).toHaveBeenCalledWith('A', 'B');
    });

    it('Given A->B->A循环, When 检测循环推荐, Then 应该返回true', async () => {
      mockMemberQueryPort.checkCircularReferral.mockResolvedValue(true);

      const result = await service.checkCircularReferral('A', 'B');

      expect(result).toBe(true);
    });

    it('Given 无循环推荐, When 检测循环推荐, Then 应该返回false', async () => {
      mockMemberQueryPort.checkCircularReferral.mockResolvedValue(false);

      const result = await service.checkCircularReferral('A', 'B');

      expect(result).toBe(false);
    });
  });
});
