import { Test, TestingModule } from '@nestjs/testing';
import { PointsTransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClsService } from 'nestjs-cls';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { CouponUsageService } from '../coupon/usage/usage.service';
import { PointsAccountService } from '../points/account/account.service';
import { PointsRuleService } from '../points/rule/rule.service';
import { PointsGracefulDegradationService } from '../points/degradation/degradation.service';
import { OrderIntegrationService } from './integration.service';

describe('OrderIntegrationService', () => {
  let service: OrderIntegrationService;

  const mockCouponUsageService = {
    calculateDiscount: jest.fn(),
    lockCoupon: jest.fn(),
    useCoupon: jest.fn(),
    unlockCoupon: jest.fn(),
    refundCoupon: jest.fn(),
  };

  const mockPointsAccountService = {
    freezePoints: jest.fn(),
    unfreezePoints: jest.fn(),
    addPoints: jest.fn(),
    deductPoints: jest.fn(),
  };

  const mockPointsRuleService = {
    validatePointsUsage: jest.fn(),
    calculatePointsDiscount: jest.fn(),
    calculateOrderPointsByItems: jest.fn(),
  };

  const mockDegradationService = {
    recordFailure: jest.fn(),
  };

  const mockPrisma = {
    mktUserCoupon: { findUnique: jest.fn() },
    omsOrder: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    omsOrderItem: { updateMany: jest.fn() },
    mktPointsTransaction: { findFirst: jest.fn() },
  };

  const mockCls = { get: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderIntegrationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ClsService, useValue: mockCls },
        { provide: CouponUsageService, useValue: mockCouponUsageService },
        { provide: PointsAccountService, useValue: mockPointsAccountService },
        { provide: PointsRuleService, useValue: mockPointsRuleService },
        { provide: PointsGracefulDegradationService, useValue: mockDegradationService },
      ],
    }).compile();

    service = module.get<OrderIntegrationService>(OrderIntegrationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateOrderDiscount', () => {
    it('仅商品时应返回原价无优惠', async () => {
      const result = await service.calculateOrderDiscount('m1', {
        items: [
          { productId: 'p1', productName: '商品1', price: 100, quantity: 2 },
        ],
      });

      expect(result.data.originalAmount).toBe(200);
      expect(result.data.couponDiscount).toBe(0);
      expect(result.data.pointsDiscount).toBe(0);
      expect(result.data.finalAmount).toBe(200);
    });

    it('使用优惠券时应计入优惠券抵扣', async () => {
      mockCouponUsageService.calculateDiscount.mockResolvedValue(30);
      mockPrisma.mktUserCoupon.findUnique.mockResolvedValue({
        couponName: '满200减30',
      });

      const result = await service.calculateOrderDiscount('m1', {
        items: [
          { productId: 'p1', productName: '商品1', price: 100, quantity: 2 },
        ],
        userCouponId: 'uc1',
      });

      expect(result.data.originalAmount).toBe(200);
      expect(result.data.couponDiscount).toBe(30);
      expect(result.data.finalAmount).toBe(170);
      expect(result.data.couponName).toBe('满200减30');
    });

    it('使用积分时应校验并计入积分抵扣', async () => {
      mockPointsRuleService.validatePointsUsage.mockResolvedValue(undefined);
      mockPointsRuleService.calculatePointsDiscount.mockResolvedValue(new Decimal(5));

      const result = await service.calculateOrderDiscount('m1', {
        items: [
          { productId: 'p1', productName: '商品1', price: 100, quantity: 2 },
        ],
        pointsUsed: 500,
      });

      expect(mockPointsRuleService.validatePointsUsage).toHaveBeenCalledWith(
        500,
        expect.any(Decimal),
      );
      expect(result.data.pointsDiscount).toBe(5);
      expect(result.data.finalAmount).toBe(195);
    });

    it('最终金额不为负', async () => {
      mockCouponUsageService.calculateDiscount.mockResolvedValue(300);
      mockPrisma.mktUserCoupon.findUnique.mockResolvedValue({ couponName: '大额券' });

      const result = await service.calculateOrderDiscount('m1', {
        items: [
          { productId: 'p1', productName: '商品1', price: 100, quantity: 2 },
        ],
        userCouponId: 'uc1',
      });

      expect(result.data.finalAmount).toBe(0);
    });
  });

  describe('handleOrderCreated', () => {
    it('应锁定优惠券并冻结积分', async () => {
      await service.handleOrderCreated('order1', 'm1', 'uc1', 100);

      expect(mockCouponUsageService.lockCoupon).toHaveBeenCalledWith('uc1', 'order1');
      expect(mockPointsAccountService.freezePoints).toHaveBeenCalledWith(
        'm1',
        100,
        'order1',
      );
    });

    it('无优惠券时仅冻结积分', async () => {
      await service.handleOrderCreated('order1', 'm1', undefined, 50);

      expect(mockCouponUsageService.lockCoupon).not.toHaveBeenCalled();
      expect(mockPointsAccountService.freezePoints).toHaveBeenCalledWith(
        'm1',
        50,
        'order1',
      );
    });
  });

  describe('handleOrderPaid', () => {
    it('订单不存在应抛异常', async () => {
      mockPrisma.omsOrder.findUnique.mockResolvedValue(null);
      jest.spyOn(service['logger'], 'error').mockImplementation(() => {});

      await expect(
        service.handleOrderPaid('order1', 'm1', 100),
      ).rejects.toThrow(BusinessException);
    });

    it('应使用优惠券、扣减积分并发放消费积分', async () => {
      const order = {
        id: 'order1',
        memberId: 'm1',
        userCouponId: 'uc1',
        pointsUsed: 50,
        couponDiscount: new Decimal(20),
        totalAmount: new Decimal(200),
        items: [
          {
            skuId: 's1',
            price: new Decimal(100),
            quantity: 2,
            pointsRatio: 100,
          },
        ],
      };
      mockPrisma.omsOrder.findUnique.mockResolvedValue(order);
      mockPointsRuleService.calculateOrderPointsByItems.mockResolvedValue([
        { skuId: 's1', earnedPoints: 18 },
      ]);
      mockPrisma.omsOrderItem.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.omsOrder.update.mockResolvedValue(undefined);
      mockPointsAccountService.unfreezePoints.mockResolvedValue(undefined);
      mockPointsAccountService.deductPoints.mockResolvedValue({ data: {} });
      mockPointsAccountService.addPoints.mockResolvedValue({ data: {} });

      await service.handleOrderPaid('order1', 'm1', 180);

      expect(mockCouponUsageService.useCoupon).toHaveBeenCalledWith(
        'uc1',
        'order1',
        20,
      );
      expect(mockPointsAccountService.unfreezePoints).toHaveBeenCalledWith(
        'm1',
        50,
        'order1',
      );
      expect(mockPointsAccountService.deductPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: 'm1',
          amount: 50,
          type: PointsTransactionType.USE_ORDER,
        }),
      );
      expect(mockPointsAccountService.addPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: 'm1',
          amount: 18,
          type: PointsTransactionType.EARN_ORDER,
        }),
      );
    });

    it('积分发放失败应记录降级不抛错', async () => {
      const order = {
        id: 'order1',
        memberId: 'm1',
        userCouponId: null,
        pointsUsed: 0,
        couponDiscount: new Decimal(0),
        totalAmount: new Decimal(100),
        items: [
          { skuId: 's1', price: new Decimal(100), quantity: 1, pointsRatio: 100 },
        ],
      };
      mockPrisma.omsOrder.findUnique.mockResolvedValue(order);
      mockPointsRuleService.calculateOrderPointsByItems.mockResolvedValue([
        { skuId: 's1', earnedPoints: 10 },
      ]);
      mockPrisma.omsOrderItem.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.omsOrder.update.mockResolvedValue(undefined);
      mockPointsAccountService.addPoints.mockRejectedValue(new Error('DB error'));

      await expect(
        service.handleOrderPaid('order1', 'm1', 100),
      ).resolves.not.toThrow();
      expect(mockDegradationService.recordFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: 'm1',
          amount: 10,
          type: PointsTransactionType.EARN_ORDER,
        }),
      );
    });
  });

  describe('handleOrderCancelled', () => {
    it('应解锁优惠券并解冻积分', async () => {
      mockPrisma.omsOrder.findUnique.mockResolvedValue({
        id: 'order1',
        userCouponId: 'uc1',
        pointsUsed: 50,
      });

      await service.handleOrderCancelled('order1', 'm1');

      expect(mockCouponUsageService.unlockCoupon).toHaveBeenCalledWith('uc1');
      expect(mockPointsAccountService.unfreezePoints).toHaveBeenCalledWith(
        'm1',
        50,
        'order1',
      );
    });
  });

  describe('handleOrderRefunded', () => {
    it('应退还优惠券、退还积分并扣减已发放消费积分', async () => {
      mockPrisma.omsOrder.findUnique.mockResolvedValue({
        id: 'order1',
        userCouponId: 'uc1',
        pointsUsed: 30,
      });
      mockPrisma.mktPointsTransaction.findFirst.mockResolvedValue({
        amount: 15,
      });
      mockPointsAccountService.addPoints.mockResolvedValue({});
      mockPointsAccountService.deductPoints.mockResolvedValue({});

      await service.handleOrderRefunded('order1', 'm1');

      expect(mockCouponUsageService.refundCoupon).toHaveBeenCalledWith('uc1');
      expect(mockPointsAccountService.addPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: 'm1',
          amount: 30,
          type: PointsTransactionType.REFUND,
        }),
      );
      expect(mockPointsAccountService.deductPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 15,
          type: PointsTransactionType.DEDUCT_ADMIN,
        }),
      );
    });
  });
});
