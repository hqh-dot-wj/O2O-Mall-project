import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, DistributionMode, PublishStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Result } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { ImportProductDto, ListMarketProductDto, ListStoreProductDto, UpdateProductPriceDto } from './dto';

/**
 * 店铺商品管理服务
 * 处理店铺选品、导入、价格调整、列表查询等逻辑
 */
@Injectable()
export class StoreProductService {
    constructor(private readonly prisma: PrismaService) { }

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
                        where: { tenantId }
                    }
                },
                skip: query.skip,
                take: query.take,
                orderBy: { createTime: 'desc' }
            }),
            this.prisma.pmsProduct.count({ where })
        ]);

        const formatted = list.map(item => {
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
     * 导入商品到店铺
     * 包含创建店铺商品记录和初始SKU库存/价格
     */
    async importProduct(tenantId: string, dto: ImportProductDto) {
        const { productId, overrideRadius, skus } = dto;

        // 1. 检查全局商品是否存在
        const globalProduct = await this.prisma.pmsProduct.findUnique({
            where: { productId },
            include: { globalSkus: true },
        });
        BusinessException.throwIfNull(globalProduct, '商品不存在');

        // 2. 检查是否已引入
        const existing = await this.prisma.pmsTenantProduct.findUnique({
            where: { tenantId_productId: { tenantId, productId } },
        });
        BusinessException.throwIf(!!existing, '商品已引入，请勿重复操作');

        // 3. 事务创建
        const res = await this.prisma.$transaction(async (tx) => {
            const tenantProduct = await tx.pmsTenantProduct.create({
                data: {
                    tenantId,
                    productId,
                    status: PublishStatus.OFF_SHELF,
                    overrideRadius: overrideRadius,
                },
            });

            if (skus && skus.length > 0) {
                await tx.pmsTenantSku.createMany({
                    data: skus.map((sku) => {
                        return {
                            tenantProductId: tenantProduct.id,
                            globalSkuId: sku.globalSkuId,
                            price: new Decimal(sku.price),
                            stock: sku.stock,
                            distMode: sku.distMode || DistributionMode.RATIO,
                            distRate: new Decimal(sku.distRate || 0),
                            isActive: true,
                        };
                    }),
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
        const [list, total] = await Promise.all([
            this.prisma.pmsTenantProduct.findMany({
                where: { tenantId },
                include: {
                    product: true,
                    skus: {
                        include: { globalSku: true }
                    },
                },
                skip: query.skip,
                take: query.take,
                orderBy: { createTime: 'desc' }
            }),
            this.prisma.pmsTenantProduct.count({ where: { tenantId } })
        ]);

        const formatted = list.map(item => ({
            id: item.id,
            name: item.product.name,
            albumPics: item.product.mainImages ? item.product.mainImages.join(',') : '',
            status: item.status,
            isHot: item.isHot,
            price: item.skus?.[0]?.price || 0
        }));

        return Result.page(formatted, total);
    }

    /**
     * 更新店铺商品价格/分销配置
     * 需校验利润风控 (售价 - 成本 - 分销佣金 > 0)
     */
    async updateProductPrice(tenantId: string, dto: UpdateProductPriceDto) {
        const { tenantSkuId, price, distRate } = dto;

        // 1. 获取店铺 SKU
        const tenantSku = await this.prisma.pmsTenantSku.findUnique({
            where: { id: tenantSkuId },
            include: { tenantProd: true },
        });
        BusinessException.throwIfNull(tenantSku, 'SKU不存在');
        BusinessException.throwIf(tenantSku.tenantProd.tenantId !== tenantId, '无权操作此商品');

        // 2. 获取全局 SKU (用于成本校验)
        const globalSku = await this.prisma.pmsGlobalSku.findUnique({
            where: { skuId: tenantSku.globalSkuId },
        });
        BusinessException.throwIfNull(globalSku, '关联全局SKU异常');

        // 3. 利润风控计算
        // 佣金计算
        let commission = new Decimal(0);
        if (tenantSku.distMode === DistributionMode.RATIO) {
            // distRate 认为是小数 (如 0.15)
            commission = new Decimal(price).mul(new Decimal(distRate));
        } else if (tenantSku.distMode === DistributionMode.FIXED) {
            commission = new Decimal(distRate);
        }

        const cost = globalSku.costPrice;
        // 利润 = 售价 - 成本 - 佣金
        const profit = new Decimal(price).sub(cost).sub(commission);

        BusinessException.throwIf(
            profit.lessThan(0),
            `价格设置异常导致亏损! 售价:${price}, 成本:${cost}, 佣金:${commission}`
        );

        // 4. 更新数据库
        const res = await this.prisma.pmsTenantSku.update({
            where: { id: tenantSkuId },
            data: {
                price: new Decimal(price),
                distRate: new Decimal(distRate),
            },
        });

        return Result.ok(res);
    }
}
