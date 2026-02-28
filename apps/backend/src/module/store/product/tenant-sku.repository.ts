import { Injectable } from '@nestjs/common';
import { PmsTenantSku, Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/common/repository/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 租户SKU仓储层
 *
 * @description
 * 封装租户SKU相关的数据访问逻辑,继承 BaseRepository 提供通用 CRUD 操作。
 *
 * 核心职责:
 * - 租户SKU的增删改查
 * - 价格更新(支持乐观锁)
 * - 库存更新(原子操作)
 * - 批量查询和批量更新
 *
 * @example
 * // 乐观锁更新价格
 * const updated = await updatePriceWithVersion(
 *   'sku1',
 *   100,
 *   5
 * );
 *
 * // 原子增加库存
 * await incrementStock('sku1', 10);
 */
@Injectable()
export class TenantSkuRepository extends BaseRepository<
  PmsTenantSku,
  Prisma.PmsTenantSkuCreateInput,
  Prisma.PmsTenantSkuUpdateInput
> {
  /**
   * 构造函数
   *
   * @param prisma - Prisma 服务实例
   * @param cls - CLS 上下文服务,用于事务管理和租户隔离
   */
  constructor(prisma: PrismaService, cls: ClsService) {
    // 指定模型名、主键名、租户字段名
    super(prisma, cls, 'pmsTenantSku', 'id', 'tenantId');
  }

  /**
   * 查询租户SKU(带关联信息)
   *
   * @description
   * 关联查询:
   * - 全局SKU(规格值、指导价)
   * - 租户商品(商品名称)
   *
   * @param where - 查询条件
   * @returns SKU列表
   *
   * @example
   * const skus = await findWithRelations({
   *   tenantId: 't1',
   *   tenantProdId: 'tp1'
   * });
   */
  async findWithRelations(where: Prisma.PmsTenantSkuWhereInput) {
    return this.delegate.findMany({
      where,
      include: {
        globalSku: true,
        tenantProd: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Upsert 租户 SKU（按 tenantProductId+globalSkuId 唯一约束）
   */
  async upsert(args: Prisma.PmsTenantSkuUpsertArgs) {
    return (this.delegate as Prisma.PmsTenantSkuDelegate).upsert(args);
  }

  /**
   * 根据全局SKU ID查询租户SKU
   *
   * @description
   * 用于检查租户是否已引入某个全局SKU
   *
   * @param tenantId - 租户ID
   * @param skuId - 全局SKU ID
   * @returns 租户SKU或 null
   *
   * @example
   * const sku = await findByGlobalSku('t1', 's1');
   */
  async findByGlobalSku(tenantId: string, skuId: string) {
    return this.delegate.findFirst({
      where: { tenantId, skuId },
    });
  }

  /**
   * 批量查询租户SKU(按全局SKU ID)
   *
   * @param tenantId - 租户ID
   * @param skuIds - 全局SKU ID列表
   * @returns 租户SKU列表
   *
   * @example
   * const skus = await findByGlobalSkus('t1', ['s1', 's2', 's3']);
   */
  async findByGlobalSkus(tenantId: string, skuIds: string[]) {
    return this.delegate.findMany({
      where: {
        tenantId,
        skuId: { in: skuIds },
      },
    });
  }

  /** 库存列表查询返回类型（含 globalSku、tenantProd 关联） */
  private static readonly STOCK_LIST_INCLUDE = {
    globalSku: true,
    tenantProd: { include: { product: true } },
  } as const;

  /**
   * 库存列表分页查询(按租户、商品名称)
   *
   * @param tenantId - 租户ID
   * @param options - skip, take, productName
   * @returns [records, total]
   */
  async findStockList(
    tenantId: string,
    options: { skip: number; take: number; productName?: string },
  ): Promise<
    [
      Prisma.PmsTenantSkuGetPayload<{
        include: typeof TenantSkuRepository.STOCK_LIST_INCLUDE;
      }>[],
      number,
    ]
  > {
    const where: Prisma.PmsTenantSkuWhereInput = {
      tenantProd: {
        tenantId,
        product: options.productName ? { name: { contains: options.productName } } : undefined,
      },
    };
    const [records, total] = await Promise.all([
      this.delegate.findMany({
        where,
        skip: options.skip,
        take: options.take,
        include: TenantSkuRepository.STOCK_LIST_INCLUDE,
      }),
      this.delegate.count({ where }),
    ]);
    return [records, total];
  }

  /**
   * 根据租户商品ID查询SKU列表
   *
   * @param tenantProdId - 租户商品ID
   * @returns SKU列表
   *
   * @example
   * const skus = await findByTenantProduct('tp1');
   */
  async findByTenantProduct(tenantProdId: string) {
    return this.delegate.findMany({
      where: { tenantProdId },
      orderBy: { createTime: 'asc' },
    });
  }

  /**
   * 使用乐观锁更新价格
   *
   * @description
   * 使用 version 字段防止并发更新冲突:
   * 1. 在 WHERE 条件中检查 version
   * 2. 更新时 version + 1
   * 3. 如果 version 不匹配,更新失败
   *
   * @param tenantSkuId - 租户SKU ID
   * @param price - 新价格
   * @param currentVersion - 当前版本号
   * @returns 更新后的SKU,失败返回 null
   *
   * @performance
   * - 乐观锁适用于冲突率 < 5% 的场景
   * - 冲突时需要前端重试
   *
   * @example
   * const updated = await updatePriceWithVersion('sku1', 100, 5);
   * if (!updated) {
   *   throw new BusinessException('更新失败,数据已被修改,请重试');
   * }
   */
  async updatePriceWithVersion(tenantSkuId: string, price: number, currentVersion: number) {
    try {
      return await this.delegate.update({
        where: {
          id: tenantSkuId,
          version: currentVersion, // 乐观锁条件
        },
        data: {
          price,
          version: { increment: 1 }, // 版本号 + 1
          updateTime: new Date(),
        },
      });
    } catch (error) {
      // 版本号不匹配时,Prisma 会抛出 RecordNotFound 错误
      return null;
    }
  }

  /**
   * 原子增加库存
   *
   * @description
   * 使用数据库原子操作,避免并发问题
   *
   * @param tenantSkuId - 租户SKU ID
   * @param amount - 增加数量(正数)
   * @returns 更新后的SKU
   *
   * @example
   * await incrementStock('sku1', 10); // 库存 + 10
   */
  async incrementStock(tenantSkuId: string, amount: number) {
    return this.delegate.update({
      where: { id: tenantSkuId },
      data: {
        stock: { increment: amount },
        updateTime: new Date(),
      },
    });
  }

  /**
   * 原子减少库存
   *
   * @description
   * 使用数据库原子操作,避免并发问题。
   * 注意: 此方法不检查库存是否充足,调用前需要先检查。
   *
   * @param tenantSkuId - 租户SKU ID
   * @param amount - 减少数量(正数)
   * @returns 更新后的SKU
   *
   * @example
   * // 先检查库存
   * const sku = await findById('sku1');
   * if (sku.stock < 5) {
   *   throw new BusinessException('库存不足');
   * }
   * // 再扣减
   * await decrementStock('sku1', 5);
   */
  async decrementStock(tenantSkuId: string, amount: number) {
    return this.delegate.update({
      where: { id: tenantSkuId },
      data: {
        stock: { decrement: amount },
        updateTime: new Date(),
      },
    });
  }

  /**
   * 按租户原子更新库存(带库存检查)
   *
   * @description
   * 使用 updateMany 原子操作,租户隔离,扣减时 WHERE 检查库存充足
   *
   * @param tenantId - 租户ID
   * @param skuId - 租户SKU主键ID
   * @param change - 库存变化量(正数增加,负数减少)
   * @returns 更新成功返回最新SKU,失败返回 { updated: false, sku } 便于区分不存在/库存不足
   */
  async updateStockForTenant(
    tenantId: string,
    skuId: string,
    change: number,
  ): Promise<{ updated: true; sku: PmsTenantSku } | { updated: false; sku: PmsTenantSku | null }> {
    const affected = await this.delegate.updateMany({
      where: {
        id: skuId,
        tenantId,
        stock: change < 0 ? { gte: Math.abs(change) } : undefined,
      },
      data: {
        stock: { [change > 0 ? 'increment' : 'decrement']: Math.abs(change) },
      },
    });

    if (affected.count > 0) {
      const sku = await this.delegate.findUnique({
        where: { id: skuId },
        include: {
          globalSku: true,
          tenantProd: { include: { product: true } },
        },
      });
      return { updated: true, sku: sku! };
    }

    const sku = await this.delegate.findFirst({
      where: { id: skuId, tenantId },
    });
    return { updated: false, sku };
  }

  /**
   * 原子更新库存(带库存检查)
   *
   * @description
   * 使用 WHERE 条件确保库存充足:
   * - 如果库存不足,更新失败
   * - 如果库存充足,原子扣减
   *
   * @param tenantSkuId - 租户SKU ID
   * @param change - 库存变化量(正数增加,负数减少)
   * @returns 更新后的SKU,失败返回 null
   *
   * @example
   * const updated = await updateStockSafely('sku1', -5);
   * if (!updated) {
   *   throw new BusinessException('库存不足');
   * }
   */
  async updateStockSafely(tenantSkuId: string, change: number) {
    try {
      if (change >= 0) {
        // 增加库存,无需检查
        return await this.incrementStock(tenantSkuId, change);
      } else {
        // 减少库存,需要检查
        const sku = await this.findById(tenantSkuId);
        if (!sku || sku.stock < Math.abs(change)) {
          return null; // 库存不足
        }

        return await this.delegate.update({
          where: {
            id: tenantSkuId,
            stock: { gte: Math.abs(change) }, // 确保库存充足
          },
          data: {
            stock: { increment: change }, // change 是负数
            updateTime: new Date(),
          },
        });
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * 批量更新SKU状态
   *
   * @param tenantSkuIds - 租户SKU ID列表
   * @param status - 目标状态
   * @returns 更新数量
   *
   * @example
   * await updateStatus(['sku1', 'sku2'], 'ON_SHELF');
   */
  async updateStatus(tenantSkuIds: string[], status: string) {
    return this.updateMany(
      { id: { in: tenantSkuIds } },
      { status },
    );
  }

  /**
   * 批量更新SKU价格
   *
   * @description
   * 注意: 此方法不使用乐观锁,适用于批量操作场景
   *
   * @param updates - 更新列表 [{ tenantSkuId, price }]
   * @returns 更新数量
   *
   * @example
   * await batchUpdatePrice([
   *   { tenantSkuId: 'sku1', price: 100 },
   *   { tenantSkuId: 'sku2', price: 200 },
   * ]);
   */
  async batchUpdatePrice(updates: Array<{ tenantSkuId: string; price: number }>) {
    // 使用事务批量更新
    const client = this.client as PrismaService;
    return client.$transaction(
      updates.map(({ tenantSkuId, price }) =>
        this.delegate.update({
          where: { id: tenantSkuId },
          data: { price, updateTime: new Date() },
        }),
      ),
    );
  }
}
