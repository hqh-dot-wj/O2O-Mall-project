// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { WalletAdminService } from './wallet-admin.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { FinanceEventEmitter } from '../events/finance-event.emitter';
import { Decimal } from '@prisma/client/runtime/library';
import { BusinessException } from 'src/common/exceptions';
import { TenantContext } from 'src/common/tenant/tenant.context';

// Mock WalletStatus enum since it may not be generated yet
const WalletStatus = {
  NORMAL: 'NORMAL',
  FROZEN: 'FROZEN',
  DISABLED: 'DISABLED',
};

describe('WalletAdminService', () => {
  let service: WalletAdminService;

  const mockPrismaService = {
    finWallet: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant1');
    jest.spyOn(TenantContext, 'isSuperTenant').mockReturnValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletAdminService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: FinanceEventEmitter, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<WalletAdminService>(WalletAdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // ========== W-T7: 钱包统计功能 ==========
  describe('getWalletStats - W-T7', () => {
    it('Given 有钱包数据, When getWalletStats, Then 返回统计数据', async () => {
      // R-FLOW-WALLET-STATS-01
      mockPrismaService.finWallet.aggregate.mockResolvedValue({
        _count: 100,
        _sum: {
          balance: new Decimal(10000),
          frozen: new Decimal(500),
          totalIncome: new Decimal(15000),
          pendingRecovery: new Decimal(200),
        },
      });

      mockPrismaService.finWallet.groupBy.mockResolvedValue([
        { status: WalletStatus.NORMAL, _count: 95 },
        { status: WalletStatus.FROZEN, _count: 5 },
      ]);

      mockPrismaService.finWallet.count.mockResolvedValue(3);

      const result = await service.getWalletStats();

      expect(result.data.totalWallets).toBe(100);
      expect(result.data.totalBalance).toBe(10000);
      expect(result.data.normalWallets).toBe(95);
      expect(result.data.frozenWallets).toBe(5);
      expect(result.data.pendingRecoveryWallets).toBe(3);
    });
  });

  // ========== W-T8: 异常钱包监控 ==========
  describe('getAbnormalWallets - W-T8', () => {
    it('Given 有异常钱包, When getAbnormalWallets, Then 返回异常钱包列表', async () => {
      // R-FLOW-WALLET-MONITOR-01
      const mockWallets = [
        {
          id: 'wallet1',
          memberId: 'member1',
          balance: new Decimal(100),
          frozen: new Decimal(0),
          totalIncome: new Decimal(100),
          pendingRecovery: new Decimal(50),
          status: WalletStatus.NORMAL,
          frozenReason: null,
          frozenAt: null,
          frozenBy: null,
          updatedAt: new Date(),
          member: { memberId: 'member1', nickname: '用户1', mobile: '13800138001', avatar: '' },
        },
      ];

      mockPrismaService.finWallet.findMany.mockResolvedValue(mockWallets);
      mockPrismaService.finWallet.count.mockResolvedValue(1);

      const result = await service.getAbnormalWallets(1, 20);

      expect(result.data.rows.length).toBe(1);
      expect(result.data.rows[0].abnormalReasons).toContain('待回收余额 50 元');
    });

    it('Given 钱包被冻结, When getAbnormalWallets, Then 异常原因包含冻结', async () => {
      const mockWallets = [
        {
          id: 'wallet2',
          memberId: 'member2',
          balance: new Decimal(0),
          frozen: new Decimal(0),
          totalIncome: new Decimal(0),
          pendingRecovery: new Decimal(0),
          status: WalletStatus.FROZEN,
          frozenReason: '异常操作',
          frozenAt: new Date(),
          frozenBy: 'admin',
          updatedAt: new Date(),
          member: { memberId: 'member2', nickname: '用户2', mobile: '13800138002', avatar: '' },
        },
      ];

      mockPrismaService.finWallet.findMany.mockResolvedValue(mockWallets);
      mockPrismaService.finWallet.count.mockResolvedValue(1);

      const result = await service.getAbnormalWallets(1, 20);

      expect(result.data.rows[0].abnormalReasons).toContain('钱包已冻结');
    });
  });

  // ========== W-T9: 钱包冻结功能 ==========
  describe('freezeWallet - W-T9', () => {
    it('Given 正常钱包, When freezeWallet, Then 成功冻结', async () => {
      // R-FLOW-WALLET-FREEZE-01
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
        tenantId: 'tenant1',
        status: WalletStatus.NORMAL,
      };

      mockPrismaService.finWallet.findUnique.mockResolvedValue(mockWallet);
      mockPrismaService.finWallet.update.mockResolvedValue({
        ...mockWallet,
        status: WalletStatus.FROZEN,
        frozenReason: '异常操作',
        frozenAt: new Date(),
        frozenBy: 'admin',
      });

      const result = await service.freezeWallet('wallet1', '异常操作', 'admin');

      expect(result.data.status).toBe(WalletStatus.FROZEN);
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });

    it('Given 钱包不存在, When freezeWallet, Then 抛出异常', async () => {
      mockPrismaService.finWallet.findUnique.mockResolvedValue(null);

      await expect(service.freezeWallet('wallet1', '异常操作', 'admin')).rejects.toThrow(
        BusinessException,
      );
    });

    it('Given 钱包已冻结, When freezeWallet, Then 抛出异常', async () => {
      mockPrismaService.finWallet.findUnique.mockResolvedValue({
        id: 'wallet1',
        status: WalletStatus.FROZEN,
      });

      await expect(service.freezeWallet('wallet1', '异常操作', 'admin')).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe('unfreezeWallet - W-T9', () => {
    it('Given 冻结钱包, When unfreezeWallet, Then 成功解冻', async () => {
      // R-FLOW-WALLET-UNFREEZE-01
      const mockWallet = {
        id: 'wallet1',
        memberId: 'member1',
        status: WalletStatus.FROZEN,
      };

      mockPrismaService.finWallet.findUnique.mockResolvedValue(mockWallet);
      mockPrismaService.finWallet.update.mockResolvedValue({
        ...mockWallet,
        status: WalletStatus.NORMAL,
        frozenReason: null,
        frozenAt: null,
        frozenBy: null,
      });

      const result = await service.unfreezeWallet('wallet1', 'admin');

      expect(result.data.status).toBe(WalletStatus.NORMAL);
    });

    it('Given 钱包未冻结, When unfreezeWallet, Then 抛出异常', async () => {
      mockPrismaService.finWallet.findUnique.mockResolvedValue({
        id: 'wallet1',
        status: WalletStatus.NORMAL,
      });

      await expect(service.unfreezeWallet('wallet1', 'admin')).rejects.toThrow(BusinessException);
    });
  });

  // ========== W-T10: 批量查询优化 ==========
  describe('getWalletsByMemberIds - W-T10', () => {
    it('Given 有效的会员ID列表, When getWalletsByMemberIds, Then 返回钱包Map', async () => {
      // R-FLOW-WALLET-BATCH-01
      const mockWallets = [
        { memberId: 'member1', balance: new Decimal(100), member: { memberId: 'member1', nickname: '用户1', mobile: '138' } },
        { memberId: 'member2', balance: new Decimal(200), member: { memberId: 'member2', nickname: '用户2', mobile: '139' } },
      ];

      mockPrismaService.finWallet.findMany.mockResolvedValue(mockWallets);

      const result = await service.getWalletsByMemberIds(['member1', 'member2']);

      expect(result.data.wallets.length).toBe(2);
      expect(result.data.walletMap['member1']).toBeDefined();
      expect(result.data.walletMap['member2']).toBeDefined();
    });

    it('Given 超过100个会员ID, When getWalletsByMemberIds, Then 抛出异常', async () => {
      const memberIds = Array.from({ length: 101 }, (_, i) => `member${i}`);

      await expect(service.getWalletsByMemberIds(memberIds)).rejects.toThrow(BusinessException);
    });
  });

  describe('getWalletList', () => {
    it('Given 查询条件, When getWalletList, Then 返回分页列表', async () => {
      const mockWallets = [
        {
          id: 'wallet1',
          memberId: 'member1',
          balance: new Decimal(100),
          frozen: new Decimal(0),
          totalIncome: new Decimal(100),
          pendingRecovery: new Decimal(0),
          status: WalletStatus.NORMAL,
          frozenReason: null,
          updatedAt: new Date(),
          member: { memberId: 'member1', nickname: '用户1', mobile: '138', avatar: '' },
        },
      ];

      mockPrismaService.finWallet.findMany.mockResolvedValue(mockWallets);
      mockPrismaService.finWallet.count.mockResolvedValue(1);

      const result = await service.getWalletList({ pageNum: 1, pageSize: 20 });

      expect(result.data.rows.length).toBe(1);
      expect(result.data.total).toBe(1);
    });
  });
});
