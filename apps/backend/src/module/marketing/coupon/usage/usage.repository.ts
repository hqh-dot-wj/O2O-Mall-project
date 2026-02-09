import { Injectable } from '@nestjs/common';
import { MktCouponUsage, Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/common/repository/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 优惠券使用记录仓储
 * 
 * @description 继承 BaseRepository，自动处理租户隔离
 */
@Injectable()
export class CouponUsageRepository extends BaseRepository<
  MktCouponUsage,
  Prisma.MktCouponUsageCreateInput,
  Prisma.MktCouponUsageUpdateInput
> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'mktCouponUsage', 'id', 'tenantId');
  }

  /**
   * 查询用户的优惠券使用记录
   * 
   * @param memberId 用户ID
   * @param pageNum 页码
   * @param pageSize 每页数量
   * @returns 分页结果
   */
  async findUserUsageRecords(
    memberId: string,
    pageNum: number = 1,
    pageSize: number = 10,
  ) {
    return this.findPage({
      pageNum,
      pageSize,
      where: {
        memberId,
      },
      orderBy: 'usedTime',
      order: 'desc',
    });
  }

  /**
   * 查询订单的优惠券使用记录
   * 
   * @param orderId 订单ID
   * @returns 使用记录
   */
  async findByOrderId(orderId: string) {
    return this.findOne({
      where: {
        orderId,
      },
    });
  }

  /**
   * 统计优惠券使用次数
   * 
   * @param userCouponId 用户优惠券ID
   * @returns 使用次数
   */
  async countUsage(userCouponId: string): Promise<number> {
    return this.count({
      userCouponId,
    });
  }
}
