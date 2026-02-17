import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PointsTransactionType, PointsTransactionStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { getErrorMessage, getErrorStack } from 'src/common/utils/error';

/**
 * 积分定时任务服务
 * 
 * @description 提供积分过期处理等定时任务
 */
@Injectable()
export class PointsSchedulerService {
  private readonly logger = new Logger(PointsSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 处理过期积分
   * 
   * @description 每天凌晨2点执行，处理已过期的积分
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processExpiredPoints() {
    this.logger.log('开始处理过期积分...');

    try {
      const now = new Date();

      // 查询所有已过期但未处理的积分交易
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
      });

      this.logger.log(`找到 ${expiredTransactions.length} 条过期积分记录`);

      let processedCount = 0;
      let errorCount = 0;

      for (const transaction of expiredTransactions) {
        try {
          // 检查账户可用积分是否足够扣减
          if (transaction.account.availablePoints < transaction.amount) {
            this.logger.warn(
              `账户可用积分不足，跳过过期处理: accountId=${transaction.accountId}, available=${transaction.account.availablePoints}, expire=${transaction.amount}`,
            );
            continue;
          }

          await this.prisma.$transaction(async (tx) => {
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
            await tx.mktPointsTransaction.create({
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
          });

          processedCount++;
          this.logger.log(
            `处理过期积分成功: transactionId=${transaction.id}, memberId=${transaction.memberId}, amount=${transaction.amount}`,
          );
        } catch (error) {
          errorCount++;
          this.logger.error(
            `处理过期积分失败: transactionId=${transaction.id}, memberId=${transaction.memberId}, error=${getErrorMessage(error)}`,
          );
        }
      }

      this.logger.log(
        `过期积分处理完成: 成功=${processedCount}, 失败=${errorCount}, 跳过=${expiredTransactions.length - processedCount - errorCount}`,
      );
    } catch (error) {
      this.logger.error(`处理过期积分异常: ${getErrorMessage(error)}`, getErrorStack(error));
    }
  }
}
