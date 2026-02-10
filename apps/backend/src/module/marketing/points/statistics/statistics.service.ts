import { Injectable, Logger } from '@nestjs/common';
import { PointsTransactionType } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { Result } from 'src/common/response/result';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 积分统计服务
 * 
 * @description 提供积分发放、使用、余额、过期等统计功能
 */
@Injectable()
export class PointsStatisticsService {
  private readonly logger = new Logger(PointsStatisticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  /**
   * 查询积分发放统计
   * 
   * @param query 查询参数
   * @returns 发放统计
   */
  async getEarnStatistics(query: {
    startTime?: Date;
    endTime?: Date;
  }) {
    const tenantId = TenantContext.getTenantId() ?? TenantContext.SUPER_TENANT_ID;
    const where: any = {
      tenantId,
      type: {
        in: [
          PointsTransactionType.EARN_ORDER,
          PointsTransactionType.EARN_SIGNIN,
          PointsTransactionType.EARN_TASK,
          PointsTransactionType.EARN_ADMIN,
        ],
      },
    };

    if (query.startTime || query.endTime) {
      where.createTime = {};
      if (query.startTime) {
        where.createTime.gte = query.startTime;
      }
      if (query.endTime) {
        where.createTime.lte = query.endTime;
      }
    }

    // 按类型统计
    const byType = await this.prisma.mktPointsTransaction.groupBy({
      by: ['type'],
      where,
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    // 总计
    const total = await this.prisma.mktPointsTransaction.aggregate({
      where,
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    return Result.ok({
      byType: byType.map((item) => ({
        type: item.type,
        totalPoints: item._sum.amount || 0,
        totalCount: item._count.id,
      })),
      total: {
        totalPoints: total._sum.amount || 0,
        totalCount: total._count.id,
      },
    });
  }

  /**
   * 查询积分使用统计
   * 
   * @param query 查询参数
   * @returns 使用统计
   */
  async getUseStatistics(query: {
    startTime?: Date;
    endTime?: Date;
  }) {
    const tenantId = TenantContext.getTenantId() ?? TenantContext.SUPER_TENANT_ID;
    const where: any = {
      tenantId,
      type: {
        in: [
          PointsTransactionType.USE_ORDER,
          PointsTransactionType.USE_COUPON,
          PointsTransactionType.USE_PRODUCT,
        ],
      },
    };

    if (query.startTime || query.endTime) {
      where.createTime = {};
      if (query.startTime) {
        where.createTime.gte = query.startTime;
      }
      if (query.endTime) {
        where.createTime.lte = query.endTime;
      }
    }

    // 按类型统计
    const byType = await this.prisma.mktPointsTransaction.groupBy({
      by: ['type'],
      where,
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    // 总计
    const total = await this.prisma.mktPointsTransaction.aggregate({
      where,
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    return Result.ok({
      byType: byType.map((item) => ({
        type: item.type,
        totalPoints: Math.abs(item._sum.amount || 0),
        totalCount: item._count.id,
      })),
      total: {
        totalPoints: Math.abs(total._sum.amount || 0),
        totalCount: total._count.id,
      },
    });
  }

  /**
   * 查询积分余额统计
   * 
   * @returns 余额统计
   */
  async getBalanceStatistics() {
    const tenantId = TenantContext.getTenantId() ?? TenantContext.SUPER_TENANT_ID;

    const result = await this.prisma.mktPointsAccount.aggregate({
      where: {
        tenantId,
      },
      _sum: {
        totalPoints: true,
        availablePoints: true,
        frozenPoints: true,
        usedPoints: true,
        expiredPoints: true,
      },
      _count: {
        id: true,
      },
    });

    return Result.ok({
      totalAccounts: result._count.id,
      totalPoints: result._sum.totalPoints || 0,
      availablePoints: result._sum.availablePoints || 0,
      frozenPoints: result._sum.frozenPoints || 0,
      usedPoints: result._sum.usedPoints || 0,
      expiredPoints: result._sum.expiredPoints || 0,
    });
  }

  /**
   * 查询积分过期统计
   * 
   * @param query 查询参数
   * @returns 过期统计
   */
  async getExpireStatistics(query: {
    startTime?: Date;
    endTime?: Date;
  }) {
    const tenantId = TenantContext.getTenantId() ?? TenantContext.SUPER_TENANT_ID;
    const where: any = {
      tenantId,
      type: PointsTransactionType.EXPIRE,
    };

    if (query.startTime || query.endTime) {
      where.createTime = {};
      if (query.startTime) {
        where.createTime.gte = query.startTime;
      }
      if (query.endTime) {
        where.createTime.lte = query.endTime;
      }
    }

    const result = await this.prisma.mktPointsTransaction.aggregate({
      where,
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    return Result.ok({
      totalExpiredPoints: Math.abs(result._sum.amount || 0),
      totalExpiredCount: result._count.id,
    });
  }

  /**
   * 查询积分排行榜
   * 
   * @param limit 排行数量
   * @returns 排行榜
   */
  async getRanking(limit: number = 10) {
    const tenantId = TenantContext.getTenantId() ?? TenantContext.SUPER_TENANT_ID;

    const accounts = await this.prisma.mktPointsAccount.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        totalPoints: 'desc',
      },
      take: limit,
    });

    return Result.ok({
      ranking: accounts.map((account, index) => ({
        rank: index + 1,
        memberId: account.memberId,
        totalPoints: account.totalPoints,
        availablePoints: account.availablePoints,
      })),
    });
  }

  /**
   * 导出积分明细
   * 
   * @param query 查询参数
   * @returns 导出数据
   */
  async exportTransactions(query: {
    memberId?: string;
    type?: PointsTransactionType;
    startTime?: Date;
    endTime?: Date;
  }) {
    const tenantId = TenantContext.getTenantId() ?? TenantContext.SUPER_TENANT_ID;
    const where: any = {
      tenantId,
    };

    if (query.memberId) {
      where.memberId = query.memberId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.startTime || query.endTime) {
      where.createTime = {};
      if (query.startTime) {
        where.createTime.gte = query.startTime;
      }
      if (query.endTime) {
        where.createTime.lte = query.endTime;
      }
    }

    const transactions = await this.prisma.mktPointsTransaction.findMany({
      where,
      orderBy: {
        createTime: 'desc',
      },
    });

    const exportData = transactions.map((transaction) => ({
      用户ID: transaction.memberId,
      交易类型: transaction.type,
      积分数量: transaction.amount,
      交易前余额: transaction.balanceBefore,
      交易后余额: transaction.balanceAfter,
      状态: transaction.status,
      关联ID: transaction.relatedId || '',
      备注: transaction.remark || '',
      创建时间: transaction.createTime,
    }));

    return Result.ok(exportData);
  }
}
