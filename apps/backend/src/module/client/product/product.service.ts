import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { Result } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { ClientListProductDto } from './dto';
import { TenantContext } from 'src/common/tenant/tenant.context';

/**
 * C端商品服务层
 * 提供商品列表、详情以及分类接口
 * 支持租户上下文：如果有租户ID，返回门店价格；否则返回总部指导价
 */
@Injectable()
export class ClientProductService {
    private readonly logger = new Logger(ClientProductService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * 获取商品列表
     * 【重要】C端接口：只返回当前租户已上架的商品
     * - 如果有租户ID：从PmsTenantProduct查起，只返回该租户已上架的商品
     * - 如果是超级租户：返回所有总部已上架的商品（用于Selection Center）
     */
    async findAll(query: ClientListProductDto) {
        const { name, categoryId, type } = query;
        const tenantId = TenantContext.getTenantId();

        this.logger.debug(`获取商品列表，租户ID: ${tenantId}`);

        // 如果是普通租户，从租户商品表查询（只返回该租户已上架的商品）
        if (tenantId && tenantId !== TenantContext.SUPER_TENANT_ID) {
            return this.findTenantProducts(query, tenantId);
        }

        // 超级租户：返回所有总部已上架的商品（用于Selection Center等场景）
        return this.findGlobalProducts(query);
    }

    /**
     * 查询租户商品列表（普通租户使用）
     */
    private async findTenantProducts(query: ClientListProductDto, tenantId: string) {
        let { name, categoryId, type } = query;

        // 如果传了分类ID，获取该分类及其所有子分类的ID
        let categoryIds: number[] = [];
        if (categoryId) {
            categoryIds = await this.getAllCategoryIds(categoryId);
        }

        // 构建商品筛选条件
        const productConditions: Prisma.PmsProductWhereInput[] = [
            { publishStatus: 'ON_SHELF' }
        ];

        if (name) {
            productConditions.push({ name: { contains: name } });
        }
        if (categoryIds.length > 0) {
            productConditions.push({ categoryId: { in: categoryIds } });
        }
        if (type) {
            productConditions.push({ type: type as any });
        }

        const tenantProductWhere: Prisma.PmsTenantProductWhereInput = {
            tenantId,
            status: 'ON_SHELF',
            product: {
                AND: productConditions
            }
        };

        // 并行执行列表查询和总数查询
        const [tenantProducts, total] = await Promise.all([
            this.prisma.pmsTenantProduct.findMany({
                where: tenantProductWhere,
                include: {
                    product: {
                        include: {
                            globalSkus: {
                                select: {
                                    skuId: true,
                                    guidePrice: true,
                                    specValues: true,
                                    skuImage: true,
                                }
                            },
                            category: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    },
                    skus: true, // 租户SKU价格
                },
                skip: query.skip,
                take: query.take,
                orderBy: [
                    { sort: 'asc' },      // 优先按租户自定义排序
                    { createTime: 'desc' } // 其次按创建时间
                ]
            }),
            this.prisma.pmsTenantProduct.count({ where: tenantProductWhere })
        ]);

        // 数据映射：转换为前端期望的 VO 格式
        const records = tenantProducts.map(tenantProd => {
            const product = tenantProd.product;
            // 使用租户SKU价格，如果没有则使用总部指导价
            const tenantSku = tenantProd.skus?.[0];
            const price = tenantSku?.price || product.globalSkus?.[0]?.guidePrice || 0;
            const totalStock = tenantProd.skus?.reduce((sum, sku) => sum + (sku.stock || 0), 0) || 0;

            return {
                productId: product.productId,
                name: tenantProd.customTitle || product.name, // 优先使用租户自定义标题
                subTitle: product.subTitle,
                mainImages: product.mainImages || [],
                coverImage: product.mainImages?.[0] || null,
                type: product.type,
                categoryId: product.categoryId,
                categoryName: product.category?.name,
                price,
                stock: totalStock,
                isHot: tenantProd.isHot, // 租户是否标记为推荐
            };
        });

        return Result.page(records, total, query.pageNum, query.pageSize);
    }

    /**
     * 查询全局商品列表（超级租户使用）
     * 用于 Selection Center 等场景
     */
    private async findGlobalProducts(query: ClientListProductDto) {
        const { name, categoryId, type } = query;

        // 如果传了分类ID，获取该分类及其所有子分类的ID
        let categoryIds: number[] = [];
        if (categoryId) {
            categoryIds = await this.getAllCategoryIds(categoryId);
        }

        // 构建查询条件 - 只查询已上架商品
        const where: Prisma.PmsProductWhereInput = {
            publishStatus: 'ON_SHELF',
        };

        if (name) {
            where.name = { contains: name };
        }
        if (categoryIds.length > 0) {
            where.categoryId = { in: categoryIds };
        }
        if (type) {
            where.type = type as any;
        }

        // 并行执行列表查询和总数查询
        const [list, total] = await Promise.all([
            this.prisma.pmsProduct.findMany({
                where,
                include: {
                    globalSkus: {
                        select: {
                            skuId: true,
                            guidePrice: true,
                            specValues: true,
                            skuImage: true,
                        }
                    },
                    category: {
                        select: {
                            name: true
                        }
                    },
                },
                skip: query.skip,
                take: query.take,
                orderBy: { createTime: 'desc' }
            }),
            this.prisma.pmsProduct.count({ where })
        ]);

        // 数据映射：转换为前端期望的 VO 格式
        const records = list.map(item => {
            const price = item.globalSkus?.[0]?.guidePrice || 0;
            // 全局商品(总部标准库)不存储库存，库存由各门店(PmsTenantSku)维护
            const totalStock = 999;

            return {
                productId: item.productId,
                name: item.name,
                subTitle: item.subTitle,
                mainImages: item.mainImages || [],
                coverImage: item.mainImages?.[0] || null,
                type: item.type,
                categoryId: item.categoryId,
                categoryName: item.category?.name,
                price,
                stock: totalStock,
            };
        });

        return Result.page(records, total, query.pageNum, query.pageSize);
    }

    /**
     * 获取商品详情
     * 如果有租户上下文，返回该租户的门店价格
     */
    async findOne(id: string) {
        const tenantId = TenantContext.getTenantId();

        const product = await this.prisma.pmsProduct.findUnique({
            where: { productId: id },
            include: {
                globalSkus: true,
                category: {
                    select: { name: true }
                },
                // 如果有有效的租户ID，同时查询该租户的门店商品
                tenantProducts: (tenantId && tenantId !== TenantContext.SUPER_TENANT_ID) ? {
                    where: { tenantId, status: 'ON_SHELF' },
                    include: {
                        skus: true,
                    },
                } : false,
            },
        });

        BusinessException.throwIfNull(product, '商品不存在');

        // 校验商品是否已上架
        if (product.publishStatus !== 'ON_SHELF') {
            BusinessException.throwIf(true, '商品已下架');
        }

        // 获取门店商品信息 (如果有)
        const tenantProduct = (product as any).tenantProducts?.[0];
        const tenantSkuMap = new Map<string, any>();
        if (tenantProduct?.skus) {
            for (const sku of tenantProduct.skus) {
                tenantSkuMap.set(sku.globalSkuId, sku);
            }
        }

        return Result.ok({
            productId: product.productId,
            name: product.name,
            subTitle: product.subTitle,
            mainImages: product.mainImages || [],
            coverImage: product.mainImages?.[0] || null,
            detailHtml: product.detailHtml,
            type: product.type,
            categoryId: product.categoryId,
            categoryName: product.category?.name,
            isFreeShip: product.isFreeShip,
            serviceDuration: product.serviceDuration,
            serviceRadius: product.serviceRadius,
            needBooking: product.needBooking,
            // 优先使用门店价格
            price: tenantSkuMap.get(product.globalSkus?.[0]?.skuId)?.price || product.globalSkus?.[0]?.guidePrice || 0,
            skus: product.globalSkus.map(sku => {
                const tenantSku = tenantSkuMap.get(sku.skuId);
                return {
                    skuId: tenantSku?.id || sku.skuId,
                    specValues: sku.specValues || {},
                    skuImage: sku.skuImage,
                    // 优先使用门店价格
                    price: tenantSku?.price || sku.guidePrice,
                    stock: tenantSku?.stock ?? 0,
                };
            }),
        });
    }

    /**
     * 获取商品分类树
     */
    async findCategoryTree() {
        const categories = await this.prisma.pmsCategory.findMany({
            orderBy: { sort: 'asc' },
        });

        return Result.ok(this.buildTree(categories));
    }

    /**
     * 获取商品分类列表(平铺)
     */
    async findCategoryList(parentId?: number) {
        const where: Prisma.PmsCategoryWhereInput = {};

        if (parentId !== undefined) {
            where.parentId = parentId === 0 ? null : parentId;
        }

        const categories = await this.prisma.pmsCategory.findMany({
            where,
            orderBy: { sort: 'asc' },
            select: {
                catId: true,
                name: true,
                icon: true,
                parentId: true,
                sort: true,
            }
        });

        return Result.ok(categories);
    }

    /**
     * 构建分类树结构
     */
    private buildTree(items: any[], parentId: number | null = null) {
        const tree: any[] = [];
        for (const item of items) {
            if (item.parentId === parentId) {
                const children = this.buildTree(items, item.catId);
                if (children.length) {
                    item.children = children;
                } else {
                    item.children = undefined;
                }
                tree.push({
                    catId: item.catId,
                    name: item.name,
                    icon: item.icon,
                    parentId: item.parentId,
                    sort: item.sort,
                    children: item.children,
                });
            }
        }
        return tree;
    }

    /**
     * 递归获取分类及其所有子分类ID
     */
    private async getAllCategoryIds(categoryId: number): Promise<number[]> {
        const categoryIds: number[] = [categoryId];

        // 获取所有子分类
        const children = await this.prisma.pmsCategory.findMany({
            where: { parentId: categoryId },
            select: { catId: true }
        });

        // 递归获取子分类的子分类
        for (const child of children) {
            const childIds = await this.getAllCategoryIds(child.catId);
            categoryIds.push(...childIds);
        }

        return categoryIds;
    }
}
