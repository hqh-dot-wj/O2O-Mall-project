import { Test, TestingModule } from '@nestjs/testing';
import { CouponStatus, CouponDistributionType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exceptions';
import { CouponTemplateRepository } from '../template/template.repository';
import { UserCouponRepository } from './user-coupon.repository';
import { RedisLockService } from './redis-lock.service';
import { CouponDistributionService } from './distribution.service';

describe('CouponDistributionService', () => {
  let service: CouponDistributionService;

  const mockTemplateRepo = {
    findById: jest.fn(),
  };

  const mockUserCouponRepo = {
    countUserCoupons: jest.fn(),
  };

  const mockPrisma = {
    $transaction: jest.fn(),
    omsOrder: { findUnique: jest.fn() },
  };

  const mockRedisLock = {
    getCouponStockLockKey: jest.fn().mockReturnValue('lock:coupon:t1'),
    executeWithLock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponDistributionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisLockService, useValue: mockRedisLock },
        { provide: CouponTemplateRepository, useValue: mockTemplateRepo },
        { provide: UserCouponRepository, useValue: mockUserCouponRepo },
      ],
    }).compile();

    service = module.get<CouponDistributionService>(CouponDistributionService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkEligibility', () => {
    it('模板不存在或已停用应返回不可领取', async () => {
      mockTemplateRepo.findById.mockResolvedValue(null);

      const result = await service.checkEligibility('m1', 't1');

      expect(result.data.eligible).toBe(false);
      expect(result.data.reason).toBeDefined();
    });

    it('库存为 0 应返回不可领取', async () => {
      mockTemplateRepo.findById.mockResolvedValue({
        id: 't1',
        status: CouponStatus.ACTIVE,
        remainingStock: 0,
        limitPerUser: 1,
      });

      const result = await service.checkEligibility('m1', 't1');

      expect(result.data.eligible).toBe(false);
    });

    it('已达领取上限应返回不可领取', async () => {
      mockTemplateRepo.findById.mockResolvedValue({
        id: 't1',
        status: CouponStatus.ACTIVE,
        remainingStock: 100,
        limitPerUser: 1,
      });
      mockUserCouponRepo.countUserCoupons.mockResolvedValue(1);

      const result = await service.checkEligibility('m1', 't1');

      expect(result.data.eligible).toBe(false);
    });

    it('符合条件应返回可领取', async () => {
      mockTemplateRepo.findById.mockResolvedValue({
        id: 't1',
        status: CouponStatus.ACTIVE,
        remainingStock: 100,
        limitPerUser: 2,
      });
      mockUserCouponRepo.countUserCoupons.mockResolvedValue(0);

      const result = await service.checkEligibility('m1', 't1');

      expect(result.data.eligible).toBe(true);
    });
  });

  describe('claimCoupon', () => {
    it('应通过分布式锁调用内部领取并返回结果', async () => {
      const userCoupon = {
        id: 'uc1',
        memberId: 'm1',
        templateId: 't1',
        status: 'UNUSED',
        createTime: new Date(),
      };
      mockRedisLock.executeWithLock.mockImplementation(async (_key, fn) => fn());

      const moduleRef = await Test.createTestingModule({
        providers: [
          CouponDistributionService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: RedisLockService, useValue: mockRedisLock },
          { provide: CouponTemplateRepository, useValue: mockTemplateRepo },
          { provide: UserCouponRepository, useValue: mockUserCouponRepo },
        ],
      }).compile();

      const svc = moduleRef.get<CouponDistributionService>(CouponDistributionService);
      const template = {
        id: 't1',
        tenantId: '00000',
        name: '满100减20',
        type: 'DISCOUNT',
        status: CouponStatus.ACTIVE,
        remainingStock: 10,
        limitPerUser: 1,
        discountAmount: 20,
        discountPercent: null,
        maxDiscountAmount: null,
        minOrderAmount: 100,
        validityType: 'RELATIVE',
        validDays: 30,
        startTime: null,
        endTime: null,
      };
      mockTemplateRepo.findById.mockResolvedValue(template);
      mockUserCouponRepo.countUserCoupons.mockResolvedValue(0);
      mockPrisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          mktCouponTemplate: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          mktUserCoupon: {
            create: jest.fn().mockResolvedValue(userCoupon),
          },
        };
        return cb(tx);
      });

      const result = await svc.claimCoupon('m1', 't1');

      expect(result.data).toBeDefined();
      expect(result.msg).toContain('领取成功');
    });
  });

  describe('distributeManually', () => {
    it('模板不存在应抛异常', async () => {
      mockTemplateRepo.findById.mockResolvedValue(null);

      await expect(
        service.distributeManually({
          templateId: 't1',
          memberIds: ['m1'],
        }),
      ).rejects.toThrow(BusinessException);
    });

    it('模板已停用应抛异常', async () => {
      mockTemplateRepo.findById.mockResolvedValue({
        id: 't1',
        status: CouponStatus.INACTIVE,
      });

      await expect(
        service.distributeManually({
          templateId: 't1',
          memberIds: ['m1'],
        }),
      ).rejects.toThrow(BusinessException);
    });
  });
});
