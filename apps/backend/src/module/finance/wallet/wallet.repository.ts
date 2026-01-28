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
}
