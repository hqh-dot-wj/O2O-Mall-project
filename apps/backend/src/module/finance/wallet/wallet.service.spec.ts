import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { WalletRepository } from './wallet.repository';
import { TransactionRepository } from './transaction.repository';
import { RedisService } from 'src/module/common/redis/redis.service';
import { Decimal } from '@prisma/client/runtime/library';
import { TransType } from '@prisma/client';
import { BusinessException } from 'src/common/exceptions';
import { FinanceEventEmitter } from '../events/finance-event.emitter';
import { BusinessConstants } from 'src/common/constants/business.constants';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepo: WalletRepository;
  let transactionRepo: TransactionRepository;

  const mockPrismaService = {
    finTransaction: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockWalletRepo = {
    findByMemberId: jest.fn(),
    create: jest.fn(),
    updateByMemberId: jest.fn(),
    deductBalanceAtomic: jest.fn(),
    freezeBalanceAtomic: jest.fn(),
  };

  const mockTransactionRepo = {
    create: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    getClient: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    })),
  };

  const mockEventEmitter = {
    emitBalanceIncreased: jest.fn(),
    emitBalanceDecreased: jest.fn(),
    emitPendingRecoveryIncreased: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
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
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: FinanceEventEmitter,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    walletRepo = module.get<WalletRepository>(WalletRepository);
    transactionRepo = module.get<TransactionRepository>(TransactionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateWallet', () => {
    it('Given 钱包已存在, When getOrCreateWallet, Then 返回已存在的钱包', async () => {
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
        tenantId: 'tenant1',
        balance: new Decimal(100),
        frozen: new Decimal(0),
        totalIncome: new Decimal(100),
        pendingRecovery: new Decimal(0),
      };

      mockWalletRepo.findByMemberId.mockResolvedValue(mockWallet);

      const result = await service.getOrCreateWallet('member1', 'tenant1');

      expect(result).toEqual(mockWallet);
      expect(mockWalletRepo.create).not.toHaveBeenCalled();
    });

    it('Given 钱包不存在, When getOrCreateWallet, Then 创建新钱包', async () => {
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
        tenantId: 'tenant1',
        balance: new Decimal(0),
        frozen: new Decimal(0),
        totalIncome: new Decimal(0),
        pendingRecovery: new Decimal(0),
      };

      mockWalletRepo.findByMemberId.mockResolvedValue(null);
      mockWalletRepo.create.mockResolvedValue(mockWallet);

      const result = await service.getOrCreateWallet('member1', 'tenant1');

      expect(result).toEqual(mockWallet);
      expect(mockWalletRepo.create).toHaveBeenCalledWith({
        member: { connect: { memberId: 'member1' } },
        tenantId: 'tenant1',
        balance: 0,
        frozen: 0,
        totalIncome: 0,
        pendingRecovery: 0,
      });
    });
  });

  describe('getWallet', () => {
    it('Given 钱包存在, When getWallet, Then 返回钱包信息', async () => {
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
        balance: new Decimal(100),
      };

      mockWalletRepo.findByMemberId.mockResolvedValue(mockWallet);

      const result = await service.getWallet('member1');

      expect(result).toEqual(mockWallet);
      expect(mockWalletRepo.findByMemberId).toHaveBeenCalledWith('member1');
    });
  });

  // ========== W-T3: 单笔金额上限校验 ==========
  describe('addBalance - W-T3 单笔金额上限校验', () => {
    it('Given 金额在限额内, When addBalance, Then 成功增加余额', async () => {
      // R-IN-WALLET-01: 单笔金额上限校验
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
        tenantId: 'tenant1',
        balance: new Decimal(110),
        totalIncome: new Decimal(110),
        version: 2,
      };

      mockWalletRepo.updateByMemberId.mockResolvedValue(mockWallet);

      const result = await service.addBalance('member1', new Decimal(10), 'order1', '佣金结算');

      expect(result).toEqual(mockWallet);
      expect(mockWalletRepo.updateByMemberId).toHaveBeenCalledWith('member1', {
        balance: { increment: new Decimal(10) },
        totalIncome: { increment: new Decimal(10) },
        version: { increment: 1 },
      });
      expect(mockTransactionRepo.create).toHaveBeenCalled();
      expect(mockEventEmitter.emitBalanceIncreased).toHaveBeenCalled();
    });

    it('Given 金额超过单笔上限, When addBalance, Then 抛出金额超限异常', async () => {
      // R-IN-WALLET-01: 单笔金额不能超过配置的上限
      const exceedAmount = new Decimal(BusinessConstants.FINANCE.MAX_SINGLE_AMOUNT + 1);

      await expect(
        service.addBalance('member1', exceedAmount, 'order1', '佣金结算'),
      ).rejects.toThrow(BusinessException);

      expect(mockWalletRepo.updateByMemberId).not.toHaveBeenCalled();
    });

    it('Given 金额为0或负数, When addBalance, Then 抛出金额必须大于0异常', async () => {
      // R-IN-WALLET-02: 金额必须大于 0
      await expect(
        service.addBalance('member1', new Decimal(0), 'order1', '佣金结算'),
      ).rejects.toThrow(BusinessException);

      await expect(
        service.addBalance('member1', new Decimal(-10), 'order1', '佣金结算'),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('deductBalance', () => {
    it('Given 余额充足, When deductBalance, Then 成功扣减余额并记录流水', async () => {
      // R-PRE-WALLET-01: 原子性校验余额充足
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
        tenantId: 'tenant1',
        balance: new Decimal(90),
        version: 2,
      };

      mockWalletRepo.deductBalanceAtomic.mockResolvedValue(1);
      mockWalletRepo.findByMemberId.mockResolvedValue(mockWallet);

      const result = await service.deductBalance(
        'member1',
        new Decimal(10),
        'order1',
        '退款扣除',
        TransType.REFUND_DEDUCT,
      );

      expect(result).toEqual(mockWallet);
      expect(mockWalletRepo.deductBalanceAtomic).toHaveBeenCalledWith('member1', new Decimal(10), {
        version: { increment: 1 },
      });
      expect(mockTransactionRepo.create).toHaveBeenCalled();
      expect(mockEventEmitter.emitBalanceDecreased).toHaveBeenCalled();
    });

    it('Given 余额不足, When deductBalance, Then 抛出余额不足异常', async () => {
      // R-PRE-WALLET-01: 原子性校验余额充足
      mockWalletRepo.deductBalanceAtomic.mockResolvedValue(0);

      await expect(
        service.deductBalance('member1', new Decimal(100), 'order1', '退款扣除', TransType.REFUND_DEDUCT),
      ).rejects.toThrow(BusinessException);

      expect(mockTransactionRepo.create).not.toHaveBeenCalled();
    });

    it('Given 金额超过单笔上限, When deductBalance, Then 抛出金额超限异常', async () => {
      // R-IN-WALLET-01: 单笔金额上限校验
      const exceedAmount = new Decimal(BusinessConstants.FINANCE.MAX_SINGLE_AMOUNT + 1);

      await expect(
        service.deductBalance('member1', exceedAmount, 'order1', '退款扣除', TransType.REFUND_DEDUCT),
      ).rejects.toThrow(BusinessException);
    });
  });

  // ========== W-T6: 待回收台账 ==========
  describe('deductBalanceOrPendingRecovery - W-T6 待回收台账', () => {
    it('Given 余额充足, When deductBalanceOrPendingRecovery, Then 全额扣减余额', async () => {
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
        tenantId: 'tenant1',
        balance: new Decimal(100),
        pendingRecovery: new Decimal(0),
        version: 1,
      };

      const updatedWallet = {
        ...mockWallet,
        balance: new Decimal(90),
        version: 2,
      };

      mockWalletRepo.findByMemberId
        .mockResolvedValueOnce(mockWallet)
        .mockResolvedValueOnce(updatedWallet);
      mockWalletRepo.updateByMemberId.mockResolvedValue(updatedWallet);

      const result = await service.deductBalanceOrPendingRecovery(
        'member1',
        new Decimal(10),
        'order1',
        '佣金回滚',
        TransType.REFUND_DEDUCT,
      );

      expect(result.deducted.toString()).toBe('10');
      expect(result.pendingRecovery.toString()).toBe('0');
      expect(mockWalletRepo.updateByMemberId).toHaveBeenCalledWith('member1', {
        balance: { decrement: new Decimal(10) },
        version: { increment: 1 },
      });
    });

    it('Given 余额部分不足, When deductBalanceOrPendingRecovery, Then 扣减可用部分并记入待回收', async () => {
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
        tenantId: 'tenant1',
        balance: new Decimal(30),
        pendingRecovery: new Decimal(0),
        version: 1,
      };

      const updatedWallet = {
        ...mockWallet,
        balance: new Decimal(0),
        pendingRecovery: new Decimal(70),
        version: 2,
      };

      mockWalletRepo.findByMemberId
        .mockResolvedValueOnce(mockWallet)
        .mockResolvedValueOnce(updatedWallet);
      mockWalletRepo.updateByMemberId.mockResolvedValue(updatedWallet);

      const result = await service.deductBalanceOrPendingRecovery(
        'member1',
        new Decimal(100),
        'order1',
        '佣金回滚',
        TransType.REFUND_DEDUCT,
      );

      expect(result.deducted.toString()).toBe('30');
      expect(result.pendingRecovery.toString()).toBe('70');
      expect(mockWalletRepo.updateByMemberId).toHaveBeenCalledWith('member1', {
        balance: new Decimal(0),
        pendingRecovery: { increment: new Decimal(70) },
        version: { increment: 1 },
      });
      expect(mockEventEmitter.emitPendingRecoveryIncreased).toHaveBeenCalled();
    });

    it('Given 余额为0, When deductBalanceOrPendingRecovery, Then 全额记入待回收', async () => {
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
        tenantId: 'tenant1',
        balance: new Decimal(0),
        pendingRecovery: new Decimal(0),
        version: 1,
      };

      const updatedWallet = {
        ...mockWallet,
        pendingRecovery: new Decimal(50),
        version: 2,
      };

      mockWalletRepo.findByMemberId
        .mockResolvedValueOnce(mockWallet)
        .mockResolvedValueOnce(updatedWallet);
      mockWalletRepo.updateByMemberId.mockResolvedValue(updatedWallet);

      const result = await service.deductBalanceOrPendingRecovery(
        'member1',
        new Decimal(50),
        'order1',
        '佣金回滚',
        TransType.REFUND_DEDUCT,
      );

      expect(result.deducted.toString()).toBe('0');
      expect(result.pendingRecovery.toString()).toBe('50');
      expect(mockEventEmitter.emitPendingRecoveryIncreased).toHaveBeenCalled();
    });

    it('Given 钱包不存在, When deductBalanceOrPendingRecovery, Then 抛出钱包不存在异常', async () => {
      mockWalletRepo.findByMemberId.mockResolvedValue(null);

      await expect(
        service.deductBalanceOrPendingRecovery(
          'member1',
          new Decimal(10),
          'order1',
          '佣金回滚',
          TransType.REFUND_DEDUCT,
        ),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('recoverPendingBalance - W-T6 回收待回收余额', () => {
    it('Given 有待回收余额且可用金额充足, When recoverPendingBalance, Then 全额回收', async () => {
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
        pendingRecovery: new Decimal(50),
      };

      mockWalletRepo.findByMemberId.mockResolvedValue(mockWallet);
      mockWalletRepo.updateByMemberId.mockResolvedValue({
        ...mockWallet,
        pendingRecovery: new Decimal(0),
      });

      const result = await service.recoverPendingBalance('member1', new Decimal(100));

      expect(result.toString()).toBe('50');
      expect(mockWalletRepo.updateByMemberId).toHaveBeenCalledWith('member1', {
        pendingRecovery: { decrement: new Decimal(50) },
        version: { increment: 1 },
      });
    });

    it('Given 有待回收余额但可用金额不足, When recoverPendingBalance, Then 部分回收', async () => {
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
        pendingRecovery: new Decimal(100),
      };

      mockWalletRepo.findByMemberId.mockResolvedValue(mockWallet);
      mockWalletRepo.updateByMemberId.mockResolvedValue({
        ...mockWallet,
        pendingRecovery: new Decimal(70),
      });

      const result = await service.recoverPendingBalance('member1', new Decimal(30));

      expect(result.toString()).toBe('30');
    });

    it('Given 无待回收余额, When recoverPendingBalance, Then 返回0', async () => {
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
        pendingRecovery: new Decimal(0),
      };

      mockWalletRepo.findByMemberId.mockResolvedValue(mockWallet);

      const result = await service.recoverPendingBalance('member1', new Decimal(100));

      expect(result.toString()).toBe('0');
      expect(mockWalletRepo.updateByMemberId).not.toHaveBeenCalled();
    });

    it('Given 钱包不存在, When recoverPendingBalance, Then 返回0', async () => {
      mockWalletRepo.findByMemberId.mockResolvedValue(null);

      const result = await service.recoverPendingBalance('member1', new Decimal(100));

      expect(result.toString()).toBe('0');
    });
  });

  describe('freezeBalance', () => {
    it('Given 余额充足, When freezeBalance, Then 成功冻结余额', async () => {
      // R-PRE-WALLET-02: 原子性校验余额充足
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
        balance: new Decimal(90),
        frozen: new Decimal(10),
        version: 2,
      };

      mockWalletRepo.freezeBalanceAtomic.mockResolvedValue(1);
      mockWalletRepo.findByMemberId.mockResolvedValue(mockWallet);

      const result = await service.freezeBalance('member1', new Decimal(10));

      expect(result).toEqual(mockWallet);
      expect(mockWalletRepo.freezeBalanceAtomic).toHaveBeenCalledWith('member1', new Decimal(10));
    });

    it('Given 余额不足, When freezeBalance, Then 抛出余额不足异常', async () => {
      // R-PRE-WALLET-02: 原子性校验余额充足
      mockWalletRepo.freezeBalanceAtomic.mockResolvedValue(0);

      await expect(service.freezeBalance('member1', new Decimal(100))).rejects.toThrow(BusinessException);
    });

    it('Given 金额超过单笔上限, When freezeBalance, Then 抛出金额超限异常', async () => {
      // R-IN-WALLET-01: 单笔金额上限校验
      const exceedAmount = new Decimal(BusinessConstants.FINANCE.MAX_SINGLE_AMOUNT + 1);

      await expect(service.freezeBalance('member1', exceedAmount)).rejects.toThrow(BusinessException);
    });
  });

  describe('unfreezeBalance', () => {
    it('应该成功解冻余额', async () => {
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
        balance: new Decimal(110),
        frozen: new Decimal(0),
        version: 2,
      };

      mockWalletRepo.updateByMemberId.mockResolvedValue(mockWallet);

      const result = await service.unfreezeBalance('member1', new Decimal(10));

      expect(result).toEqual(mockWallet);
      expect(mockWalletRepo.updateByMemberId).toHaveBeenCalledWith('member1', {
        balance: { increment: new Decimal(10) },
        frozen: { decrement: new Decimal(10) },
        version: { increment: 1 },
      });
    });
  });

  describe('deductFrozen', () => {
    it('应该成功扣减冻结余额', async () => {
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
        frozen: new Decimal(0),
        version: 2,
      };

      mockWalletRepo.updateByMemberId.mockResolvedValue(mockWallet);

      const result = await service.deductFrozen('member1', new Decimal(10));

      expect(result).toEqual(mockWallet);
      expect(mockWalletRepo.updateByMemberId).toHaveBeenCalledWith('member1', {
        frozen: { decrement: new Decimal(10) },
        version: { increment: 1 },
      });
    });
  });

  describe('getTransactions', () => {
    it('应该返回用户流水列表', async () => {
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
      };

      const mockTransactions = [
        {
          id: 'trans1',
          walletId: 'wallet1',
          type: TransType.COMMISSION_IN,
          amount: new Decimal(10),
          createTime: new Date(),
        },
      ];

      mockWalletRepo.findByMemberId.mockResolvedValue(mockWallet);
      mockPrismaService.finTransaction.findMany.mockResolvedValue(mockTransactions);
      mockPrismaService.finTransaction.count.mockResolvedValue(1);

      const result = await service.getTransactions('member1', 1, 20);

      expect(result).toEqual({
        list: mockTransactions,
        total: 1,
      });
      expect(mockPrismaService.finTransaction.findMany).toHaveBeenCalledWith({
        where: { walletId: 'wallet1' },
        orderBy: { createTime: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('应该返回空列表 - 钱包不存在', async () => {
      mockWalletRepo.findByMemberId.mockResolvedValue(null);

      const result = await service.getTransactions('member1', 1, 20);

      expect(result).toEqual({
        list: [],
        total: 0,
      });
      expect(mockPrismaService.finTransaction.findMany).not.toHaveBeenCalled();
    });
  });
});
