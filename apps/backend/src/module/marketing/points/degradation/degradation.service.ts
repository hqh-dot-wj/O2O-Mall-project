import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PointsTransactionType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 积分发放失败记录接口
 */
export interface PointsGrantFailureRecord {
  memberId: string;
  amount: number;
  type: PointsTransactionType;
  relatedId?: string;
  remark?: string;
  expireTime?: Date;
  failureReason: string;
  failureTime: Date;
  retryCount: number;
}

/**
 * 积分优雅降级服务
 * 
 * @description 处理积分发放失败的降级策略，包括失败重试队列和失败日志记录
 * 
 * 功能：
 * 1. 积分发放失败时记录到重试队列
 * 2. 自动重试失败的积分发放
 * 3. 记录失败日志用于审计和排查
 * 4. 支持手动重试失败记录
 * 
 * 验证需求: 12.12, 12.13
 */
@Injectable()
export class PointsGracefulDegradationService {
  private readonly logger = new Logger(PointsGracefulDegradationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('points-retry') private readonly retryQueue: Queue,
  ) {}

  /**
   * 记录积分发放失败
   * 
   * @description 当积分发放失败时，记录失败信息并加入重试队列
   * 
   * @param record 失败记录
   */
  async recordFailure(record: Omit<PointsGrantFailureRecord, 'failureTime' | 'retryCount'>) {
    try {
      const failureRecord: PointsGrantFailureRecord = {
        ...record,
        failureTime: new Date(),
        retryCount: 0,
      };

      // 1. 记录失败日志到数据库
      await this.prisma.mktPointsGrantFailure.create({
        data: {
          memberId: failureRecord.memberId,
          amount: failureRecord.amount,
          type: failureRecord.type,
          relatedId: failureRecord.relatedId,
          remark: failureRecord.remark,
          expireTime: failureRecord.expireTime,
          failureReason: failureRecord.failureReason,
          failureTime: failureRecord.failureTime,
          retryCount: 0,
          status: 'PENDING', // 待重试
        },
      });

      // 2. 加入重试队列（延迟1分钟后重试）
      await this.retryQueue.add(
        'retry-points-grant',
        failureRecord,
        {
          delay: 60000, // 1分钟后重试
          attempts: 3, // 最多重试3次
          backoff: {
            type: 'exponential',
            delay: 60000, // 指数退避，基础延迟1分钟
          },
        },
      );

      this.logger.warn({
        message: '积分发放失败，已加入重试队列',
        memberId: record.memberId,
        amount: record.amount,
        type: record.type,
        reason: record.failureReason,
      });
    } catch (error) {
      // 记录失败本身也失败了，记录到日志
      this.logger.error({
        message: '记录积分发放失败时出错',
        error: error.message,
        stack: error.stack,
        record,
      });
    }
  }

  /**
   * 更新失败记录的重试次数
   * 
   * @param memberId 用户ID
   * @param relatedId 关联ID
   * @param retryCount 重试次数
   * @param success 是否成功
   * @param errorMessage 错误信息（如果失败）
   */
  async updateRetryStatus(
    memberId: string,
    relatedId: string | undefined,
    retryCount: number,
    success: boolean,
    errorMessage?: string,
  ) {
    try {
      const whereClause: any = {
        memberId,
        status: 'PENDING',
      };

      if (relatedId) {
        whereClause.relatedId = relatedId;
      }

      if (success) {
        // 重试成功，更新状态为已完成
        await this.prisma.mktPointsGrantFailure.updateMany({
          where: whereClause,
          data: {
            status: 'COMPLETED',
            retryCount,
            lastRetryTime: new Date(),
          },
        });

        this.logger.log({
          message: '积分发放重试成功',
          memberId,
          relatedId,
          retryCount,
        });
      } else {
        // 重试失败，更新重试次数
        await this.prisma.mktPointsGrantFailure.updateMany({
          where: whereClause,
          data: {
            retryCount,
            lastRetryTime: new Date(),
            lastErrorMessage: errorMessage,
          },
        });

        this.logger.warn({
          message: '积分发放重试失败',
          memberId,
          relatedId,
          retryCount,
          error: errorMessage,
        });
      }
    } catch (error) {
      this.logger.error({
        message: '更新重试状态时出错',
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * 标记失败记录为最终失败
   * 
   * @description 当重试次数用尽后，标记为最终失败，需要人工介入
   * 
   * @param memberId 用户ID
   * @param relatedId 关联ID
   * @param errorMessage 最终错误信息
   */
  async markAsFinalFailure(
    memberId: string,
    relatedId: string | undefined,
    errorMessage: string,
  ) {
    try {
      const whereClause: any = {
        memberId,
        status: 'PENDING',
      };

      if (relatedId) {
        whereClause.relatedId = relatedId;
      }

      await this.prisma.mktPointsGrantFailure.updateMany({
        where: whereClause,
        data: {
          status: 'FAILED',
          lastRetryTime: new Date(),
          lastErrorMessage: errorMessage,
        },
      });

      this.logger.error({
        message: '积分发放最终失败，需要人工介入',
        memberId,
        relatedId,
        error: errorMessage,
      });

      // TODO: 可以在这里触发告警通知管理员
    } catch (error) {
      this.logger.error({
        message: '标记最终失败时出错',
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * 查询失败记录
   * 
   * @param status 状态筛选
   * @param limit 返回数量限制
   * @returns 失败记录列表
   */
  async getFailureRecords(status?: string, limit: number = 100) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    return await this.prisma.mktPointsGrantFailure.findMany({
      where,
      orderBy: {
        failureTime: 'desc',
      },
      take: limit,
    });
  }

  /**
   * 手动重试失败记录
   * 
   * @description 允许管理员手动触发重试
   * 
   * @param id 失败记录ID
   */
  async manualRetry(id: string) {
    const record = await this.prisma.mktPointsGrantFailure.findUnique({
      where: { id },
    });

    if (!record) {
      throw new Error('失败记录不存在');
    }

    if (record.status === 'COMPLETED') {
      throw new Error('该记录已成功处理');
    }

    // 加入重试队列
    await this.retryQueue.add(
      'retry-points-grant',
      {
        memberId: record.memberId,
        amount: record.amount,
        type: record.type,
        relatedId: record.relatedId,
        remark: record.remark,
        expireTime: record.expireTime,
        failureReason: record.failureReason,
        failureTime: record.failureTime,
        retryCount: record.retryCount,
      },
      {
        attempts: 1, // 手动重试只尝试1次
      },
    );

    this.logger.log({
      message: '手动触发积分发放重试',
      id,
      memberId: record.memberId,
    });
  }

  /**
   * 清理已完成的失败记录
   * 
   * @description 定期清理已成功重试的记录，保持数据库整洁
   * 
   * @param daysAgo 清理多少天前的记录
   */
  async cleanupCompletedRecords(daysAgo: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    const result = await this.prisma.mktPointsGrantFailure.deleteMany({
      where: {
        status: 'COMPLETED',
        lastRetryTime: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log({
      message: '清理已完成的失败记录',
      deletedCount: result.count,
      daysAgo,
    });

    return result.count;
  }
}
