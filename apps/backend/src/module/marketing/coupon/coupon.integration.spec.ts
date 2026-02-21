import { Test, TestingModule } from '@nestjs/testing';
import { CouponStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClsService } from 'nestjs-cls';
import { TenantContext } from 'src/common/tenant';
import { CouponTemplateService } from './template/template.service';
import { CouponTemplateRepository } from './template/template.repository';
import { CouponDistributionService } from './distribution/distribution.service';
import { UserCouponRepository } from './distribution/user-coupon.repository';
import { RedisLockService } from './distribution/redis-lock.service';
import { CouponUsageService } from './usage/usage.service';
import { CouponUsageRepository } from './usage/usage.repository';

/**
 * 优惠券模块集成测试
 * 验证：模板服务 + 发放服务 + 使用服务 协作流程（Mock 仓储）
 */
describe('Coupon Module Integration', () => {
  let templateService: CouponTemplateService;
  let distributionService: CouponDistributionService;
  let usageService: CouponUsageService;

  const mockTemplateRepo = {
    search: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    getStatsForTemplates: jest.fn(),
    countDistributed: jest.fn(),
    countUsed: jest.fn(),
    hasDistributed: jest.fn(),
  };

  const mockUserCouponRepo = {
    findAvailableCoupons: jest.fn(),
    findById: jest.fn(),
    countUserCoupons: jest.fn(),
    lockCoupon: jest.fn(),
    useCoupon: jest.fn(),
    unlockCoupon: jest.fn(),
    refundCoupon: jest.fn(),
  };

  const mockUsageRepo = { create: jest.fn() };
  const mockPrisma = {
    $transaction: jest.fn(),
    omsOrder: { findUnique: jest.fn() },
  };
  const mockRedisLock = {
    getCouponStockLockKey: jest.fn().mockReturnValue('lock:coupon:t1'),
    executeWithLock: jest.fn((_key, fn) => fn()),
  };
  const mockCls = { get: jest.fn().mockReturnValue('user1') };

  beforeEach(async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('00000');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponTemplateService,
        CouponDistributionService,
        CouponUsageService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ClsService, useValue: mockCls },
        { provide: CouponTemplateRepository, useValue: mockTemplateRepo },
        { provide: UserCouponRepository, useValue: mockUserCouponRepo },
        { provide: RedisLockService, useValue: mockRedisLock },
        { provide: CouponUsageRepository, useValue: mockUsageRepo },
      ],
    }).compile();

    templateService = module.get<CouponTemplateService>(CouponTemplateService);
    distributionService = module.get<CouponDistributionService>(CouponDistributionService);
    usageService = module.get<CouponUsageService>(CouponUsageService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(templateService).toBeDefined();
    expect(distributionService).toBeDefined();
    expect(usageService).toBeDefined();
  });

  it('流程：创建模板 -> 检查领取资格 -> 领取 -> 计算抵扣', async () => {
    const template = {
      id: 't1',
      name: '满100减20',
      type: 'DISCOUNT',
      status: CouponStatus.ACTIVE,
      remainingStock: 100,
      limitPerUser: 1,
      discountAmount: 20,
      minOrderAmount: 100,
      tenantId: '00000',
      validityType: 'RELATIVE',
      validDays: 30,
      startTime: null,
      endTime: null,
    };
    mockTemplateRepo.create.mockResolvedValue(template);
    mockTemplateRepo.findById.mockResolvedValue(template);
    mockTemplateRepo.hasDistributed.mockResolvedValue(false);
    mockUserCouponRepo.countUserCoupons.mockResolvedValue(0);

    const created = await templateService.create({
      name: '满100减20',
      type: 'DISCOUNT',
      discountAmount: 20,
      minOrderAmount: 100,
      totalStock: 100,
      limitPerUser: 1,
      validityType: 'RELATIVE',
      validDays: 30,
    } as any);
    expect(created.data).toBeDefined();

    const eligibility = await distributionService.checkEligibility('m1', 't1');
    expect(eligibility.data.eligible).toBe(true);

    const userCoupon = {
      id: 'uc1',
      memberId: 'm1',
      templateId: 't1',
      couponType: 'DISCOUNT',
      discountAmount: 20,
      minOrderAmount: 100,
      status: 'UNUSED',
      startTime: new Date(0),
      endTime: new Date(Date.now() + 86400000),
    };
    mockPrisma.$transaction.mockImplementation(async (cb) => {
      const tx = {
        mktCouponTemplate: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        mktUserCoupon: { create: jest.fn().mockResolvedValue(userCoupon) },
      };
      return cb(tx);
    });

    const claimResult = await distributionService.claimCoupon('m1', 't1');
    expect(claimResult.data.id).toBe('uc1');

    mockUserCouponRepo.findById.mockResolvedValue(userCoupon);
    const discount = await usageService.calculateDiscount('uc1', 150);
    expect(discount).toBe(20);
  });
});
