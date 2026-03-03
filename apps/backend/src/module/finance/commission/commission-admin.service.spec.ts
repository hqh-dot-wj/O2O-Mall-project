// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { CommissionAdminService } from './commission-admin.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommissionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { TenantContext } from 'src/common/tenant/tenant.context';

describe('CommissionAdminService', () => {
  let service: CommissionAdminService;

  const mockPrismaService = {
    finCommission: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant1');
    jest.spyOn(TenantContext, 'isSuperTenant').mockReturnValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionAdminService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CommissionAdminService>(CommissionAdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // ========== C-T9: 佣金查询接口 ==========
  describe('getCommissionList - C-T9', () => {
    it('Given 有佣金数据, When getCommissionList, Then 返回分页列表', async () => {
      // R-FLOW-COMMISSION-LIST-01
      const mockCommissions = [
        {
          id: BigInt(1),
          orderId: 'order1',
          beneficiaryId: 'member1',
          level: 1,
          amount: new Decimal(10),
          rateSnapshot: new Decimal(0.1),
          commissionBase: new Decimal(100),
          commissionBaseType: 'ACTUAL_PAID',
          isCapped: false,
          isCrossTenant: false,
          status: CommissionStatus.FROZEN,
          planSettleTime: new Date(),
          settleTime: null,
          createTime: new Date(),
          beneficiary: { memberId: 'member1', nickname: '用户1', mobile: '138', avatar: '' },
          order: { id: 'order1', orderSn: 'SN001', payAmount: new Decimal(100), status: 'COMPLETED' },
        },
      ];

      mockPrismaService.finCommission.findMany.mockResolvedValue(mockCommissions);
      mockPrismaService.finCommission.count.mockResolvedValue(1);

      const result = await service.getCommissionList({ pageNum: 1, pageSize: 20 });

      expect(result.data.rows.length).toBe(1);
      expect(result.data.rows[0].levelName).toBe('一级佣金');
      expect(result.data.rows[0].statusName).toBe('待结算');
    });

    it('Given 按状态筛选, When getCommissionList, Then 返回筛选后的列表', async () => {
      mockPrismaService.finCommission.findMany.mockResolvedValue([]);
      mockPrismaService.finCommission.count.mockResolvedValue(0);

      const result = await service.getCommissionList({
        pageNum: 1,
        pageSize: 20,
        status: CommissionStatus.SETTLED,
      });

      expect(result.data.rows.length).toBe(0);
      expect(mockPrismaService.finCommission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: CommissionStatus.SETTLED }),
        }),
      );
    });
  });

  describe('getCommissionDetail - C-T9', () => {
    it('Given 佣金存在, When getCommissionDetail, Then 返回详情', async () => {
      const mockCommission = {
        id: BigInt(1),
        orderId: 'order1',
        beneficiaryId: 'member1',
        level: 1,
        amount: new Decimal(10),
        rateSnapshot: new Decimal(0.1),
        commissionBase: new Decimal(100),
        commissionBaseType: 'ACTUAL_PAID',
        orderOriginalPrice: new Decimal(120),
        orderActualPaid: new Decimal(100),
        couponDiscount: new Decimal(20),
        pointsDiscount: new Decimal(0),
        isCapped: false,
        isCrossTenant: false,
        status: CommissionStatus.FROZEN,
        planSettleTime: new Date(),
        settleTime: null,
        createTime: new Date(),
        beneficiary: { memberId: 'member1', nickname: '用户1', mobile: '138', avatar: '' },
        order: { id: 'order1', orderSn: 'SN001', payAmount: new Decimal(100), status: 'COMPLETED', createTime: new Date() },
      };

      mockPrismaService.finCommission.findUnique.mockResolvedValue(mockCommission);

      const result = await service.getCommissionDetail('1');

      expect(result.data.id).toBe('1');
      expect(result.data.couponDiscount).toBe(20);
    });

    it('Given 佣金不存在, When getCommissionDetail, Then 返回404', async () => {
      mockPrismaService.finCommission.findUnique.mockResolvedValue(null);

      const result = await service.getCommissionDetail('999');

      expect(result.code).toBe(404);
    });
  });

  // ========== C-T10: 佣金统计功能 ==========
  describe('getCommissionStats - C-T10', () => {
    it('Given 有佣金数据, When getCommissionStats, Then 返回统计数据', async () => {
      // R-FLOW-COMMISSION-STATS-01
      mockPrismaService.finCommission.aggregate
        .mockResolvedValueOnce({ _count: 100, _sum: { amount: new Decimal(5000) } }) // total
        .mockResolvedValueOnce({ _count: 10, _sum: { amount: new Decimal(500) } }) // today
        .mockResolvedValueOnce({ _count: 50, _sum: { amount: new Decimal(2500) } }) // month
        .mockResolvedValueOnce({ _count: 100, _sum: { amount: new Decimal(5000) } }); // year

      mockPrismaService.finCommission.groupBy
        .mockResolvedValueOnce([
          { status: CommissionStatus.FROZEN, _count: 30, _sum: { amount: new Decimal(1500) } },
          { status: CommissionStatus.SETTLED, _count: 70, _sum: { amount: new Decimal(3500) } },
        ]) // status
        .mockResolvedValueOnce([
          { level: 1, _count: 60, _sum: { amount: new Decimal(3000) } },
          { level: 2, _count: 40, _sum: { amount: new Decimal(2000) } },
        ]); // level

      const result = await service.getCommissionStats();

      expect(result.data.totalCount).toBe(100);
      expect(result.data.totalAmount).toBe(5000);
      expect(result.data.frozenCount).toBe(30);
      expect(result.data.settledCount).toBe(70);
      expect(result.data.level1Count).toBe(60);
      expect(result.data.level2Count).toBe(40);
    });
  });

  describe('getCommissionTrend - C-T10', () => {
    it('Given 有历史数据, When getCommissionTrend, Then 返回趋势数据', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([
        { date: new Date('2026-03-01'), count: BigInt(10), amount: 500 },
        { date: new Date('2026-03-02'), count: BigInt(15), amount: 750 },
      ]);

      const result = await service.getCommissionTrend(30);

      expect(result.data.length).toBe(2);
      expect(result.data[0].count).toBe(10);
      expect(result.data[1].amount).toBe(750);
    });
  });
});
