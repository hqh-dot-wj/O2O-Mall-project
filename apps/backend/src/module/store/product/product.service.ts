import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, DistributionMode, PublishStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import {
  ImportProductDto,
  ListMarketProductDto,
  ListStoreProductDto,
  UpdateProductBaseDto,
  UpdateProductPriceDto,
} from './dto';
import { ProfitValidator } from './profit-validator';

/**
 * 店铺商品管理服务
 * 处理店铺选品、导入、价格调整、列表查询等逻辑
 */
@Injectable()
export class StoreProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profitValidator: ProfitValidator,
  ) {}

  /**
   * 选品中心 - 查询全局商品列表
   * 支持名称搜索、分类筛选、类型筛选，并标记是否已引入
   */
  async getMarketList(tenantId: string, query: ListMarketProductDto) {
    const { name, categoryId, type } = query;

    const where: Prisma.PmsProductWhereInput = {
      publishStatus: PublishStatus.ON_SHELF,
    };

    if (name) where.name = { contains: name };
    if (categoryId) where.categoryId = Number(categoryId);
    if (type) where.type = type;

    const [list, total] = await Promise.all([
      this.prisma.pmsProduct.findMany({
        where,
        include: {
          globalSkus: true,
          tenantProducts: {
            where: { tenantId },
          },
        },
        skip: query.skip,
        take: query.take,
        orderBy: { createTime: 'desc' },
      }),
      this.prisma.pmsProduct.count({ where }),
    ]);

    const formatted = list.map((item) => {
      const { tenantProducts, ...rest } = item;
      return {
        productId: rest.productId,
        name: rest.name,
        albumPics: rest.mainImages ? rest.mainImages.join(',') : '',
        type: rest.type,
        hasSku: rest.globalSkus.length > 0,
        price: rest.globalSkus?.[0]?.guidePrice || 0,
        isImported: tenantProducts.length > 0,
      };
    });

    return Result.page(formatted, total);
  }

  /**
   * 选品中心 - 获取商品详情 (含SKU)
   */
  async getMarketDetail(tenantId: string, productId: string) {
    const product = await this.prisma.pmsProduct.findUnique({
      where: { productId },
      include: {
        globalSkus: true,
        tenantProducts: {
          where: { tenantId },
        },
      },
    });
    BusinessException.throwIfNull(product, '商品不存在');

    // Check if already imported to set 'isImported' flag if needed,
    // though usually the dialog handles 'isImported' logic by list view status.
    // We focus on returning details here.

    const { tenantProducts, ...rest } = product;
    return Result.ok({
      productId: rest.productId,
      name: rest.name,
      albumPics: rest.mainImages ? rest.mainImages.join(',') : '',
      type: rest.type,
      hasSku: rest.globalSkus.length > 0,
      price: rest.globalSkus?.[0]?.guidePrice || 0,
      isImported: tenantProducts.length > 0,
      serviceRadius: rest.serviceRadius ? Number(rest.serviceRadius) : 0,
      globalSkus: rest.globalSkus.map((sku) => ({
        skuId: sku.skuId,
        productId: sku.productId,
        specValues: sku.specValues,
        skuImage: sku.skuImage,
        guidePrice: Number(sku.guidePrice),
        guideRate: Number(sku.guideRate),
        distMode: sku.distMode,
        costPrice: Number(sku.costPrice),
      })),
    });
  }

  /**
   * 导入商品到店铺
   *
   * @description
   * 将全局商品库中的商品导入到当前店铺,包括商品基础信息和SKU配置。
   * 导入后商品默认为下架状态,需手动上架。
   *
   * @param tenantId - 当前租户ID
   * @param dto - 导入参数
   * @param dto.productId - 全局商品ID
   * @param dto.overrideRadius - 覆盖服务半径(米),null表示使用全局配置
   * @param dto.skus - SKU配置列表
   * @returns 创建的店铺商品记录
   *
   * @throws BusinessException
   * - 商品不存在: 全局商品ID无效
   * - 无效SKU: SKU ID不属于该商品
   * - 利润校验失败: 价格设置导致亏损
   *
   * @transaction 使用数据库事务保证原子性
   * @concurrency 使用 upsert 防止并发重复导入
   *
   * @example
   * await importProduct('tenant123', {
   *   productId: 'prod001',
   *   overrideRadius: 5000,
   *   skus: [
   *     { globalSkuId: 'sku001', price: 99.00, stock: 100, distMode: 'RATIO', distRate: 0.15 }
   *   ]
   * });
   */
  async importProduct(tenantId: string, dto: ImportProductDto) {
    const { productId, overrideRadius, skus } = dto;

    // 在事务内完成所有操作
    const res = await this.prisma.$transaction(async (tx) => {
      // 1. 在事务内检查全局商品是否存在
      const globalProduct = await tx.pmsProduct.findUnique({
        where: { productId },
        include: { globalSkus: true },
      });
      BusinessException.throwIfNull(globalProduct, '商品不存在');

      // 2. 校验 SKU 有效性
      if (skus && skus.length > 0) {
        const validSkuIds = new Set(globalProduct.globalSkus.map((s) => s.skuId));
        const invalidSkus = skus.filter((s) => !validSkuIds.has(s.globalSkuId));
        BusinessException.throwIf(
          invalidSkus.length > 0,
          `无效的SKU: ${invalidSkus.map((s) => s.globalSkuId).join(',')}`,
          ResponseCode.PARAM_INVALID,
        );

        // 3. 校验每个SKU的利润
        for (const sku of skus) {
          const globalSku = globalProduct.globalSkus.find((g) => g.skuId === sku.globalSkuId);
          if (globalSku) {
            this.profitValidator.validate(
              sku.price,
              globalSku.costPrice,
              sku.distRate || 0,
              sku.distMode || DistributionMode.RATIO,
            );
          }
        }
      }

      // 4. 使用 upsert 创建或更新店铺商品(防止并发重复导入)
      const tenantProduct = await tx.pmsTenantProduct.upsert({
        where: { tenantId_productId: { tenantId, productId } },
        create: {
          tenantId,
          productId,
          status: PublishStatus.OFF_SHELF,
          overrideRadius: overrideRadius,
        },
        update: {
          // 如果已存在,更新服务半径
          overrideRadius: overrideRadius,
        },
      });

      // 5. 批量创建 SKU(使用 skipDuplicates 防止重复)
      if (skus && skus.length > 0) {
        await tx.pmsTenantSku.createMany({
          data: skus.map((sku) => ({
            tenantId,
            tenantProductId: tenantProduct.id,
            globalSkuId: sku.globalSkuId,
            price: new Decimal(sku.price),
            stock: sku.stock,
            distMode: sku.distMode || DistributionMode.RATIO,
            distRate: new Decimal(sku.distRate || 0),
            isActive: true,
          })),
          skipDuplicates: true, // 防止重复创建
        });
      }

      return tenantProduct;
    });

    return Result.ok(res);
  }

  /**
   * 店铺商品列表
   * 查询当前店铺已引入的商品
   */
  async findAll(tenantId: string, query: ListStoreProductDto) {
    const { name, type, status, storeId } = query;

    const where: Prisma.PmsTenantProductWhereInput = {
      tenantId: storeId || tenantId, // 优先使用查询参数中的 storeId (HQ场景), 否则使用 Token 中的租户ID
    };

    if (name) {
      where.OR = [{ customTitle: { contains: name } }, { product: { name: { contains: name } } }];
    }
    if (type) where.product = { type };
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      this.prisma.pmsTenantProduct.findMany({
        where,
        include: {
          product: true,
          skus: {
            include: { globalSku: true },
          },
        },
        skip: query.skip,
        take: query.take,
        orderBy: { createTime: 'desc' },
      }),
      this.prisma.pmsTenantProduct.count({ where }),
    ]);

    const formatted = list.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.product.name,
      albumPics: item.product.mainImages ? item.product.mainImages.join(',') : '',
      type: item.product.type,
      status: item.status,
      isHot: item.isHot,
      price: Number(item.skus?.[0]?.price || 0),
      customTitle: item.customTitle,
      overrideRadius: item.overrideRadius,
      skus: item.skus.map((sku) => ({
        id: sku.id,
        price: Number(sku.price),
        stock: sku.stock,
        distMode: sku.distMode,
        distRate: Number(sku.distRate),
        isActive: sku.isActive,
        specValues: sku.globalSku.specValues,
        costPrice: Number(sku.globalSku.costPrice),
        guidePrice: Number(sku.globalSku.guidePrice),
      })),
    }));

    return Result.page(formatted, total);
  }

  /**
   * 更新店铺商品价格/分销配置/库存
   *
   * @description
   * 需校验利润风控 (售价 - 成本 - 分销佣金 > 0)
   * 使用乐观锁防止并发更新冲突
   *
   * @param tenantId - 租户ID
   * @param dto - 更新参数
   * @returns 更新后的SKU信息
   *
   * @throws BusinessException
   * - SKU不存在
   * - 无权操作此商品
   * - 价格设置导致亏损
   * - 更新失败,数据已被修改,请重试 (乐观锁冲突)
   *
   * @concurrency 使用乐观锁(version字段)防止并发更新
   * @performance 冲突率低(<1%),适合商品价格更新场景
   *
   * @example
   * // 更新商品价格
   * await updateProductPrice('tenant1', {
   *   tenantSkuId: 'sku1',
   *   price: 99.00,
   *   stock: 100,
   *   distRate: 0.15,
   *   distMode: 'RATIO'
   * });
   */
  async updateProductPrice(tenantId: string, dto: UpdateProductPriceDto) {
    const { tenantSkuId, price, stock, distRate, distMode } = dto;

    // 1. 获取店铺 SKU (包含当前版本号)
    const tenantSku = await this.prisma.pmsTenantSku.findUnique({
      where: { id: tenantSkuId },
      include: {
        tenantProd: true,
        globalSku: true,
      },
    });
    BusinessException.throwIfNull(tenantSku, 'SKU不存在');
    BusinessException.throwIf(tenantSku.tenantProd.tenantId !== tenantId, '无权操作此商品', ResponseCode.FORBIDDEN);

    // 2. 利润风控校验(使用 ProfitValidator)
    const currentDistMode = distMode || tenantSku.distMode;
    const currentDistRate = distRate !== undefined ? distRate : tenantSku.distRate;
    const cost = tenantSku.globalSku.costPrice;

    // 使用 ProfitValidator 进行完整的参数校验和利润校验
    this.profitValidator.validate(price, cost, Number(currentDistRate), currentDistMode);

    // 3. 使用乐观锁更新数据库
    // updateMany 返回 { count: number },如果 count=0 说明版本号不匹配(被其他请求修改了)
    const affected = await this.prisma.pmsTenantSku.updateMany({
      where: {
        id: tenantSkuId,
        version: tenantSku.version, // 乐观锁条件: 版本号必须匹配
        tenantProd: { tenantId }, // 额外安全检查
      },
      data: {
        price: new Decimal(price),
        stock: stock !== undefined ? stock : undefined,
        distRate: distRate !== undefined ? new Decimal(distRate) : undefined,
        distMode: distMode !== undefined ? distMode : undefined,
        version: { increment: 1 }, // 版本号+1
      },
    });

    // 4. 检查更新结果
    if (affected.count === 0) {
      throw new BusinessException(ResponseCode.CONFLICT, '更新失败,数据已被修改,请重试');
    }

    // 5. 查询最新数据返回
    const updated = await this.prisma.pmsTenantSku.findUnique({
      where: { id: tenantSkuId },
      include: { globalSku: true },
    });

    return Result.ok(updated);
  }

  /**
   * 更新店铺商品基础信息 (状态、自定义标题、半径)
   */
  async updateProductBase(tenantId: string, dto: UpdateProductBaseDto) {
    const { id, status, customTitle, overrideRadius } = dto;

    const tenantProduct = await this.prisma.pmsTenantProduct.findUnique({
      where: { id },
    });
    BusinessException.throwIfNull(tenantProduct, '商品不存在');
    BusinessException.throwIf(tenantProduct.tenantId !== tenantId, '无权操作此商品', ResponseCode.FORBIDDEN);

    const res = await this.prisma.pmsTenantProduct.update({
      where: { id },
      data: {
        status,
        customTitle,
        overrideRadius,
      },
    });

    return Result.ok(res);
  }
}
