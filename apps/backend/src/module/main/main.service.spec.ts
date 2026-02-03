import { Test, TestingModule } from '@nestjs/testing';
import { MainService } from './main.service';
import { MenuService } from '../admin/system/menu/menu.service';
import { WalletService } from '../finance/wallet/wallet.service';
import { CommissionRepository } from '../finance/commission/commission.repository';
import { StoreOrderRepository } from '../store/order/store-order.repository';
import { ProductRepository } from '../pms/product/product.repository';
import { MemberRepository } from '../admin/member/member.repository';
import { Decimal } from '@prisma/client/runtime/library';
import { CommissionStatus, PayStatus, StatusEnum } from '@prisma/client';

describe('MainService', () => {
  let service: MainService;
  let walletService: WalletService;
  let commissionRepo: CommissionRepository;
  let storeOrderRepo: StoreOrderRepository;
  let productRepo: ProductRepository;
  let memberRepo: MemberRepository;

  const mockMenuService = {
    getMenuListByUserId: jest.fn(),
  };

  const mockWalletService = {
    getWallet: jest.fn(),
  };

  const mockCommissionRepo = {
    aggregate: jest.fn(),
  };

  const mockStoreOrderRepo = {
    aggregate: jest.fn(),
  };

  const mockProductRepo = {
    count: jest.fn(),
  };

  const mockMemberRepo = {
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MainService,
        { provide: MenuService, useValue: mockMenuService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: CommissionRepository, useValue: mockCommissionRepo },
        { provide: StoreOrderRepository, useValue: mockStoreOrderRepo },
        { provide: ProductRepository, useValue: mockProductRepo },
        { provide: MemberRepository, useValue: mockMemberRepo },
      ],
    }).compile();

    service = module.get<MainService>(MainService);
    walletService = module.get<WalletService>(WalletService);
    commissionRepo = module.get<CommissionRepository>(CommissionRepository);
    storeOrderRepo = module.get<StoreOrderRepository>(StoreOrderRepository);
    productRepo = module.get<ProductRepository>(ProductRepository);
    memberRepo = module.get<MemberRepository>(MemberRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardStats', () => {
    const tenantId = 'test-tenant-123';

    it('should return dashboard statistics with valid data', async () => {
      // Mock wallet balance
      mockWalletService.getWallet.mockResolvedValue({
        id: 'wallet-1',
        memberId: `STORE_${tenantId}`,
        balance: new Decimal(5000.5),
        frozen: new Decimal(0),
        totalIncome: new Decimal(10000),
      });

      // Mock today's orders
      mockStoreOrderRepo.aggregate
        .mockResolvedValueOnce({
          _sum: { payAmount: new Decimal(1500.25) },
          _count: 15,
        })
        // Mock month's orders
        .mockResolvedValueOnce({
          _sum: { payAmount: new Decimal(25000.75) },
        });

      // Mock product count
      mockProductRepo.count.mockResolvedValue(150);

      // Mock member count
      mockMemberRepo.count.mockResolvedValue(320);

      // Mock commission stats
      mockCommissionRepo.aggregate
        // Settled commission
        .mockResolvedValueOnce({
          _sum: { amount: new Decimal(3000) },
        })
        // Pending commission
        .mockResolvedValueOnce({
          _sum: { amount: new Decimal(500) },
        });

      const result = await service.getDashboardStats(tenantId);

      expect(result).toEqual({
        walletBalance: 5000.5,
        todayGMV: 1500.25,
        todayOrderCount: 15,
        monthGMV: 25000.75,
        productCount: 150,
        memberCount: 320,
        settledCommission: 3000,
        pendingCommission: 500,
      });

      // Verify wallet service was called correctly
      expect(mockWalletService.getWallet).toHaveBeenCalledWith(`STORE_${tenantId}`);

      // Verify order aggregations
      expect(mockStoreOrderRepo.aggregate).toHaveBeenCalledTimes(2);

      // Verify product count
      expect(mockProductRepo.count).toHaveBeenCalledWith({
        status: StatusEnum.NORMAL,
      });

      // Verify member count
      expect(mockMemberRepo.count).toHaveBeenCalledWith({ tenantId });

      // Verify commission aggregations
      expect(mockCommissionRepo.aggregate).toHaveBeenCalledTimes(2);
    });

    it('should return zero wallet balance when wallet not found', async () => {
      // Mock wallet not found
      mockWalletService.getWallet.mockResolvedValue(null);

      // Mock other data
      mockStoreOrderRepo.aggregate
        .mockResolvedValueOnce({
          _sum: { payAmount: new Decimal(0) },
          _count: 0,
        })
        .mockResolvedValueOnce({
          _sum: { payAmount: new Decimal(0) },
        });

      mockProductRepo.count.mockResolvedValue(0);
      mockMemberRepo.count.mockResolvedValue(0);

      mockCommissionRepo.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(0) } })
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(0) } });

      const result = await service.getDashboardStats(tenantId);

      expect(result.walletBalance).toBe(0);
    });

    it('should handle null aggregation results gracefully', async () => {
      mockWalletService.getWallet.mockResolvedValue({
        balance: new Decimal(0),
      });

      // Mock null results
      mockStoreOrderRepo.aggregate
        .mockResolvedValueOnce({
          _sum: { payAmount: null },
          _count: 0,
        })
        .mockResolvedValueOnce({
          _sum: { payAmount: null },
        });

      mockProductRepo.count.mockResolvedValue(0);
      mockMemberRepo.count.mockResolvedValue(0);

      mockCommissionRepo.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } });

      const result = await service.getDashboardStats(tenantId);

      expect(result).toEqual({
        walletBalance: 0,
        todayGMV: 0,
        todayOrderCount: 0,
        monthGMV: 0,
        productCount: 0,
        memberCount: 0,
        settledCommission: 0,
        pendingCommission: 0,
      });
    });

    it('should throw error when data fetching fails', async () => {
      mockWalletService.getWallet.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.getDashboardStats(tenantId)).rejects.toThrow('Database connection failed');
    });
  });

  describe('getRouters', () => {
    it('should return routers for a user', async () => {
      const userId = 1;
      const mockMenus = [
        { menuId: 1, menuName: 'Home', path: '/home' },
        { menuId: 2, menuName: 'Users', path: '/users' },
      ];

      mockMenuService.getMenuListByUserId.mockResolvedValue(mockMenus);

      const result = await service.getRouters(userId);

      expect(result).toEqual({
        code: 200,
        data: mockMenus,
        msg: '操作成功',
      });

      expect(mockMenuService.getMenuListByUserId).toHaveBeenCalledWith(userId);
    });
  });
});
