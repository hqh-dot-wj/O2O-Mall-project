import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: {
            umsMember: {
              count: jest.fn(),
            },
            omsOrder: {
              aggregate: jest.fn(),
            },
            finCommission: {
              groupBy: jest.fn(),
              aggregate: jest.fn(),
            },
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboard', () => {
    it('应该返回完整的数据看板', async () => {
      // Mock 分销员统计
      jest.spyOn(prisma.umsMember, 'count')
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(10); // newCount

      jest.spyOn(prisma.finCommission, 'groupBy').mockResolvedValueOnce([
        { beneficiaryId: 'user1' },
        { beneficiaryId: 'user2' },
      ] as any);

      // Mock 订单统计
      jest.spyOn(prisma.omsOrder, 'aggregate')
        .mockResolvedValueOnce({
          _count: 50,
          _sum: { payAmount: new Decimal(10000) },
        } as any)
        .mockResolvedValueOnce({
          _count: 200,
        } as any);

      // Mock 佣金统计
      jest.spyOn(prisma.finCommission, 'aggregate')
        .mockResolvedValueOnce({
          _sum: { amount: new Decimal(1000) },
        } as any)
        .mockResolvedValueOnce({
          _sum: { amount: new Decimal(600) },
        } as any)
        .mockResolvedValueOnce({
          _sum: { amount: new Decimal(400) },
        } as any);

      // Mock 佣金趋势
      jest.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([
        { date: new Date('2026-02-25'), amount: new Decimal(500) },
        { date: new Date('2026-02-26'), amount: new Decimal(500) },
      ]);

      const result = await service.getDashboard('tenant1', {});

      expect(result.data).toBeDefined();
      expect(result.data.distributorStats.total).toBe(100);
      expect(result.data.distributorStats.newCount).toBe(10);
      expect(result.data.distributorStats.activeCount).toBe(2);
      expect(result.data.orderStats.totalCount).toBe(50);
      expect(result.data.orderStats.totalAmount).toBe(10000);
      expect(result.data.orderStats.percentage).toBe(25); // 50/200 * 100
      expect(result.data.commissionStats.totalAmount).toBe(1000);
      expect(result.data.commissionStats.pendingAmount).toBe(600);
      expect(result.data.commissionStats.settledAmount).toBe(400);
      expect(result.data.commissionStats.trend).toHaveLength(2);
    });

    it('应该处理无数据的情况', async () => {
      jest.spyOn(prisma.umsMember, 'count').mockResolvedValue(0);
      jest.spyOn(prisma.finCommission, 'groupBy').mockResolvedValue([]);
      jest.spyOn(prisma.omsOrder, 'aggregate').mockResolvedValue({
        _count: 0,
        _sum: { payAmount: null },
      } as any);
      jest.spyOn(prisma.finCommission, 'aggregate').mockResolvedValue({
        _sum: { amount: null },
      } as any);
      jest.spyOn(prisma, '$queryRaw').mockResolvedValue([]);

      const result = await service.getDashboard('tenant1', {});

      expect(result.data.distributorStats.total).toBe(0);
      expect(result.data.distributorStats.newCount).toBe(0);
      expect(result.data.distributorStats.activeCount).toBe(0);
      expect(result.data.orderStats.totalCount).toBe(0);
      expect(result.data.orderStats.totalAmount).toBe(0);
      expect(result.data.orderStats.percentage).toBe(0);
      expect(result.data.commissionStats.totalAmount).toBe(0);
      expect(result.data.commissionStats.pendingAmount).toBe(0);
      expect(result.data.commissionStats.settledAmount).toBe(0);
      expect(result.data.commissionStats.trend).toHaveLength(0);
    });

    it('应该使用指定的时间范围', async () => {
      jest.spyOn(prisma.umsMember, 'count').mockResolvedValue(0);
      jest.spyOn(prisma.finCommission, 'groupBy').mockResolvedValue([]);
      jest.spyOn(prisma.omsOrder, 'aggregate').mockResolvedValue({
        _count: 0,
        _sum: { payAmount: null },
      } as any);
      jest.spyOn(prisma.finCommission, 'aggregate').mockResolvedValue({
        _sum: { amount: null },
      } as any);
      jest.spyOn(prisma, '$queryRaw').mockResolvedValue([]);

      await service.getDashboard('tenant1', {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      // 验证调用参数包含正确的日期范围
      expect(prisma.umsMember.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            updateTime: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('应该使用默认时间范围（最近30天）', async () => {
      jest.spyOn(prisma.umsMember, 'count').mockResolvedValue(0);
      jest.spyOn(prisma.finCommission, 'groupBy').mockResolvedValue([]);
      jest.spyOn(prisma.omsOrder, 'aggregate').mockResolvedValue({
        _count: 0,
        _sum: { payAmount: null },
      } as any);
      jest.spyOn(prisma.finCommission, 'aggregate').mockResolvedValue({
        _sum: { amount: null },
      } as any);
      jest.spyOn(prisma, '$queryRaw').mockResolvedValue([]);

      await service.getDashboard('tenant1', {});

      // 验证使用了默认时间范围
      expect(prisma.umsMember.count).toHaveBeenCalled();
    });

    it('应该正确计算分销订单占比', async () => {
      jest.spyOn(prisma.umsMember, 'count').mockResolvedValue(0);
      jest.spyOn(prisma.finCommission, 'groupBy').mockResolvedValue([]);
      jest.spyOn(prisma.omsOrder, 'aggregate')
        .mockResolvedValueOnce({
          _count: 30,
          _sum: { payAmount: new Decimal(5000) },
        } as any)
        .mockResolvedValueOnce({
          _count: 100,
        } as any);
      jest.spyOn(prisma.finCommission, 'aggregate').mockResolvedValue({
        _sum: { amount: null },
      } as any);
      jest.spyOn(prisma, '$queryRaw').mockResolvedValue([]);

      const result = await service.getDashboard('tenant1', {});

      expect(result.data.orderStats.percentage).toBe(30); // 30/100 * 100
    });

    it('应该处理佣金趋势数据', async () => {
      jest.spyOn(prisma.umsMember, 'count').mockResolvedValue(0);
      jest.spyOn(prisma.finCommission, 'groupBy').mockResolvedValue([]);
      jest.spyOn(prisma.omsOrder, 'aggregate').mockResolvedValue({
        _count: 0,
        _sum: { payAmount: null },
      } as any);
      jest.spyOn(prisma.finCommission, 'aggregate').mockResolvedValue({
        _sum: { amount: null },
      } as any);
      jest.spyOn(prisma, '$queryRaw').mockResolvedValue([
        { date: new Date('2026-02-24'), amount: new Decimal(300) },
        { date: new Date('2026-02-25'), amount: new Decimal(400) },
        { date: new Date('2026-02-26'), amount: new Decimal(500) },
      ]);

      const result = await service.getDashboard('tenant1', {});

      expect(result.data.commissionStats.trend).toHaveLength(3);
      expect(result.data.commissionStats.trend[0].date).toBe('2026-02-24');
      expect(result.data.commissionStats.trend[0].amount).toBe(300);
      expect(result.data.commissionStats.trend[2].date).toBe('2026-02-26');
      expect(result.data.commissionStats.trend[2].amount).toBe(500);
    });
  });
});
