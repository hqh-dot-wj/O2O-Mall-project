import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Result } from 'src/common/response/result';
import { FormatDateFields } from 'src/common/utils';
import { CouponUsageRepository } from '../usage/usage.repository';
import { UserCouponRepository } from '../distribution/user-coupon.repository';
import { CouponTemplateRepository } from '../template/template.repository';

/**
 * 优惠券统计服务
 * 
 * @description 提供优惠券使用记录查询、核销率统计、数据导出等功能
 */
@Injectable()
export class CouponStatisticsService {
  private readonly logger = new Logger(CouponStatisticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usageRepo: CouponUsageRepository,
    private readonly userCouponRepo: UserCouponRepository,
    private readonly templateRepo: CouponTemplateRepository,
  ) {}

  /**
   * 查询优惠券使用记录
   * 
   * @param query 查询参数
   * @returns 使用记录列表
   */
  async getUsageRecords(query: {
    memberId?: string;
    templateId?: string;
    startTime?: Date;
    endTime?: Date;
    pageNum?: number;
    pageSize?: number;
  }) {
    const where: any = {};

    if (query.memberId) {
      where.memberId = query.memberId;
    }

    if (query.templateId) {
      where.userCoupon = {
        templateId: query.templateId,
      };
    }

    if (query.startTime || query.endTime) {
      where.usedTime = {};
      if (query.startTime) {
        where.usedTime.gte = query.startTime;
      }
      if (query.endTime) {
        where.usedTime.lte = query.endTime;
      }
    }

    const { rows, total } = await this.usageRepo.findPage({
      pageNum: query.pageNum || 1,
      pageSize: query.pageSize || 10,
      where,
      include: {
        userCoupon: {
          include: {
            template: true,
          },
        },
      },
      orderBy: 'usedTime',
      order: 'desc',
    });

    return Result.page(FormatDateFields(rows), total);
  }

  /**
   * 统计优惠券核销率
   * 
   * @param templateId 模板ID（可选）
   * @returns 核销率统计
   */
  async getUsageRate(templateId?: string) {
    const where: any = {};
    if (templateId) {
      where.templateId = templateId;
    }

    // 查询已发放数量
    const distributedCount = await this.userCouponRepo.count(where);

    // 查询已使用数量
    const usedCount = await this.userCouponRepo.count({
      ...where,
      status: 'USED',
    });

    // 计算核销率
    const usageRate = distributedCount > 0 ? (usedCount / distributedCount) * 100 : 0;

    return Result.ok({
      distributedCount,
      usedCount,
      usageRate: Number(usageRate.toFixed(2)),
    });
  }

  /**
   * 获取优惠券统计概览
   * 
   * @returns 统计概览
   */
  async getStatisticsOverview() {
    // 查询所有模板
    const templates = await this.templateRepo.findMany({});

    // 查询总发放数量
    const totalDistributed = await this.userCouponRepo.count({});

    // 查询总使用数量
    const totalUsed = await this.userCouponRepo.count({
      status: 'USED',
    });

    // 查询总优惠金额
    const usageRecords = await this.prisma.mktCouponUsage.aggregate({
      _sum: {
        discountAmount: true,
      },
    });

    const totalDiscountAmount = usageRecords._sum.discountAmount || 0;

    // 计算总核销率
    const totalUsageRate = totalDistributed > 0 ? (totalUsed / totalDistributed) * 100 : 0;

    return Result.ok({
      templateCount: templates.length,
      totalDistributed,
      totalUsed,
      totalUsageRate: Number(totalUsageRate.toFixed(2)),
      totalDiscountAmount: Number(totalDiscountAmount),
    });
  }

  /**
   * 导出优惠券使用记录
   * 
   * @param query 查询参数
   * @returns 导出数据
   */
  async exportUsageRecords(query: {
    memberId?: string;
    templateId?: string;
    startTime?: Date;
    endTime?: Date;
  }) {
    const where: any = {};

    if (query.memberId) {
      where.memberId = query.memberId;
    }

    if (query.templateId) {
      where.userCoupon = {
        templateId: query.templateId,
      };
    }

    if (query.startTime || query.endTime) {
      where.usedTime = {};
      if (query.startTime) {
        where.usedTime.gte = query.startTime;
      }
      if (query.endTime) {
        where.usedTime.lte = query.endTime;
      }
    }

    // 查询所有符合条件的记录（使用 Prisma 客户端直接查询以支持 include）
    const records = await this.prisma.mktCouponUsage.findMany({
      where: where as any,
      include: {
        userCoupon: {
          include: {
            template: true,
          },
        },
      },
      orderBy: {
        usedTime: 'desc',
      },
    });

    // 转换为导出格式
    const exportData = records.map((record) => ({
      优惠券名称: record.userCoupon?.template?.name || '',
      用户ID: record.memberId,
      订单ID: record.orderId,
      订单金额: Number(record.orderAmount),
      优惠金额: Number(record.discountAmount),
      使用时间: record.usedTime,
    }));

    return Result.ok(exportData);
  }
}
