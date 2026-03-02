import { Test, TestingModule } from '@nestjs/testing';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { PrismaService } from 'src/prisma/prisma.service';
import { CouponUsageRepository } from '../usage/usage.repository';
import { UserCouponRepository } from '../distribution/user-coupon.repository';
import { CouponTemplateRepository } from '../template/template.repository';
import { MemberRepository } from 'src/module/admin/member/member.repository';
import { CouponStatisticsService } from './statistics.service';

describe('CouponStatisticsService', () => {
  let service: CouponStatisticsService;

  const mockPrisma = {
    mktCouponUsage: {
      aggregate: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockUsageRepo = {
    findPage: jest.fn(),
  };

  const mockUserCouponRepo = {
    count: jest.fn(),
  };

  const mockTemplateRepo = {
    findMany: jest.fn(),
  };

  const mockMemberRepo = {
    findMany: jest.fn(),
  };

  beforeEach(async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('t-1');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponStatisticsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CouponUsageRepository, useValue: mockUsageRepo },
        { provide: UserCouponRepository, useValue: mockUserCouponRepo },
        { provide: CouponTemplateRepository, useValue: mockTemplateRepo },
        { provide: MemberRepository, useValue: mockMemberRepo },
      ],
    }).compile();

    service = module.get<CouponStatisticsService>(CouponStatisticsService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // R-FLOW-COUPON-STAT-01
  it('Given 存在近7日趋势数据, When getStatisticsOverview, Then 使用单次聚合查询返回趋势', async () => {
    mockTemplateRepo.findMany.mockResolvedValue([{ id: 't1' }]);
    mockUserCouponRepo.count
      .mockResolvedValueOnce(100) // totalDistributed
      .mockResolvedValueOnce(30) // totalUsed
      .mockResolvedValueOnce(10); // totalExpired
    mockPrisma.mktCouponUsage.aggregate.mockResolvedValue({
      _sum: { discountAmount: 88.5 },
    });
    mockPrisma.$queryRaw.mockResolvedValue([
      { date: '2026-03-01', distributed: '2', used: '1' },
      { date: '2026-03-02', distributed: '3', used: '2' },
    ]);

    const result = await service.getStatisticsOverview();

    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(mockUserCouponRepo.count).toHaveBeenCalledTimes(3);
    expect(result.data.templateCount).toBe(1);
    expect(result.data.useRate).toBe(0.3);
    expect(result.data.trend).toEqual([
      { date: '2026-03-01', distributed: 2, used: 1 },
      { date: '2026-03-02', distributed: 3, used: 2 },
    ]);
  });

  // R-BRANCH-COUPON-STAT-01
  it('Given 总发放为0, When getStatisticsOverview, Then 核销率返回0且趋势为空数组', async () => {
    mockTemplateRepo.findMany.mockResolvedValue([]);
    mockUserCouponRepo.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockPrisma.mktCouponUsage.aggregate.mockResolvedValue({
      _sum: { discountAmount: null },
    });
    mockPrisma.$queryRaw.mockResolvedValue([]);

    const result = await service.getStatisticsOverview();

    expect(result.data.useRate).toBe(0);
    expect(result.data.totalDiscountAmount).toBe(0);
    expect(result.data.trend).toEqual([]);
  });

  // R-BRANCH-COUPON-STAT-02
  it('Given 导出记录数超过10000, When exportUsageRecords, Then 抛出导出上限异常', async () => {
    mockPrisma.mktCouponUsage.count.mockResolvedValue(10001);

    await expect(service.exportUsageRecords({}, {} as any)).rejects.toThrow(BusinessException);
    expect(mockPrisma.mktCouponUsage.findMany).not.toHaveBeenCalled();
  });
});
