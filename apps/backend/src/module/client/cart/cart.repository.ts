import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/repository/base.repository';
import { OmsCartItem, Prisma } from '@prisma/client';

import { ClsService } from 'nestjs-cls';

@Injectable()
export class CartRepository extends BaseRepository<OmsCartItem, Prisma.OmsCartItemCreateInput> {
  constructor(
    prisma: PrismaService,
    private readonly clsService: ClsService,
  ) {
    super(prisma, clsService, 'omsCartItem');
  }

  /**
   * 批量删除购物车商品 (硬删除)
   */
  async deleteByMemberAndTenant(memberId: string, tenantId: string, skuIds: string[]) {
    return this.prisma.omsCartItem.deleteMany({
      where: {
        memberId,
        tenantId,
        skuId: { in: skuIds },
      },
    });
  }

  /**
   * 清空购物车 (硬删除)
   */
  async clearCart(memberId: string, tenantId: string) {
    return this.prisma.omsCartItem.deleteMany({
      where: { memberId, tenantId },
    });
  }

  /**
   * 查询购物车列表
   */
  async findList(memberId: string, tenantId: string) {
    return this.prisma.omsCartItem.findMany({
      where: { memberId, tenantId },
      orderBy: { createTime: 'desc' },
    });
  }
}
