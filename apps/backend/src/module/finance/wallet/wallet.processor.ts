import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { WalletService } from './wallet.service';
import {
  WalletJobData,
  WalletJobType,
  WalletJobResult,
  BalanceChangeJobData,
  FreezeJobData,
  BatchSettleJobData,
} from './wallet-queue.types';
import { RedisService } from 'src/module/common/redis/redis.service';
import { getErrorMessage } from 'src/common/utils/error';

/**
 * 钱包队列处理器
 *
 * @description
 * A-T4: 引入消息队列解耦钱包服务
 * 异步处理钱包操作，提升系统吞吐量和可靠性
 *
 * 特性：
 * - 幂等性：通过 idempotencyKey 防止重复处理
 * - 重试：失败任务自动重试（最多3次）
 * - 批量处理：支持批量结算优化性能
 */
@Injectable()
@Processor('WALLET_OPERATIONS')
export class WalletProcessor {
  private readonly logger = new Logger(WalletProcessor.name);
  private readonly IDEMPOTENCY_TTL = 86400; // 24小时

  constructor(
    private readonly walletService: WalletService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 处理钱包任务
   */
  @Process()
  async handleJob(job: Job<WalletJobData>): Promise<WalletJobResult> {
    const { data } = job;
    this.logger.log(`[WalletProcessor] Processing job: type=${data.type}, member=${data.memberId}`);

    // 幂等性检查
    const idempotencyKey = `wallet:idempotency:${data.idempotencyKey}`;
    const exists = await this.redis.getClient().get(idempotencyKey);
    if (exists) {
      this.logger.log(`[WalletProcessor] Job already processed: ${data.idempotencyKey}`);
      return JSON.parse(exists) as WalletJobResult;
    }

    let result: WalletJobResult;

    try {
      switch (data.type) {
        case WalletJobType.INCREASE_BALANCE:
          result = await this.handleIncreaseBalance(data as BalanceChangeJobData);
          break;
        case WalletJobType.DECREASE_BALANCE:
          result = await this.handleDecreaseBalance(data as BalanceChangeJobData);
          break;
        case WalletJobType.FREEZE_BALANCE:
          result = await this.handleFreezeBalance(data as FreezeJobData);
          break;
        case WalletJobType.UNFREEZE_BALANCE:
          result = await this.handleUnfreezeBalance(data as FreezeJobData);
          break;
        case WalletJobType.BATCH_SETTLE:
          result = await this.handleBatchSettle(data as BatchSettleJobData);
          break;
        default:
          throw new Error(`Unknown job type: ${(data as WalletJobData).type}`);
      }

      // 记录幂等性标记
      await this.redis.getClient().setex(idempotencyKey, this.IDEMPOTENCY_TTL, JSON.stringify(result));

      this.logger.log(`[WalletProcessor] Job completed: type=${data.type}, success=${result.success}`);
      return result;
    } catch (error) {
      this.logger.error(
        `[WalletProcessor] Job failed: type=${data.type}, error=${getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  /**
   * 处理余额增加
   */
  private async handleIncreaseBalance(data: BalanceChangeJobData): Promise<WalletJobResult> {
    const amount = new Decimal(data.amount);
    const wallet = await this.walletService.addBalance(
      data.memberId,
      amount,
      data.relatedId,
      data.remark,
    );

    return {
      success: true,
      memberId: data.memberId,
      balanceAfter: wallet.balance.toString(),
    };
  }

  /**
   * 处理余额扣减
   */
  private async handleDecreaseBalance(data: BalanceChangeJobData): Promise<WalletJobResult> {
    const amount = new Decimal(data.amount);
    const wallet = await this.walletService.deductBalance(
      data.memberId,
      amount,
      data.relatedId,
      data.remark,
      data.transType,
    );

    return {
      success: true,
      memberId: data.memberId,
      balanceAfter: wallet.balance.toString(),
    };
  }

  /**
   * 处理余额冻结
   */
  private async handleFreezeBalance(data: FreezeJobData): Promise<WalletJobResult> {
    const amount = new Decimal(data.amount);
    await this.walletService.freezeBalance(data.memberId, amount);

    return {
      success: true,
      memberId: data.memberId,
    };
  }

  /**
   * 处理余额解冻
   */
  private async handleUnfreezeBalance(data: FreezeJobData): Promise<WalletJobResult> {
    const amount = new Decimal(data.amount);
    await this.walletService.unfreezeBalance(data.memberId, amount);

    return {
      success: true,
      memberId: data.memberId,
    };
  }

  /**
   * 处理批量结算
   */
  private async handleBatchSettle(data: BatchSettleJobData): Promise<WalletJobResult> {
    let successCount = 0;
    const errors: string[] = [];

    for (const item of data.items) {
      try {
        const amount = new Decimal(item.amount);
        await this.walletService.addBalance(
          item.memberId,
          amount,
          item.commissionId,
          '佣金结算',
        );
        successCount++;
      } catch (error) {
        errors.push(`${item.memberId}: ${getErrorMessage(error)}`);
      }
    }

    return {
      success: errors.length === 0,
      memberId: data.memberId,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }

  /**
   * 任务失败处理
   */
  @OnQueueFailed()
  async onFailed(job: Job<WalletJobData>, error: Error) {
    this.logger.error(
      `[WalletProcessor] Job failed permanently: ` +
        `type=${job.data.type}, member=${job.data.memberId}, ` +
        `attempts=${job.attemptsMade}, error=${error.message}`,
    );

    // 可以在这里发送告警通知
  }
}
