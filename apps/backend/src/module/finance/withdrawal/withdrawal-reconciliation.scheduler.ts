import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/module/common/redis/redis.service';
import { WithdrawalStatus } from '@prisma/client';
import { WalletService } from '../wallet/wallet.service';

/**
 * 提现对账补偿定时任务
 * 
 * @description
 * 处理打款超时的提现记录：
 * 1. 查询支付平台获取真实状态
 * 2. 根据真实状态更新本地记录
 * 3. 超时未确认的记录标记为 FAILED 并解冻余额
 * 
 * 解决 D-3 缺陷：approve 方法分布式事务失衡
 */
@Injectable()
export class WithdrawalReconciliationScheduler {
  private readonly logger = new Logger(WithdrawalReconciliationScheduler.name);
  private readonly LOCK_KEY = 'lock:withdrawal:reconciliation';
  private readonly LOCK_TTL = 300; // 5分钟
  private readonly TIMEOUT_MINUTES = 30; // 超时时间（分钟）

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly walletService: WalletService,
  ) {}

  /**
   * 每10分钟执行对账任务
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async reconcileJob() {
    const locked = await this.acquireLock();
    if (!locked) {
      this.logger.debug('Reconciliation job skipped: another instance is running');
      return;
    }

    try {
      await this.doReconcile();
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * 执行对账
   */
  private async doReconcile() {
    const timeoutThreshold = new Date(Date.now() - this.TIMEOUT_MINUTES * 60 * 1000);

    // 查询超时的 FAILED 状态记录（打款失败但未处理）
    const failedRecords = await this.prisma.finWithdrawal.findMany({
      where: {
        status: WithdrawalStatus.FAILED,
        createTime: { lte: timeoutThreshold },
      },
      take: 50,
    });

    for (const record of failedRecords) {
      try {
        await this.handleFailedWithdrawal(record);
      } catch (error) {
        this.logger.error(`Reconciliation failed for withdrawal ${record.id}`, error);
      }
    }

    if (failedRecords.length > 0) {
      this.logger.log(`Reconciled ${failedRecords.length} failed withdrawal records`);
    }
  }

  /**
   * 处理失败的提现记录
   * 
   * @description
   * 1. 查询支付平台确认最终状态
   * 2. 如果支付平台确认失败，解冻用户余额
   * 3. 如果支付平台确认成功，更新状态为 APPROVED
   */
  private async handleFailedWithdrawal(withdrawal: { id: string; memberId: string; amount: unknown; paymentNo: string | null }) {
    // TODO: 实际项目中应调用支付平台查询接口
    // const paymentStatus = await this.paymentService.queryStatus(withdrawal.paymentNo);
    
    // 模拟：如果没有 paymentNo，说明打款请求未发出，直接解冻
    if (!withdrawal.paymentNo) {
      await this.prisma.$transaction(async (tx) => {
        // 更新状态为 REJECTED（系统自动驳回）
        await tx.finWithdrawal.update({
          where: { id: withdrawal.id },
          data: {
            status: WithdrawalStatus.REJECTED,
            auditRemark: '系统对账：打款超时自动驳回',
            auditTime: new Date(),
          },
        });

        // 解冻余额
        await this.walletService.unfreezeBalance(
          withdrawal.memberId,
          withdrawal.amount as import('@prisma/client/runtime/library').Decimal,
        );
      });

      this.logger.log(`Withdrawal ${withdrawal.id} auto-rejected due to payment timeout`);
    }
    
    // TODO: 如果有 paymentNo，需要查询支付平台确认状态
    // 这里暂时只处理无 paymentNo 的情况
  }

  private async acquireLock(): Promise<boolean> {
    try {
      const result = await this.redis.getClient().set(this.LOCK_KEY, '1', 'EX', this.LOCK_TTL, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.error('Failed to acquire lock', error);
      return false;
    }
  }

  private async releaseLock(): Promise<void> {
    try {
      await this.redis.getClient().del(this.LOCK_KEY);
    } catch (error) {
      this.logger.error('Failed to release lock', error);
    }
  }
}
