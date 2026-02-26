// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalService } from './withdrawal.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { WithdrawalRepository } from './withdrawal.repository';
import { WithdrawalAuditService } from './withdrawal-audit.service';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response';
import { WithdrawalStatus } from '@prisma/client';

describe('WithdrawalService - T-4: 提现审核租户校验', () => {
  let service: WithdrawalService;
  let withdrawalRepo: WithdrawalRepository;
  let auditService: WithdrawalAuditService;

  const mockWithdrawalRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    findPage: jest.fn(),
  };

  const mockAuditService = {
    approve: jest.fn(),
    reject: jest.fn(),
  };

  const mockWalletService = {
    getOrCreateWallet: jest.fn(),
    freezeBalance: jest.fn(),
  };

  const mockPrismaService = {
    umsMember: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalService,
        {
          provide: WithdrawalRepository,
          useValue: mockWithdrawalRepo,
        },
        {
          provide: WithdrawalAuditService,
          useValue: mockAuditService,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WithdrawalService>(WithdrawalService);
    withdrawalRepo = module.get<WithdrawalRepository>(WithdrawalRepository);
    auditService = module.get<WithdrawalAuditService>(WithdrawalAuditService);

    jest.clearAllMocks();
  });

  describe('audit', () => {
    it('应该在提现记录不存在时抛出错误', async () => {
      // Arrange
      mockWithdrawalRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.audit('withdrawal-1', 'APPROVE', 'admin-1', 'tenant-1')).rejects.toThrow(
        BusinessException,
      );
      await expect(service.audit('withdrawal-1', 'APPROVE', 'admin-1', 'tenant-1')).rejects.toThrow(
        '提现申请不存在或已处理',
      );
    });

    it('应该在租户不匹配时抛出错误', async () => {
      // Arrange
      const mockWithdrawal = {
        id: 'withdrawal-1',
        tenantId: 'tenant-2', // 不同的租户
        memberId: 'member-1',
        amount: 100,
        status: WithdrawalStatus.PENDING,
      };

      mockWithdrawalRepo.findOne.mockResolvedValue(mockWithdrawal);

      // Act & Assert
      await expect(service.audit('withdrawal-1', 'APPROVE', 'admin-1', 'tenant-1')).rejects.toThrow(
        BusinessException,
      );
      await expect(service.audit('withdrawal-1', 'APPROVE', 'admin-1', 'tenant-1')).rejects.toThrow(
        '无权审核其他租户的提现申请',
      );
    });

    it('应该在租户匹配时正常审核通过', async () => {
      // Arrange
      const mockWithdrawal = {
        id: 'withdrawal-1',
        tenantId: 'tenant-1',
        memberId: 'member-1',
        amount: 100,
        status: WithdrawalStatus.PENDING,
      };

      mockWithdrawalRepo.findOne.mockResolvedValue(mockWithdrawal);
      mockAuditService.approve.mockResolvedValue({ code: 200, data: mockWithdrawal });

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
        memberId: 'member-1',
        amount: 100,
        status: WithdrawalStatus.PENDING,
      };

      mockWithdrawalRepo.findOne.mockResolvedValue(mockWithdrawal);
      mockAuditService.reject.mockResolvedValue({ code: 200, data: mockWithdrawal });

      // Act
      const result = await service.audit('withdrawal-1', 'REJECT', 'admin-1', 'tenant-1', '余额不足');

      // Assert
      expect(result).toBeDefined();
      expect(mockAuditService.reject).toHaveBeenCalledWith(mockWithdrawal, 'admin-1', '余额不足');
    });

    it('应该在未提供 tenantId 时跳过租户校验', async () => {
      // Arrange
      const mockWithdrawal = {
        id: 'withdrawal-1',
        tenantId: 'tenant-2',
        memberId: 'member-1',
        amount: 100,
        status: WithdrawalStatus.PENDING,
      };

      mockWithdrawalRepo.findOne.mockResolvedValue(mockWithdrawal);
      mockAuditService.approve.mockResolvedValue({ code: 200, data: mockWithdrawal });

      // Act
      const result = await service.audit('withdrawal-1', 'APPROVE', 'admin-1'); // 不传 tenantId

      // Assert
      expect(result).toBeDefined();
      expect(mockAuditService.approve).toHaveBeenCalledWith(mockWithdrawal, 'admin-1');
    });

    it('应该在不支持的审核操作时抛出错误', async () => {
      // Arrange
      const mockWithdrawal = {
        id: 'withdrawal-1',
        tenantId: 'tenant-1',
        memberId: 'member-1',
        amount: 100,
        status: WithdrawalStatus.PENDING,
      };

      mockWithdrawalRepo.findOne.mockResolvedValue(mockWithdrawal);

      // Act & Assert
      await expect(service.audit('withdrawal-1', 'INVALID' as any, 'admin-1', 'tenant-1')).rejects.toThrow(
        BusinessException,
      );
      await expect(service.audit('withdrawal-1', 'INVALID' as any, 'admin-1', 'tenant-1')).rejects.toThrow(
        '不支持的审核操作',
      );
    });
  });
});
