import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/repository/base.repository';
import { PmsProduct, Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class ClientProductRepository extends BaseRepository<PmsProduct, Prisma.PmsProductCreateInput> {
    constructor(
        prisma: PrismaService,
        private readonly clsService: ClsService,
    ) {
        super(prisma, clsService, 'pmsProduct', 'productId');
    }

    /**
     * 查询租户商品列表 (复杂查询)
     */
    async findTenantProducts(tenantId: string, where: Prisma.PmsTenantProductWhereInput, skip: number, take: number) {
        return this.prisma.pmsTenantProduct.findMany({
            where,
            include: {
                product: {
                    include: {
                        globalSkus: {
                            select: {
                                skuId: true,
                                guidePrice: true,
                                specValues: true,
                                skuImage: true,
                            },
                        },
                        category: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                skus: true, // 租户SKU价格
            },
            skip,
            take,
            orderBy: [
                { sort: 'asc' }, // 优先按租户自定义排序
                { createTime: 'desc' }, // 其次按创建时间
            ],
        });
    }

    /**
     * 统计租户商品数量
     */
    async countTenantProducts(where: Prisma.PmsTenantProductWhereInput) {
        return this.prisma.pmsTenantProduct.count({ where });
    }

    /**
     * 查询商品详情 (包含租户信息)
     */
    async findOneWithDetails(productId: string, tenantId?: string, isSuper?: boolean) {
        return this.prisma.pmsProduct.findUnique({
            where: { productId },
            include: {
                globalSkus: true,
                category: {
                    select: { name: true },
                },
                // 如果有有效且非超级租户ID，同时查询该租户的门店商品
                tenantProducts:
                    tenantId && !isSuper
                        ? {
                            where: { tenantId, status: 'ON_SHELF' },
                            include: {
                                skus: true,
                            },
                        }
                        : false,
            },
        });
    }

    /**
     * 查询全局商品列表 (Selection Center)
     */
    async findGlobalProducts(where: Prisma.PmsProductWhereInput, skip: number, take: number) {
        return this.prisma.pmsProduct.findMany({
            where,
            include: {
                globalSkus: {
                    select: {
                        skuId: true,
                        guidePrice: true,
                        specValues: true,
                        skuImage: true,
                    },
                },
                category: {
                    select: {
                        name: true,
                    },
                },
            },
            skip,
            take,
            orderBy: { createTime: 'desc' },
        });
    }

    /**
     * 统计全局商品数量
     */
    async countGlobalProducts(where: Prisma.PmsProductWhereInput) {
        return this.prisma.pmsProduct.count({ where });
    }
}
