import { Injectable } from '@nestjs/common';
import { MktUserCoupon, Prisma, UserCouponStatus } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/common/repository/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 用户优惠券仓储
 *
 * @description 继承 BaseRepository，自动处理租户隔离
 */
@Injectable()
export class UserCouponRepository extends BaseRepository<
  MktUserCoupon,
  Prisma.MktUserCouponCreateInput,
  Prisma.MktUserCouponUpdateInput
> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'mktUserCoupon', 'id', 'tenantId');
  }

  /**
   * 查询用户已领取的优惠券数量
   *
   * @param memberId 用户ID
   * @param templateId 模板ID
   * @returns 已领取数量
   */
  async countUserCoupons(memberId: string, templateId: string): Promise<number> {
    return this.count({
      memberId,
      templateId,
    });
  }

  /**
   * 查询用户可用的优惠券列表
   *
   * @param memberId 用户ID
   * @param options 查询选项
   * @returns 可用优惠券列表
   */
  async findAvailableCoupons(
    memberId: string,
    options?: {
      minOrderAmount?: number;
      productIds?: string[];
      categoryIds?: number[];
    },
  ) {
    const where: Prisma.MktUserCouponWhereInput = {
      memberId,
      status: UserCouponStatus.UNUSED,
      startTime: { lte: new Date() },
      endTime: { gte: new Date() },
    };

    // 如果指定了订单金额，筛选满足条件的优惠券
    if (options?.minOrderAmount !== undefined) {
      where.template = {
        minOrderAmount: { lte: options.minOrderAmount },
      };
    }

    return this.findMany({
      where,
      include: {
        template: true,
      },
      orderBy: {
        createTime: 'desc',
      },
    });
  }

  /**
   * 查询用户的优惠券列表（分页）
   * 管理端不传 memberId 时查询全部用户优惠券（发放记录）
   *
   * @param memberId 用户ID（可选，不传则查全部）
   * @param status 状态筛选
   * @param pageNum 页码
   * @param pageSize 每页数量
   * @returns 分页结果
   */
  async findUserCouponsPage(memberId?: string, status?: UserCouponStatus, pageNum: number = 1, pageSize: number = 10) {
    const where: Prisma.MktUserCouponWhereInput = {};

    if (memberId) {
      where.memberId = memberId;
    }

    if (status) {
      where.status = status;
    }

    return this.findPage({
      pageNum,
      pageSize,
      where,
      include: {
        template: true,
      },
      orderBy: 'receiveTime',
      order: 'desc',
    });
  }

  /**
   * 锁定优惠券（订单创建时）
   *
   * @param couponId 优惠券ID
   * @param orderId 订单ID
   * @returns 更新结果
   */
  async lockCoupon(couponId: string, orderId: string) {
    return this.updateMany(
      {
        id: couponId,
        status: UserCouponStatus.UNUSED,
      },
      {
        status: UserCouponStatus.LOCKED,
        orderId: orderId,
      },
    );
  }

  /**
   * 使用优惠券（订单支付时）
   *
   * @param couponId 优惠券ID
   * @returns 更新结果
   */
  async useCoupon(couponId: string) {
    return this.updateMany(
      {
        id: couponId,
        status: UserCouponStatus.LOCKED,
      },
      {
        status: UserCouponStatus.USED,
        usedTime: new Date(),
      },
    );
  }

  /**
   * 解锁优惠券（订单取消时）
   *
   * @param couponId 优惠券ID
   * @returns 更新结果
   */
  async unlockCoupon(couponId: string) {
    return this.updateMany(
      {
        id: couponId,
        status: UserCouponStatus.LOCKED,
      },
      {
        status: UserCouponStatus.UNUSED,
        orderId: null,
      },
    );
  }

  /**
   * 退还优惠券（订单退款时）
   *
   * @param couponId 优惠券ID
   * @returns 更新结果
   */
  async refundCoupon(couponId: string) {
    return this.updateMany(
      {
        id: couponId,
        status: UserCouponStatus.USED,
      },
      {
        status: UserCouponStatus.UNUSED,
        orderId: null,
        usedTime: null,
      },
    );
  }

  /**
   * 批量过期优惠券
   *
   * @returns 更新数量
   */
  async expireCoupons() {
    const result = await this.updateMany(
      {
        status: UserCouponStatus.UNUSED,
        endTime: { lt: new Date() },
      },
      {
        status: UserCouponStatus.EXPIRED,
      },
    );

    return result.count;
  }
}
