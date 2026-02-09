import { Injectable, Logger } from '@nestjs/common';
import { CouponType, UserCouponStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exceptions';
import { Result } from 'src/common/response/result';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { FormatDateFields } from 'src/common/utils';
import { UserCouponRepository } from '../distribution/user-coupon.repository';
import { CouponUsageRepository } from './usage.repository';
import { OrderContext } from './dto/validate-coupon.dto';

/**
 * 优惠券使用服务
 * 
 * @description 处理优惠券的验证、计算、锁定、使用、解锁、退还等操作
 */
@Injectable()
export class CouponUsageService {
  private readonly logger = new Logger(CouponUsageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userCouponRepo: UserCouponRepository,
    private readonly usageRepo: CouponUsageRepository,
  ) {}

  /**
   * 查询用户可用优惠券列表
   * 
   * @param memberId 用户ID
   * @param orderContext 订单上下文
   * @returns 可用优惠券列表
   */
  async findAvailableCoupons(memberId: string, orderContext?: OrderContext) {
    const now = new Date();

    // 查询未使用且未过期的优惠券
    const coupons = await this.userCouponRepo.findAvailableCoupons(memberId, {
      minOrderAmount: orderContext?.orderAmount,
      productIds: orderContext?.productIds,
      categoryIds: orderContext?.categoryIds,
    });

    // 如果提供了订单上下文，进一步过滤
    if (orderContext) {
      const availableCoupons = coupons.filter((coupon) => {
        return this.isApplicableToOrder(coupon, orderContext);
      });
      return Result.ok(FormatDateFields(availableCoupons));
    }

    return Result.ok(FormatDateFields(coupons));
  }

  /**
   * 验证优惠券是否可用
   * 
   * @param userCouponId 用户优惠券ID
   * @param orderContext 订单上下文
   * @returns 验证结果
   */
  async validateCoupon(userCouponId: string, orderContext: OrderContext) {
    const coupon = await this.userCouponRepo.findById(userCouponId);
    BusinessException.throwIfNull(coupon, '优惠券不存在');

    // 验证归属
    BusinessException.throwIf(
      coupon.memberId !== orderContext.memberId,
      '优惠券不属于当前用户',
    );

    // 验证状态
    BusinessException.throwIf(
      coupon.status !== UserCouponStatus.UNUSED,
      '优惠券已使用或已过期',
    );

    // 验证有效期
    const now = new Date();
    BusinessException.throwIf(
      now < coupon.startTime || now > coupon.endTime,
      '优惠券不在有效期内',
    );

    // 验证最低消费
    const minAmount = Number(coupon.minOrderAmount);
    BusinessException.throwIf(
      orderContext.orderAmount < minAmount,
      '订单金额未达到最低消费' + minAmount + '元',
    );

    // 验证适用商品（如果有限制）
    if (!this.isApplicableToOrder(coupon, orderContext)) {
      throw new BusinessException(400, '优惠券不适用于当前订单商品');
    }

    return Result.ok({ valid: true });
  }

  /**
   * 计算优惠券优惠金额
   * 
   * @param userCouponId 用户优惠券ID
   * @param orderAmount 订单金额
   * @returns 优惠金额
   */
  async calculateDiscount(userCouponId: string, orderAmount: number) {
    const coupon = await this.userCouponRepo.findById(userCouponId);
    BusinessException.throwIfNull(coupon, '优惠券不存在');

    let discount = new Decimal(0);
    const amount = new Decimal(orderAmount);

    switch (coupon.couponType) {
      case CouponType.DISCOUNT:
        // 满减券：直接减免固定金额
        discount = new Decimal(coupon.discountAmount || 0);
        break;

      case CouponType.PERCENTAGE:
        // 折扣券：按百分比计算，不超过最高优惠金额
        discount = amount.mul(coupon.discountPercent || 0).div(100);
        if (coupon.maxDiscountAmount) {
          discount = Decimal.min(discount, new Decimal(coupon.maxDiscountAmount));
        }
        break;

      case CouponType.EXCHANGE:
        // 兑换券：优惠金额等于订单金额（全额抵扣）
        discount = amount;
        break;
    }

    // 确保优惠金额不超过订单金额
    discount = Decimal.min(discount, amount);

    return Number(discount.toFixed(2));
  }

  /**
   * 锁定优惠券（订单创建时）
   * 
   * @param userCouponId 用户优惠券ID
   * @param orderId 订单ID
   */
  @Transactional()
  async lockCoupon(userCouponId: string, orderId: string) {
    const updated = await this.userCouponRepo.lockCoupon(userCouponId, orderId);

    BusinessException.throwIf(
      updated.count === 0,
      '优惠券状态异常，无法锁定',
    );

    this.logger.log({
      message: 'Coupon locked',
      userCouponId,
      orderId,
    });
  }

  /**
   * 使用优惠券（订单支付成功时）
   * 
   * @param userCouponId 用户优惠券ID
   * @param orderId 订单ID
   * @param discountAmount 优惠金额
   */
  @Transactional()
  async useCoupon(userCouponId: string, orderId: string, discountAmount: number) {
    const coupon = await this.userCouponRepo.findById(userCouponId);
    BusinessException.throwIfNull(coupon, '优惠券不存在');

    // 更新优惠券状态
    await this.userCouponRepo.useCoupon(userCouponId);

    // 获取订单金额
    const orderAmount = await this.getOrderAmount(orderId);

    // 创建使用记录
    await this.usageRepo.create({
      tenantId: coupon.tenantId,
      userCoupon: {
        connect: { id: userCouponId },
      },
      memberId: coupon.memberId,
      orderId,
      discountAmount: new Decimal(discountAmount),
      orderAmount: new Decimal(orderAmount),
    });

    this.logger.log({
      message: 'Coupon used',
      userCouponId,
      orderId,
      discountAmount,
    });
  }

  /**
   * 解锁优惠券（订单取消或支付失败时）
   * 
   * @param userCouponId 用户优惠券ID
   */
  @Transactional()
  async unlockCoupon(userCouponId: string) {
    await this.userCouponRepo.unlockCoupon(userCouponId);

    this.logger.log({
      message: 'Coupon unlocked',
      userCouponId,
    });
  }

  /**
   * 返还优惠券（订单退款时）
   * 
   * @param userCouponId 用户优惠券ID
   */
  @Transactional()
  async refundCoupon(userCouponId: string) {
    const coupon = await this.userCouponRepo.findById(userCouponId);
    BusinessException.throwIfNull(coupon, '优惠券不存在');

    // 检查是否已过期
    const now = new Date();
    if (now > coupon.endTime) {
      this.logger.warn({
        message: 'Coupon expired, cannot refund',
        userCouponId,
      });
      return;
    }

    // 返还优惠券
    await this.userCouponRepo.refundCoupon(userCouponId);

    this.logger.log({
      message: 'Coupon refunded',
      userCouponId,
    });
  }

  /**
   * 判断优惠券是否适用于订单
   * 
   * @param coupon 优惠券
   * @param orderContext 订单上下文
   * @returns 是否适用
   */
  private isApplicableToOrder(coupon: any, orderContext: OrderContext): boolean {
    // 检查最低消费
    if (orderContext.orderAmount < Number(coupon.minOrderAmount)) {
      return false;
    }

    // 检查适用商品（如果有限制）
    if (coupon.applicableProducts && coupon.applicableProducts.length > 0) {
      if (!orderContext.productIds || orderContext.productIds.length === 0) {
        return false;
      }
      const hasApplicableProduct = orderContext.productIds.some((productId) =>
        coupon.applicableProducts.includes(productId),
      );
      if (!hasApplicableProduct) {
        return false;
      }
    }

    // 检查适用分类（如果有限制）
    if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
      if (!orderContext.categoryIds || orderContext.categoryIds.length === 0) {
        return false;
      }
      const hasApplicableCategory = orderContext.categoryIds.some((categoryId) =>
        coupon.applicableCategories.includes(categoryId),
      );
      if (!hasApplicableCategory) {
        return false;
      }
    }

    return true;
  }

  /**
   * 获取订单金额
   * 
   * @param orderId 订单ID
   * @returns 订单金额
   */
  private async getOrderAmount(orderId: string): Promise<number> {
    const order = await this.prisma.omsOrder.findUnique({
      where: { id: orderId },
      select: { totalAmount: true },
    });
    return order?.totalAmount ? Number(order.totalAmount) : 0;
  }
}
