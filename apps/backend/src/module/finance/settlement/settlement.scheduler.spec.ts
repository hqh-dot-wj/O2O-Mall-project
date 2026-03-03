// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { SettlementScheduler } from './settlement.scheduler';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/module/common/redis/redis.service';
import { WalletService } from '../wallet/wallet.service';
import { FinanceEventEmitter } from '../events/finance-event.emitter';
import { SettlementLogService } from './settlement-log.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('SettlementScheduler', () => {
  let scheduler: SettlementScheduler;

  const mockRedisClient = {
    set: jest.fn(),
    del: jest.fn(),
    get: jest.fn(),
    expire: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn(() => mockRedisClient),
  };

  const mockPrismaService = {
    finCommission: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      aggregate: jest.fn(),
    },
    finWallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    finTransaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockWalletService = {
    addBalance: jest.fn(),
  };

  const mockEventEmitter = {
    emitCommissionSettled: jest.fn(),
    emitSettlementBatchCompleted: jest.fn(),
  };

  const mockSettlementLogService = {
    createLog: jest.fn().mockResolvedValue('batch-id'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementScheduler,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
        {
          provide: FinanceEventEmitter,
          useValue: mockEventEmitter,
        },
        {
          provide: SettlementLogService,
          useValue: mockSettlementLogService,
        },
      ],
    }).compile();

    scheduler = module.get<SettlementScheduler>(SettlementScheduler);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ========== S-T1: 看门狗机制 ==========
  describe('settleJob - S-T1 分布式锁', () => {
    it('Given 锁已被占用, When settleJob, Then 跳过执行', async () => {
      mockRedisClient.set.mockResolvedValue(null); // 锁获取失败

      await scheduler.settleJob();

      expect(mockPrismaService.finCommission.findMany).not.toHaveBeenCalled();
    });

    it('Given 锁可用, When settleJob, Then 获取锁并执行结算', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue(null); // 无断点
      mockPrismaService.finCommission.findMany.mockResolvedValue([]);

      await scheduler.settleJob();

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'lock:settle:commission',
        '1',
        'EX',
        300,
        'NX',
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith('lock:settle:commission');
    });
  });

  // ========== S-T3: 指数退避重试 ==========
  describe('triggerSettlement - S-T3 重试机制', () => {
    it('Given 结算成功, When triggerSettlement, Then 返回结算统计', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue(null);
      
      const mockCommission = {
        id: BigInt(1),
        beneficiaryId: 'member1',
        tenantId: 'tenant1',
        amount: new Decimal(100),
        orderId: 'order1',
        status: 'FROZEN',
      };

      mockPrismaService.finCommission.findMany
        .mockResolvedValueOnce([mockCommission])
        .mockResolvedValueOnce([]);
      mockPrismaService.finCommission.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.finWallet.findUnique.mockResolvedValue({
        id: 'wallet1',
        memberId: 'member1',
        tenantId: 'tenant1',
        balance: new Decimal(0),
        pendingRecovery: new Decimal(0),
      });
      mockPrismaService.finWallet.update.mockResolvedValue({
        id: 'wallet1',
        balance: new Decimal(100),
      });

      const result = await scheduler.triggerSettlement();

      expect(result.settledCount).toBe(1);
      expect(result.totalAmount.toString()).toBe('100');
    });

    it('Given 锁被占用, When triggerSettlement, Then 返回空统计', async () => {
      mockRedisClient.set.mockResolvedValue(null);

      const result = await scheduler.triggerSettlement();

      expect(result.settledCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });
  });

  // ========== S-T5: 断点续传 ==========
  describe('doSettle - S-T5 断点续传', () => {
    it('Given 存在断点, When doSettle, Then 从断点位置继续', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue('100'); // 断点 ID=100
      mockPrismaService.finCommission.findMany.mockResolvedValue([]);

      await scheduler.triggerSettlement();

      // 验证查询条件包含断点
      expect(mockPrismaService.finCommission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { gt: BigInt(100) },
          }),
        }),
      );
    });

    it('Given 处理完成, When doSettle, Then 清除断点', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue(null);
      mockPrismaService.finCommission.findMany.mockResolvedValue([]);

      await scheduler.triggerSettlement();

      expect(mockRedisClient.del).toHaveBeenCalledWith('settle:checkpoint');
    });
  });

  // ========== S-T6: 结算统计 ==========
  describe('getSettlementStats - S-T6 结算统计', () => {
    it('Given 有待结算和已结算记录, When getSettlementStats, Then 返回统计数据', async () => {
      mockPrismaService.finCommission.aggregate
        .mockResolvedValueOnce({
          _count: 10,
          _sum: { amount: new Decimal(1000) },
        })
        .mockResolvedValueOnce({
          _count: 5,
          _sum: { amount: new Decimal(500) },
        });

      const stats = await scheduler.getSettlementStats();

      expect(stats.pendingCount).toBe(10);
      expect(stats.pendingAmount.toString()).toBe('1000');
      expect(stats.todaySettledCount).toBe(5);
      expect(stats.todaySettledAmount.toString()).toBe('500');
    });

    it('Given 无记录, When getSettlementStats, Then 返回0', async () => {
      mockPrismaService.finCommission.aggregate
        .mockResolvedValueOnce({
          _count: 0,
          _sum: { amount: null },
        })
        .mockResolvedValueOnce({
          _count: 0,
          _sum: { amount: null },
        });

      const stats = await scheduler.getSettlementStats();

      expect(stats.pendingCount).toBe(0);
      expect(stats.pendingAmount.toString()).toBe('0');
      expect(stats.todaySettledCount).toBe(0);
      expect(stats.todaySettledAmount.toString()).toBe('0');
    });
  });

  // ========== S-T2: 状态校验 ==========
  describe('settleOne - S-T2 状态校验', () => {
    it('Given 佣金状态非FROZEN, When settleOne, Then 跳过结算', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue(null);

      const mockCommission = {
        id: BigInt(1),
        beneficiaryId: 'member1',
        tenantId: 'tenant1',
        amount: new Decimal(100),
        orderId: 'order1',
        status: 'FROZEN',
      };

      mockPrismaService.finCommission.findMany
        .mockResolvedValueOnce([mockCommission])
        .mockResolvedValueOnce([]);
      
      // 模拟状态已变更（updateMany 返回 0）
      mockPrismaService.finCommission.updateMany.mockResolvedValue({ count: 0 });

      const result = await scheduler.triggerSettlement();

      // 状态校验失败，不应增加钱包余额
      expect(mockPrismaService.finWallet.update).not.toHaveBeenCalled();
    });
  });

  // ========== 待回收抵扣 ==========
  describe('settleOne - 待回收抵扣', () => {
    it('Given 用户有待回收余额, When settleOne, Then 优先抵扣待回收', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue(null);

      const mockCommission = {
        id: BigInt(1),
        beneficiaryId: 'member1',
        tenantId: 'tenant1',
        amount: new Decimal(100),
        orderId: 'order1',
        status: 'FROZEN',
      };

      mockPrismaService.finCommission.findMany
        .mockResolvedValueOnce([mockCommission])
        .mockResolvedValueOnce([]);
      mockPrismaService.finCommission.updateMany.mockResolvedValue({ count: 1 });
      
      // 用户有 30 元待回收
      mockPrismaService.finWallet.findUnique.mockResolvedValue({
        id: 'wallet1',
        memberId: 'member1',
        tenantId: 'tenant1',
        balance: new Decimal(0),
        pendingRecovery: new Decimal(30),
      });
      mockPrismaService.finWallet.update.mockResolvedValue({
        id: 'wallet1',
        balance: new Decimal(70),
        pendingRecovery: new Decimal(0),
      });

      await scheduler.triggerSettlement();

      // 验证先扣减待回收
      expect(mockPrismaService.finWallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wallet1' },
          data: expect.objectContaining({
            pendingRecovery: { decrement: new Decimal(30) },
          }),
        }),
      );
    });
  });
});
