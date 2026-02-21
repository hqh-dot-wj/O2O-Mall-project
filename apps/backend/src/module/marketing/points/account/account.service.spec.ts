import { Test, TestingModule } from '@nestjs/testing';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { PrismaService } from 'src/prisma/prisma.service';
import { PointsRuleService } from '../rule/rule.service';
import { PointsAccountRepository } from './account.repository';
import { PointsTransactionRepository } from './transaction.repository';
import { PointsAccountService } from './account.service';

describe('PointsAccountService', () => {
  let service: PointsAccountService;
  let accountRepo: PointsAccountRepository;
  let transactionRepo: PointsTransactionRepository;

  const mockAccountRepo = {
    findByMemberId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateWithOptimisticLock: jest.fn(),
    findPage: jest.fn(),
  };

  const mockTransactionRepo = {
    create: jest.fn(),
    findUserTransactions: jest.fn(),
    getExpiringPoints: jest.fn(),
    findTransactionsAdmin: jest.fn(),
  };

  const mockRuleService = {};
  const mockPrisma = {
    umsMember: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('00000');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsAccountService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PointsAccountRepository, useValue: mockAccountRepo },
        { provide: PointsTransactionRepository, useValue: mockTransactionRepo },
        { provide: PointsRuleService, useValue: mockRuleService },
      ],
    }).compile();

    service = module.get<PointsAccountService>(PointsAccountService);
    accountRepo = module.get(PointsAccountRepository);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrCreateAccount', () => {
    it('应返回已存在的账户', async () => {
      const account = { id: 'acc1', memberId: 'm1', availablePoints: 100 };
      mockAccountRepo.findByMemberId.mockResolvedValue(account);

      const result = await service.getOrCreateAccount('m1');

      expect(result.data).toBeDefined();
      expect(result.data.availablePoints).toBe(100);
      expect(mockAccountRepo.create).not.toHaveBeenCalled();
    });

    it('应创建新账户并返回', async () => {
      mockAccountRepo.findByMemberId.mockResolvedValue(null);
      const newAccount = { id: 'acc2', memberId: 'm2', availablePoints: 0 };
      mockAccountRepo.create.mockResolvedValue(newAccount);

      const result = await service.getOrCreateAccount('m2');

      expect(mockAccountRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ memberId: 'm2', availablePoints: 0 }),
      );
      expect(result.data).toBeDefined();
    });
  });

  describe('getBalance', () => {
    it('无账户时应返回零余额', async () => {
      mockAccountRepo.findByMemberId.mockResolvedValue(null);

      const result = await service.getBalance('m1');

      expect(result.data).toEqual({
        availablePoints: 0,
        frozenPoints: 0,
        expiringPoints: expect.any(Number),
      });
    });

    it('有账户时应返回余额与即将过期积分', async () => {
      mockAccountRepo.findByMemberId.mockResolvedValue({
        availablePoints: 50,
        frozenPoints: 10,
      });
      mockTransactionRepo.getExpiringPoints.mockResolvedValue(5);

      const result = await service.getBalance('m1');

      expect(result.data.availablePoints).toBe(50);
      expect(result.data.frozenPoints).toBe(10);
      expect(result.data.expiringPoints).toBe(5);
    });
  });

  describe('addPoints', () => {
    it('应增加积分并创建交易记录', async () => {
      const account = { id: 'acc1', memberId: 'm1', availablePoints: 100 };
      mockAccountRepo.findByMemberId.mockResolvedValue(account);
      mockAccountRepo.update.mockResolvedValue(undefined);
      const tx = { id: 'tx1', amount: 20, balanceAfter: 120 };
      mockTransactionRepo.create.mockResolvedValue(tx);

      const result = await service.addPoints({
        memberId: 'm1',
        amount: 20,
        type: 'EARN_TASK',
        remark: '任务奖励',
      });

      expect(mockAccountRepo.update).toHaveBeenCalledWith(
        'acc1',
        expect.objectContaining({
          totalPoints: { increment: 20 },
          availablePoints: { increment: 20 },
        }),
      );
      expect(mockTransactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: 'm1',
          amount: 20,
          balanceBefore: 100,
          balanceAfter: 120,
        }),
      );
      expect(result.data).toBeDefined();
    });
  });

  describe('deductPoints', () => {
    it('账户不存在应抛异常', async () => {
      mockAccountRepo.findByMemberId.mockResolvedValue(null);

      await expect(
        service.deductPoints({
          memberId: 'm1',
          amount: 10,
          type: 'USE_ORDER',
          remark: '订单抵扣',
        }),
      ).rejects.toThrow(BusinessException);
    });

    it('余额不足应抛异常', async () => {
      mockAccountRepo.findByMemberId.mockResolvedValue({
        id: 'acc1',
        memberId: 'm1',
        availablePoints: 5,
        usedPoints: 0,
        version: 0,
      });

      await expect(
        service.deductPoints({
          memberId: 'm1',
          amount: 10,
          type: 'USE_ORDER',
          remark: '订单抵扣',
        }),
      ).rejects.toThrow(BusinessException);
    });

    it('应成功扣减积分', async () => {
      const account = {
        id: 'acc1',
        memberId: 'm1',
        availablePoints: 100,
        usedPoints: 0,
        version: 0,
      };
      mockAccountRepo.findByMemberId.mockResolvedValue(account);
      mockAccountRepo.updateWithOptimisticLock.mockResolvedValue({
        ...account,
        availablePoints: 90,
      });
      mockTransactionRepo.create.mockResolvedValue({
        id: 'tx1',
        amount: -10,
        balanceAfter: 90,
      });

      const result = await service.deductPoints({
        memberId: 'm1',
        amount: 10,
        type: 'USE_ORDER',
        relatedId: 'order1',
        remark: '订单抵扣',
      });

      expect(mockAccountRepo.updateWithOptimisticLock).toHaveBeenCalledWith(
        'acc1',
        0,
        expect.objectContaining({
          availablePoints: 90,
          usedPoints: 10,
        }),
      );
      expect(result.data).toBeDefined();
    });
  });

  describe('freezePoints', () => {
    it('账户不存在应抛异常', async () => {
      mockAccountRepo.findByMemberId.mockResolvedValue(null);

      await expect(
        service.freezePoints('m1', 10, 'order1'),
      ).rejects.toThrow(BusinessException);
    });

    it('余额不足应抛异常', async () => {
      mockAccountRepo.findByMemberId.mockResolvedValue({
        id: 'acc1',
        availablePoints: 5,
        frozenPoints: 0,
      });

      await expect(
        service.freezePoints('m1', 10, 'order1'),
      ).rejects.toThrow(BusinessException);
    });

    it('应成功冻结积分', async () => {
      const account = {
        id: 'acc1',
        memberId: 'm1',
        availablePoints: 100,
        frozenPoints: 0,
      };
      mockAccountRepo.findByMemberId.mockResolvedValue(account);
      mockAccountRepo.update.mockResolvedValue(undefined);
      mockTransactionRepo.create.mockResolvedValue({ id: 'tx1' });

      const result = await service.freezePoints('m1', 20, 'order1');

      expect(mockAccountRepo.update).toHaveBeenCalledWith(
        'acc1',
        expect.objectContaining({
          availablePoints: { decrement: 20 },
          frozenPoints: { increment: 20 },
        }),
      );
      expect(result.data).toBeDefined();
    });
  });

  describe('unfreezePoints', () => {
    it('冻结积分不足应抛异常', async () => {
      mockAccountRepo.findByMemberId.mockResolvedValue({
        id: 'acc1',
        frozenPoints: 5,
      });

      await expect(
        service.unfreezePoints('m1', 10, 'order1'),
      ).rejects.toThrow(BusinessException);
    });

    it('应成功解冻积分', async () => {
      const account = {
        id: 'acc1',
        memberId: 'm1',
        availablePoints: 80,
        frozenPoints: 20,
      };
      mockAccountRepo.findByMemberId.mockResolvedValue(account);
      mockAccountRepo.update.mockResolvedValue(undefined);
      mockTransactionRepo.create.mockResolvedValue({ id: 'tx1' });

      const result = await service.unfreezePoints('m1', 20, 'order1');

      expect(mockAccountRepo.update).toHaveBeenCalledWith(
        'acc1',
        expect.objectContaining({
          availablePoints: { increment: 20 },
          frozenPoints: { decrement: 20 },
        }),
      );
      expect(result.data).toBeDefined();
    });
  });

  describe('getTransactions', () => {
    it('应返回分页交易记录', async () => {
      mockTransactionRepo.findUserTransactions.mockResolvedValue({
        rows: [{ id: 'tx1', amount: 10 }],
        total: 1,
      });

      const result = await service.getTransactions('m1', {
        pageNum: 1,
        pageSize: 10,
      });

      expect(result.data).toBeDefined();
      expect(result.data?.total).toBe(1);
    });
  });

  describe('getAccountsForAdmin', () => {
    it('应返回账户列表并关联会员信息', async () => {
      mockAccountRepo.findPage.mockResolvedValue({
        rows: [{ id: 'acc1', memberId: 'm1' }],
        total: 1,
      });
      mockPrisma.umsMember.findMany.mockResolvedValue([
        { memberId: 'm1', nickname: '用户1' },
      ]);

      const result = await service.getAccountsForAdmin({
        pageNum: 1,
        pageSize: 10,
      });

      expect(result.data).toBeDefined();
      expect(result.data?.total).toBe(1);
    });
  });
});
