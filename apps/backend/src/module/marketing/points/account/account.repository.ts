import { Injectable } from '@nestjs/common';
import { MktPointsAccount, Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/common/repository/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 积分账户仓储
 * 
 * @description 继承 BaseRepository，自动处理租户隔离
 */
@Injectable()
export class PointsAccountRepository extends BaseRepository<
  MktPointsAccount,
  Prisma.MktPointsAccountCreateInput,
  Prisma.MktPointsAccountUpdateInput
> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'mktPointsAccount', 'id', 'tenantId');
  }

  /**
   * 根据用户ID查询积分账户
   * 
   * @param memberId 用户ID
   * @returns 积分账户
   */
  async findByMemberId(memberId: string): Promise<MktPointsAccount | null> {
    return this.findOne({
      where: {
        memberId,
      },
    });
  }

  /**
   * 使用乐观锁更新账户余额
   * 
   * @param accountId 账户ID
   * @param version 当前版本号
   * @param data 更新数据
   * @returns 更新后的账户
   */
  async updateWithOptimisticLock(
    accountId: string,
    version: number,
    data: Partial<MktPointsAccount>,
  ): Promise<MktPointsAccount | null> {
    const result = await this.prisma.mktPointsAccount.updateMany({
      where: {
        id: accountId,
        version,
      },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(accountId);
  }
}
