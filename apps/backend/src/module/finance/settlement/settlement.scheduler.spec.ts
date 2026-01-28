import { Test, TestingModule } from '@nestjs/testing';
import { SettlementScheduler } from './settlement.scheduler';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/module/common/redis/redis.service';
import { WalletService } from '../wallet/wallet.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('SettlementScheduler', () => {
  let scheduler: SettlementScheduler;
  let prismaService: PrismaService;
  let redisService: RedisService;
  let walletService: WalletService;

  const mockRedisClient = {
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockPrismaService = {
    finCommission: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn(() => mockRedisClient),
  };

  const mockWalletService = {};

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
      ],
    }).compile();

    scheduler = module.get<SettlementScheduler>(SettlementScheduler);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
    walletService = module.get<WalletService>(WalletService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('settleJob', () => {
    it('应该成功获取锁并执行结算', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockPrismaService.finCommission.findMany.mockResolvedValue([]);
      mockRedisClient.del.mockResolvedValue(1);

      await scheduler.settleJob();

      expect(mockRedisClient.set).toHaveBeenCalledWith('lock:settle:commission', '1', 'EX', 300, 'NX');
      expect(mockRedisClient.del).toHaveBeenCalledWith('lock:settle:commission');
    });

    it('应该跳过执行 - 无法获取锁', async () => {
      mockRedisClient.set.mockResolvedValue(null);

      await scheduler.settleJob();

      expect(mockPrismaService.finCommission.findMany).not.toHaveBeenCalled();
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('应该批量处理到期佣金', async () => {
      const mockCommissions = [
        {
          id: BigInt(1),
          orderId: 'order1',
          beneficiaryId: 'member1',
          tenantId: 'tenant1',
          amount: new Decimal(10),
          status: 'FROZEN',
        },
        {
          id: BigInt(2),
          orderId: 'order2',
          beneficiaryId: 'member2',
          tenantId: 'tenant1',
          amount: new Decimal(20),
          status: 'FROZEN',
        },
      ];

      mockRedisClient.set.mockResolvedValue('OK');
      mockPrismaService.finCommission.findMany.mockResolvedValueOnce(mockCommissions).mockResolvedValueOnce([]);

      const mockTx = {
        finCommission: {
          update: jest.fn(),
        },
        finWallet: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
        finTransaction: {
          create: jest.fn(),
        },
      };

      mockTx.finWallet.findUnique.mockResolvedValue({
        id: 'wallet1',
        memberId: 'member1',
        tenantId: 'tenant1',
        balance: new Decimal(100),
      });

      mockTx.finWallet.update.mockResolvedValue({
        id: 'wallet1',
        balance: new Decimal(110),
      });

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await scheduler.settleJob();

      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(2);
    });

    it('应该创建钱包 - 钱包不存在', async () => {
      const mockCommission = {
        id: BigInt(1),
        orderId: 'order1',
        beneficiaryId: 'member1',
        tenantId: 'tenant1',
        amount: new Decimal(10),
        status: 'FROZEN',
      };

      mockRedisClient.set.mockResolvedValue('OK');
      mockPrismaService.finCommission.findMany.mockResolvedValueOnce([mockCommission]).mockResolvedValueOnce([]);

      const mockTx = {
        finCommission: {
          update: jest.fn(),
        },
        finWallet: {
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        finTransaction: {
          create: jest.fn(),
        },
      };

      mockTx.finWallet.findUnique.mockResolvedValue(null);
      mockTx.finWallet.create.mockResolvedValue({
        id: 'wallet1',
        memberId: 'member1',
        tenantId: 'tenant1',
        balance: new Decimal(0),
      });
      mockTx.finWallet.update.mockResolvedValue({
        id: 'wallet1',
        balance: new Decimal(10),
      });

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await scheduler.settleJob();

      expect(mockTx.finWallet.create).toHaveBeenCalledWith({
        data: {
          memberId: 'member1',
          tenantId: 'tenant1',
          balance: 0,
          frozen: 0,
          totalIncome: 0,
        },
      });
    });

    it('应该处理单条失败不影响其他记录', async () => {
      const mockCommissions = [
        {
          id: BigInt(1),
          orderId: 'order1',
          beneficiaryId: 'member1',
          tenantId: 'tenant1',
          amount: new Decimal(10),
          status: 'FROZEN',
        },
        {
          id: BigInt(2),
          orderId: 'order2',
          beneficiaryId: 'member2',
          tenantId: 'tenant1',
          amount: new Decimal(20),
          status: 'FROZEN',
        },
      ];

      mockRedisClient.set.mockResolvedValue('OK');
      mockPrismaService.finCommission.findMany.mockResolvedValueOnce(mockCommissions).mockResolvedValueOnce([]);

      mockPrismaService.$transaction.mockRejectedValueOnce(new Error('Database error')).mockResolvedValueOnce({});

      await scheduler.settleJob();

      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(2);
    });

    it('应该在异常时释放锁', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockPrismaService.finCommission.findMany.mockRejectedValue(new Error('Database error'));

      await expect(scheduler.settleJob()).rejects.toThrow('Database error');

      expect(mockRedisClient.del).toHaveBeenCalledWith('lock:settle:commission');
    });
  });
});
