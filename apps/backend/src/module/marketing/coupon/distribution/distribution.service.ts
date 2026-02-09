import { Injectable, Logger } from '@nestjs/common';
import { CouponStatus, CouponDistributionType, UserCouponStatus, CouponValidityType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exceptions';
import { Result } from 'src/common/response/result';
import { ResponseCode } from 'src/common/response';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { FormatDateFields } from 'src/common/utils';
import { CouponTemplateRepository } from '../template/template.repository';
import { UserCouponRepository } from './user-coupon.repository';
import { RedisLockService } from './redis-lock.service';
import { ManualDistributionDto } from './dto/manual-distribution.dto';

/**
 * 优惠券发放服务
 * 
 * @description 处理优惠券的发放、领取、赠送等操作，使用分布式锁保证并发安全
 */
@Injectable()
export class CouponDistributionService {
  private readonly logger = new Logger(CouponDistributionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisLock: RedisLockService,
    private readonly templateRepo: CouponTemplateRepository,
    private readonly userCouponRepo: UserCouponRepository,
  ) {}

  /**
   * 手动发放优惠券
   * 
   * @param dto 发放数据
   * @returns 发放结果列表
   */
  @Transactional()
  async distributeManually(dto: ManualDistributionDto) {
    // 1. 检查模板
    const template = await this.templateRepo.findById(dto.templateId);
    BusinessException.throwIfNull(template, '优惠券模板不存在');
    BusinessException.throwIf(
      template.status !== CouponStatus.ACTIVE,
      '优惠券模板已停用',
    );

    // 2. 批量发放
    const results = [];
    for (const memberId of dto.memberIds) {
      try {
        const userCoupon = await this.claimCouponInternal(
          memberId,
          dto.templateId,
          CouponDistributionType.MANUAL,
        );
        results.push({ memberId, success: true, couponId: userCoupon.id });
      } catch (error) {
        results.push({ memberId, success: false, error: error.message });
      }
    }

    return Result.ok(results, '发放完成');
  }

  /**
   * 用户领取优惠券
   * 
   * @param memberId 用户ID
   * @param templateId 模板ID
   * @returns 领取的优惠券
   */
  async claimCoupon(memberId: string, templateId: string) {
    const userCoupon = await this.claimCouponInternal(
      memberId,
      templateId,
      CouponDistributionType.ACTIVITY,
    );
    return Result.ok(FormatDateFields(userCoupon), '领取成功');
  }

  /**
   * 订单赠送优惠券
   * 
   * @param orderId 订单ID
   * @param templateIds 模板ID列表
   * @returns 赠送的优惠券列表
   */
  @Transactional()
  async grantByOrder(orderId: string, templateIds: string[]) {
    // 1. 检查订单
    const order = await this.prisma.omsOrder.findUnique({
      where: { id: orderId },
    });
    BusinessException.throwIfNull(order, '订单不存在');

    // 2. 批量赠送
    const coupons = [];
    for (const templateId of templateIds) {
      try {
        const userCoupon = await this.claimCouponInternal(
          order.memberId,
          templateId,
          CouponDistributionType.ORDER,
        );
        coupons.push(userCoupon);
      } catch (error) {
        this.logger.warn({
          message: 'Failed to grant coupon by order',
          orderId,
          templateId,
          error: error.message,
        });
      }
    }

    return coupons;
  }

  /**
   * 检查用户是否可以领取优惠券
   * 
   * @param memberId 用户ID
   * @param templateId 模板ID
   * @returns 资格检查结果
   */
  async checkEligibility(memberId: string, templateId: string) {
    // 1. 检查模板
    const template = await this.templateRepo.findById(templateId);
    if (!template || template.status !== CouponStatus.ACTIVE) {
      return Result.ok({ eligible: false, reason: '优惠券不存在或已停用' });
    }

    // 2. 检查库存
    if (template.remainingStock <= 0) {
      return Result.ok({ eligible: false, reason: '优惠券已抢光' });
    }

    // 3. 检查用户领取次数
    const userClaimedCount = await this.userCouponRepo.countUserCoupons(
      memberId,
      templateId,
    );

    if (userClaimedCount >= template.limitPerUser) {
      return Result.ok({ eligible: false, reason: '已达到领取上限' });
    }

    return Result.ok({ eligible: true });
  }

  /**
   * 内部领取优惠券方法（使用分布式锁）
   * 
   * @param memberId 用户ID
   * @param templateId 模板ID
   * @param distributionType 发放方式
   * @returns 用户优惠券
   */
  private async claimCouponInternal(
    memberId: string,
    templateId: string,
    distributionType: CouponDistributionType,
  ) {
    // 使用分布式锁保证并发安全
    const lockKey = this.redisLock.getCouponStockLockKey(templateId);

    return await this.redisLock.executeWithLock(
      lockKey,
      async () => {
        // 1. 检查模板
        const template = await this.templateRepo.findById(templateId);
        BusinessException.throwIfNull(template, '优惠券不存在');
        BusinessException.throwIf(
          template.status !== CouponStatus.ACTIVE,
          '优惠券已停用',
        );
        BusinessException.throwIf(
          template.remainingStock <= 0,
          '优惠券已抢光',
        );

        // 2. 检查用户领取次数
        const userClaimedCount = await this.userCouponRepo.countUserCoupons(
          memberId,
          templateId,
        );
        BusinessException.throwIf(
          userClaimedCount >= template.limitPerUser,
          '已达到领取上限',
        );

        // 3. 使用事务扣减库存并创建用户优惠券
        const userCoupon = await this.prisma.$transaction(async (tx) => {
          // 扣减库存（使用乐观锁）
          const updated = await tx.mktCouponTemplate.updateMany({
            where: {
              id: templateId,
              remainingStock: { gt: 0 },
            },
            data: {
              remainingStock: { decrement: 1 },
            },
          });

          if (updated.count === 0) {
            throw new BusinessException(ResponseCode.BUSINESS_ERROR, '优惠券已抢光');
          }

          // 计算有效期
          const { startTime, endTime } = this.calculateValidity(template);

          // 创建用户优惠券
          return await tx.mktUserCoupon.create({
            data: {
              tenantId: template.tenantId,
              memberId,
              templateId,
              couponName: template.name,
              couponType: template.type,
              discountAmount: template.discountAmount,
              discountPercent: template.discountPercent,
              maxDiscountAmount: template.maxDiscountAmount,
              minOrderAmount: template.minOrderAmount,
              startTime,
              endTime,
              status: UserCouponStatus.UNUSED,
              distributionType,
            },
          });
        });

        this.logger.log({
          message: 'Coupon claimed successfully',
          memberId,
          templateId,
          userCouponId: userCoupon.id,
        });

        return userCoupon;
      },
      5000, // 锁过期时间 5 秒
      3, // 最大重试次数 3 次
      100, // 重试延迟 100ms
    );
  }

  /**
   * 计算优惠券有效期
   * 
   * @param template 优惠券模板
   * @returns 有效期起止时间
   */
  private calculateValidity(template: any): { startTime: Date; endTime: Date } {
    if (template.validityType === CouponValidityType.FIXED) {
      // 固定时间段
      return {
        startTime: template.startTime,
        endTime: template.endTime,
      };
    } else {
      // 相对时间（领取后N天）
      const now = new Date();
      const endTime = new Date(now);
      endTime.setDate(endTime.getDate() + template.validDays);
      return { startTime: now, endTime };
    }
  }
}
