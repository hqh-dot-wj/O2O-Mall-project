import { Test, TestingModule } from '@nestjs/testing';
import { PointsTransactionType } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { PrismaService } from 'src/prisma/prisma.service';
import { PointsStatisticsService } from './statistics.service';

describe('PointsStatisticsService', () => {
  let service: PointsStatisticsService;

  const mockPrisma = {
    mktPointsTransaction: {
      groupBy: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    mktPointsAccount: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  const mockCls = { get: jest.fn() };

  beforeEach(async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('00000');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsStatisticsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ClsService, useValue: mockCls },
      ],
    }).compile();

    service = module.get<PointsStatisticsService>(PointsStatisticsService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getEarnStatistics', () => {
    it('应返回按类型的发放统计', async () => {
      mockPrisma.mktPointsTransaction.groupBy.mockResolvedValue([
        { type: PointsTransactionType.EARN_ORDER, _sum: { amount: 100 }, _count: { id: 2 } },
      ]);
      mockPrisma.mktPointsTransaction.aggregate.mockResolvedValue({
        _sum: { amount: 100 },
        _count: { id: 2 },
      });

      const result = await service.getEarnStatistics({});

      expect(result.data).toBeDefined();
      expect(result.data.byType).toBeDefined();
      expect(result.data.total).toBeDefined();
    });
  });

  describe('getUseStatistics', () => {
    it('应返回使用统计', async () => {
      mockPrisma.mktPointsTransaction.groupBy.mockResolvedValue([]);
      mockPrisma.mktPointsTransaction.aggregate.mockResolvedValue({
        _sum: { amount: -50 },
        _count: { id: 1 },
      });

      const result = await service.getUseStatistics({});

      expect(result.data.byType).toBeDefined();
      expect(result.data.total.totalPoints).toBe(50);
    });
  });

  describe('getBalanceStatistics', () => {
    it('应返回余额汇总', async () => {
      mockPrisma.mktPointsAccount.aggregate.mockResolvedValue({
        _sum: {
          totalPoints: 1000,
          availablePoints: 800,
          frozenPoints: 100,
          usedPoints: 80,
          expiredPoints: 20,
        },
        _count: { id: 5 },
      });

      const result = await service.getBalanceStatistics();

      expect(result.data.totalAccounts).toBe(5);
      expect(result.data.totalPoints).toBe(1000);
      expect(result.data.availablePoints).toBe(800);
    });
  });

  describe('getExpireStatistics', () => {
    it('应返回过期统计', async () => {
      mockPrisma.mktPointsTransaction.aggregate.mockResolvedValue({
        _sum: { amount: -30 },
        _count: { id: 3 },
      });

      const result = await service.getExpireStatistics({});

      expect(result.data.totalExpiredPoints).toBe(30);
      expect(result.data.totalExpiredCount).toBe(3);
    });
  });

  describe('getRanking', () => {
    it('应返回积分排行榜', async () => {
      mockPrisma.mktPointsAccount.findMany.mockResolvedValue([
        { memberId: 'm1', totalPoints: 500, availablePoints: 400 },
        { memberId: 'm2', totalPoints: 300, availablePoints: 300 },
      ]);

      const result = await service.getRanking(10);

      expect(result.data.ranking).toHaveLength(2);
      expect(result.data.ranking[0].rank).toBe(1);
      expect(result.data.ranking[0].memberId).toBe('m1');
    });
  });

  describe('exportTransactions', () => {
    it('应返回导出格式的明细', async () => {
      mockPrisma.mktPointsTransaction.findMany.mockResolvedValue([
        {
          memberId: 'm1',
          type: PointsTransactionType.EARN_ORDER,
          amount: 10,
          balanceBefore: 0,
          balanceAfter: 10,
          status: 'COMPLETED',
          relatedId: 'o1',
          remark: '消费',
          createTime: new Date(),
        },
      ]);

      const result = await service.exportTransactions({});

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('用户ID', 'm1');
      expect(result.data[0]).toHaveProperty('积分数量', 10);
    });
  });
});
