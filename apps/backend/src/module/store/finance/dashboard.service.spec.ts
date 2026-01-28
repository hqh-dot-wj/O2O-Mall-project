import { Test, TestingModule } from '@nestjs/testing';
import { StoreDashboardService } from './dashboard.service';
import { StoreOrderRepository } from 'src/module/store/order/store-order.repository';
import { CommissionRepository } from 'src/module/finance/commission/commission.repository';
import { WithdrawalRepository } from 'src/module/finance/withdrawal/withdrawal.repository';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { CommissionStatus, WithdrawalStatus } from '@prisma/client';

describe('StoreDashboardService', () => {
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

    // Mock TenantContext
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('t1');
    jest.spyOn(TenantContext, 'isSuperTenant').mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('应该返回看板数据', async () => {
      // Mock 数据
      mockStoreOrderRepo.aggregate
        .mockResolvedValueOnce({
          _sum: { payAmount: 10000 },
          _count: 50,
        })
        .mockResolvedValueOnce({
          _sum: { payAmount: 100000 },
        });

      mockCommissionRepo.aggregate
        .mockResolvedValueOnce({
          _sum: { amount: 5000 },
        })
        .mockResolvedValueOnce({
          _sum: { amount: 20000 },
        });

      mockWithdrawalRepo.count.mockResolvedValue(3);

      const result = await service.getDashboard();

      expect(result.data).toMatchObject({
        todayGMV: 10000,
        todayOrderCount: 50,
        monthGMV: 100000,
        pendingCommission: 5000,
        settledCommission: 20000,
        pendingWithdrawals: 3,
      });

      // 验证调用次数
      expect(mockStoreOrderRepo.aggregate).toHaveBeenCalledTimes(2);
      expect(mockCommissionRepo.aggregate).toHaveBeenCalledTimes(2);
      expect(mockWithdrawalRepo.count).toHaveBeenCalledTimes(1);
    });

    it('应该处理空数据', async () => {
      mockStoreOrderRepo.aggregate
        .mockResolvedValueOnce({
          _sum: { payAmount: null },
          _count: 0,
        })
        .mockResolvedValueOnce({
          _sum: { payAmount: null },
        });

      mockCommissionRepo.aggregate
        .mockResolvedValueOnce({
          _sum: { amount: null },
        })
        .mockResolvedValueOnce({
          _sum: { amount: null },
        });

      mockWithdrawalRepo.count.mockResolvedValue(0);

      const result = await service.getDashboard();

      expect(result.data).toMatchObject({
        todayGMV: 0,
        todayOrderCount: 0,
        monthGMV: 0,
        pendingCommission: 0,
        settledCommission: 0,
        pendingWithdrawals: 0,
      });
    });
  });

  describe('getCommissionStats', () => {
    it('应该返回佣金统计数据', async () => {
      mockCommissionRepo.aggregate
        .mockResolvedValueOnce({
          _sum: { amount: 1000 },
        })
        .mockResolvedValueOnce({
          _sum: { amount: 5000 },
        })
        .mockResolvedValueOnce({
          _sum: { amount: 2000 },
        });

      const result = await service.getCommissionStats();

      expect(result.data).toMatchObject({
        todayCommission: 1000,
        monthCommission: 5000,
        pendingCommission: 2000,
      });

      expect(mockCommissionRepo.aggregate).toHaveBeenCalledTimes(3);
    });

    it('应该处理空佣金数据', async () => {
      mockCommissionRepo.aggregate
        .mockResolvedValueOnce({
          _sum: { amount: null },
        })
        .mockResolvedValueOnce({
          _sum: { amount: null },
        })
        .mockResolvedValueOnce({
          _sum: { amount: null },
        });

      const result = await service.getCommissionStats();

      expect(result.data).toMatchObject({
        todayCommission: 0,
        monthCommission: 0,
        pendingCommission: 0,
      });
    });
  });
});
