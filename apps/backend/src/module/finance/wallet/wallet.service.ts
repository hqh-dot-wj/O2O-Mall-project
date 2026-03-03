import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { TransType } from '@prisma/client';
import { WalletRepository } from './wallet.repository';
import { TransactionRepository } from './transaction.repository';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { Cacheable, CachePut } from 'src/common/decorators/redis.decorator';
import { CacheEnum } from 'src/common/enum/cache.enum';
import { BusinessException } from 'src/common/exceptions';
import { BusinessConstants } from 'src/common/constants/business.constants';
import { FinanceEventEmitter } from '../events/finance-event.emitter';

/**
 * 钱包服务
 * 管理用户钱包的余额、冻结、解冻等操作
 * 
 * @description
 * W-T3: 单笔金额上限校验
 * W-T4: 事件驱动，余额变动通知
 * W-T6: 支持待回收台账（负余额场景）
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private readonly MAX_SINGLE_AMOUNT = BusinessConstants.FINANCE.MAX_SINGLE_AMOUNT;

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletRepo: WalletRepository,
    private readonly transactionRepo: TransactionRepository,
    private readonly eventEmitter: FinanceEventEmitter,
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
        pendingRecovery: 0,
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

  // ========== 输入校验方法 ==========

  /**
   * 校验单笔金额上限
   * 
   * @description
   * R-IN-WALLET-01: 单笔金额不能超过配置的上限
   * 
   * @throws BusinessException 金额超限时抛出异常
   */
  private validateAmountLimit(amount: Decimal): void {
    BusinessException.throwIf(
      amount.gt(this.MAX_SINGLE_AMOUNT),
      `单笔金额不能超过 ${this.MAX_SINGLE_AMOUNT} 元`,
    );
  }

  /**
   * 校验金额为正数
   * 
   * @description
   * R-IN-WALLET-02: 金额必须大于 0
   */
  private validatePositiveAmount(amount: Decimal): void {
    BusinessException.throwIf(amount.lte(0), '金额必须大于 0');
  }

  // ========== 余额操作方法 ==========

  /**
   * 增加可用余额
   * 
   * @param memberId 会员ID
   * @param amount 金额
   * @param relatedId 关联业务ID
   * @param remark 备注
   * 
   * @description
   * W-T3: 增加单笔金额上限校验
   * W-T4: 发送余额增加事件
   */
  @Transactional()
  @CachePut(CacheEnum.FIN_WALLET_KEY, '{memberId}')
  async addBalance(memberId: string, amount: Decimal, relatedId: string, remark: string) {
    // R-IN-WALLET-01: 单笔金额上限校验
    this.validateAmountLimit(amount);
    this.validatePositiveAmount(amount);

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

    // W-T4: 发送余额增加事件
    await this.eventEmitter.emitBalanceIncreased(wallet.tenantId, memberId, {
      walletId: wallet.id,
      amount: amount.toString(),
      balanceAfter: wallet.balance.toString(),
      relatedId,
      transType: TransType.COMMISSION_IN,
      remark,
    });

    return wallet;
  }

  /**
   * 扣减可用余额（带原子性校验）
   * 
   * @description
   * 使用原子性校验防止并发扣减导致余额变负
   * W-T3: 增加单笔金额上限校验
   * W-T4: 发送余额扣减事件
   * 
   * @throws BusinessException 余额不足时抛出异常
   */
  @Transactional()
  @CachePut(CacheEnum.FIN_WALLET_KEY, '{memberId}')
  async deductBalance(memberId: string, amount: Decimal, relatedId: string, remark: string, type: TransType) {
    // R-IN-WALLET-01: 单笔金额上限校验
    this.validateAmountLimit(amount);
    this.validatePositiveAmount(amount);

    // R-PRE-WALLET-01: 原子性校验余额充足
    const updateCount = await this.walletRepo.deductBalanceAtomic(memberId, amount, {
      version: { increment: 1 },
    });

    BusinessException.throwIf(updateCount === 0, '余额不足');

    // 查询更新后的钱包用于记录流水
    const wallet = await this.walletRepo.findByMemberId(memberId);
    BusinessException.throwIfNull(wallet, '钱包不存在');

    await this.transactionRepo.create({
      wallet: { connect: { id: wallet.id } },
      tenantId: wallet.tenantId,
      type,
      amount: new Decimal(0).minus(amount), // 负数
      balanceAfter: wallet.balance,
      relatedId,
      remark,
    });

    // W-T4: 发送余额扣减事件
    await this.eventEmitter.emitBalanceDecreased(wallet.tenantId, memberId, {
      walletId: wallet.id,
      amount: amount.toString(),
      balanceAfter: wallet.balance.toString(),
      relatedId,
      transType: type,
      remark,
    });

    return wallet;
  }

  /**
   * 扣减余额或记入待回收台账
   * 
   * @description
   * W-T6: 支持负余额场景
   * 当余额不足时，不抛出异常，而是将差额记入待回收台账
   * 用于佣金回滚等场景，避免因余额不足导致回滚失败
   * 
   * @param memberId 会员ID
   * @param amount 扣减金额
   * @param relatedId 关联业务ID
   * @param remark 备注
   * @param type 流水类型
   * @returns 实际扣减金额和待回收金额
   */
  @Transactional()
  @CachePut(CacheEnum.FIN_WALLET_KEY, '{memberId}')
  async deductBalanceOrPendingRecovery(
    memberId: string,
    amount: Decimal,
    relatedId: string,
    remark: string,
    type: TransType,
  ): Promise<{ deducted: Decimal; pendingRecovery: Decimal }> {
    this.validateAmountLimit(amount);
    this.validatePositiveAmount(amount);

    const wallet = await this.walletRepo.findByMemberId(memberId);
    BusinessException.throwIfNull(wallet, '钱包不存在');

    const currentBalance = wallet.balance;
    let deducted: Decimal;
    let pendingRecovery: Decimal;

    if (currentBalance.gte(amount)) {
      // 余额充足，正常扣减
      deducted = amount;
      pendingRecovery = new Decimal(0);

      await this.walletRepo.updateByMemberId(memberId, {
        balance: { decrement: amount },
        version: { increment: 1 },
      });
    } else {
      // 余额不足，扣减可用部分，差额记入待回收
      deducted = currentBalance.gt(0) ? currentBalance : new Decimal(0);
      pendingRecovery = amount.minus(deducted);

      await this.walletRepo.updateByMemberId(memberId, {
        balance: new Decimal(0),
        pendingRecovery: { increment: pendingRecovery },
        version: { increment: 1 },
      });

      this.logger.warn(
        `[待回收] 用户 ${memberId} 余额不足，扣减 ${deducted}，待回收 ${pendingRecovery}`,
      );

      // 发送待回收事件
      await this.eventEmitter.emitPendingRecoveryIncreased(wallet.tenantId, memberId, {
        walletId: wallet.id,
        amount: pendingRecovery.toString(),
        pendingRecoveryAfter: wallet.pendingRecovery.add(pendingRecovery).toString(),
        relatedId,
        reason: remark,
      });
    }

    // 查询更新后的钱包
    const updatedWallet = await this.walletRepo.findByMemberId(memberId);

    // 记录流水（仅记录实际扣减部分）
    if (deducted.gt(0)) {
      await this.transactionRepo.create({
        wallet: { connect: { id: wallet.id } },
        tenantId: wallet.tenantId,
        type,
        amount: new Decimal(0).minus(deducted),
        balanceAfter: updatedWallet?.balance ?? new Decimal(0),
        relatedId,
        remark: pendingRecovery.gt(0) ? `${remark}（部分扣减，待回收 ${pendingRecovery}）` : remark,
      });
    }

    // 发送余额扣减事件
    if (deducted.gt(0)) {
      await this.eventEmitter.emitBalanceDecreased(wallet.tenantId, memberId, {
        walletId: wallet.id,
        amount: deducted.toString(),
        balanceAfter: updatedWallet?.balance.toString() ?? '0',
        relatedId,
        transType: type,
        remark,
      });
    }

    return { deducted, pendingRecovery };
  }

  /**
   * 冻结余额 (申请提现时)
   * 
   * @description
   * 使用原子性校验防止并发冻结导致余额变负
   * W-T3: 增加单笔金额上限校验
   * 
   * @throws BusinessException 余额不足时抛出异常
   */
  @CachePut(CacheEnum.FIN_WALLET_KEY, '{memberId}')
  async freezeBalance(memberId: string, amount: Decimal) {
    // R-IN-WALLET-01: 单笔金额上限校验
    this.validateAmountLimit(amount);
    this.validatePositiveAmount(amount);

    // R-PRE-WALLET-02: 原子性校验余额充足
    const updateCount = await this.walletRepo.freezeBalanceAtomic(memberId, amount);
    BusinessException.throwIf(updateCount === 0, '余额不足');

    // 返回更新后的钱包
    const wallet = await this.walletRepo.findByMemberId(memberId);
    BusinessException.throwIfNull(wallet, '钱包不存在');
    return wallet;
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
   * 回收待回收余额
   * 
   * @description
   * W-T6: 当用户有新收入时，自动抵扣待回收金额
   * 
   * @param memberId 会员ID
   * @param availableAmount 可用于回收的金额
   * @returns 实际回收金额
   */
  @Transactional()
  @CachePut(CacheEnum.FIN_WALLET_KEY, '{memberId}')
  async recoverPendingBalance(memberId: string, availableAmount: Decimal): Promise<Decimal> {
    const wallet = await this.walletRepo.findByMemberId(memberId);
    if (!wallet || wallet.pendingRecovery.lte(0)) {
      return new Decimal(0);
    }

    const recoveryAmount = Decimal.min(availableAmount, wallet.pendingRecovery);
    if (recoveryAmount.lte(0)) {
      return new Decimal(0);
    }

    await this.walletRepo.updateByMemberId(memberId, {
      pendingRecovery: { decrement: recoveryAmount },
      version: { increment: 1 },
    });

    this.logger.log(`[回收] 用户 ${memberId} 回收待回收余额 ${recoveryAmount}`);

    return recoveryAmount;
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
