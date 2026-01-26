import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/repository/base.repository';
import { MktUserAsset, Prisma, AssetStatus } from '@prisma/client';
import { ListUserAssetDto } from './dto/asset.dto';
import { ClsService } from 'nestjs-cls';

/**
 * 用户资产仓储
 *
 * @description 处理用户营销资产 (券、次卡) 的持久化操作
 */
@Injectable()
export class UserAssetRepository extends BaseRepository<MktUserAsset, any, any> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'mktUserAsset');
  }

  /**
   * 分页搜索用户资产
   */
  async search(query: ListUserAssetDto) {
    const where: Prisma.MktUserAssetWhereInput = {};

    if (query.memberId) {
      where.memberId = query.memberId;
    }

    if (query.status) {
      where.status = query.status;
    }

    return this.findPage({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      where,
      orderBy: 'createTime',
      order: 'desc',
    });
  }

  /**
   * 核销资产 (扣减余额)
   */
  async consume(id: string, amount: number) {
    return this.prisma.mktUserAsset.update({
      where: { id },
      data: {
        balance: { decrement: amount },
        status: {
          set: amount > 0 ? AssetStatus.USED : AssetStatus.UNUSED, // 简化的逻辑，通常需要更复杂的余量判断
        },
      },
    });
    // 注意：Prisma 的 decrement 对 Decimal 字段可能需要处理
    // 或者直接先查再更 (配合事务)
  }
}
