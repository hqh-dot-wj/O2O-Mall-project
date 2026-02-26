// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { StoreCommissionQueryService } from './commission-query.service';
import { CommissionRepository } from 'src/module/finance/commission/commission.repository';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { ListCommissionDto } from './dto/store-finance.dto';
import { CommissionStatus } from '@prisma/client';

describe('StoreCommissionQueryService - T-5: phone 参数生效', () => {
  let service: StoreCommissionQueryService;
  let commissionRepo: CommissionRepository;

  const mockCommissionRepo = {
    findPage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreCommissionQueryService,
        {
          provide: CommissionRepository,
          useValue: mockCommissionRepo,
        },
      ],
    }).compile();

    service = module.get<StoreCommissionQueryService>(StoreCommissionQueryService);
    commissionRepo = module.get<CommissionRepository>(CommissionRepository);

    jest.clearAllMocks();
  });

  describe('getCommissionList', () => {
    it('应该在提供 phone 参数时通过 beneficiary 关联查询', async () => {
      // Arrange
      const query = new ListCommissionDto();
      query.phone = '138';
      query.pageNum = 1;
      query.pageSize = 10;

      jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-1');

      mockCommissionRepo.findPage.mockResolvedValue({
        rows: [],
        total: 0,
      });

      // Act
      await service.getCommissionList(query);

      // Assert
      expect(mockCommissionRepo.findPage).toHaveBeenCalled();
      const callArgs = mockCommissionRepo.findPage.mock.calls[0][0];
      
      // 验证 where 条件包含 beneficiary.mobile
      expect(callArgs.where).toHaveProperty('beneficiary');
      expect(callArgs.where.beneficiary).toHaveProperty('mobile');
      expect(callArgs.where.beneficiary.mobile).toEqual({ contains: '138' });
    });

    it('应该在同时提供 orderSn 和 phone 时正确构建查询条件', async () => {
      // Arrange
      const query = new ListCommissionDto();
      query.orderSn = 'ORD123';
      query.phone = '138';
      query.pageNum = 1;
      query.pageSize = 10;

      jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-1');

      mockCommissionRepo.findPage.mockResolvedValue({
        rows: [],
        total: 0,
      });

      // Act
      await service.getCommissionList(query);

      // Assert
      expect(mockCommissionRepo.findPage).toHaveBeenCalled();
      const callArgs = mockCommissionRepo.findPage.mock.calls[0][0];
      
      // 验证同时包含 order 和 beneficiary 条件
      expect(callArgs.where).toHaveProperty('order');
      expect(callArgs.where.order).toHaveProperty('orderSn');
      expect(callArgs.where).toHaveProperty('beneficiary');
      expect(callArgs.where.beneficiary).toHaveProperty('mobile');
    });

    it('应该在仅提供 orderSn 时不添加 beneficiary 条件', async () => {
      // Arrange
      const query = new ListCommissionDto();
      query.orderSn = 'ORD123';
      query.pageNum = 1;
      query.pageSize = 10;

      jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-1');

      mockCommissionRepo.findPage.mockResolvedValue({
        rows: [],
        total: 0,
      });

      // Act
      await service.getCommissionList(query);

      // Assert
      expect(mockCommissionRepo.findPage).toHaveBeenCalled();
      const callArgs = mockCommissionRepo.findPage.mock.calls[0][0];
      
      // 验证只有 order 条件，没有 beneficiary
      expect(callArgs.where).toHaveProperty('order');
      expect(callArgs.where).not.toHaveProperty('beneficiary');
    });

    it('应该在未提供 orderSn 和 phone 时不添加这些条件', async () => {
      // Arrange
      const query = new ListCommissionDto();
      query.status = CommissionStatus.SETTLED;
      query.pageNum = 1;
      query.pageSize = 10;

      jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-1');

      mockCommissionRepo.findPage.mockResolvedValue({
        rows: [],
        total: 0,
      });

      // Act
      await service.getCommissionList(query);

      // Assert
      expect(mockCommissionRepo.findPage).toHaveBeenCalled();
      const callArgs = mockCommissionRepo.findPage.mock.calls[0][0];
      
      // 验证没有 order 和 beneficiary 条件
      expect(callArgs.where).not.toHaveProperty('order');
      expect(callArgs.where).not.toHaveProperty('beneficiary');
      // 但应该有 status 条件
      expect(callArgs.where).toHaveProperty('status');
      expect(callArgs.where.status).toBe(CommissionStatus.SETTLED);
    });

    it('应该正确处理其他查询参数（status, memberId, dateRange）', async () => {
      // Arrange
      const query = new ListCommissionDto();
      query.status = CommissionStatus.FROZEN;
      query.memberId = 'member-1';
      query.phone = '138';
      query.pageNum = 1;
      query.pageSize = 10;

      jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-1');

      mockCommissionRepo.findPage.mockResolvedValue({
        rows: [],
        total: 0,
      });

      // Act
      await service.getCommissionList(query);

      // Assert
      expect(mockCommissionRepo.findPage).toHaveBeenCalled();
      const callArgs = mockCommissionRepo.findPage.mock.calls[0][0];
      
      // 验证所有条件都存在
      expect(callArgs.where).toHaveProperty('tenantId', 'tenant-1');
      expect(callArgs.where).toHaveProperty('status', CommissionStatus.FROZEN);
      expect(callArgs.where).toHaveProperty('beneficiaryId', 'member-1');
      expect(callArgs.where).toHaveProperty('beneficiary');
      expect(callArgs.where.beneficiary).toHaveProperty('mobile');
    });
  });
});
