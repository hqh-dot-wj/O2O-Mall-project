import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { TransType } from '@prisma/client';
import { WalletRepository } from './wallet.repository';
import { TransactionRepository } from './transaction.repository';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { Cacheable, CachePut } from 'src/common/decorators/redis.decorator';
import { CacheEnum } from 'src/common/enum/cache.enum';

/**
 * 钱包服务
 * 管理用户钱包的余额、冻结、解冻等操作
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletRepo: WalletRepository,
    private readonly transactionRepo: TransactionRepository,
  ) {}

  /**
   * 获取或创建用户钱包
   */
  async getOrCreateWallet(memberId: string, tenantId: string) {
    let wallet = await this.walletRepo.findByMemberId(memberId);

    if (!wallet) {
      wallet = await this.walletRepo.create({
        member: { connect: { memberId } },
        tenantId,
        balance: 0,
        frozen: 0,
        totalIncome: 0,
      });
      this.logger.log(`Created wallet for member ${memberId}`);
    }

    return wallet;
  }

  /**
   * 获取钱包信息
   */
  @Cacheable(CacheEnum.FIN_WALLET_KEY, '{memberId}')
  async getWallet(memberId: string) {
    return this.walletRepo.findByMemberId(memberId);
  }

  /**
   * 增加可用余额
   * @param memberId 会员ID
   * @param amount 金额
   * @param relatedId 关联业务ID
   * @param remark 备注
   */
  @Transactional()
  @CachePut(CacheEnum.FIN_WALLET_KEY, '{memberId}')
  async addBalance(memberId: string, amount: Decimal, relatedId: string, remark: string) {
    // 使用乐观锁更新余额
    const wallet = await this.walletRepo.updateByMemberId(memberId, {
      balance: { increment: amount },
      totalIncome: { increment: amount },
      version: { increment: 1 },
    });

    // 写入流水
    await this.transactionRepo.create({
      wallet: { connect: { id: wallet.id } },
      tenantId: wallet.tenantId,
      type: TransType.COMMISSION_IN,
      amount,
      balanceAfter: wallet.balance,
      relatedId,
      remark,
    });

    return wallet;
  }

  /**
   * 扣减可用余额
   */
  @Transactional()
  @CachePut(CacheEnum.FIN_WALLET_KEY, '{memberId}')
  async deductBalance(memberId: string, amount: Decimal, relatedId: string, remark: string, type: TransType) {
    const wallet = await this.walletRepo.updateByMemberId(memberId, {
      balance: { decrement: amount },
      version: { increment: 1 },
    });

    await this.transactionRepo.create({
      wallet: { connect: { id: wallet.id } },
      tenantId: wallet.tenantId,
      type,
      amount: new Decimal(0).minus(amount), // 负数
      balanceAfter: wallet.balance,
      relatedId,
      remark,
    });

    return wallet;
  }

  /**
   * 冻结余额 (申请提现时)
   */
  @CachePut(CacheEnum.FIN_WALLET_KEY, '{memberId}')
  async freezeBalance(memberId: string, amount: Decimal) {
    return this.walletRepo.updateByMemberId(memberId, {
      balance: { decrement: amount },
      frozen: { increment: amount },
      version: { increment: 1 },
    });
  }

  /**
   * 解冻余额 (提现驳回时退回)
   */
  @CachePut(CacheEnum.FIN_WALLET_KEY, '{memberId}')
  async unfreezeBalance(memberId: string, amount: Decimal) {
    return this.walletRepo.updateByMemberId(memberId, {
      balance: { increment: amount },
      frozen: { decrement: amount },
      version: { increment: 1 },
    });
  }

  /**
   * 扣减冻结余额 (提现成功时)
   */
  @CachePut(CacheEnum.FIN_WALLET_KEY, '{memberId}')
  async deductFrozen(memberId: string, amount: Decimal) {
    return this.walletRepo.updateByMemberId(memberId, {
      frozen: { decrement: amount },
      version: { increment: 1 },
    });
  }

  /**
   * 获取用户流水列表
   */
  async getTransactions(memberId: string, page: number = 1, size: number = 20) {
    const wallet = await this.getWallet(memberId);
    if (!wallet) {
      return { list: [], total: 0 };
    }

    const [list, total] = await Promise.all([
      this.prisma.finTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createTime: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.finTransaction.count({
        where: { walletId: wallet.id },
      }),
    ]);

    return { list, total };
  }
}
