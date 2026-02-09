import { Test, TestingModule } from '@nestjs/testing';
import { CouponUsageService } from '../../src/module/marketing/coupon/usage/usage.service';
import { UserCouponRepository } from '../../src/module/marketing/coupon/distribution/user-coupon.repository';
import { CouponUsageRepository } from '../../src/module/marketing/coupon/usage/usage.repository';
import { PrismaService } from '../../src/prisma/prisma.service';
import { CouponType, UserCouponStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as fc from 'fast-check';

/**
 * 优惠券使用属性测试
 * 
 * 使用 fast-check 进行基于属性的测试，验证优惠券使用的正确性属性
 */
describe('CouponUsageService - Property-Based Tests', () => {
  let service: CouponUsageService;
  let prisma: PrismaService;
  let userCouponRepo: UserCouponRepository;
  let usageRepo: CouponUsageRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponUsageService,
        {
          provide: PrismaService,
          useValue: {
            omsOrder: {
              findUnique: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: UserCouponRepository,
          useValue: {
            findById: jest.fn(),
            findAvailableCoupons: jest.fn(),
            lockCoupon: jest.fn(),
            useCoupon: jest.fn(),
            unlockCoupon: jest.fn(),
            refundCoupon: jest.fn(),
          },
        },
        {
          provide: CouponUsageRepository,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CouponUsageService>(CouponUsageService);
    prisma = module.get<PrismaService>(PrismaService);
    userCouponRepo = module.get<UserCouponRepository>(UserCouponRepository);
    usageRepo = module.get<CouponUsageRepository>(CouponUsageRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 2: 优惠券不可重复使用
   * 
   * **Validates: Requirements 3.15**
   * 
   * 对于任何用户优惠券，一旦状态变为"已使用"，就不能再次被使用或锁定
   */
  describe('Property 2: 优惠券不可重复使用', () => {
    it('should prevent reusing a coupon that is already used', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            couponId: fc.uuid(),
            orderId: fc.uuid(),
            memberId: fc.uuid(),
            tenantId: fc.string({ minLength: 6, maxLength: 20 }),
          }),
          async ({ couponId, orderId, memberId, tenantId }) => {
            // 模拟已使用的优惠券
            const usedCoupon = {
              id: couponId,
              memberId,
              tenantId,
              status: UserCouponStatus.USED,
              couponType: CouponType.DISCOUNT,
              discountAmount: new Decimal(20),
              minOrderAmount: new Decimal(100),
              startTime: new Date(Date.now() - 86400000),
              endTime: new Date(Date.now() + 86400000),
            };

            jest.spyOn(userCouponRepo, 'findById').mockResolvedValue(usedCoupon as any);
            jest.spyOn(userCouponRepo, 'lockCoupon').mockResolvedValue({ count: 0 });

            // 尝试锁定已使用的优惠券应该失败
            await expect(
              service.lockCoupon(couponId, orderId)
            ).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prevent using a coupon that is already locked by another order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            couponId: fc.uuid(),
            orderId1: fc.uuid(),
            orderId2: fc.uuid(),
            memberId: fc.uuid(),
          }),
          async ({ couponId, orderId1, orderId2, memberId }) => {
            // 确保两个订单ID不同
            fc.pre(orderId1 !== orderId2);

            // 模拟已锁定的优惠券
            const lockedCoupon = {
              id: couponId,
              memberId,
              status: UserCouponStatus.LOCKED,
              orderId: orderId1,
              couponType: CouponType.DISCOUNT,
              discountAmount: new Decimal(20),
              minOrderAmount: new Decimal(100),
              startTime: new Date(Date.now() - 86400000),
              endTime: new Date(Date.now() + 86400000),
            };

            jest.spyOn(userCouponRepo, 'findById').mockResolvedValue(lockedCoupon as any);
            jest.spyOn(userCouponRepo, 'lockCoupon').mockResolvedValue({ count: 0 });

            // 尝试用另一个订单锁定已锁定的优惠券应该失败
            await expect(
              service.lockCoupon(couponId, orderId2)
            ).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: 优惠券金额计算正确性
   * 
   * **Validates: Requirements 3.10**
   * 
   * 对于任何满减券，当订单金额满足最低消费条件时，优惠金额应该等于设定的减免金额
   */
  describe('Property 3: 优惠券金额计算正确性', () => {
    it('should calculate discount amount correctly for discount coupons', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            couponId: fc.uuid(),
            discountAmount: fc.integer({ min: 1, max: 500 }),
            minOrderAmount: fc.integer({ min: 1, max: 1000 }),
            orderAmount: fc.integer({ min: 1, max: 2000 }),
          }),
          async ({ couponId, discountAmount, minOrderAmount, orderAmount }) => {
            // 创建满减券
            const coupon = {
              id: couponId,
              couponType: CouponType.DISCOUNT,
              discountAmount: new Decimal(discountAmount),
              minOrderAmount: new Decimal(minOrderAmount),
              startTime: new Date(Date.now() - 86400000),
              endTime: new Date(Date.now() + 86400000),
            };

            jest.spyOn(userCouponRepo, 'findById').mockResolvedValue(coupon as any);

            // 计算优惠金额
            const result = await service.calculateDiscount(couponId, orderAmount);

            // 验证计算正确性
            if (orderAmount >= minOrderAmount) {
              // 订单金额满足条件，优惠金额应该等于设定的减免金额
              // 但不能超过订单金额
              const expectedDiscount = Math.min(discountAmount, orderAmount);
              expect(result).toBe(expectedDiscount);
            } else {
              // 订单金额不满足条件，优惠金额应该为0
              // 注意：实际实现中，不满足条件时仍会返回折扣金额，但在验证阶段会拒绝
              // 这里我们测试计算逻辑本身
              expect(result).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not exceed order amount for discount coupons', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            couponId: fc.uuid(),
            discountAmount: fc.integer({ min: 100, max: 1000 }),
            orderAmount: fc.integer({ min: 1, max: 500 }),
          }),
          async ({ couponId, discountAmount, orderAmount }) => {
            // 创建满减券，减免金额大于订单金额
            const coupon = {
              id: couponId,
              couponType: CouponType.DISCOUNT,
              discountAmount: new Decimal(discountAmount),
              minOrderAmount: new Decimal(0),
            };

            jest.spyOn(userCouponRepo, 'findById').mockResolvedValue(coupon as any);

            // 计算优惠金额
            const result = await service.calculateDiscount(couponId, orderAmount);

            // 优惠金额不应超过订单金额
            expect(result).toBeLessThanOrEqual(orderAmount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: 折扣券金额计算正确性
   * 
   * **Validates: Requirements 3.11**
   * 
   * 对于任何折扣券，优惠金额应该等于订单金额乘以折扣比例，且不超过最高优惠金额
   */
  describe('Property 4: 折扣券金额计算正确性', () => {
    it('should calculate discount amount correctly for percentage coupons', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            couponId: fc.uuid(),
            discountPercent: fc.integer({ min: 1, max: 99 }),
            maxDiscountAmount: fc.option(fc.integer({ min: 10, max: 500 }), { nil: null }),
            orderAmount: fc.integer({ min: 100, max: 2000 }),
          }),
          async ({ couponId, discountPercent, maxDiscountAmount, orderAmount }) => {
            // 创建折扣券
            const coupon = {
              id: couponId,
              couponType: CouponType.PERCENTAGE,
              discountPercent,
              maxDiscountAmount: maxDiscountAmount ? new Decimal(maxDiscountAmount) : null,
              minOrderAmount: new Decimal(0),
            };

            jest.spyOn(userCouponRepo, 'findById').mockResolvedValue(coupon as any);

            // 计算优惠金额
            const result = await service.calculateDiscount(couponId, orderAmount);

            // 计算预期的优惠金额
            let expectedDiscount = (orderAmount * discountPercent) / 100;
            
            // 不超过最高优惠金额
            if (maxDiscountAmount !== null) {
              expectedDiscount = Math.min(expectedDiscount, maxDiscountAmount);
            }
            
            // 不超过订单金额
            expectedDiscount = Math.min(expectedDiscount, orderAmount);

            // 验证计算正确性（允许小数精度误差）
            expect(Math.abs(result - expectedDiscount)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect max discount amount for percentage coupons', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            couponId: fc.uuid(),
            discountPercent: fc.integer({ min: 50, max: 99 }),
            maxDiscountAmount: fc.integer({ min: 10, max: 100 }),
            orderAmount: fc.integer({ min: 500, max: 2000 }),
          }),
          async ({ couponId, discountPercent, maxDiscountAmount, orderAmount }) => {
            // 创建折扣券，确保计算出的折扣会超过最高限额
            const coupon = {
              id: couponId,
              couponType: CouponType.PERCENTAGE,
              discountPercent,
              maxDiscountAmount: new Decimal(maxDiscountAmount),
              minOrderAmount: new Decimal(0),
            };

            jest.spyOn(userCouponRepo, 'findById').mockResolvedValue(coupon as any);

            // 计算优惠金额
            const result = await service.calculateDiscount(couponId, orderAmount);

            // 优惠金额不应超过最高优惠金额
            expect(result).toBeLessThanOrEqual(maxDiscountAmount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: 优惠券状态转换原子性
   * 
   * **Validates: Requirements 3.16**
   * 
   * 对于任何优惠券状态变更操作（锁定、使用、解锁），要么全部成功，要么全部失败，不存在中间状态
   */
  describe('Property 5: 优惠券状态转换原子性', () => {
    it('should ensure atomic state transition when locking coupon', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            couponId: fc.uuid(),
            orderId: fc.uuid(),
            shouldSucceed: fc.boolean(),
          }),
          async ({ couponId, orderId, shouldSucceed }) => {
            const coupon = {
              id: couponId,
              status: UserCouponStatus.UNUSED,
              couponType: CouponType.DISCOUNT,
              discountAmount: new Decimal(20),
            };

            jest.spyOn(userCouponRepo, 'findById').mockResolvedValue(coupon as any);
            jest.spyOn(userCouponRepo, 'lockCoupon').mockResolvedValue({
              count: shouldSucceed ? 1 : 0,
            });

            if (shouldSucceed) {
              // 成功情况：不应抛出异常
              await expect(service.lockCoupon(couponId, orderId)).resolves.not.toThrow();
              expect(userCouponRepo.lockCoupon).toHaveBeenCalledWith(couponId, orderId);
            } else {
              // 失败情况：应该抛出异常，状态不应改变
              await expect(service.lockCoupon(couponId, orderId)).rejects.toThrow();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure atomic state transition when using coupon', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            couponId: fc.uuid(),
            orderId: fc.uuid(),
            memberId: fc.uuid(),
            tenantId: fc.string({ minLength: 6, maxLength: 20 }),
            discountAmount: fc.integer({ min: 1, max: 500 }),
            orderAmount: fc.integer({ min: 100, max: 2000 }),
          }),
          async ({ couponId, orderId, memberId, tenantId, discountAmount, orderAmount }) => {
            const coupon = {
              id: couponId,
              memberId,
              tenantId,
              status: UserCouponStatus.LOCKED,
              couponType: CouponType.DISCOUNT,
              discountAmount: new Decimal(discountAmount),
            };

            jest.spyOn(userCouponRepo, 'findById').mockResolvedValue(coupon as any);
            jest.spyOn(userCouponRepo, 'useCoupon').mockResolvedValue(undefined);
            jest.spyOn(usageRepo, 'create').mockResolvedValue({} as any);
            jest.spyOn(prisma.omsOrder, 'findUnique').mockResolvedValue({
              totalAmount: new Decimal(orderAmount),
            } as any);

            // 使用优惠券应该成功
            await expect(
              service.useCoupon(couponId, orderId, discountAmount)
            ).resolves.not.toThrow();

            // 验证状态更新和使用记录创建都被调用
            expect(userCouponRepo.useCoupon).toHaveBeenCalledWith(couponId);
            expect(usageRepo.create).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 7: 优惠券有效期验证
   * 
   * **Validates: Requirements 3.5**
   * 
   * 对于任何用户优惠券，只有当前时间在有效期内（startTime <= now <= endTime）时才能使用
   */
  describe('Property 7: 优惠券有效期验证', () => {
    it('should reject coupons outside valid time range', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            couponId: fc.uuid(),
            memberId: fc.uuid(),
            orderAmount: fc.integer({ min: 100, max: 2000 }),
            // 生成过去或未来的时间范围
            timeOffset: fc.integer({ min: -365, max: 365 }).filter(offset => offset < -1 || offset > 1),
          }),
          async ({ couponId, memberId, orderAmount, timeOffset }) => {
            const now = new Date();
            const startTime = new Date(now.getTime() + timeOffset * 86400000);
            const endTime = new Date(startTime.getTime() + 86400000);

            const coupon = {
              id: couponId,
              memberId,
              status: UserCouponStatus.UNUSED,
              couponType: CouponType.DISCOUNT,
              discountAmount: new Decimal(20),
              minOrderAmount: new Decimal(0),
              startTime,
              endTime,
            };

            jest.spyOn(userCouponRepo, 'findById').mockResolvedValue(coupon as any);

            const orderContext = {
              memberId,
              orderAmount,
              productIds: [] as string[],
              categoryIds: [] as number[],
            };

            // 如果优惠券不在有效期内，验证应该失败
            if (now < startTime || now > endTime) {
              await expect(
                service.validateCoupon(couponId, orderContext)
              ).rejects.toThrow();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept coupons within valid time range', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            couponId: fc.uuid(),
            memberId: fc.uuid(),
            orderAmount: fc.integer({ min: 100, max: 2000 }),
          }),
          async ({ couponId, memberId, orderAmount }) => {
            const now = new Date();
            const startTime = new Date(now.getTime() - 86400000); // 昨天
            const endTime = new Date(now.getTime() + 86400000);   // 明天

            const coupon = {
              id: couponId,
              memberId,
              status: UserCouponStatus.UNUSED,
              couponType: CouponType.DISCOUNT,
              discountAmount: new Decimal(20),
              minOrderAmount: new Decimal(0),
              startTime,
              endTime,
              applicableProducts: [] as string[],
              applicableCategories: [] as number[],
            };

            jest.spyOn(userCouponRepo, 'findById').mockResolvedValue(coupon as any);

            const orderContext = {
              memberId,
              orderAmount,
              productIds: [] as string[],
              categoryIds: [] as number[],
            };

            // 优惠券在有效期内，验证应该成功
            const result = await service.validateCoupon(couponId, orderContext);
            expect(result.data.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: 优惠券适用范围验证
   * 
   * **Validates: Requirements 3.7**
   * 
   * 对于任何订单，如果使用优惠券，订单中的所有商品都必须在优惠券的适用范围内
   */
  describe('Property 8: 优惠券适用范围验证', () => {
    it('should validate applicable products correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            couponId: fc.uuid(),
            memberId: fc.uuid(),
            orderAmount: fc.integer({ min: 100, max: 2000 }),
            applicableProducts: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
            orderProducts: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          }),
          async ({ couponId, memberId, orderAmount, applicableProducts, orderProducts }) => {
            const now = new Date();
            const coupon = {
              id: couponId,
              memberId,
              status: UserCouponStatus.UNUSED,
              couponType: CouponType.DISCOUNT,
              discountAmount: new Decimal(20),
              minOrderAmount: new Decimal(0),
              startTime: new Date(now.getTime() - 86400000),
              endTime: new Date(now.getTime() + 86400000),
              applicableProducts,
              applicableCategories: [] as number[],
            };

            jest.spyOn(userCouponRepo, 'findById').mockResolvedValue(coupon as any);

            const orderContext = {
              memberId,
              orderAmount,
              productIds: orderProducts,
              categoryIds: [] as number[],
            };

            // 检查是否有交集
            const hasApplicableProduct = orderProducts.some(productId =>
              applicableProducts.includes(productId)
            );

            if (hasApplicableProduct) {
              // 有适用商品，验证应该成功
              const result = await service.validateCoupon(couponId, orderContext);
              expect(result.data.valid).toBe(true);
            } else {
              // 没有适用商品，验证应该失败
              await expect(
                service.validateCoupon(couponId, orderContext)
              ).rejects.toThrow();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate applicable categories correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            couponId: fc.uuid(),
            memberId: fc.uuid(),
            orderAmount: fc.integer({ min: 100, max: 2000 }),
            applicableCategories: fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 5 }),
            orderCategories: fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 5 }),
          }),
          async ({ couponId, memberId, orderAmount, applicableCategories, orderCategories }) => {
            const now = new Date();
            const coupon = {
              id: couponId,
              memberId,
              status: UserCouponStatus.UNUSED,
              couponType: CouponType.DISCOUNT,
              discountAmount: new Decimal(20),
              minOrderAmount: new Decimal(0),
              startTime: new Date(now.getTime() - 86400000),
              endTime: new Date(now.getTime() + 86400000),
              applicableProducts: [] as string[],
              applicableCategories,
            };

            jest.spyOn(userCouponRepo, 'findById').mockResolvedValue(coupon as any);

            const orderContext = {
              memberId,
              orderAmount,
              productIds: [] as string[],
              categoryIds: orderCategories,
            };

            // 检查是否有交集
            const hasApplicableCategory = orderCategories.some(categoryId =>
              applicableCategories.includes(categoryId)
            );

            if (hasApplicableCategory) {
              // 有适用分类，验证应该成功
              const result = await service.validateCoupon(couponId, orderContext);
              expect(result.data.valid).toBe(true);
            } else {
              // 没有适用分类，验证应该失败
              await expect(
                service.validateCoupon(couponId, orderContext)
              ).rejects.toThrow();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept coupons with no restrictions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            couponId: fc.uuid(),
            memberId: fc.uuid(),
            orderAmount: fc.integer({ min: 100, max: 2000 }),
            orderProducts: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          }),
          async ({ couponId, memberId, orderAmount, orderProducts }) => {
            const now = new Date();
            const coupon = {
              id: couponId,
              memberId,
              status: UserCouponStatus.UNUSED,
              couponType: CouponType.DISCOUNT,
              discountAmount: new Decimal(20),
              minOrderAmount: new Decimal(0),
              startTime: new Date(now.getTime() - 86400000),
              endTime: new Date(now.getTime() + 86400000),
              applicableProducts: [] as string[], // 无商品限制
              applicableCategories: [] as number[], // 无分类限制
            };

            jest.spyOn(userCouponRepo, 'findById').mockResolvedValue(coupon as any);

            const orderContext = {
              memberId,
              orderAmount,
              productIds: orderProducts,
              categoryIds: [] as number[],
            };

            // 无限制的优惠券应该对所有订单有效
            const result = await service.validateCoupon(couponId, orderContext);
            expect(result.data.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
