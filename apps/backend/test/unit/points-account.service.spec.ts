import { Test, TestingModule } from '@nestjs/testing';
import { PointsAccountService } from '../../src/module/marketing/points/account/account.service';
import { PointsAccountRepository } from '../../src/module/marketing/points/account/account.repository';
import { PointsTransactionRepository } from '../../src/module/marketing/points/account/transaction.repository';
import { PointsRuleService } from '../../src/module/marketing/points/rule/rule.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ClsService } from 'nestjs-cls';
import { PointsTransactionType } from '@prisma/client';
import { BusinessException } from '../../src/common/exceptions/business.exception';

/**
 * 积分账户服务单元测试
 */
describe('PointsAccountService', () => {
  let service: PointsAccountService;
  let accountRepo: PointsAccountRepository;
  let transactionRepo: PointsTransactionRepository;
  let ruleService: PointsRuleService;

  const mockAccountRepo = {
    findByMemberId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateWithOptimisticLock: jest.fn(),
  };

  const mockTransactionRepo = {
    create: jest.fn(),
    findUserTransactions: jest.fn(),
    getExpiringPoints: jest.fn(),
  };

  const mockRuleService = {
    getRules: jest.fn(),
  };

  const mockPrisma = {
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  const mockClsService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsAccountService,
        {
          provide: PointsAccountRepository,
          useValue: mockAccountRepo,
        },
        {
          provide: PointsTransactionRepository,
          useValue: mockTransactionRepo,
        },
        {
          provide: PointsRuleService,
          useValue: mockRuleService,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ClsService,
          useValue: mockClsService,
        },
      ],
    }).compile();

    service = module.get<PointsAccountService>(PointsAccountService);
    accountRepo = module.get<PointsAccountRepository>(PointsAccountRepository);
    transactionRepo = module.get<PointsTransactionRepository>(PointsTransactionRepository);
    ruleService = module.get<PointsRuleService>(PointsRuleService);

    mockClsService.get.mockReturnValue('test-tenant-001');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateAccount', () => {
    it('应该返回已存在的账户', async () => {
      const memberId = 'member-001';
      const mockAccount = {
        id: 'account-001',
        memberId,
        availablePoints: 100,
        frozenPoints: 0,
      };

      mockAccountRepo.findByMemberId.mockResolvedValue(mockAccount);

      const result = await service.getOrCreateAccount(memberId);

      expect(result.code).toBe(200);
      expect(result.data.id).toBe('account-001');
      expect(mockAccountRepo.create).not.toHaveBeenCalled();
    });

    it('应该创建新账户', async () => {
      const memberId = 'member-002';

      mockAccountRepo.findByMemberId.mockResolvedValue(null);
      mockAccountRepo.create.mockResolvedValue({
        id: 'account-002',
        memberId,
        availablePoints: 0,
        frozenPoints: 0,
      });

      const result = await service.getOrCreateAccount(memberId);

      expect(result.code).toBe(200);
      expect(mockAccountRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId,
          totalPoints: 0,
          availablePoints: 0,
        })
      );
    });
  });

  describe('addPoints', () => {
    it('应该成功增加积分', async () => {
      const dto = {
        memberId: 'member-001',
        amount: 100,
        type: PointsTransactionType.EARN_ORDER,
        remark: '消费获得积分',
      };

      const mockAccount = {
        id: 'account-001',
        memberId: dto.memberId,
        availablePoints: 200,
      };

      mockAccountRepo.findByMemberId.mockResolvedValue(mockAccount);
      mockAccountRepo.update.mockResolvedValue({
        ...mockAccount,
        availablePoints: 300,
      });
      mockTransactionRepo.create.mockResolvedValue({
        id: 'transaction-001',
        amount: dto.amount,
        balanceBefore: 200,
        balanceAfter: 300,
      });

      const result = await service.addPoints(dto);

      expect(result.code).toBe(200);
      expect(result.data.amount).toBe(100);
      expect(mockAccountRepo.update).toHaveBeenCalledWith(
        'account-001',
        expect.objectContaining({
          totalPoints: { increment: 100 },
          availablePoints: { increment: 100 },
        })
      );
    });
  });

  describe('deductPoints', () => {
    it('应该成功扣减积分', async () => {
      const dto = {
        memberId: 'member-001',
        amount: 50,
        type: PointsTransactionType.USE_ORDER,
        remark: '积分抵扣',
      };

      const mockAccount = {
        id: 'account-001',
        memberId: dto.memberId,
        availablePoints: 200,
        usedPoints: 100,
        version: 1,
      };

      mockAccountRepo.findByMemberId.mockResolvedValue(mockAccount);
      mockAccountRepo.updateWithOptimisticLock.mockResolvedValue(true);
      mockTransactionRepo.create.mockResolvedValue({
        id: 'transaction-001',
        amount: -50,
        balanceBefore: 200,
        balanceAfter: 150,
      });

      const result = await service.deductPoints(dto);

      expect(result.code).toBe(200);
      expect(result.data.amount).toBe(-50);
    });

    it('应该在余额不足时抛出异常', async () => {
      const dto = {
        memberId: 'member-001',
        amount: 300,
        type: PointsTransactionType.USE_ORDER,
        remark: '积分抵扣',
      };

      const mockAccount = {
        id: 'account-001',
        memberId: dto.memberId,
        availablePoints: 200, // 余额不足
        version: 1,
      };

      mockAccountRepo.findByMemberId.mockResolvedValue(mockAccount);

      await expect(service.deductPoints(dto)).rejects.toThrow(
        '积分余额不足'
      );
    });

    it('应该在乐观锁冲突时重试', async () => {
      const dto = {
        memberId: 'member-001',
        amount: 50,
        type: PointsTransactionType.USE_ORDER,
        remark: '积分抵扣',
      };

      const mockAccount = {
        id: 'account-001',
        memberId: dto.memberId,
        availablePoints: 200,
        usedPoints: 100,
        version: 1,
      };

      mockAccountRepo.findByMemberId.mockResolvedValue(mockAccount);
      
      // 第一次失败，第二次成功
      mockAccountRepo.updateWithOptimisticLock
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      
      mockTransactionRepo.create.mockResolvedValue({
        id: 'transaction-001',
        amount: -50,
      });

      const result = await service.deductPoints(dto);

      expect(result.code).toBe(200);
      expect(mockAccountRepo.updateWithOptimisticLock).toHaveBeenCalledTimes(2);
    });

    it('应该在重试3次后仍失败时抛出异常', async () => {
      const dto = {
        memberId: 'member-001',
        amount: 50,
        type: PointsTransactionType.USE_ORDER,
        remark: '积分抵扣',
      };

      const mockAccount = {
        id: 'account-001',
        memberId: dto.memberId,
        availablePoints: 200,
        version: 1,
      };

      mockAccountRepo.findByMemberId.mockResolvedValue(mockAccount);
      mockAccountRepo.updateWithOptimisticLock.mockResolvedValue(false);

      await expect(service.deductPoints(dto)).rejects.toThrow(
        '积分扣减失败，请稍后重试'
      );
      
      expect(mockAccountRepo.updateWithOptimisticLock).toHaveBeenCalledTimes(3);
    });
  });

  describe('freezePoints', () => {
    it('应该成功冻结积分', async () => {
      const memberId = 'member-001';
      const amount = 100;
      const relatedId = 'order-001';

      const mockAccount = {
        id: 'account-001',
        memberId,
        availablePoints: 200,
        frozenPoints: 0,
      };

      mockAccountRepo.findByMemberId.mockResolvedValue(mockAccount);
      mockAccountRepo.update.mockResolvedValue({
        ...mockAccount,
        availablePoints: 100,
        frozenPoints: 100,
      });
      mockTransactionRepo.create.mockResolvedValue({
        id: 'transaction-001',
        amount: -100,
      });

      const result = await service.freezePoints(memberId, amount, relatedId);

      expect(result.code).toBe(200);
      expect(mockAccountRepo.update).toHaveBeenCalledWith(
        'account-001',
        expect.objectContaining({
          availablePoints: { decrement: 100 },
          frozenPoints: { increment: 100 },
        })
      );
    });

    it('应该在余额不足时抛出异常', async () => {
      const memberId = 'member-001';
      const amount = 300;
      const relatedId = 'order-001';

      const mockAccount = {
        id: 'account-001',
        memberId,
        availablePoints: 200,
      };

      mockAccountRepo.findByMemberId.mockResolvedValue(mockAccount);

      await expect(
        service.freezePoints(memberId, amount, relatedId)
      ).rejects.toThrow('积分余额不足');
    });
  });

  describe('unfreezePoints', () => {
    it('应该成功解冻积分', async () => {
      const memberId = 'member-001';
      const amount = 100;
      const relatedId = 'order-001';

      const mockAccount = {
        id: 'account-001',
        memberId,
        availablePoints: 100,
        frozenPoints: 100,
      };

      mockAccountRepo.findByMemberId.mockResolvedValue(mockAccount);
      mockAccountRepo.update.mockResolvedValue({
        ...mockAccount,
        availablePoints: 200,
        frozenPoints: 0,
      });
      mockTransactionRepo.create.mockResolvedValue({
        id: 'transaction-001',
        amount: 100,
      });

      const result = await service.unfreezePoints(memberId, amount, relatedId);

      expect(result.code).toBe(200);
      expect(mockAccountRepo.update).toHaveBeenCalledWith(
        'account-001',
        expect.objectContaining({
          availablePoints: { increment: 100 },
          frozenPoints: { decrement: 100 },
        })
      );
    });

    it('应该在冻结积分不足时抛出异常', async () => {
      const memberId = 'member-001';
      const amount = 200;
      const relatedId = 'order-001';

      const mockAccount = {
        id: 'account-001',
        memberId,
        frozenPoints: 100,
      };

      mockAccountRepo.findByMemberId.mockResolvedValue(mockAccount);

      await expect(
        service.unfreezePoints(memberId, amount, relatedId)
      ).rejects.toThrow('冻结积分不足');
    });
  });

  describe('getTransactions', () => {
    it('应该返回积分明细', async () => {
      const memberId = 'member-001';
      const query = {
        pageNum: 1,
        pageSize: 10,
      };

      const mockResult = {
        rows: [
          { id: 'trans-001', amount: 100, type: PointsTransactionType.EARN_ORDER },
          { id: 'trans-002', amount: -50, type: PointsTransactionType.USE_ORDER },
        ],
        total: 2,
      };

      mockTransactionRepo.findUserTransactions.mockResolvedValue(mockResult);

      const result = await service.getTransactions(memberId, query);

      expect(result.code).toBe(200);
      expect(result.data.rows.length).toBe(2);
      expect(result.data.total).toBe(2);
    });
  });

  describe('getExpiringPoints', () => {
    it('应该返回即将过期的积分', async () => {
      const memberId = 'member-001';
      const days = 30;

      mockTransactionRepo.getExpiringPoints.mockResolvedValue(500);

      const result = await service.getExpiringPoints(memberId, days);

      expect(result.code).toBe(200);
      expect(result.data.expiringPoints).toBe(500);
      expect(result.data.days).toBe(30);
    });
  });
});
