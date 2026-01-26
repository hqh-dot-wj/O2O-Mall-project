import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/module/common/redis/redis.service';
import { WalletService } from '../wallet/wallet.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * 结算定时任务
 * 每5分钟扫描到期的冻结佣金并结算到用户钱包
 */
@Injectable()
export class SettlementScheduler {
  private readonly logger = new Logger(SettlementScheduler.name);
  private readonly LOCK_KEY = 'lock:settle:commission';
  private readonly LOCK_TTL = 300; // 5分钟
  private readonly BATCH_SIZE = 100;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly walletService: WalletService,
  ) {}

  /**
   * 每5分钟执行结算任务
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async settleJob() {
    // 获取分布式锁
    const locked = await this.acquireLock();
    if (!locked) {
      this.logger.debug('Settlement job skipped: another instance is running');
      return;
    }

    try {
      await this.doSettle();
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * 执行结算
   */
  private async doSettle() {
    const now = new Date();
    let cursor: bigint | null = null;
    let totalSettled = 0;

    while (true) {
      // 查询到期的冻结佣金
      const records = await this.prisma.finCommission.findMany({
        where: {
          status: 'FROZEN',
          planSettleTime: { lte: now },
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        orderBy: { id: 'asc' },
        take: this.BATCH_SIZE,
      });

      if (records.length === 0) break;

      // 批量处理
      for (const record of records) {
        try {
          await this.settleOne(record);
          totalSettled++;
        } catch (error) {
          this.logger.error(`Settlement failed for commission ${record.id}`, error);
          // 单条失败不影响其他记录
        }
      }

      cursor = records[records.length - 1].id;
    }

    if (totalSettled > 0) {
      this.logger.log(`Settled ${totalSettled} commission records`);
    }
  }

  /**
   * 结算单条佣金
   */
  private async settleOne(commission: any) {
    await this.prisma.$transaction(async (tx) => {
      // 1. 更新佣金状态
      await tx.finCommission.update({
        where: { id: commission.id },
        data: {
          status: 'SETTLED',
          settleTime: new Date(),
        },
      });

      // 2. 获取或创建钱包
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
          },
        });
      }

      // 3. 增加钱包余额
      const updatedWallet = await tx.finWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: commission.amount },
          totalIncome: { increment: commission.amount },
          version: { increment: 1 },
        },
      });

      // 4. 写入流水
      await tx.finTransaction.create({
        data: {
          walletId: wallet.id,
          tenantId: commission.tenantId,
          type: 'COMMISSION_IN',
          amount: commission.amount,
          balanceAfter: updatedWallet.balance,
          relatedId: commission.orderId,
          remark: `订单${commission.orderId}佣金结算`,
        },
      });
    });
  }

  /**
   * 获取分布式锁
   */
  private async acquireLock(): Promise<boolean> {
    try {
      const result = await this.redis.getClient().set(this.LOCK_KEY, '1', 'EX', this.LOCK_TTL, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.error('Failed to acquire lock', error);
      return false;
    }
  }

  /**
   * 释放分布式锁
   */
  private async releaseLock(): Promise<void> {
    try {
      await this.redis.getClient().del(this.LOCK_KEY);
    } catch (error) {
      this.logger.error('Failed to release lock', error);
    }
  }
}
