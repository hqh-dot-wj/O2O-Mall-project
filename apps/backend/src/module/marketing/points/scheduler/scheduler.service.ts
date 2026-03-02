import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PointsTransactionType, PointsTransactionStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { getErrorMessage, getErrorStack } from 'src/common/utils/error';
import { RedisService } from 'src/module/common/redis/redis.service';
import { MarketingEventEmitter } from '../../events/marketing-event.emitter';
import { MarketingEventType } from '../../events/marketing-event.types';

/**
 * 积分定时任务服务
 * 
 * @description 提供积分过期处理等定时任务
 */
@Injectable()
export class PointsSchedulerService {
  private readonly logger = new Logger(PointsSchedulerService.name);
  private readonly lockKey = 'lock:marketing:points:scheduler:process-expired-points';
  private readonly lockTtlMs = 5 * 60 * 1000;
  private readonly batchSize = 200;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly eventEmitter: MarketingEventEmitter,
  ) {}

  /**
   * 处理过期积分
   * 
   * @description 每天凌晨2点执行，处理已过期的积分
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processExpiredPoints() {
    const lockAcquired = await this.redisService.tryLock(this.lockKey, this.lockTtlMs);
    if (!lockAcquired) {
      this.logger.log('跳过处理过期积分：已有实例正在执行');
      return;
    }

    this.logger.log('开始处理过期积分...');

    try {
      const now = new Date();
      let processedCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      let batchCursorId: string | undefined;

      while (true) {
        const expiredTransactions = await this.prisma.mktPointsTransaction.findMany({
          where: {
            expireTime: {
              lte: now,
            },
            amount: {
              gt: 0,
            },
            status: PointsTransactionStatus.COMPLETED,
          },
          include: {
            account: true,
          },
          orderBy: {
            id: 'asc',
          },
          ...(batchCursorId
            ? {
                cursor: { id: batchCursorId },
                skip: 1,
              }
            : {}),
          take: this.batchSize,
        });

        if (expiredTransactions.length === 0) {
          break;
        }

        this.logger.log(`找到 ${expiredTransactions.length} 条待处理过期积分（分批）`);

        for (const transaction of expiredTransactions) {
          try {
            // 检查账户可用积分是否足够扣减
            if (transaction.account.availablePoints < transaction.amount) {
              skippedCount++;
              this.logger.warn(
                `账户可用积分不足，跳过过期处理: accountId=${transaction.accountId}, available=${transaction.account.availablePoints}, expire=${transaction.amount}`,
              );
              continue;
            }

            const expiredTx = await this.prisma.$transaction(async (tx) => {
              // 更新账户余额
              await tx.mktPointsAccount.update({
                where: {
                  id: transaction.accountId,
                },
                data: {
                  availablePoints: {
                    decrement: transaction.amount,
                  },
                  expiredPoints: {
                    increment: transaction.amount,
                  },
                },
              });

              // 创建过期扣减记录
              const createdExpiredTx = await tx.mktPointsTransaction.create({
                data: {
                  tenantId: transaction.tenantId,
                  accountId: transaction.accountId,
                  memberId: transaction.memberId,
                  type: PointsTransactionType.EXPIRE,
                  amount: -transaction.amount,
                  balanceBefore: transaction.account.availablePoints,
                  balanceAfter: transaction.account.availablePoints - transaction.amount,
                  status: PointsTransactionStatus.COMPLETED,
                  relatedId: transaction.id,
                  remark: `积分过期扣减（原交易: ${transaction.remark || '无备注'}）`,
                  expireTime: null,
                },
              });

              // ✅ 软删除：标记原交易为已取消（保留历史记录）
              await tx.mktPointsTransaction.update({
                where: {
                  id: transaction.id,
                },
                data: {
                  status: PointsTransactionStatus.CANCELLED,
                  remark: `${transaction.remark || ''} [已过期]`,
                },
              });

              return createdExpiredTx;
            });

            await this.eventEmitter.emitAsync({
              type: MarketingEventType.POINTS_EXPIRED,
              tenantId: transaction.tenantId,
              instanceId: expiredTx.id,
              configId: transaction.accountId,
              memberId: transaction.memberId,
              payload: {
                amount: transaction.amount,
                originalTransactionId: transaction.id,
                accountId: transaction.accountId,
              },
              timestamp: new Date(),
            });

            processedCount++;
            this.logger.log(
              `处理过期积分成功: transactionId=${transaction.id}, memberId=${transaction.memberId}, amount=${transaction.amount}`,
            );
          } catch (error) {
            errorCount++;
            this.logger.error(
              `处理过期积分失败: transactionId=${transaction.id}, memberId=${transaction.memberId}, error=${getErrorMessage(error)}`,
              getErrorStack(error),
            );
          }
        }

        batchCursorId = expiredTransactions[expiredTransactions.length - 1]?.id;
        if (expiredTransactions.length < this.batchSize) {
          break;
        }
      }

      this.logger.log(
        `过期积分处理完成: 成功=${processedCount}, 失败=${errorCount}, 跳过=${skippedCount}`,
      );
    } catch (error) {
      this.logger.error(`处理过期积分异常: ${getErrorMessage(error)}`, getErrorStack(error));
    } finally {
      try {
        await this.redisService.unlock(this.lockKey);
      } catch (error) {
        this.logger.warn(`释放过期积分任务锁失败: ${getErrorMessage(error)}`);
      }
    }
  }
}
