import { Injectable } from '@nestjs/common';
import { MktPointsTransaction, Prisma, PointsTransactionType } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/common/repository/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 积分交易记录仓储
 * 
 * @description 继承 BaseRepository，自动处理租户隔离
 */
@Injectable()
export class PointsTransactionRepository extends BaseRepository<
  MktPointsTransaction,
  Prisma.MktPointsTransactionCreateInput,
  Prisma.MktPointsTransactionUpdateInput
> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'mktPointsTransaction', 'id', 'tenantId');
  }

  /**
   * 查询用户的积分交易记录
   * 
   * @param memberId 用户ID
   * @param query 查询参数
   * @returns 分页结果
   */
  async findUserTransactions(
    memberId: string,
    query: {
      type?: PointsTransactionType;
      startTime?: Date;
      endTime?: Date;
      pageNum?: number;
      pageSize?: number;
    },
  ) {
    const where: any = {
      memberId,
    };

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

    return this.findPage({
      pageNum: query.pageNum || 1,
      pageSize: query.pageSize || 10,
      where,
      orderBy: 'createTime',
      order: 'desc',
    });
  }

  /**
   * 管理端：分页查询积分交易记录（支持按会员、类型、时间筛选）
   */
  async findTransactionsAdmin(query: {
    memberId?: string;
    type?: PointsTransactionType;
    startTime?: Date;
    endTime?: Date;
    pageNum?: number;
    pageSize?: number;
  }) {
    const where: any = {};
    if (query.memberId) where.memberId = query.memberId;
    if (query.type) where.type = query.type;
    if (query.startTime || query.endTime) {
      where.createTime = {};
      if (query.startTime) where.createTime.gte = query.startTime;
      if (query.endTime) where.createTime.lte = query.endTime;
    }
    return this.findPage({
      pageNum: query.pageNum || 1,
      pageSize: query.pageSize || 10,
      where,
      orderBy: 'createTime',
      order: 'desc',
    });
  }

  /**
   * 查询即将过期的积分
   * 
   * @param memberId 用户ID
   * @param days 天数
   * @returns 即将过期的积分总数
   */
  async getExpiringPoints(memberId: string, days: number): Promise<number> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const result = await this.prisma.mktPointsTransaction.aggregate({
      where: {
        memberId,
        amount: { gt: 0 },
        expireTime: {
          gte: now,
          lte: futureDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }
}
