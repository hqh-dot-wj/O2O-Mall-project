import { Test, TestingModule } from '@nestjs/testing';
import { CouponType, UserCouponStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exceptions';
import { UserCouponRepository } from '../distribution/user-coupon.repository';
import { CouponUsageRepository } from './usage.repository';
import { CouponUsageService } from './usage.service';

describe('CouponUsageService', () => {
  let service: CouponUsageService;

  const mockUserCouponRepo = {
    findAvailableCoupons: jest.fn(),
    findById: jest.fn(),
    lockCoupon: jest.fn(),
    useCoupon: jest.fn(),
    unlockCoupon: jest.fn(),
    refundCoupon: jest.fn(),
  };

  const mockUsageRepo = {
    create: jest.fn(),
  };

  const mockPrisma = {
    omsOrder: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponUsageService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UserCouponRepository, useValue: mockUserCouponRepo },
        { provide: CouponUsageRepository, useValue: mockUsageRepo },
      ],
    }).compile();

    service = module.get<CouponUsageService>(CouponUsageService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAvailableCoupons', () => {
    it('无订单上下文时应返回全部可用券', async () => {
      const coupons = [
        {
          id: 'uc1',
          memberId: 'm1',
          status: UserCouponStatus.UNUSED,
          minOrderAmount: 100,
        },
      ];
      mockUserCouponRepo.findAvailableCoupons.mockResolvedValue(coupons);

      const result = await service.findAvailableCoupons('m1');

      expect(result.data).toHaveLength(1);
    });

    it('有订单上下文时应过滤适用券', async () => {
      const coupons = [
        {
          id: 'uc1',
          memberId: 'm1',
          status: UserCouponStatus.UNUSED,
          minOrderAmount: 50,
          applicableProducts: [],
          applicableCategories: [],
        },
      ];
      mockUserCouponRepo.findAvailableCoupons.mockResolvedValue(coupons);

      const result = await service.findAvailableCoupons('m1', {
        memberId: 'm1',
        orderAmount: 100,
        productIds: [],
        categoryIds: [],
      });

      expect(result.data).toBeDefined();
    });
  });

  describe('validateCoupon', () => {
    it('优惠券不存在应抛异常', async () => {
      mockUserCouponRepo.findById.mockResolvedValue(null);

      await expect(
        service.validateCoupon('uc1', {
          memberId: 'm1',
          orderAmount: 100,
          productIds: [],
          categoryIds: [],
        }),
      ).rejects.toThrow(BusinessException);
    });

    it('非当前用户券应抛异常', async () => {
      mockUserCouponRepo.findById.mockResolvedValue({
        id: 'uc1',
        memberId: 'm2',
        status: UserCouponStatus.UNUSED,
        startTime: new Date(0),
        endTime: new Date(Date.now() + 86400000),
        minOrderAmount: 50,
        applicableProducts: [],
        applicableCategories: [],
      });

      await expect(
        service.validateCoupon('uc1', {
          memberId: 'm1',
          orderAmount: 100,
          productIds: [],
          categoryIds: [],
        }),
      ).rejects.toThrow(BusinessException);
    });

    it('订单金额未达最低消费应抛异常', async () => {
      mockUserCouponRepo.findById.mockResolvedValue({
        id: 'uc1',
        memberId: 'm1',
        status: UserCouponStatus.UNUSED,
        startTime: new Date(0),
        endTime: new Date(Date.now() + 86400000),
        minOrderAmount: 200,
        applicableProducts: [],
        applicableCategories: [],
      });

      await expect(
        service.validateCoupon('uc1', {
          memberId: 'm1',
          orderAmount: 100,
          productIds: [],
          categoryIds: [],
        }),
      ).rejects.toThrow(BusinessException);
    });

    it('验证通过应返回 valid', async () => {
      mockUserCouponRepo.findById.mockResolvedValue({
        id: 'uc1',
        memberId: 'm1',
        status: UserCouponStatus.UNUSED,
        startTime: new Date(0),
        endTime: new Date(Date.now() + 86400000),
        minOrderAmount: 50,
        applicableProducts: [],
        applicableCategories: [],
      });

      const result = await service.validateCoupon('uc1', {
        memberId: 'm1',
        orderAmount: 100,
        productIds: [],
        categoryIds: [],
      });

      expect(result.data.valid).toBe(true);
    });
  });

  describe('calculateDiscount', () => {
    it('优惠券不存在应抛异常', async () => {
      mockUserCouponRepo.findById.mockResolvedValue(null);

      await expect(service.calculateDiscount('uc1', 100)).rejects.toThrow(
        BusinessException,
      );
    });

    it('满减券应返回固定金额', async () => {
      mockUserCouponRepo.findById.mockResolvedValue({
        id: 'uc1',
        couponType: CouponType.DISCOUNT,
        discountAmount: 20,
        discountPercent: null,
        maxDiscountAmount: null,
        minOrderAmount: 100,
      });

      const discount = await service.calculateDiscount('uc1', 150);
      expect(discount).toBe(20);
    });

    it('折扣券应按比例计算且不超过最高优惠', async () => {
      mockUserCouponRepo.findById.mockResolvedValue({
        id: 'uc1',
        couponType: CouponType.PERCENTAGE,
        discountAmount: null,
        discountPercent: 10,
        maxDiscountAmount: 15,
        minOrderAmount: 100,
      });

      const discount = await service.calculateDiscount('uc1', 200);
      expect(discount).toBe(15); // 200*0.1=20, cap 15
    });

    it('优惠不超过订单金额', async () => {
      mockUserCouponRepo.findById.mockResolvedValue({
        id: 'uc1',
        couponType: CouponType.DISCOUNT,
        discountAmount: 500,
        minOrderAmount: 100,
      });

      const discount = await service.calculateDiscount('uc1', 80);
      expect(discount).toBe(80);
    });
  });

  describe('lockCoupon', () => {
    it('更新数为 0 应抛异常', async () => {
      mockUserCouponRepo.lockCoupon.mockResolvedValue({ count: 0 });

      await expect(
        service.lockCoupon('uc1', 'order1'),
      ).rejects.toThrow(BusinessException);
    });

    it('应成功锁定', async () => {
      mockUserCouponRepo.lockCoupon.mockResolvedValue({ count: 1 });

      await service.lockCoupon('uc1', 'order1');

      expect(mockUserCouponRepo.lockCoupon).toHaveBeenCalledWith('uc1', 'order1');
    });
  });

  describe('useCoupon', () => {
    it('优惠券不存在应抛异常', async () => {
      mockUserCouponRepo.findById.mockResolvedValue(null);

      await expect(
        service.useCoupon('uc1', 'order1', 20),
      ).rejects.toThrow(BusinessException);
    });

    it('应更新状态并创建使用记录', async () => {
      mockUserCouponRepo.findById.mockResolvedValue({
        id: 'uc1',
        tenantId: '00000',
        memberId: 'm1',
      });
      mockUserCouponRepo.useCoupon.mockResolvedValue(undefined);
      mockPrisma.omsOrder.findUnique.mockResolvedValue({
        totalAmount: new Decimal(100),
      });
      mockUsageRepo.create.mockResolvedValue({});

      await service.useCoupon('uc1', 'order1', 20);

      expect(mockUserCouponRepo.useCoupon).toHaveBeenCalledWith('uc1');
      expect(mockUsageRepo.create).toHaveBeenCalled();
    });
  });

  describe('unlockCoupon', () => {
    it('应调用仓储解锁', async () => {
      mockUserCouponRepo.unlockCoupon.mockResolvedValue(undefined);

      await service.unlockCoupon('uc1');

      expect(mockUserCouponRepo.unlockCoupon).toHaveBeenCalledWith('uc1');
    });
  });

  describe('refundCoupon', () => {
    it('优惠券不存在应抛异常', async () => {
      mockUserCouponRepo.findById.mockResolvedValue(null);

      await expect(service.refundCoupon('uc1')).rejects.toThrow(BusinessException);
    });

    it('已过期则不执行返还', async () => {
      mockUserCouponRepo.findById.mockResolvedValue({
        id: 'uc1',
        endTime: new Date(Date.now() - 86400000),
      });

      await service.refundCoupon('uc1');

      expect(mockUserCouponRepo.refundCoupon).not.toHaveBeenCalled();
    });

    it('未过期应调用返还', async () => {
      mockUserCouponRepo.findById.mockResolvedValue({
        id: 'uc1',
        endTime: new Date(Date.now() + 86400000),
      });
      mockUserCouponRepo.refundCoupon.mockResolvedValue(undefined);

      await service.refundCoupon('uc1');

      expect(mockUserCouponRepo.refundCoupon).toHaveBeenCalledWith('uc1');
    });
  });
});
