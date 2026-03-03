import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { TransType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  WalletJobData,
  WalletJobType,
  BalanceChangeJobData,
  FreezeJobData,
  BatchSettleJobData,
} from './wallet-queue.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 钱包队列服务
 *
 * @description
 * A-T4: 引入消息队列解耦钱包服务
 * 提供异步钱包操作的入队接口
 *
 * 使用场景：
 * - 高并发场景下的余额变动
 * - 批量结算操作
 * - 需要保证最终一致性的场景
 */
@Injectable()
export class WalletQueueService {
  private readonly logger = new Logger(WalletQueueService.name);

  constructor(
    @InjectQueue('WALLET_OPERATIONS')
    private readonly walletQueue: Queue<WalletJobData>,
  ) {}

  /**
   * 异步增加余额
   *
   * @param memberId - 会员ID
   * @param tenantId - 租户ID
   * @param amount - 金额
   * @param transType - 交易类型
   * @param relatedId - 关联业务ID
   * @param remark - 备注
   * @param idempotencyKey - 幂等键（可选，默认自动生成）
   */
  async enqueueIncreaseBalance(
    memberId: string,
    tenantId: string,
    amount: Decimal | string,
    transType: TransType,
    relatedId: string,
    remark: string,
    idempotencyKey?: string,
  ): Promise<string> {
    const jobData: BalanceChangeJobData = {
      type: WalletJobType.INCREASE_BALANCE,
      memberId,
      tenantId,
      amount: amount.toString(),
      transType,
      relatedId,
      remark,
      idempotencyKey: idempotencyKey || `inc:${relatedId}:${uuidv4()}`,
      createdAt: new Date(),
    };

    const job = await this.walletQueue.add(jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 100,
      removeOnFail: 1000,
    });

    this.logger.log(
      `[WalletQueue] Enqueued INCREASE_BALANCE: member=${memberId}, amount=${amount}, jobId=${job.id}`,
    );

    return job.id?.toString() || '';
  }

  /**
   * 异步扣减余额
   */
  async enqueueDecreaseBalance(
    memberId: string,
    tenantId: string,
    amount: Decimal | string,
    transType: TransType,
    relatedId: string,
    remark: string,
    idempotencyKey?: string,
  ): Promise<string> {
    const jobData: BalanceChangeJobData = {
      type: WalletJobType.DECREASE_BALANCE,
      memberId,
      tenantId,
      amount: amount.toString(),
      transType,
      relatedId,
      remark,
      idempotencyKey: idempotencyKey || `dec:${relatedId}:${uuidv4()}`,
      createdAt: new Date(),
    };

    const job = await this.walletQueue.add(jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 100,
      removeOnFail: 1000,
    });

    this.logger.log(
      `[WalletQueue] Enqueued DECREASE_BALANCE: member=${memberId}, amount=${amount}, jobId=${job.id}`,
    );

    return job.id?.toString() || '';
  }

  /**
   * 异步冻结余额
   */
  async enqueueFreezeBalance(
    memberId: string,
    tenantId: string,
    amount: Decimal | string,
    relatedId: string,
    idempotencyKey?: string,
  ): Promise<string> {
    const jobData: FreezeJobData = {
      type: WalletJobType.FREEZE_BALANCE,
      memberId,
      tenantId,
      amount: amount.toString(),
      relatedId,
      idempotencyKey: idempotencyKey || `freeze:${relatedId}:${uuidv4()}`,
      createdAt: new Date(),
    };

    const job = await this.walletQueue.add(jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });

    this.logger.log(
      `[WalletQueue] Enqueued FREEZE_BALANCE: member=${memberId}, amount=${amount}, jobId=${job.id}`,
    );

    return job.id?.toString() || '';
  }

  /**
   * 异步解冻余额
   */
  async enqueueUnfreezeBalance(
    memberId: string,
    tenantId: string,
    amount: Decimal | string,
    relatedId: string,
    idempotencyKey?: string,
  ): Promise<string> {
    const jobData: FreezeJobData = {
      type: WalletJobType.UNFREEZE_BALANCE,
      memberId,
      tenantId,
      amount: amount.toString(),
      relatedId,
      idempotencyKey: idempotencyKey || `unfreeze:${relatedId}:${uuidv4()}`,
      createdAt: new Date(),
    };

    const job = await this.walletQueue.add(jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });

    this.logger.log(
      `[WalletQueue] Enqueued UNFREEZE_BALANCE: member=${memberId}, amount=${amount}, jobId=${job.id}`,
    );

    return job.id?.toString() || '';
  }

  /**
   * 批量结算入队
   *
   * @description
   * 将多个结算项打包成一个任务，提升处理效率
   */
  async enqueueBatchSettle(
    tenantId: string,
    items: Array<{
      memberId: string;
      amount: Decimal | string;
      commissionId: string;
    }>,
    idempotencyKey?: string,
  ): Promise<string> {
    const jobData: BatchSettleJobData = {
      type: WalletJobType.BATCH_SETTLE,
      memberId: 'batch',
      tenantId,
      items: items.map((item) => ({
        memberId: item.memberId,
        amount: item.amount.toString(),
        commissionId: item.commissionId,
      })),
      idempotencyKey: idempotencyKey || `batch:${uuidv4()}`,
      createdAt: new Date(),
    };

    const job = await this.walletQueue.add(jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 50,
      removeOnFail: 500,
    });

    this.logger.log(
      `[WalletQueue] Enqueued BATCH_SETTLE: count=${items.length}, jobId=${job.id}`,
    );

    return job.id?.toString() || '';
  }

  /**
   * 获取队列状态
   */
  async getQueueStatus(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.walletQueue.getWaitingCount(),
      this.walletQueue.getActiveCount(),
      this.walletQueue.getCompletedCount(),
      this.walletQueue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }
}
