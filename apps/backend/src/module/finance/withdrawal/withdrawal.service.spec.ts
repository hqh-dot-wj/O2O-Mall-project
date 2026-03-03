import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalService } from './withdrawal.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { WithdrawalRepository } from './withdrawal.repository';
import { WithdrawalAuditService } from './withdrawal-audit.service';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response';
import { WithdrawalStatus } from '@prisma/client';
import { RedisService } from 'src/module/common/redis/redis.service';
import { FinanceEventEmitter } from '../events/finance-event.emitter';
import { Decimal } from '@prisma/client/runtime/library';
import { BusinessConstants } from 'src/common/constants/business.constants';
import { MemberQueryPort } from '../ports/member-query.port';

describe('WithdrawalService', () => {
  let service: WithdrawalService;
  let withdrawalRepo: WithdrawalRepository;
  let auditService: WithdrawalAuditService;

  const mockPrismaService = {
    umsMember: {
      findUnique: jest.fn(),
    },
    finWithdrawal: {
      aggregate: jest.fn(),
    },
  };

  const mockWalletService = {
    getOrCreateWallet: jest.fn(),
    freezeBalance: jest.fn(),
  };

  const mockWithdrawalRepo = {
    create: jest.fn(),
    findOne: jest.fn(),
    findPage: jest.fn(),
  };

  const mockAuditService = {
    approve: jest.fn(),
    reject: jest.fn(),
  };

  const mockRedisClient = {
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn(() => mockRedisClient),
  };

  const mockEventEmitter = {
    emitWithdrawalApplied: jest.fn(),
  };

  // A-T2: MemberQueryPort mock
  const mockMemberQueryPort = {
    findMemberForCommission: jest.fn(),
    findMemberBrief: jest.fn().mockResolvedValue({
      memberId: 'member1',
      nickname: '测试用户',
    }),
    findMembersBrief: jest.fn(),
    checkCircularReferral: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
        {
          provide: WithdrawalRepository,
          useValue: mockWithdrawalRepo,
        },
        {
          provide: WithdrawalAuditService,
          useValue: mockAuditService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: FinanceEventEmitter,
          useValue: mockEventEmitter,
        },
        {
          provide: MemberQueryPort,
          useValue: mockMemberQueryPort,
        },
      ],
    }).compile();

    service = module.get<WithdrawalService>(WithdrawalService);
    withdrawalRepo = module.get<WithdrawalRepository>(WithdrawalRepository);
    auditService = module.get<WithdrawalAuditService>(WithdrawalAuditService);

    jest.clearAllMocks();
  });

  // ========== WD-T5: 提现手续费计算 ==========
  describe('calculateFee - WD-T5 提现手续费', () => {
    it('Given 费率和最低手续费都为0, When calculateFee, Then 返回0', () => {
      // 当前配置 FEE_RATE=0, FEE_MIN=0
      const fee = service.calculateFee(new Decimal(100));
      expect(fee.toString()).toBe('0');
    });
  });

  // ========== WD-T4: 单日提现限额 ==========
  describe('apply - WD-T4 单日提现限额', () => {
    beforeEach(() => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockWalletService.getOrCreateWallet.mockResolvedValue({
        id: 'wallet1',
        memberId: 'member1',
        balance: new Decimal(1000),
      });
      mockPrismaService.umsMember.findUnique.mockResolvedValue({
        memberId: 'member1',
        nickname: '测试用户',
      });
      mockWalletService.freezeBalance.mockResolvedValue({});
      mockWithdrawalRepo.create.mockResolvedValue({
        id: 'withdrawal1',
        amount: new Decimal(100),
        fee: new Decimal(0),
        actualAmount: new Decimal(100),
      });
    });

    it('Given 今日未提现, When apply, Then 成功创建提现申请', async () => {
      mockPrismaService.finWithdrawal.aggregate.mockResolvedValue({
        _count: 0,
        _sum: { amount: null },
      });

      const result = await service.apply('member1', 'tenant1', 100, 'WECHAT');

      expect(result.code).toBe(200);
      expect(mockWithdrawalRepo.create).toHaveBeenCalled();
      expect(mockEventEmitter.emitWithdrawalApplied).toHaveBeenCalled();
    });

    it('Given 今日提现次数已达上限, When apply, Then 抛出次数超限异常', async () => {
      // R-PRE-WD-01: 单日限额校验
      mockPrismaService.finWithdrawal.aggregate.mockResolvedValue({
        _count: BusinessConstants.FINANCE.MAX_DAILY_WITHDRAWAL_COUNT,
        _sum: { amount: new Decimal(100) },
      });

      await expect(
        service.apply('member1', 'tenant1', 100, 'WECHAT'),
      ).rejects.toThrow(BusinessException);
    });

    it('Given 今日提现金额将超限, When apply, Then 抛出金额超限异常', async () => {
      // R-PRE-WD-01: 单日限额校验
      const maxDaily = BusinessConstants.FINANCE.MAX_DAILY_WITHDRAWAL_AMOUNT;
      mockPrismaService.finWithdrawal.aggregate.mockResolvedValue({
        _count: 1,
        _sum: { amount: new Decimal(maxDaily - 100) },
      });

      await expect(
        service.apply('member1', 'tenant1', 200, 'WECHAT'),
      ).rejects.toThrow(BusinessException);
    });

    it('Given 金额低于最小提现金额, When apply, Then 抛出金额过小异常', async () => {
      // R-IN-WD-01: 金额范围校验
      mockPrismaService.finWithdrawal.aggregate.mockResolvedValue({
        _count: 0,
        _sum: { amount: null },
      });

      await expect(
        service.apply('member1', 'tenant1', 0.5, 'WECHAT'),
      ).rejects.toThrow(BusinessException);
    });

    it('Given 金额超过单笔上限, When apply, Then 抛出金额过大异常', async () => {
      // R-IN-WD-01: 金额范围校验
      mockPrismaService.finWithdrawal.aggregate.mockResolvedValue({
        _count: 0,
        _sum: { amount: null },
      });

      const exceedAmount = BusinessConstants.FINANCE.MAX_SINGLE_AMOUNT + 1;
      await expect(
        service.apply('member1', 'tenant1', exceedAmount, 'WECHAT'),
      ).rejects.toThrow(BusinessException);
    });

    it('Given 重复提交, When apply, Then 抛出重复提交异常', async () => {
      // R-CONCUR-WD-01: 防重提交校验
      mockRedisClient.set.mockResolvedValue(null); // 锁获取失败

      await expect(
        service.apply('member1', 'tenant1', 100, 'WECHAT'),
      ).rejects.toThrow(BusinessException);
    });

    it('Given 余额不足, When apply, Then 抛出余额不足异常', async () => {
      mockPrismaService.finWithdrawal.aggregate.mockResolvedValue({
        _count: 0,
        _sum: { amount: null },
      });
      mockWalletService.getOrCreateWallet.mockResolvedValue({
        id: 'wallet1',
        memberId: 'member1',
        balance: new Decimal(50),
      });

      await expect(
        service.apply('member1', 'tenant1', 100, 'WECHAT'),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('getWithdrawalConfig', () => {
    it('Given 调用getWithdrawalConfig, When 获取配置, Then 返回正确的配置值', () => {
      const config = service.getWithdrawalConfig();

      expect(config.minAmount).toBe(BusinessConstants.FINANCE.MIN_WITHDRAWAL_AMOUNT);
      expect(config.maxSingleAmount).toBe(BusinessConstants.FINANCE.MAX_SINGLE_AMOUNT);
      expect(config.maxDailyCount).toBe(BusinessConstants.FINANCE.MAX_DAILY_WITHDRAWAL_COUNT);
      expect(config.maxDailyAmount).toBe(BusinessConstants.FINANCE.MAX_DAILY_WITHDRAWAL_AMOUNT);
    });
  });

  describe('audit - 租户归属校验', () => {
    it('应该在提现记录不存在时抛出错误', async () => {
      // Arrange
      mockWithdrawalRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.audit('withdrawal-1', 'APPROVE', 'admin-1', 'tenant-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('应该在提现记录已处理时抛出错误', async () => {
      // Arrange
      mockWithdrawalRepo.findOne.mockResolvedValue(null); // findOne 查询条件包含 status=PENDING，已处理的记录会返回 null

      // Act & Assert
      await expect(
        service.audit('withdrawal-1', 'APPROVE', 'admin-1', 'tenant-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('应该在租户不匹配时抛出错误', async () => {
      // Arrange
      mockWithdrawalRepo.findOne.mockResolvedValue({
        id: 'withdrawal-1',
        tenantId: 'tenant-1',
        status: WithdrawalStatus.PENDING,
        member: { memberId: 'member-1' },
      });

      // Act & Assert
      await expect(
        service.audit('withdrawal-1', 'APPROVE', 'admin-1', 'tenant-2'),
      ).rejects.toThrow(BusinessException);
    });

    it('应该在租户匹配时正常审核通过', async () => {
      // Arrange
      const mockWithdrawal = {
        id: 'withdrawal-1',
        tenantId: 'tenant-1',
        status: WithdrawalStatus.PENDING,
        member: { memberId: 'member-1' },
      };

      mockWithdrawalRepo.findOne.mockResolvedValue(mockWithdrawal);
      mockAuditService.approve.mockResolvedValue({
        code: 200,
        data: { ...mockWithdrawal, status: WithdrawalStatus.APPROVED },
      });

      // Act
      const result = await service.audit('withdrawal-1', 'APPROVE', 'admin-1', 'tenant-1');

      // Assert
      expect(result).toBeDefined();
      expect(mockAuditService.approve).toHaveBeenCalledWith(mockWithdrawal, 'admin-1');
    });

    it('应该在租户匹配时正常审核驳回', async () => {
      // Arrange
      const mockWithdrawal = {
        id: 'withdrawal-1',
        tenantId: 'tenant-1',
        status: WithdrawalStatus.PENDING,
        member: { memberId: 'member-1' },
      };

      mockWithdrawalRepo.findOne.mockResolvedValue(mockWithdrawal);
      mockAuditService.reject.mockResolvedValue({
        code: 200,
        data: { ...mockWithdrawal, status: WithdrawalStatus.REJECTED },
      });

      // Act
      const result = await service.audit(
        'withdrawal-1',
        'REJECT',
        'admin-1',
        'tenant-1',
        '余额不足',
      );

      // Assert
      expect(result).toBeDefined();
      expect(mockAuditService.reject).toHaveBeenCalledWith(mockWithdrawal, 'admin-1', '余额不足');
    });

    it('应该在未提供 tenantId 时跳过租户校验（超管场景）', async () => {
      // Arrange
      const mockWithdrawal = {
        id: 'withdrawal-1',
        tenantId: 'tenant-1',
        status: WithdrawalStatus.PENDING,
        member: { memberId: 'member-1' },
      };

      mockWithdrawalRepo.findOne.mockResolvedValue(mockWithdrawal);
      mockAuditService.approve.mockResolvedValue({
        code: 200,
        data: { ...mockWithdrawal, status: WithdrawalStatus.APPROVED },
      });

      // Act
      const result = await service.audit('withdrawal-1', 'APPROVE', 'admin-1');

      // Assert
      expect(result).toBeDefined();
      expect(mockAuditService.approve).toHaveBeenCalledWith(mockWithdrawal, 'admin-1');
    });

    it('应该在不支持的审核操作时抛出错误', async () => {
      // Arrange
      const mockWithdrawal = {
        id: 'withdrawal-1',
        tenantId: 'tenant-1',
        status: WithdrawalStatus.PENDING,
        member: { memberId: 'member-1' },
      };

      mockWithdrawalRepo.findOne.mockResolvedValue(mockWithdrawal);

      // Act & Assert
      await expect(
        service.audit('withdrawal-1', 'INVALID_ACTION' as any, 'admin-1', 'tenant-1'),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('audit - 边界情况', () => {
    it('应该在提现记录的 tenantId 为 null 时正确处理', async () => {
      // Arrange
      mockWithdrawalRepo.findOne.mockResolvedValue({
        id: 'withdrawal-1',
        tenantId: null,
        status: WithdrawalStatus.PENDING,
        member: { memberId: 'member-1' },
      });

      // Act & Assert
      await expect(
        service.audit('withdrawal-1', 'APPROVE', 'admin-1', 'tenant-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('应该在提供的 tenantId 为空字符串时正确处理', async () => {
      // Arrange
      const mockWithdrawal = {
        id: 'withdrawal-1',
        tenantId: 'tenant-1',
        status: WithdrawalStatus.PENDING,
        member: { memberId: 'member-1' },
      };

      mockWithdrawalRepo.findOne.mockResolvedValue(mockWithdrawal);
      mockAuditService.approve.mockResolvedValue({
        code: 200,
        data: { ...mockWithdrawal, status: WithdrawalStatus.APPROVED },
      });

      // Act
      const result = await service.audit('withdrawal-1', 'APPROVE', 'admin-1', '');

      // Assert
      // 空字符串被视为 falsy，应该跳过租户校验
      expect(result).toBeDefined();
      expect(mockAuditService.approve).toHaveBeenCalled();
    });
  });
});
