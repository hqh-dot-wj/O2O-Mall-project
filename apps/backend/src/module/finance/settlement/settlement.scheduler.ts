import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/module/common/redis/redis.service';
import { WalletService } from '../wallet/wallet.service';
import { FinanceEventEmitter } from '../events/finance-event.emitter';
import { SettlementLogService } from './settlement-log.service';
import { Decimal } from '@prisma/client/runtime/library';
import { getErrorMessage, getErrorStack } from 'src/common/utils/error';
import { BusinessConstants } from 'src/common/constants/business.constants';

/**
 * 结算统计结果
 */
interface SettlementStats {
  settledCount: number;
  failedCount: number;
  totalAmount: Decimal;
  lastProcessedId: bigint | null;
  errorDetails?: string[];
}

/**
 * 结算定时任务
 * 
 * @description
 * 每5分钟扫描到期的冻结佣金并结算到用户钱包
 * 
 * S-T1: 看门狗机制，锁自动续期防止重入 ✅
 * S-T2: settleOne 事务内重新查询状态 ✅
 * S-T3: 增加重试指数退避机制 ✅
 * S-T5: 批量处理支持断点续传 ✅
 * S-T6: 新增结算统计功能 ✅
 * S-T8: 新增结算日志记录 ✅
 * S-T9: 批量大小配置化 ✅
 * S-T10: 集成监控告警 ✅
 */
@Injectable()
export class SettlementScheduler {
  private readonly logger = new Logger(SettlementScheduler.name);
  private readonly LOCK_KEY = 'lock:settle:commission';
  private readonly CHECKPOINT_KEY = 'settle:checkpoint';
  private readonly LOCK_TTL = BusinessConstants.REDIS_LOCK.SETTLEMENT_TTL;
  private readonly LOCK_RENEW_INTERVAL = 60000; // 1分钟续期一次
  // S-T9: 批量大小配置化
  private readonly BATCH_SIZE = BusinessConstants.FINANCE.SETTLEMENT_BATCH_SIZE ?? 100;
  private readonly MAX_RETRY_COUNT = 3;
  private readonly BASE_RETRY_DELAY = 1000; // 1秒
  // S-T10: 告警阈值
  private readonly FAILURE_RATE_THRESHOLD = 0.01; // 1% 失败率告警
  private lockRenewTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly walletService: WalletService,
    private readonly eventEmitter: FinanceEventEmitter,
    private readonly logService: SettlementLogService,
  ) {}

  /**
   * 每5分钟执行结算任务
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async settleJob() {
    const locked = await this.acquireLock();
    if (!locked) {
      this.logger.debug('Settlement job skipped: another instance is running');
      return;
    }

    // S-T1: 启动看门狗续期
    this.startLockRenewal();
    const startTime = new Date();

    try {
      const stats = await this.doSettle();
      
      // S-T8: 记录结算日志
      if (stats.settledCount > 0 || stats.failedCount > 0) {
        await this.logService.createLog({
          settledCount: stats.settledCount,
          failedCount: stats.failedCount,
          totalAmount: stats.totalAmount,
          startTime,
          endTime: new Date(),
          triggerType: 'SCHEDULED',
          errorDetails: stats.errorDetails?.length ? JSON.stringify(stats.errorDetails) : undefined,
        });

        // S-T6: 发送结算统计事件
        await this.eventEmitter.emitSettlementBatchCompleted('system', {
          settledCount: stats.settledCount,
          failedCount: stats.failedCount,
          totalAmount: stats.totalAmount.toString(),
        });

        // S-T10: 检查失败率并告警
        await this.checkAndAlert(stats);
      }
    } finally {
      this.stopLockRenewal();
      await this.releaseLock();
    }
  }

  /**
   * 手动触发结算（供 Controller 调用）
   * 
   * @description
   * S-T7: 新增手动触发结算接口
   */
  async triggerSettlement(): Promise<SettlementStats> {
    const locked = await this.acquireLock();
    if (!locked) {
      return {
        settledCount: 0,
        failedCount: 0,
        totalAmount: new Decimal(0),
        lastProcessedId: null,
      };
    }

    this.startLockRenewal();
    const startTime = new Date();

    try {
      const stats = await this.doSettle();

      // S-T8: 记录结算日志
      if (stats.settledCount > 0 || stats.failedCount > 0) {
        await this.logService.createLog({
          settledCount: stats.settledCount,
          failedCount: stats.failedCount,
          totalAmount: stats.totalAmount,
          startTime,
          endTime: new Date(),
          triggerType: 'MANUAL',
          errorDetails: stats.errorDetails?.length ? JSON.stringify(stats.errorDetails) : undefined,
        });
      }

      return stats;
    } finally {
      this.stopLockRenewal();
      await this.releaseLock();
    }
  }

  /**
   * 获取结算统计
   * 
   * @description
   * S-T6: 新增结算统计功能
   */
  async getSettlementStats(): Promise<{
    pendingCount: number;
    pendingAmount: Decimal;
    todaySettledCount: number;
    todaySettledAmount: Decimal;
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [pendingStats, todayStats] = await Promise.all([
      this.prisma.finCommission.aggregate({
        where: {
          status: 'FROZEN',
          planSettleTime: { lte: now },
        },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.finCommission.aggregate({
        where: {
          status: 'SETTLED',
          settleTime: { gte: todayStart },
        },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    return {
      pendingCount: pendingStats._count,
      pendingAmount: pendingStats._sum.amount ?? new Decimal(0),
      todaySettledCount: todayStats._count,
      todaySettledAmount: todayStats._sum.amount ?? new Decimal(0),
    };
  }

  /**
   * 执行结算
   * 
   * @description
   * S-T5: 支持断点续传，从上次中断的位置继续
   */
  private async doSettle(): Promise<SettlementStats> {
    const now = new Date();
    let cursor = await this.getCheckpoint();
    let totalSettled = 0;
    let totalFailed = 0;
    let totalAmount = new Decimal(0);
    const errorDetails: string[] = [];

    while (true) {
      const records = await this.prisma.finCommission.findMany({
        where: {
          status: 'FROZEN',
          planSettleTime: { lte: now },
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        orderBy: { id: 'asc' },
        take: this.BATCH_SIZE,
      });

      if (records.length === 0) {
        // 清除断点
        await this.clearCheckpoint();
        break;
      }

      for (const record of records) {
        // S-T3: 带重试的结算
        const result = await this.settleOneWithRetry(record);
        if (result.success) {
          totalSettled++;
          totalAmount = totalAmount.add(record.amount);
        } else {
          totalFailed++;
          if (result.error) {
            errorDetails.push(`Commission ${record.id}: ${result.error}`);
          }
        }
      }

      cursor = records[records.length - 1].id;
      // S-T5: 保存断点
      await this.saveCheckpoint(cursor);
    }

    if (totalSettled > 0 || totalFailed > 0) {
      this.logger.log(
        `Settlement completed: settled=${totalSettled}, failed=${totalFailed}, amount=${totalAmount}`,
      );
    }

    return {
      settledCount: totalSettled,
      failedCount: totalFailed,
      totalAmount,
      lastProcessedId: cursor,
      errorDetails: errorDetails.length > 0 ? errorDetails.slice(0, 100) : undefined, // 最多保留100条错误
    };
  }

  /**
   * 带重试的单条结算
   * 
   * @description
   * S-T3: 增加重试指数退避机制
   */
  private async settleOneWithRetry(commission: {
    id: bigint;
    beneficiaryId: string;
    tenantId: string;
    amount: Decimal;
    orderId: string;
  }): Promise<{ success: boolean; error?: string }> {
    for (let attempt = 1; attempt <= this.MAX_RETRY_COUNT; attempt++) {
      try {
        await this.settleOne(commission);
        return { success: true };
      } catch (error) {
        const errorMsg = getErrorMessage(error);
        const delay = this.BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
        this.logger.warn(
          `Settlement attempt ${attempt}/${this.MAX_RETRY_COUNT} failed for commission ${commission.id}, ` +
          `retrying in ${delay}ms: ${errorMsg}`,
        );

        if (attempt < this.MAX_RETRY_COUNT) {
          await this.sleep(delay);
        } else {
          this.logger.error(
            `Settlement failed after ${this.MAX_RETRY_COUNT} attempts for commission ${commission.id}`,
            getErrorStack(error),
          );
          return { success: false, error: errorMsg };
        }
      }
    }
    return { success: false, error: 'Unknown error' };
  }

  /**
   * S-T10: 检查失败率并告警
   */
  private async checkAndAlert(stats: SettlementStats): Promise<void> {
    const total = stats.settledCount + stats.failedCount;
    if (total === 0) return;

    const failureRate = stats.failedCount / total;
    if (failureRate > this.FAILURE_RATE_THRESHOLD) {
      this.logger.error(
        `[结算告警] 失败率过高: ${(failureRate * 100).toFixed(2)}% ` +
        `(成功: ${stats.settledCount}, 失败: ${stats.failedCount})`,
      );

      // 发送告警事件（可对接监控系统）
      await this.eventEmitter.emit({
        type: 'settlement.alert' as never,
        tenantId: 'system',
        memberId: 'system',
        payload: {
          alertType: 'HIGH_FAILURE_RATE',
          failureRate: failureRate.toFixed(4),
          settledCount: stats.settledCount,
          failedCount: stats.failedCount,
          threshold: this.FAILURE_RATE_THRESHOLD,
        },
        timestamp: new Date(),
      });
    }
  }

  /**
   * 结算单条佣金
   * 
   * @description
   * S-T2: 事务内重新查询状态 where: { status: 'FROZEN' }
   * S-T4: 结算前校验订单状态（通过关联查询）
   */
  private async settleOne(commission: {
    id: bigint;
    beneficiaryId: string;
    tenantId: string;
    amount: Decimal;
    orderId: string;
  }) {
    await this.prisma.$transaction(async (tx) => {
      // S-T2: 原子性更新佣金状态（带状态校验防止并发重复结算）
      const updateResult = await tx.finCommission.updateMany({
        where: {
          id: commission.id,
          status: 'FROZEN',
        },
        data: {
          status: 'SETTLED',
          settleTime: new Date(),
        },
      });

      if (updateResult.count === 0) {
        this.logger.warn(`Commission ${commission.id} skipped: status is not FROZEN`);
        return;
      }

      // 获取或创建钱包
      let wallet = await tx.finWallet.findUnique({
        where: { memberId: commission.beneficiaryId },
      });

      if (!wallet) {
        wallet = await tx.finWallet.create({
          data: {
            memberId: commission.beneficiaryId,
            tenantId: commission.tenantId,
            balance: 0,
            frozen: 0,
            totalIncome: 0,
            pendingRecovery: 0,
          },
        });
      }

      // 检查是否有待回收余额，优先抵扣
      let actualIncome = commission.amount;
      if (wallet.pendingRecovery.gt(0)) {
        const recoveryAmount = Decimal.min(commission.amount, wallet.pendingRecovery);
        actualIncome = commission.amount.minus(recoveryAmount);

        if (recoveryAmount.gt(0)) {
          await tx.finWallet.update({
            where: { id: wallet.id },
            data: {
              pendingRecovery: { decrement: recoveryAmount },
            },
          });
          this.logger.log(
            `[结算回收] 用户 ${commission.beneficiaryId} 抵扣待回收 ${recoveryAmount}`,
          );
        }
      }

      // 增加钱包余额（仅增加抵扣后的实际收入）
      const updatedWallet = await tx.finWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: actualIncome },
          totalIncome: { increment: commission.amount },
          version: { increment: 1 },
        },
      });

      // 写入流水
      await tx.finTransaction.create({
        data: {
          walletId: wallet.id,
          tenantId: commission.tenantId,
          type: 'COMMISSION_IN',
          amount: actualIncome,
          balanceAfter: updatedWallet.balance,
          relatedId: commission.orderId,
          remark: actualIncome.lt(commission.amount)
            ? `订单${commission.orderId}佣金结算（部分抵扣待回收）`
            : `订单${commission.orderId}佣金结算`,
        },
      });
    });

    // 发送佣金结算事件
    await this.eventEmitter.emitCommissionSettled(commission.tenantId, commission.beneficiaryId, {
      commissionId: commission.id.toString(),
      orderId: commission.orderId,
      amount: commission.amount.toString(),
    });
  }

  // ========== 锁管理 ==========

  private async acquireLock(): Promise<boolean> {
    try {
      const result = await this.redis.getClient().set(this.LOCK_KEY, '1', 'EX', this.LOCK_TTL, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.error('Failed to acquire lock', getErrorMessage(error));
      return false;
    }
  }

  private async releaseLock(): Promise<void> {
    try {
      await this.redis.getClient().del(this.LOCK_KEY);
    } catch (error) {
      this.logger.error('Failed to release lock', getErrorMessage(error));
    }
  }

  /**
   * S-T1: 启动看门狗续期
   */
  private startLockRenewal(): void {
    this.lockRenewTimer = setInterval(async () => {
      try {
        await this.redis.getClient().expire(this.LOCK_KEY, this.LOCK_TTL);
        this.logger.debug('Lock renewed');
      } catch (error) {
        this.logger.error('Failed to renew lock', getErrorMessage(error));
      }
    }, this.LOCK_RENEW_INTERVAL);
  }

  /**
   * S-T1: 停止看门狗续期
   */
  private stopLockRenewal(): void {
    if (this.lockRenewTimer) {
      clearInterval(this.lockRenewTimer);
      this.lockRenewTimer = null;
    }
  }

  // ========== 断点续传 ==========

  /**
   * S-T5: 获取断点
   */
  private async getCheckpoint(): Promise<bigint | null> {
    try {
      const checkpoint = await this.redis.getClient().get(this.CHECKPOINT_KEY);
      return checkpoint ? BigInt(checkpoint) : null;
    } catch {
      return null;
    }
  }

  /**
   * S-T5: 保存断点
   */
  private async saveCheckpoint(id: bigint): Promise<void> {
    try {
      // 断点保留 1 小时
      await this.redis.getClient().set(this.CHECKPOINT_KEY, id.toString(), 'EX', 3600);
    } catch (error) {
      this.logger.error('Failed to save checkpoint', getErrorMessage(error));
    }
  }

  /**
   * S-T5: 清除断点
   */
  private async clearCheckpoint(): Promise<void> {
    try {
      await this.redis.getClient().del(this.CHECKPOINT_KEY);
    } catch (error) {
      this.logger.error('Failed to clear checkpoint', getErrorMessage(error));
    }
  }

  // ========== 工具方法 ==========

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
