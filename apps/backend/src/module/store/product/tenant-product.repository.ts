import { Injectable } from '@nestjs/common';
import { PmsTenantProduct, Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/common/repository/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 租户商品仓储层
 * 
 * @description
 * 封装租户商品相关的数据访问逻辑,继承 BaseRepository 提供通用 CRUD 操作。
 * 
 * 核心职责:
 * - 租户商品的增删改查
 * - 带关联查询的复杂查询(全局商品、SKU、分类、品牌)
 * - 商品列表分页查询
 * - 商品详情查询
 * 
 * @example
 * // 查询租户商品列表(带关联)
 * const products = await tenantProductRepo.findWithRelations(
 *   { tenantId: 't1', status: PublishStatus.ON_SHELF },
 *   0,
 *   10
 * );
 * 
 * // 查询商品详情(带完整关联)
 * const detail = await tenantProductRepo.findOneWithDetails('tp1');
 */
@Injectable()
export class TenantProductRepository extends BaseRepository<
  PmsTenantProduct,
  Prisma.PmsTenantProductCreateInput,
  Prisma.PmsTenantProductUpdateInput
> {
  /**
   * 构造函数
   * 
   * @param prisma - Prisma 服务实例
   * @param cls - CLS 上下文服务,用于事务管理和租户隔离
   */
  constructor(prisma: PrismaService, cls: ClsService) {
    // 指定模型名、主键名、租户字段名
    super(prisma, cls, 'pmsTenantProduct', 'tenantProdId', 'tenantId');
  }

  /**
   * 查询租户商品列表(带关联信息)
   * 
   * @description
   * 关联查询:
   * - 全局商品(名称、图片、类型)
   * - 分类名称
   * - 品牌名称
   * - 租户SKU列表(价格、库存、规格)
   * 
   * @param where - 查询条件
   * @param skip - 跳过记录数(分页)
   * @param take - 获取记录数(分页)
   * @returns 租户商品列表
   * 
   * @example
   * const products = await findWithRelations(
   *   { tenantId: 't1', status: PublishStatus.ON_SHELF },
   *   0,
   *   10
   * );
   */
  async findWithRelations(where: any, skip: number, take: number) {
    return this.delegate.findMany({
      where,
      include: {
        // 关联全局商品
        globalProduct: {
          select: {
            name: true,
            picUrl: true,
            type: true,
            // 关联分类和品牌
            category: { select: { name: true } },
            brand: { select: { name: true } },
          },
        },
        // 关联租户SKU
        tenantSkus: {
          select: {
            tenantSkuId: true,
            price: true,
            stock: true,
            specValues: true,
            status: true,
          },
        },
      },
      skip,
      take,
      orderBy: { createTime: 'desc' },
    });
  }

  /**
   * 查询租户商品详情(带完整关联信息)
   * 
   * @description
   * 关联查询:
   * - 全局商品(完整信息)
   * - 分类、品牌
   * - 租户SKU列表(完整信息)
   * - 属性值列表
   * 
   * @param tenantProdId - 租户商品ID
   * @returns 租户商品详情对象或 null
   * 
   * @example
   * const detail = await findOneWithDetails('tp1');
   * // {
   * //   tenantProdId: 'tp1',
   * //   globalProduct: { name: '商品A', ... },
   * //   tenantSkus: [{ price: 100, stock: 50, ... }],
   * //   ...
   * // }
   */
  async findOneWithDetails(tenantProdId: string) {
    return this.delegate.findUnique({
      where: { tenantProdId },
      include: {
        // 关联全局商品(完整信息)
        globalProduct: {
          include: {
            category: { select: { name: true } },
            brand: { select: { name: true } },
            globalSkus: true,
            attrValues: {
              include: {
                attribute: { select: { name: true } },
              },
            },
          },
        },
        // 关联租户SKU(完整信息)
        tenantSkus: {
          include: {
            globalSku: {
              select: {
                skuId: true,
                specValues: true,
                guidePrice: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * 根据全局商品ID查询租户商品
   * 
   * @description
   * 用于检查租户是否已引入某个全局商品
   * 
   * @param tenantId - 租户ID
   * @param productId - 全局商品ID
   * @returns 租户商品或 null
   * 
   * @example
   * const exists = await findByGlobalProduct('t1', 'p1');
   * if (exists) {
   *   console.log('商品已引入');
   * }
   */
  async findByGlobalProduct(tenantId: string, productId: string) {
    return this.delegate.findFirst({
      where: { tenantId, productId },
    });
  }

  /**
   * 批量查询租户商品(按全局商品ID)
   * 
   * @description
   * 用于批量检查哪些全局商品已被租户引入
   * 
   * @param tenantId - 租户ID
   * @param productIds - 全局商品ID列表
   * @returns 租户商品列表
   * 
   * @example
   * const imported = await findByGlobalProducts('t1', ['p1', 'p2', 'p3']);
   * // [{ tenantProdId: 'tp1', productId: 'p1', ... }]
   */
  async findByGlobalProducts(tenantId: string, productIds: string[]) {
    return this.delegate.findMany({
      where: {
        tenantId,
        productId: { in: productIds },
      },
      select: {
        tenantProdId: true,
        productId: true,
      },
    });
  }

  /**
   * 统计租户商品数量(带查询条件)
   * 
   * @param where - 查询条件
   * @returns 商品数量
   * 
   * @example
   * const count = await countWithConditions({
   *   tenantId: 't1',
   *   status: PublishStatus.ON_SHELF
   * });
   */
  async countWithConditions(where: any): Promise<number> {
    return this.count(where);
  }

  /**
   * 更新商品状态
   * 
   * @description
   * 批量更新商品的发布状态
   * 
   * @param tenantProdIds - 租户商品ID列表
   * @param status - 目标状态
   * @returns 更新数量
   * 
   * @example
   * await updateStatus(['tp1', 'tp2'], PublishStatus.ON_SHELF);
   */
  async updateStatus(tenantProdIds: string[], status: string) {
    return this.updateMany(
      { tenantProdId: { in: tenantProdIds } },
      { status },
    );
  }
}
