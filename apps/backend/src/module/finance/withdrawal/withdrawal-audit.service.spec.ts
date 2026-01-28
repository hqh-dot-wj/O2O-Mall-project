import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalAuditService } from './withdrawal-audit.service';
import { WithdrawalRepository } from './withdrawal.repository';
import { WalletRepository } from '../wallet/wallet.repository';
import { TransactionRepository } from '../wallet/transaction.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { WithdrawalPaymentService } from './withdrawal-payment.service';
import { WalletService } from '../wallet/wallet.service';
import { Decimal } from '@prisma/client/runtime/library';
import { WithdrawalStatus } from '@prisma/client';
import { BusinessException } from 'src/common/exceptions';

describe('WithdrawalAuditService', () => {
  let service: WithdrawalAuditService;
  let withdrawalRepo: WithdrawalRepository;
  let walletService: WalletService;
  let paymentService: WithdrawalPaymentService;

  const mockWithdrawalRepo = {
    update: jest.fn(),
  };

  const mockWalletRepo = {
    findByMemberId: jest.fn(),
  };

  const mockTransactionRepo = {
    create: jest.fn(),
  };

  const mockPrismaService = {};

  const mockPaymentService = {
    transfer: jest.fn(),
  };

  const mockWalletService = {
    deductFrozen: jest.fn(),
    unfreezeBalance: jest.fn(),
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
    withdrawalRepo = module.get<WithdrawalRepository>(WithdrawalRepository);
    walletService = module.get<WalletService>(WalletService);
    paymentService = module.get<WithdrawalPaymentService>(WithdrawalPaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('approve', () => {
    const mockWithdrawal: any = {
      id: 'withdrawal1',
      memberId: 'member1',
      tenantId: 'tenant1',
      amount: new Decimal(50),
      status: WithdrawalStatus.PENDING,
      method: 'WECHAT',
      accountNo: '',
      realName: '测试用户',
      auditTime: null,
      auditBy: null,
      auditRemark: null,
      paymentNo: null,
      failReason: null,
      createTime: new Date(),
    };

    it('应该成功审核通过并打款', async () => {
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
        tenantId: 'tenant1',
        balance: new Decimal(50),
      };

      mockPaymentService.transfer.mockResolvedValue({ paymentNo: 'PAY123456' });
      mockWithdrawalRepo.update.mockResolvedValue({});
      mockWalletService.deductFrozen.mockResolvedValue({});
      mockWalletRepo.findByMemberId.mockResolvedValue(mockWallet);
      mockTransactionRepo.create.mockResolvedValue({});

      const result = await service.approve(mockWithdrawal, 'admin1');

      expect(result.code).toBe(200);
      expect(result.data.paymentNo).toBe('PAY123456');
      expect(mockPaymentService.transfer).toHaveBeenCalledWith(mockWithdrawal);
      expect(mockWithdrawalRepo.update).toHaveBeenCalledWith('withdrawal1', {
        status: WithdrawalStatus.APPROVED,
        auditTime: expect.any(Date),
        auditBy: 'admin1',
        paymentNo: 'PAY123456',
      });
      expect(mockWalletService.deductFrozen).toHaveBeenCalledWith(
        'member1',
        new Decimal(50),
      );
    });

    it('应该处理打款失败', async () => {
      mockPaymentService.transfer.mockRejectedValue(new Error('打款渠道异常'));
      mockWithdrawalRepo.update.mockResolvedValue({});

      await expect(service.approve(mockWithdrawal, 'admin1')).rejects.toThrow(
        BusinessException,
      );

      expect(mockWithdrawalRepo.update).toHaveBeenCalledWith('withdrawal1', {
        status: WithdrawalStatus.FAILED,
        failReason: '打款渠道异常',
      });
    });
  });

  describe('reject', () => {
    const mockWithdrawal: any = {
      id: 'withdrawal1',
      memberId: 'member1',
      tenantId: 'tenant1',
      amount: new Decimal(50),
      status: WithdrawalStatus.PENDING,
      method: 'WECHAT',
      accountNo: '',
      realName: '测试用户',
      auditTime: null,
      auditBy: null,
      auditRemark: null,
      paymentNo: null,
      failReason: null,
      createTime: new Date(),
    };

    it('应该成功驳回提现', async () => {
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
      expect(mockWalletService.unfreezeBalance).toHaveBeenCalledWith(
        'member1',
        new Decimal(50),
      );
    });

    it('应该支持无备注驳回', async () => {
      mockWithdrawalRepo.update.mockResolvedValue({});
      mockWalletService.unfreezeBalance.mockResolvedValue({});

      const result = await service.reject(mockWithdrawal, 'admin1');

      expect(result.code).toBe(200);
      expect(mockWithdrawalRepo.update).toHaveBeenCalledWith('withdrawal1', {
        status: WithdrawalStatus.REJECTED,
        auditTime: expect.any(Date),
        auditBy: 'admin1',
        auditRemark: undefined,
      });
    });
  });
});
