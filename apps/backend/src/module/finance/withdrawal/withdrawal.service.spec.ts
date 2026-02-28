import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalService } from './withdrawal.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { WithdrawalRepository } from './withdrawal.repository';
import { WithdrawalAuditService } from './withdrawal-audit.service';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response';
import { WithdrawalStatus } from '@prisma/client';

describe('WithdrawalService - T-4: 提现审核租户归属校验', () => {
  let service: WithdrawalService;
  let withdrawalRepo: WithdrawalRepository;
  let auditService: WithdrawalAuditService;

  const mockPrismaService = {
    umsMember: {
      findUnique: jest.fn(),
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
      ],
    }).compile();

    service = module.get<WithdrawalService>(WithdrawalService);
    withdrawalRepo = module.get<WithdrawalRepository>(WithdrawalRepository);
    auditService = module.get<WithdrawalAuditService>(WithdrawalAuditService);

    jest.clearAllMocks();
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
