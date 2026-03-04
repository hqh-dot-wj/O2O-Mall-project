import { Injectable, Logger, Inject } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PointsTransactionType } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { Result } from 'src/common/response/result';
import { PrismaService } from 'src/prisma/prisma.service';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { RedisService } from 'src/module/common/redis/redis.service';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { CouponUsageService } from '../coupon/usage/usage.service';
import { PointsAccountService } from '../points/account/account.service';
import { PointsRuleService } from '../points/rule/rule.service';
import { PointsGracefulDegradationService } from '../points/degradation/degradation.service';
import { CalculateDiscountDto } from './dto/calculate-discount.dto';
import { getErrorMessage, getErrorStack } from 'src/common/utils/error';
import { ORDER_SERVICE, OrderServiceContract } from 'src/module/client/order/order-service.token';
import { MarketingEventEmitter } from '../events/marketing-event.emitter';
import { MarketingEventType } from '../events/marketing-event.types';
import { OrderForMarketing } from './types/order-for-marketing.type';

/**
 * 订单集成服务
 * 
 * @description 处理订单与优惠券、积分的集成逻辑
 */
@Injectable()
export class OrderIntegrationService {
  private readonly logger = new Logger(OrderIntegrationService.name);
  private readonly idempotencyTtlSeconds = 600;
  private readonly lockTtlMs = 30 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
    private readonly redisService: RedisService,
    private readonly couponUsageService: CouponUsageService,
    private readonly pointsAccountService: PointsAccountService,
    private readonly pointsRuleService: PointsRuleService,
    private readonly degradationService: PointsGracefulDegradationService,
    private readonly eventEmitter: MarketingEventEmitter,
    @Inject(ORDER_SERVICE)
    private readonly orderService: OrderServiceContract,
  ) {}

  /**
   * 计算订单优惠（优惠券+积分）
   * 
   * @param memberId 用户ID
   * @param dto 计算参数
   * @returns 优惠计算结果
   */
  async calculateOrderDiscount(memberId: string, dto: CalculateDiscountDto) {
    // 1. 计算订单原价
    const originalAmount = dto.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    let couponDiscount = 0;
    let pointsDiscount = 0;
    let couponName: string | null = null;
    let finalAmount = originalAmount;

    // 2. 计算优惠券抵扣
    if (dto.userCouponId) {
      const discount = await this.couponUsageService.calculateDiscount(
        dto.userCouponId,
        originalAmount,
      );

      couponDiscount = discount;

      // 获取优惠券名称
      const coupon = await this.prisma.mktUserCoupon.findUnique({
        where: { id: dto.userCouponId },
      });
      couponName = coupon?.couponName || null;

      finalAmount -= couponDiscount;
    }

    // 3. 计算积分抵扣（在优惠券抵扣后的金额基础上）
    if (dto.pointsUsed && dto.pointsUsed > 0) {
      // 验证积分使用是否合法
      await this.pointsRuleService.validatePointsUsage(
        dto.pointsUsed,
        new Decimal(finalAmount),
      );

      // 计算积分抵扣金额
      const discount = await this.pointsRuleService.calculatePointsDiscount(
        dto.pointsUsed,
      );
      pointsDiscount = Number(discount);
      finalAmount -= pointsDiscount;
    }

    // 4. 确保最终金额不为负数
    if (finalAmount < 0) {
      finalAmount = 0;
    }

    const totalDiscount = couponDiscount + pointsDiscount;

    this.logger.log(
      `订单优惠计算: memberId=${memberId}, original=${originalAmount}, coupon=${couponDiscount}, points=${pointsDiscount}, final=${finalAmount}`,
    );

    const result = {
      originalAmount,
      couponDiscount,
      pointsDiscount,
      totalDiscount,
      finalAmount,
      userCouponId: dto.userCouponId || null,
      pointsUsed: dto.pointsUsed || 0,
      couponName,
    };

    await this.eventEmitter.emitAsync({
      type: MarketingEventType.INTEGRATION_ORDER_DISCOUNT_CALCULATED,
      tenantId: TenantContext.getTenantId() ?? TenantContext.SUPER_TENANT_ID,
      instanceId: `discount:${memberId}:${Date.now()}`,
      configId: 'integration.order',
      memberId,
      payload: {
        ...result,
        itemCount: dto.items.length,
      },
      timestamp: new Date(),
    });

    return Result.ok(result);
  }

  /**
   * 订单创建时处理优惠券和积分
   * 
   * @param orderId 订单ID
   * @param memberId 用户ID
   * @param userCouponId 用户优惠券ID
   * @param pointsUsed 使用的积分数量
   */
  async handleOrderCreated(
    orderId: string,
    memberId: string,
    userCouponId?: string,
    pointsUsed?: number,
  ) {
    this.logger.log(
      `处理订单创建: orderId=${orderId}, memberId=${memberId}, coupon=${userCouponId}, points=${pointsUsed}`,
    );

    return this.executeWithIdempotency('created', orderId, async () => {
      try {
        // 1. 锁定优惠券
        if (userCouponId) {
          await this.couponUsageService.lockCoupon(userCouponId, orderId);
          this.logger.log(`优惠券已锁定: couponId=${userCouponId}`);
        }

        // 2. 冻结积分
        if (pointsUsed && pointsUsed > 0) {
          await this.pointsAccountService.freezePoints(
            memberId,
            pointsUsed,
            orderId,
          );
          this.logger.log(`积分已冻结: points=${pointsUsed}`);
        }

        await this.emitIntegrationEvent(
          MarketingEventType.INTEGRATION_ORDER_CREATED,
          orderId,
          memberId,
          { userCouponId: userCouponId ?? null, pointsUsed: pointsUsed ?? 0 },
        );
      } catch (error) {
        this.logger.error(
          `订单创建处理失败: orderId=${orderId}, error=${getErrorMessage(error)}`,
          getErrorStack(error),
        );
        throw error;
      }
    });
  }

  /**
   * 订单支付成功时处理优惠券和积分
   * 
   * @param orderId 订单ID
   * @param memberId 用户ID
   * @param payAmount 实付金额
   */
  @Transactional()
  async handleOrderPaid(
    orderId: string,
    memberId: string,
    payAmount: number,
  ) {
    this.logger.log(
      `处理订单支付: orderId=${orderId}, memberId=${memberId}, payAmount=${payAmount}`,
    );

    return this.executeWithIdempotency('paid', orderId, async () => {
      try {
        // 查询订单信息（包含订单明细）
        const order = await this.orderService.findByIdForMarketing(orderId, true);

        if (!order) {
          BusinessException.throw(404, '订单不存在');
        }

        // 1. 使用优惠券
        if (order.userCouponId) {
          await this.couponUsageService.useCoupon(
            order.userCouponId,
            orderId,
            Number(order.couponDiscount),
          );
          this.logger.log(`优惠券已使用: couponId=${order.userCouponId}`);
        }

        // 2. 扣减冻结的积分
        if (order.pointsUsed && order.pointsUsed > 0) {
          // 先解冻
          await this.pointsAccountService.unfreezePoints(
            memberId,
            order.pointsUsed,
            orderId,
          );

          // 再扣减
          await this.pointsAccountService.deductPoints({
            memberId,
            amount: order.pointsUsed,
            type: PointsTransactionType.USE_ORDER,
            relatedId: orderId,
            remark: '订单抵扣',
          });

          this.logger.log(`积分已扣减: points=${order.pointsUsed}`);
        }

        // 3. 按商品明细计算并发放消费积分（防止积分套利）
        // 积分计算基数 = 原价 - 优惠券抵扣（不包括积分抵扣）
        const baseAmount = order.totalAmount.sub(order.couponDiscount);

        const itemsPointsResult = await this.pointsRuleService.calculateOrderPointsByItems(
          order.items.map(item => ({
            skuId: item.skuId,
            price: item.price,
            quantity: item.quantity,
            pointsRatio: item.pointsRatio ?? 100,
          })),
          baseAmount,
          order.totalAmount,
        );

        // 计算总积分
        const totalPointsToEarn = itemsPointsResult.reduce(
          (sum, item) => sum + item.earnedPoints,
          0,
        );

        await this.orderService.updateOrderPointsEarned(
          orderId,
          itemsPointsResult,
          totalPointsToEarn,
        );

        // 发放积分
        if (totalPointsToEarn > 0) {
          try {
            await this.pointsAccountService.addPoints({
              memberId,
              amount: totalPointsToEarn,
              type: PointsTransactionType.EARN_ORDER,
              relatedId: orderId,
              remark: '消费获得',
            });

            this.logger.log(`消费积分已发放: points=${totalPointsToEarn}`);
          } catch (error) {
            // 积分发放失败，记录到降级服务进行重试
            this.logger.warn({
              message: '消费积分发放失败，已加入重试队列',
              orderId,
              memberId,
              pointsToEarn: totalPointsToEarn,
              error: getErrorMessage(error),
            });

            await this.degradationService.recordFailure({
              memberId,
              amount: totalPointsToEarn,
              type: PointsTransactionType.EARN_ORDER,
              relatedId: orderId,
              remark: '消费获得',
              failureReason: getErrorMessage(error),
            });

            // 不抛出错误，避免影响订单支付流程
            // 积分会通过重试队列异步发放
          }
        }

        await this.emitIntegrationEvent(
          MarketingEventType.INTEGRATION_ORDER_PAID,
          orderId,
          memberId,
          {
            payAmount,
            userCouponId: order.userCouponId ?? null,
            pointsUsed: order.pointsUsed ?? 0,
            earnedPoints: totalPointsToEarn,
          },
        );
      } catch (error) {
        this.logger.error(
          `订单支付处理失败: orderId=${orderId}, error=${getErrorMessage(error)}`,
          getErrorStack(error),
        );
        throw error;
      }
    });
  }

  /**
   * 订单取消时处理优惠券和积分
   * 
   * @param orderId 订单ID
   * @param memberId 用户ID
   */
  async handleOrderCancelled(orderId: string, memberId: string) {
    this.logger.log(
      `处理订单取消: orderId=${orderId}, memberId=${memberId}`,
    );

    return this.executeWithIdempotency('cancelled', orderId, async () => {
      try {
        // 查询订单信息
        const order = await this.orderService.findByIdForMarketing(orderId);

        if (!order) {
          BusinessException.throw(404, '订单不存在');
        }

        // 1. 解锁优惠券
        if (order.userCouponId) {
          await this.couponUsageService.unlockCoupon(order.userCouponId);
          this.logger.log(`优惠券已解锁: couponId=${order.userCouponId}`);
        }

        // 2. 解冻积分
        if (order.pointsUsed && order.pointsUsed > 0) {
          await this.pointsAccountService.unfreezePoints(
            memberId,
            order.pointsUsed,
            orderId,
          );
          this.logger.log(`积分已解冻: points=${order.pointsUsed}`);
        }

        await this.emitIntegrationEvent(
          MarketingEventType.INTEGRATION_ORDER_CANCELLED,
          orderId,
          memberId,
          {
            userCouponId: order.userCouponId ?? null,
            pointsUsed: order.pointsUsed ?? 0,
          },
        );
      } catch (error) {
        this.logger.error(
          `订单取消处理失败: orderId=${orderId}, error=${getErrorMessage(error)}`,
          getErrorStack(error),
        );
        throw error;
      }
    });
  }

  /**
   * 订单退款时处理优惠券和积分
   * 
   * @param orderId 订单ID
   * @param memberId 用户ID
   */
  async handleOrderRefunded(orderId: string, memberId: string) {
    this.logger.log(
      `处理订单退款: orderId=${orderId}, memberId=${memberId}`,
    );

    return this.executeWithIdempotency('refunded', orderId, async () => {
      try {
        // 查询订单信息
        const order = await this.orderService.findByIdForMarketing(orderId);

        if (!order) {
          BusinessException.throw(404, '订单不存在');
        }

        // 1. 退还优惠券
        if (order.userCouponId) {
          await this.couponUsageService.refundCoupon(order.userCouponId);
          this.logger.log(`优惠券已退还: couponId=${order.userCouponId}`);
        }

        // 2. 退还积分
        if (order.pointsUsed && order.pointsUsed > 0) {
          await this.pointsAccountService.addPoints({
            memberId,
            amount: order.pointsUsed,
            type: PointsTransactionType.REFUND,
            relatedId: orderId,
            remark: '订单退款返还',
          });

          this.logger.log(`积分已退还: points=${order.pointsUsed}`);
        }

        // 3. 扣减消费积分（如果已发放）
        const earnedPoints = await this.prisma.mktPointsTransaction.findFirst({
          where: {
            memberId,
            type: PointsTransactionType.EARN_ORDER,
            relatedId: orderId,
          },
        });

        if (earnedPoints && earnedPoints.amount > 0) {
          const account = await this.prisma.mktPointsAccount.findFirst({
            where: { memberId },
            select: { availablePoints: true },
          });
          const availablePoints = account?.availablePoints ?? 0;

          if (availablePoints < earnedPoints.amount) {
            this.logger.warn(
              `退款扣减消费积分跳过: orderId=${orderId}, memberId=${memberId}, available=${availablePoints}, required=${earnedPoints.amount}`,
            );
          } else {
            await this.pointsAccountService.deductPoints({
              memberId,
              amount: earnedPoints.amount,
              type: PointsTransactionType.DEDUCT_ADMIN,
              relatedId: orderId,
              remark: '订单退款扣减消费积分',
            });

            this.logger.log(`消费积分已扣减: points=${earnedPoints.amount}`);
          }
        }

        await this.emitIntegrationEvent(
          MarketingEventType.INTEGRATION_ORDER_REFUNDED,
          orderId,
          memberId,
          {
            userCouponId: order.userCouponId ?? null,
            refundPoints: order.pointsUsed ?? 0,
          },
        );
      } catch (error) {
        this.logger.error(
          `订单退款处理失败: orderId=${orderId}, error=${getErrorMessage(error)}`,
          getErrorStack(error),
        );
        throw error;
      }
    });
  }

  private async executeWithIdempotency(
    eventType: 'created' | 'paid' | 'cancelled' | 'refunded',
    orderId: string,
    handler: () => Promise<void>,
  ): Promise<void> {
    const lockKey = `lock:order:marketing:${eventType}:${orderId}`;
    const lockToken = await this.redisService.tryLock(lockKey, this.lockTtlMs);
    if (!lockToken) {
      this.logger.warn(`订单事件处理锁未获取，已跳过: event=${eventType}, orderId=${orderId}`);
      return;
    }

    try {
      const key = `idempotency:order:marketing:${eventType}:${orderId}`;
      const lockResult = await this.redisService
        .getClient()
        .set(key, '1', 'EX', this.idempotencyTtlSeconds, 'NX');

      if (lockResult !== 'OK') {
        this.logger.warn(`重复订单事件已忽略: event=${eventType}, orderId=${orderId}`);
        return;
      }

      try {
        await handler();
      } catch (error) {
        await this.redisService.del(key);
        throw error;
      }
    } finally {
      try {
        await this.redisService.unlock(lockKey, lockToken);
      } catch (error) {
        this.logger.warn(
          `订单事件处理释放锁失败: event=${eventType}, orderId=${orderId}, error=${getErrorMessage(error)}`,
        );
      }
    }
  }

  private async emitIntegrationEvent(
    type: MarketingEventType,
    orderId: string,
    memberId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.eventEmitter.emitAsync({
      type,
      tenantId: TenantContext.getTenantId() ?? TenantContext.SUPER_TENANT_ID,
      instanceId: orderId,
      configId: 'integration.order',
      memberId,
      payload,
      timestamp: new Date(),
    });
  }
}
