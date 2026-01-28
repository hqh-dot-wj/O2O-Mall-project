import { Test, TestingModule } from '@nestjs/testing';
import { CommissionService } from './commission.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommissionRepository } from './commission.repository';
import { WalletRepository } from '../wallet/wallet.repository';
import { TransactionRepository } from '../wallet/transaction.repository';
import { WalletService } from '../wallet/wallet.service';
import { Queue } from 'bull';
import { TestDataFactory } from '../test/test-data.factory';
import { Decimal } from '@prisma/client/runtime/library';

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
    pmsTenantSku: { findUnique: jest.fn() },
    sysDistBlacklist: { findUnique: jest.fn() },
    $queryRaw: jest.fn(),
  };

  const mockCommissionRepo = {
    upsert: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  };

  const mockWalletRepo = {};
  const mockTransactionRepo = {};
  const mockWalletService = {
    deductBalance: jest.fn(),
  };
  const mockCommissionQueue = { add: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CommissionRepository, useValue: mockCommissionRepo },
        { provide: WalletRepository, useValue: mockWalletRepo },
        { provide: TransactionRepository, useValue: mockTransactionRepo },
        { provide: WalletService, useValue: mockWalletService },
        { provide: 'BullQueue_CALC_COMMISSION', useValue: mockCommissionQueue },
      ],
    }).compile();

    service = module.get<CommissionService>(CommissionService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('推荐关系链测试', () => {
    it('应该正确计算三级推荐关系的佣金', async () => {
      // 使用工厂创建推荐关系链
      const { c0, c1, c2 } = TestDataFactory.createReferralChain();

      // 创建 C0 的订单
      const order = TestDataFactory.createOrder({
        memberId: c0.memberId,
        shareUserId: null,
      });

      const config = TestDataFactory.createDistConfig();
      const sku = TestDataFactory.createTenantSku();

      mockPrismaService.omsOrder.findUnique.mockResolvedValue(order);
      mockPrismaService.umsMember.findUnique
        .mockResolvedValueOnce(c0)
        .mockResolvedValueOnce(c1)
        .mockResolvedValueOnce(c2);
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(config);
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue(sku);
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
    it('应该正确处理跨店佣金 - 启用跨店', async () => {
      const { order, beneficiary, config } =
        TestDataFactory.createCrossTenantScenario();

      const member = TestDataFactory.createMember({
        memberId: order.memberId,
        parentId: beneficiary.memberId,
      });

      const sku = TestDataFactory.createTenantSku();

      mockPrismaService.omsOrder.findUnique.mockResolvedValue(order);
      mockPrismaService.umsMember.findUnique
        .mockResolvedValueOnce(member)
        .mockResolvedValueOnce(beneficiary);
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(config);
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue(sku);
      mockPrismaService.sysDistBlacklist.findUnique.mockResolvedValue(null);
      mockPrismaService.$queryRaw.mockResolvedValue([{ total: '0' }]);

      await service.calculateCommission(order.id, order.tenantId);

      expect(mockCommissionRepo.upsert).toHaveBeenCalled();
      const call = mockCommissionRepo.upsert.mock.calls[0][0];
      expect(call.create.isCrossTenant).toBe(true);
    });

    it('应该跳过跨店佣金 - 未启用跨店', async () => {
      const { order, beneficiary } = TestDataFactory.createCrossTenantScenario();

      const config = TestDataFactory.createDistConfig({
        enableCrossTenant: false, // 未启用
      });

      const member = TestDataFactory.createMember({
        memberId: order.memberId,
        parentId: beneficiary.memberId,
      });

      const sku = TestDataFactory.createTenantSku();

      mockPrismaService.omsOrder.findUnique.mockResolvedValue(order);
      mockPrismaService.umsMember.findUnique
        .mockResolvedValueOnce(member)
        .mockResolvedValueOnce(beneficiary);
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(config);
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue(sku);
      mockPrismaService.sysDistBlacklist.findUnique.mockResolvedValue(null);

      await service.calculateCommission(order.id, order.tenantId);

      expect(mockCommissionRepo.upsert).not.toHaveBeenCalled();
    });

    it('应该检查跨店日限额', async () => {
      const { order, beneficiary, config } =
        TestDataFactory.createCrossTenantScenario();

      const member = TestDataFactory.createMember({
        memberId: order.memberId,
        parentId: beneficiary.memberId,
      });

      const sku = TestDataFactory.createTenantSku();

      mockPrismaService.omsOrder.findUnique.mockResolvedValue(order);
      mockPrismaService.umsMember.findUnique
        .mockResolvedValueOnce(member)
        .mockResolvedValueOnce(beneficiary);
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(config);
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue(sku);
      mockPrismaService.sysDistBlacklist.findUnique.mockResolvedValue(null);

      // 模拟已达到限额
      mockPrismaService.$queryRaw.mockResolvedValue([{ total: '1000' }]);

      await service.calculateCommission(order.id, order.tenantId);

      // 应该跳过佣金创建
      expect(mockCommissionRepo.upsert).not.toHaveBeenCalled();
    });
  });

  describe('自购场景测试', () => {
    it('应该跳过自购订单的佣金计算', async () => {
      const { member, order } = TestDataFactory.createSelfPurchaseScenario();

      mockPrismaService.omsOrder.findUnique.mockResolvedValue(order);
      mockPrismaService.umsMember.findUnique.mockResolvedValue(member);

      await service.calculateCommission(order.id, order.tenantId);

      expect(mockCommissionRepo.upsert).not.toHaveBeenCalled();
    });
  });

  describe('C2 全拿场景测试', () => {
    it('应该让 C2 获得 L1+L2 全部佣金', async () => {
      const { c2, c0, order } = TestDataFactory.createC2FullTakeScenario();

      const config = TestDataFactory.createDistConfig();
      const sku = TestDataFactory.createTenantSku();

      mockPrismaService.omsOrder.findUnique.mockResolvedValue(order);
      mockPrismaService.umsMember.findUnique
        .mockResolvedValueOnce(c0)
        .mockResolvedValueOnce(c2);
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(config);
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue(sku);
      mockPrismaService.sysDistBlacklist.findUnique.mockResolvedValue(null);

      await service.calculateCommission(order.id, order.tenantId);

      // 只创建一条佣金记录
      expect(mockCommissionRepo.upsert).toHaveBeenCalledTimes(1);

      const call = mockCommissionRepo.upsert.mock.calls[0][0];
      expect(call.create.beneficiaryId).toBe(c2.memberId);
      expect(call.create.level).toBe(1);

      // 金额应该是 L1 + L2
      const expectedAmount = new Decimal(100)
        .mul(config.level1Rate)
        .add(new Decimal(100).mul(config.level2Rate));
      expect(call.create.amount.toNumber()).toBeCloseTo(expectedAmount.toNumber(), 2);
    });
  });

  describe('黑名单测试', () => {
    it('应该跳过黑名单用户的佣金', async () => {
      const order = TestDataFactory.createOrder();
      const member = TestDataFactory.createMember({
        memberId: order.memberId,
        parentId: 'member-blacklist',
      });
      const beneficiary = TestDataFactory.createC1Member({
        memberId: 'member-blacklist',
      });
      const blacklist = TestDataFactory.createBlacklist({
        userId: 'member-blacklist',
      });

      mockPrismaService.omsOrder.findUnique.mockResolvedValue(order);
      mockPrismaService.umsMember.findUnique
        .mockResolvedValueOnce(member)
        .mockResolvedValueOnce(beneficiary);
      mockPrismaService.sysDistConfig.findUnique.mockResolvedValue(
        TestDataFactory.createDistConfig(),
      );
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue(
        TestDataFactory.createTenantSku(),
      );
      mockPrismaService.sysDistBlacklist.findUnique.mockResolvedValue(blacklist);

      await service.calculateCommission(order.id, order.tenantId);

      expect(mockCommissionRepo.upsert).not.toHaveBeenCalled();
    });
  });

  describe('佣金取消测试', () => {
    it('应该取消冻结中的佣金', async () => {
      const commissions = [
        TestDataFactory.createCommission({ id: BigInt(1) }),
        TestDataFactory.createCommission({ id: BigInt(2) }),
      ];

      mockCommissionRepo.findMany.mockResolvedValue(commissions);

      await service.cancelCommissions('order1');

      expect(mockCommissionRepo.update).toHaveBeenCalledTimes(2);
    });

    it('应该回滚已结算的佣金', async () => {
      const commission = TestDataFactory.createSettledCommission();

      mockCommissionRepo.findMany.mockResolvedValue([commission]);
      mockWalletService.deductBalance.mockResolvedValue({});

      await service.cancelCommissions('order1');

      expect(mockWalletService.deductBalance).toHaveBeenCalledWith(
        commission.beneficiaryId,
        commission.amount,
        commission.orderId,
        expect.any(String),
        expect.any(String),
      );
    });
  });

  describe('循环推荐检测', () => {
    it('应该检测到循环推荐 - A->B->C->A', async () => {
      mockPrismaService.umsMember.findUnique
        .mockResolvedValueOnce({ memberId: 'B', parentId: 'C' })
        .mockResolvedValueOnce({ memberId: 'C', parentId: 'A' });

      const result = await service.checkCircularReferral('A', 'B');

      expect(result).toBe(true);
    });

    it('应该检测到循环推荐 - A->B->A', async () => {
      mockPrismaService.umsMember.findUnique.mockResolvedValueOnce({
        memberId: 'B',
        parentId: 'A',
      });

      const result = await service.checkCircularReferral('A', 'B');

      expect(result).toBe(true);
    });

    it('应该返回 false - 无循环推荐', async () => {
      mockPrismaService.umsMember.findUnique
        .mockResolvedValueOnce({ memberId: 'B', parentId: 'C' })
        .mockResolvedValueOnce({ memberId: 'C', parentId: 'D' })
        .mockResolvedValueOnce({ memberId: 'D', parentId: null });

      const result = await service.checkCircularReferral('A', 'B');

      expect(result).toBe(false);
    });
  });
});
