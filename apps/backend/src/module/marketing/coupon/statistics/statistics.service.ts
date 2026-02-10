import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { Result } from 'src/common/response/result';
import { FormatDateFields } from 'src/common/utils';
import { ExportTable, ExportOptions } from 'src/common/utils/export';
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

    const memberIds = [...new Set((rows as any[]).map((r) => r.memberId))];
    const memberMap = new Map<string, { nickname?: string; mobile?: string }>();
    if (memberIds.length > 0) {
      const members = await this.prisma.umsMember.findMany({
        where: { memberId: { in: memberIds } },
        select: { memberId: true, nickname: true, mobile: true },
      });
      members.forEach((m) =>
        memberMap.set(m.memberId, { nickname: m.nickname ?? undefined, mobile: m.mobile ?? undefined }),
      );
    }

    const list = (rows as any[]).map((r) => ({
      ...r,
      templateName: r.userCoupon?.template?.name ?? '',
      nickname: memberMap.get(r.memberId)?.nickname ?? '',
      mobile: memberMap.get(r.memberId)?.mobile ?? '',
    }));

    return Result.page(FormatDateFields(list), total);
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
   * 返回：发放/核销/过期数量、核销率、优惠金额、近7日趋势
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

    // 查询总过期数量
    const totalExpired = await this.userCouponRepo.count({
      status: 'EXPIRED',
    });

    // 查询总优惠金额
    const usageRecords = await this.prisma.mktCouponUsage.aggregate({
      _sum: {
        discountAmount: true,
      },
    });

    const totalDiscountAmount = usageRecords._sum.discountAmount || 0;

    // 核销率 0-1（前端 * 100 展示百分比）
    const useRate = totalDistributed > 0 ? totalUsed / totalDistributed : 0;

    // 近7日发放/使用趋势
    const trend = await this.getLast7DaysTrend();

    return Result.ok({
      templateCount: templates.length,
      totalDistributed,
      totalUsed,
      totalExpired,
      useRate: Number(useRate.toFixed(4)),
      totalDiscountAmount: Number(totalDiscountAmount),
      trend,
    });
  }

  /**
   * 获取近7日发放/使用趋势
   */
  private async getLast7DaysTrend(): Promise<{ date: string; distributed: number; used: number }[]> {
    const result: { date: string; distributed: number; used: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const dateStr = dayStart.toISOString().slice(0, 10);

      const [distributed, used] = await Promise.all([
        this.userCouponRepo.count({
          receiveTime: {
            gte: dayStart,
            lte: dayEnd,
          },
        }),
        this.userCouponRepo.count({
          status: 'USED',
          usedTime: {
            gte: dayStart,
            lte: dayEnd,
          },
        }),
      ]);

      result.push({ date: dateStr, distributed, used });
    }

    return result;
  }

  /**
   * 导出优惠券使用记录为 xlsx 文件流
   *
   * @param query 查询参数
   * @param res Express Response，用于写入 xlsx 流
   */
  async exportUsageRecords(
    query: {
      memberId?: string;
      templateId?: string;
      startTime?: Date;
      endTime?: Date;
    },
    res: Response,
  ): Promise<void> {
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

    const exportData = records.map((record) => ({
      优惠券名称: record.userCoupon?.template?.name || '',
      用户ID: record.memberId,
      订单ID: record.orderId,
      订单金额: Number(record.orderAmount),
      优惠金额: Number(record.discountAmount),
      使用时间: record.usedTime,
    }));

    const options: ExportOptions = {
      sheetName: '优惠券使用记录',
      data: FormatDateFields(exportData, ['使用时间']),
      header: [
        { title: '优惠券名称', dataIndex: '优惠券名称', width: 20 },
        { title: '用户ID', dataIndex: '用户ID', width: 36 },
        { title: '订单ID', dataIndex: '订单ID', width: 36 },
        { title: '订单金额', dataIndex: '订单金额', width: 12 },
        { title: '优惠金额', dataIndex: '优惠金额', width: 12 },
        { title: '使用时间', dataIndex: '使用时间', width: 20 },
      ],
    };

    await ExportTable(options, res);
  }
}
