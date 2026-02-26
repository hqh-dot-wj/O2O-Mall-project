// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { StoreDashboardService } from './dashboard.service';
import { StoreOrderRepository } from 'src/module/store/order/store-order.repository';
import { CommissionRepository } from 'src/module/finance/commission/commission.repository';
import { WithdrawalRepository } from 'src/module/finance/withdrawal/withdrawal.repository';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { PayStatus, CommissionStatus, WithdrawalStatus } from '@prisma/client';

describe('StoreDashboardService - T-6: 看板缓存', () => {
  let service: StoreDashboardService;
  let storeOrderRepo: StoreOrderRepository;
  let commissionRepo: CommissionRepository;
  let withdrawalRepo: WithdrawalRepository;

  const mockStoreOrderRepo = {
    aggregate: jest.fn(),
  };

  const mockCommissionRepo = {
    aggregate: jest.fn(),
  };

  const mockWithdrawalRepo = {
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreDashboardService,
        {
          provide: StoreOrderRepository,
          useValue: mockStoreOrderRepo,
        },
        {
          provide: CommissionRepository,
          useValue: mockCommissionRepo,
        },
        {
          provide: WithdrawalRepository,
          useValue: mockWithdrawalRepo,
        },
      ],
    }).compile();

    service = module.get<StoreDashboardService>(StoreDashboardService);
    storeOrderRepo = module.get<StoreOrderRepository>(StoreOrderRepository);
    commissionRepo = module.get<CommissionRepository>(CommissionRepository);
    withdrawalRepo = module.get<WithdrawalRepository>(WithdrawalRepository);

    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('应该返回完整的看板数据', async () => {
      // Arrange
      jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-1');
      jest.spyOn(TenantContext, 'isSuperTenant').mockReturnValue(false);

      // Mock 今日订单
      mockStoreOrderRepo.aggregate.mockResolvedValueOnce({
        _sum: { payAmount: 1000 },
        _count: 10,
      });

      // Mock 本月订单
      mockStoreOrderRepo.aggregate.mockResolvedValueOnce({
        _sum: { payAmount: 5000 },
      });

      // Mock 待结算佣金
      mockCommissionRepo.aggregate.mockResolvedValueOnce({
        _sum: { amount: 100 },
      });

      // Mock 已结算佣金
      mockCommissionRepo.aggregate.mockResolvedValueOnce({
        _sum: { amount: 200 },
      });

      // Mock 待审核提现
      mockWithdrawalRepo.count.mockResolvedValue(5);

      // Act
      const result = await service.getDashboard();

      // Assert
      expect(result).toBeDefined();
      expect(result.code).toBe(200);
      expect(result.data).toHaveProperty('todayGMV', 1000);
      expect(result.data).toHaveProperty('todayOrderCount', 10);
      expect(result.data).toHaveProperty('monthGMV', 5000);
      expect(result.data).toHaveProperty('pendingCommission', 100);
      expect(result.data).toHaveProperty('settledCommission', 200);
      expect(result.data).toHaveProperty('pendingWithdrawals', 5);
    });

    it('应该在数据为空时返回 0', async () => {
      // Arrange
      jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-1');
      jest.spyOn(TenantContext, 'isSuperTenant').mockReturnValue(false);

      // Mock 所有聚合返回 null
      mockStoreOrderRepo.aggregate.mockResolvedValue({
        _sum: { payAmount: null },
        _count: 0,
      });

      mockCommissionRepo.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      mockWithdrawalRepo.count.mockResolvedValue(0);

      // Act
      const result = await service.getDashboard();

      // Assert
      expect(result).toBeDefined();
      expect(result.code).toBe(200);
      expect(result.data).toHaveProperty('todayGMV', 0);
      expect(result.data).toHaveProperty('todayOrderCount', 0);
      expect(result.data).toHaveProperty('monthGMV', 0);
      expect(result.data).toHaveProperty('pendingCommission', 0);
      expect(result.data).toHaveProperty('settledCommission', 0);
      expect(result.data).toHaveProperty('pendingWithdrawals', 0);
    });

    it('应该为超级租户查询所有租户数据', async () => {
      // Arrange
      jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('super-tenant');
      jest.spyOn(TenantContext, 'isSuperTenant').mockReturnValue(true);

      mockStoreOrderRepo.aggregate.mockResolvedValue({
        _sum: { payAmount: 10000 },
        _count: 100,
      });

      mockCommissionRepo.aggregate.mockResolvedValue({
        _sum: { amount: 1000 },
      });

      mockWithdrawalRepo.count.mockResolvedValue(50);

      // Act
      const result = await service.getDashboard();

      // Assert
      expect(result).toBeDefined();
      expect(result.code).toBe(200);
      
      // 验证查询条件为空对象（不过滤租户）
      const orderAggregateCall = mockStoreOrderRepo.aggregate.mock.calls[0][0];
      expect(orderAggregateCall.where).toEqual({
        payStatus: PayStatus.PAID,
        createTime: expect.any(Object),
      });
    });

    it('应该为普通租户仅查询本租户数据', async () => {
      // Arrange
      jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-1');
      jest.spyOn(TenantContext, 'isSuperTenant').mockReturnValue(false);

      mockStoreOrderRepo.aggregate.mockResolvedValue({
        _sum: { payAmount: 1000 },
        _count: 10,
      });

      mockCommissionRepo.aggregate.mockResolvedValue({
        _sum: { amount: 100 },
      });

      mockWithdrawalRepo.count.mockResolvedValue(5);

      // Act
      const result = await service.getDashboard();

      // Assert
      expect(result).toBeDefined();
      
      // 验证查询条件包含 tenantId
      const orderAggregateCall = mockStoreOrderRepo.aggregate.mock.calls[0][0];
      expect(orderAggregateCall.where).toHaveProperty('tenantId', 'tenant-1');
    });
  });

  describe('getCommissionStats', () => {
    it('应该返回佣金统计数据', async () => {
      // Arrange
      jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-1');
      jest.spyOn(TenantContext, 'isSuperTenant').mockReturnValue(false);

      // Mock 今日佣金
      mockCommissionRepo.aggregate.mockResolvedValueOnce({
        _sum: { amount: 50 },
      });

      // Mock 本月佣金
      mockCommissionRepo.aggregate.mockResolvedValueOnce({
        _sum: { amount: 500 },
      });

      // Mock 待结算佣金
      mockCommissionRepo.aggregate.mockResolvedValueOnce({
        _sum: { amount: 100 },
      });

      // Act
      const result = await service.getCommissionStats();

      // Assert
      expect(result).toBeDefined();
      expect(result.code).toBe(200);
      expect(result.data).toHaveProperty('todayCommission', 50);
      expect(result.data).toHaveProperty('monthCommission', 500);
      expect(result.data).toHaveProperty('pendingCommission', 100);
    });

    it('应该排除已取消的佣金', async () => {
      // Arrange
      jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-1');
      jest.spyOn(TenantContext, 'isSuperTenant').mockReturnValue(false);

      mockCommissionRepo.aggregate.mockResolvedValue({
        _sum: { amount: 100 },
      });

      // Act
      await service.getCommissionStats();

      // Assert
      // 验证所有聚合查询都排除了 CANCELLED 状态
      const calls = mockCommissionRepo.aggregate.mock.calls;
      
      // 今日佣金查询
      expect(calls[0][0].where.status).toEqual({ not: CommissionStatus.CANCELLED });
      
      // 本月佣金查询
      expect(calls[1][0].where.status).toEqual({ not: CommissionStatus.CANCELLED });
      
      // 待结算佣金查询（只查 FROZEN 状态，自然排除了 CANCELLED）
      expect(calls[2][0].where.status).toBe(CommissionStatus.FROZEN);
    });
  });
});
