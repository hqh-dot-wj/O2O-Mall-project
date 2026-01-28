import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { WalletRepository } from './wallet.repository';
import { TransactionRepository } from './transaction.repository';
import { RedisService } from 'src/module/common/redis/redis.service';
import { Decimal } from '@prisma/client/runtime/library';
import { TransType } from '@prisma/client';

describe('WalletService', () => {
  let service: WalletService;
  let prismaService: PrismaService;
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
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    prismaService = module.get<PrismaService>(PrismaService);
    walletRepo = module.get<WalletRepository>(WalletRepository);
    transactionRepo = module.get<TransactionRepository>(TransactionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateWallet', () => {
    it('应该返回已存在的钱包', async () => {
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
        tenantId: 'tenant1',
        balance: new Decimal(100),
        frozen: new Decimal(0),
        totalIncome: new Decimal(100),
      };

      mockWalletRepo.findByMemberId.mockResolvedValue(mockWallet);

      const result = await service.getOrCreateWallet('member1', 'tenant1');

      expect(result).toEqual(mockWallet);
      expect(mockWalletRepo.create).not.toHaveBeenCalled();
    });

    it('应该创建新钱包 - 钱包不存在', async () => {
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
        tenantId: 'tenant1',
        balance: new Decimal(0),
        frozen: new Decimal(0),
        totalIncome: new Decimal(0),
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
      });
    });
  });

  describe('getWallet', () => {
    it('应该返回钱包信息', async () => {
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

  describe('addBalance', () => {
    it('应该成功增加余额', async () => {
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
      expect(mockTransactionRepo.create).toHaveBeenCalledWith({
        wallet: { connect: { id: 'wallet1' } },
        tenantId: 'tenant1',
        type: TransType.COMMISSION_IN,
        amount: new Decimal(10),
        balanceAfter: new Decimal(110),
        relatedId: 'order1',
        remark: '佣金结算',
      });
    });
  });

  describe('deductBalance', () => {
    it('应该成功扣减余额', async () => {
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
        tenantId: 'tenant1',
        balance: new Decimal(90),
        version: 2,
      };

      mockWalletRepo.updateByMemberId.mockResolvedValue(mockWallet);

      const result = await service.deductBalance(
        'member1',
        new Decimal(10),
        'order1',
        '退款扣除',
        TransType.REFUND_DEDUCT,
      );

      expect(result).toEqual(mockWallet);
      expect(mockWalletRepo.updateByMemberId).toHaveBeenCalledWith('member1', {
        balance: { decrement: new Decimal(10) },
        version: { increment: 1 },
      });
      expect(mockTransactionRepo.create).toHaveBeenCalledWith({
        wallet: { connect: { id: 'wallet1' } },
        tenantId: 'tenant1',
        type: TransType.REFUND_DEDUCT,
        amount: new Decimal(0).minus(new Decimal(10)),
        balanceAfter: new Decimal(90),
        relatedId: 'order1',
        remark: '退款扣除',
      });
    });
  });

  describe('freezeBalance', () => {
    it('应该成功冻结余额', async () => {
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
        balance: new Decimal(90),
        frozen: new Decimal(10),
        version: 2,
      };

      mockWalletRepo.updateByMemberId.mockResolvedValue(mockWallet);

      const result = await service.freezeBalance('member1', new Decimal(10));

      expect(result).toEqual(mockWallet);
      expect(mockWalletRepo.updateByMemberId).toHaveBeenCalledWith('member1', {
        balance: { decrement: new Decimal(10) },
        frozen: { increment: new Decimal(10) },
        version: { increment: 1 },
      });
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
