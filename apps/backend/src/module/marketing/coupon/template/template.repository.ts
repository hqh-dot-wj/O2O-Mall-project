import { Injectable } from '@nestjs/common';
import { MktCouponTemplate, Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/common/repository/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { ListCouponTemplateDto } from './dto';

/**
 * 优惠券模板仓储
 *
 * @description MktCouponTemplate 无 delFlag 字段，继承 BaseRepository 仅做租户隔离，不做软删除
 */
@Injectable()
export class CouponTemplateRepository extends BaseRepository<
  MktCouponTemplate,
  Prisma.MktCouponTemplateCreateInput,
  Prisma.MktCouponTemplateUpdateInput
> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'mktCouponTemplate', 'id', 'tenantId');
  }

  /**
   * 分页查询优惠券模板列表
   *
   * @param query 查询条件
   * @returns 分页结果
   */
  async search(query: ListCouponTemplateDto) {
    const where: Prisma.MktCouponTemplateWhereInput = {};

    // 名称模糊搜索
    if (query.name) {
      where.name = { contains: query.name };
    }

    // 类型筛选
    if (query.type) {
      where.type = query.type;
    }

    // 状态筛选
    if (query.status) {
      where.status = query.status;
    }

    // 时间范围筛选
    const dateRange = query.getDateRange('createTime');
    if (dateRange) {
      Object.assign(where, dateRange);
    }

    // 调用基类的 findPage 方法
    return this.findPage({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      where,
      orderBy: query.orderByColumn || 'createTime',
      order: query.isAsc || 'desc',
    });
  }

  /**
   * 根据ID查询优惠券模板（包含用户优惠券关联）
   *
   * @param id 模板ID
   * @returns 模板详情
   */
  async findByIdWithRelations(id: string) {
    return this.findById(id, {
      include: {
        userCoupons: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * 扣减优惠券库存（原子操作）
   *
   * @param templateId 模板ID
   * @param amount 扣减数量
   * @returns 更新结果
   */
  async decrementStock(templateId: string, amount: number = 1) {
    return this.updateMany(
      {
        id: templateId,
        remainingStock: { gte: amount }, // 确保库存充足
      },
      {
        remainingStock: { decrement: amount },
      },
    );
  }

  /**
   * 增加优惠券库存（退款时使用）
   *
   * @param templateId 模板ID
   * @param amount 增加数量
   * @returns 更新结果
   */
  async incrementStock(templateId: string, amount: number = 1) {
    return this.updateMany(
      {
        id: templateId,
      },
      {
        remainingStock: { increment: amount },
      },
    );
  }

  /**
   * 统计已发放的优惠券数量
   *
   * @param templateId 模板ID
   * @returns 已发放数量
   */
  async countDistributed(templateId: string): Promise<number> {
    return this.client.mktUserCoupon.count({
      where: { templateId },
    });
  }

  /**
   * 统计已使用的优惠券数量
   *
   * @param templateId 模板ID
   * @returns 已使用数量
   */
  async countUsed(templateId: string): Promise<number> {
    return this.client.mktUserCoupon.count({
      where: {
        templateId,
        status: 'USED',
      },
    });
  }

  /**
   * 批量查询模板的统计信息
   *
   * @param templateIds 模板ID列表
   * @returns 统计信息映射
   */
  async getStatsForTemplates(templateIds: string[]): Promise<
    Map<
      string,
      {
        distributedCount: number;
        usedCount: number;
        usageRate: number;
      }
    >
  > {
    // 批量查询所有用户优惠券
    const userCoupons = await this.client.mktUserCoupon.findMany({
      where: {
        templateId: { in: templateIds },
      },
      select: {
        templateId: true,
        status: true,
      },
    });

    // 按模板ID分组统计
    const statsMap = new Map<
      string,
      {
        distributedCount: number;
        usedCount: number;
        usageRate: number;
      }
    >();

    for (const templateId of templateIds) {
      const coupons = userCoupons.filter((c) => c.templateId === templateId);
      const distributedCount = coupons.length;
      const usedCount = coupons.filter((c) => c.status === 'USED').length;
      const usageRate = distributedCount > 0 ? (usedCount / distributedCount) * 100 : 0;

      statsMap.set(templateId, {
        distributedCount,
        usedCount,
        usageRate,
      });
    }

    return statsMap;
  }

  /**
   * 检查模板是否已开始发放
   *
   * @param templateId 模板ID
   * @returns 是否已发放
   */
  async hasDistributed(templateId: string): Promise<boolean> {
    const count = await this.countDistributed(templateId);
    return count > 0;
  }
}
