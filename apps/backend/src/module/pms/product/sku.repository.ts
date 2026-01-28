import { Injectable } from '@nestjs/common';
import { PmsGlobalSku, Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/common/repository/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * SKU仓储层
 * 封装商品SKU（Stock Keeping Unit）相关的数据访问逻辑
 * 继承BaseRepository提供通用CRUD操作
 * 
 * @class SkuRepository
 * @extends {BaseRepository<PmsGlobalSku, Prisma.PmsGlobalSkuCreateInput, Prisma.PmsGlobalSkuUpdateInput>}
 */
@Injectable()
export class SkuRepository extends BaseRepository<
  PmsGlobalSku,
  Prisma.PmsGlobalSkuCreateInput,
  Prisma.PmsGlobalSkuUpdateInput
> {
  /**
   * 构造函数
   * @param prisma - Prisma服务实例
   * @param cls - CLS上下文服务，用于事务管理
   */
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'pmsGlobalSku', 'skuId');
  }

  /**
   * 批量创建SKU
   * @param data - SKU数据数组
   * @returns 创建结果
   */
  async createManySkus(data: Prisma.PmsGlobalSkuCreateManyInput[]) {
    return this.createMany(data);
  }

  /**
   * 根据商品ID删除该商品的所有SKU
   * 用于商品删除或SKU全量更新时的清理操作
   * @param productId - 商品ID
   * @returns 删除结果
   */
  async deleteByProductId(productId: string) {
    return this.deleteMany({ productId });
  }

  /**
   * 根据商品ID查询该商品的所有SKU
   * @param productId - 商品ID
   * @returns SKU列表
   */
  async findByProductId(productId: string) {
    return this.findMany({ where: { productId } });
  }

  /**
   * 根据SKU ID列表批量查询
   * @param skuIds - SKU ID数组
   * @returns SKU列表
   */
  async findByIds(skuIds: string[]) {
    return this.findMany({ where: { skuId: { in: skuIds } } });
  }
}
