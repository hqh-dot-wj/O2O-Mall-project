import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/repository/base.repository';
import { Prisma, FinWallet } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

@Injectable()
/**
 * 钱包仓储
 */
export class WalletRepository extends BaseRepository<
  FinWallet,
  Prisma.FinWalletCreateInput,
  Prisma.FinWalletUpdateInput
> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'finWallet');
  }

  /**
   * 根据会员ID查找钱包
   */
  async findByMemberId(memberId: string) {
    return this.delegate.findUnique({
      where: { memberId },
    });
  }

  /**
   * 根据会员ID更新钱包
   */
  async updateByMemberId(memberId: string, data: Prisma.FinWalletUpdateInput) {
    return this.delegate.update({
      where: { memberId },
      data,
    });
  }

  /**
   * 原子性扣减余额（带余额校验）
   * 
   * @description
   * 使用 where 条件校验 balance >= amount，防止并发扣减导致余额变负
   * 如果余额不足，updateMany 返回 count=0，调用方需检查并抛出异常
   * 
   * @param memberId - 会员ID
   * @param amount - 扣减金额
   * @param data - 其他更新数据
   * @returns 更新记录数（0 表示余额不足）
   */
  async deductBalanceAtomic(
    memberId: string,
    amount: Prisma.Decimal,
    data: Omit<Prisma.FinWalletUpdateInput, 'balance'>,
  ): Promise<number> {
    const result = await this.delegate.updateMany({
      where: {
        memberId,
        balance: { gte: amount },
      },
      data: {
        ...data,
        balance: { decrement: amount },
      },
    });
    return result.count;
  }

  /**
   * 原子性冻结余额（带余额校验）
   * 
   * @description
   * 冻结操作：balance -= amount, frozen += amount
   * 使用 where 条件校验 balance >= amount
   * 
   * @param memberId - 会员ID
   * @param amount - 冻结金额
   * @returns 更新记录数（0 表示余额不足）
   */
  async freezeBalanceAtomic(memberId: string, amount: Prisma.Decimal): Promise<number> {
    const result = await this.delegate.updateMany({
      where: {
        memberId,
        balance: { gte: amount },
      },
      data: {
        balance: { decrement: amount },
        frozen: { increment: amount },
        version: { increment: 1 },
      },
    });
    return result.count;
  }
}
