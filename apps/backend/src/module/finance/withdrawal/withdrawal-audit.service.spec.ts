import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalAuditService } from './withdrawal-audit.service';
import { WithdrawalRepository } from './withdrawal.repository';
import { WalletRepository } from '../wallet/wallet.repository';
import { TransactionRepository } from '../wallet/transaction.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { WithdrawalPaymentService } from './withdrawal-payment.service';
import { WalletService } from '../wallet/wallet.service';
import { WithdrawalStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { BusinessException } from 'src/common/exceptions';
import { BusinessConstants } from 'src/common/constants/business.constants';

describe('WithdrawalAuditService', () => {
  let service: WithdrawalAuditService;

  const mockWithdrawalRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockWalletRepo = {
    findByMemberId: jest.fn(),
  };

  const mockTransactionRepo = {
    create: jest.fn(),
  };

  const mockPrismaService = {
    finWithdrawal: {
      findMany: jest.fn(),
    },
  };

  const mockPaymentService = {
    transfer: jest.fn(),
  };

  const mockWalletService = {
    unfreezeBalance: jest.fn(),
    deductFrozen: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalAuditService,
        {
          provide: WithdrawalRepository,
          useValue: mockWithdrawalRepo,
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
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: WithdrawalPaymentService,
          useValue: mockPaymentService,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
      ],
    }).compile();

    service = module.get<WithdrawalAuditService>(WithdrawalAuditService);
    jest.clearAllMocks();
  });

  // ========== WD-T6: 打款重试 ==========
  describe('approve - WD-T6 打款流程', () => {
    const mockWithdrawal = {
      id: 'withdrawal1',
      memberId: 'member1',
      tenantId: 'tenant1',
      amount: new Decimal(100),
      fee: new Decimal(0),
      actualAmount: new Decimal(100),
      status: WithdrawalStatus.PENDING,
      retryCount: 0,
    };

    it('Given 打款成功, When approve, Then 完成审核并返回成功', async () => {
      mockPaymentService.transfer.mockResolvedValue({ paymentNo: 'PAY123' });
      mockWithdrawalRepo.update.mockResolvedValue({});
      mockWalletService.deductFrozen.mockResolvedValue({});
      mockWalletRepo.findByMemberId.mockResolvedValue({
        id: 'wallet1',
        balance: new Decimal(0),
      });
      mockTransactionRepo.create.mockResolvedValue({});

      const result = await service.approve(mockWithdrawal, 'admin1');

      expect(result.code).toBe(200);
      expect(result.data.paymentNo).toBe('PAY123');
      expect(mockPaymentService.transfer).toHaveBeenCalledWith(mockWithdrawal);
    });

    it('Given 打款失败, When approve, Then 标记为FAILED并抛出异常', async () => {
      mockPaymentService.transfer.mockRejectedValue(new Error('支付网关超时'));
      mockWithdrawalRepo.update.mockResolvedValue({});

      await expect(service.approve(mockWithdrawal, 'admin1')).rejects.toThrow(BusinessException);

      expect(mockWithdrawalRepo.update).toHaveBeenCalledWith('withdrawal1', {
        status: WithdrawalStatus.FAILED,
        failReason: '支付网关超时',
      });
    });
  });

  describe('retryPayment - WD-T6 打款重试', () => {
    it('Given 提现记录不存在, When retryPayment, Then 返回false', async () => {
      mockWithdrawalRepo.findOne.mockResolvedValue(null);

      const result = await service.retryPayment('withdrawal1');

      expect(result).toBe(false);
    });

    it('Given 状态非FAILED, When retryPayment, Then 跳过重试返回false', async () => {
      mockWithdrawalRepo.findOne.mockResolvedValue({
        id: 'withdrawal1',
        status: WithdrawalStatus.APPROVED,
        retryCount: 0,
      });

      const result = await service.retryPayment('withdrawal1');

      expect(result).toBe(false);
    });

    it('Given 重试次数已达上限, When retryPayment, Then 跳过重试返回false', async () => {
      mockWithdrawalRepo.findOne.mockResolvedValue({
        id: 'withdrawal1',
        status: WithdrawalStatus.FAILED,
        retryCount: BusinessConstants.FINANCE.MAX_PAYMENT_RETRY_COUNT,
      });

      const result = await service.retryPayment('withdrawal1');

      expect(result).toBe(false);
    });

    it('Given 重试成功, When retryPayment, Then 完成审核返回true', async () => {
      const mockWithdrawal = {
        id: 'withdrawal1',
        memberId: 'member1',
        tenantId: 'tenant1',
        amount: new Decimal(100),
        actualAmount: new Decimal(100),
        status: WithdrawalStatus.FAILED,
        retryCount: 1,
      };

      mockWithdrawalRepo.findOne.mockResolvedValue(mockWithdrawal);
      mockWithdrawalRepo.update.mockResolvedValue({});
      mockPaymentService.transfer.mockResolvedValue({ paymentNo: 'PAY456' });
      mockWalletService.deductFrozen.mockResolvedValue({});
      mockWalletRepo.findByMemberId.mockResolvedValue({
        id: 'wallet1',
        balance: new Decimal(0),
      });
      mockTransactionRepo.create.mockResolvedValue({});

      const result = await service.retryPayment('withdrawal1');

      expect(result).toBe(true);
      expect(mockWithdrawalRepo.update).toHaveBeenCalledWith('withdrawal1', {
        retryCount: { increment: 1 },
      });
    });

    it('Given 重试失败, When retryPayment, Then 更新失败原因返回false', async () => {
      const mockWithdrawal = {
        id: 'withdrawal1',
        memberId: 'member1',
        tenantId: 'tenant1',
        amount: new Decimal(100),
        status: WithdrawalStatus.FAILED,
        retryCount: 1,
      };

      mockWithdrawalRepo.findOne.mockResolvedValue(mockWithdrawal);
      mockWithdrawalRepo.update.mockResolvedValue({});
      mockPaymentService.transfer.mockRejectedValue(new Error('余额不足'));

      const result = await service.retryPayment('withdrawal1');

      expect(result).toBe(false);
      expect(mockWithdrawalRepo.update).toHaveBeenLastCalledWith('withdrawal1', {
        failReason: '余额不足',
      });
    });
  });

  describe('reject', () => {
    it('Given 提现申请, When reject, Then 驳回并解冻余额', async () => {
      const mockWithdrawal = {
        id: 'withdrawal1',
        memberId: 'member1',
        amount: new Decimal(100),
      };

      mockWithdrawalRepo.update.mockResolvedValue({});
      mockWalletService.unfreezeBalance.mockResolvedValue({});

      const result = await service.reject(mockWithdrawal, 'admin1', '余额异常');

      expect(result.code).toBe(200);
      expect(mockWithdrawalRepo.update).toHaveBeenCalledWith('withdrawal1', {
        status: WithdrawalStatus.REJECTED,
        auditTime: expect.any(Date),
        auditBy: 'admin1',
        auditRemark: '余额异常',
      });
      expect(mockWalletService.unfreezeBalance).toHaveBeenCalledWith('member1', new Decimal(100));
    });
  });

  describe('getRetryableWithdrawals', () => {
    it('Given 有待重试记录, When getRetryableWithdrawals, Then 返回记录列表', async () => {
      const mockWithdrawals = [
        { id: 'w1', status: WithdrawalStatus.FAILED, retryCount: 1 },
        { id: 'w2', status: WithdrawalStatus.FAILED, retryCount: 2 },
      ];

      mockPrismaService.finWithdrawal.findMany.mockResolvedValue(mockWithdrawals);

      const result = await service.getRetryableWithdrawals();

      expect(result).toHaveLength(2);
      expect(mockPrismaService.finWithdrawal.findMany).toHaveBeenCalledWith({
        where: {
          status: WithdrawalStatus.FAILED,
          retryCount: { lt: BusinessConstants.FINANCE.MAX_PAYMENT_RETRY_COUNT },
        },
        orderBy: { createTime: 'asc' },
        take: 10,
      });
    });
  });
});
