import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { CreateProductDto, ListProductDto, ProductType } from './dto';

/**
 * 商品管理服务层
 * 处理商品的创建、更新、查询等核心业务逻辑
 */
@Injectable()
export class PmsProductService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * 创建商品
     * 包含商品基本信息、SKU、属性值的事务创建
     * 
     * @param dto - 创建商品 DTO
     * @returns 创建成功的商品信息
     */
    async create(dto: CreateProductDto) {
        // 1. 业务逻辑校验
        // 如果是服务类商品，必须填写服务时长
        BusinessException.throwIf(
            dto.type === ProductType.SERVICE && !dto.serviceDuration,
            '服务类商品必须填写服务时长',
            ResponseCode.PARAM_INVALID
        );

        const product = await this.prisma.$transaction(async (tx) => {
            // A. 创建商品主表信息
            const product = await tx.pmsProduct.create({
                data: {
                    categoryId: dto.categoryId,
                    brandId: dto.brandId,
                    name: dto.name,
                    subTitle: dto.subTitle,
                    mainImages: dto.mainImages,
                    detailHtml: dto.detailHtml,
                    type: dto.type,
                    weight: dto.weight,
                    isFreeShip: dto.isFreeShip,
                    serviceDuration: dto.serviceDuration,
                    serviceRadius: dto.serviceRadius,
                    needBooking: dto.type === ProductType.SERVICE,
                    specDef: dto.specDef || [],
                    publishStatus: dto.publishStatus,
                },
            });

            // B. 批量创建 SKU 信息
            if (dto.skus && dto.skus.length > 0) {
                await tx.pmsGlobalSku.createMany({
                    data: dto.skus.map((sku) => ({
                        productId: product.productId,
                        specValues: sku.specValues || {},
                        skuImage: sku.skuImage,
                        guidePrice: sku.guidePrice,
                        distMode: sku.distMode,
                        guideRate: sku.guideRate,
                        minDistRate: sku.minDistRate,
                        maxDistRate: sku.maxDistRate,
                    })),
                });
            }

            // C. 批量创建属性值 (AttrValue)
            // 根据传入的属性ID查询属性定义名称，确保数据一致性
            if (dto.attrs && dto.attrs.length > 0) {
                const attrIds = dto.attrs.map(a => a.attrId);
                const attrDefinitions = await tx.pmsAttribute.findMany({
                    where: { attrId: { in: attrIds } }
                });

                const attrValueData = dto.attrs.map((item) => {
                    const def = attrDefinitions.find(d => d.attrId === item.attrId);
                    return {
                        productId: product.productId,
                        attrId: item.attrId,
                        attrName: def ? def.name : 'Unknown', // 如果属性不存在，暂时记录 Unknown
                        value: item.value
                    };
                });

                await tx.pmsProductAttrValue.createMany({
                    data: attrValueData
                });
            }

            return product;
        });

        return Result.ok(product);
    }

    /**
     * 分页查询商品列表
     * 
     * @param query - 查询参数 DTO
     * @returns 分页后的商品列表 VO
     */
    async findAll(query: ListProductDto) {
        const { name, categoryId } = query;

        // 构建查询条件
        const where: Prisma.PmsProductWhereInput = {};
        if (name) {
            where.name = { contains: name };
        }
        if (categoryId) {
            where.categoryId = Number(categoryId);
        }

        // 并行执行列表查询和总数查询
        const [list, total] = await Promise.all([
            this.prisma.pmsProduct.findMany({
                where,
                include: {
                    globalSkus: true, // 关联 SKU 获取价格
                },
                skip: query.skip,
                take: query.take,
                orderBy: { createTime: 'desc' }
            }),
            this.prisma.pmsProduct.count({ where })
        ]);

        // 数据映射：转换为前端期望的 VO 格式
        const formattedList = list.map(item => ({
            ...item,
            albumPics: item.mainImages ? item.mainImages.join(',') : '', // 将图片数组转换为逗号分隔字符串
            publishStatus: item.publishStatus === 'ON_SHELF' ? '1' : '0', // 将枚举状态映射为 '1'/'0'
            price: item.globalSkus?.[0]?.guidePrice || 0, // 取第一个 SKU 的指导价作为展示价格
        }));

        return Result.page(formattedList, total);
    }

    /**
     * 查询商品详情
     * 
     * @param id - 商品ID
     * @returns 商品详情 VO
     */
    async findOne(id: string) {
        const product = await this.prisma.pmsProduct.findUnique({
            where: { productId: id },
            include: {
                globalSkus: true,
                attrValues: true,
            },
        });

        BusinessException.throwIfNull(product, '商品不存在');

        return Result.ok({
            ...product,
            attrs: product.attrValues.map(av => ({
                attrId: av.attrId,
                value: av.value
            }))
        });
    }

    /**
     * 更新商品信息
     * 包含全量更新商品信息、SKU 变动处理、属性值更新的事务操作
     * 
     * @param id - 商品ID
     * @param dto - 更新商品 DTO
     * @returns 更新后的商品信息
     */
    async update(id: string, dto: CreateProductDto) {
        // 1. 业务逻辑校验
        BusinessException.throwIf(
            dto.type === ProductType.SERVICE && !dto.serviceDuration,
            '服务类商品必须填写服务时长',
            ResponseCode.PARAM_INVALID
        );

        const product = await this.prisma.$transaction(async (tx) => {
            // A. 更新商品基础信息
            const product = await tx.pmsProduct.update({
                where: { productId: id },
                data: {
                    categoryId: dto.categoryId,
                    brandId: dto.brandId,
                    name: dto.name,
                    subTitle: dto.subTitle,
                    mainImages: dto.mainImages,
                    detailHtml: dto.detailHtml,
                    type: dto.type,
                    weight: dto.weight,
                    isFreeShip: dto.isFreeShip,
                    serviceDuration: dto.serviceDuration,
                    serviceRadius: dto.serviceRadius,
                    needBooking: dto.type === ProductType.SERVICE,
                    specDef: dto.specDef || [],
                    publishStatus: dto.publishStatus,
                },
            });

            // B. 处理 SKU 变动 (增删改)
            // B1. 获取现有 SKU ID 列表
            const existingSkus = await tx.pmsGlobalSku.findMany({
                where: { productId: id },
                select: { skuId: true }
            });
            const existingSkuIds = existingSkus.map(s => s.skuId);

            // B2. 识别需要保留/更新的 SKU ID
            const incomingSkuIds = dto.skus.filter(s => s.skuId).map(s => s.skuId);

            // B3. 识别需要删除的 SKU ID
            const skusToDelete = existingSkuIds.filter(id => !incomingSkuIds.includes(id));

            // B4. 执行删除
            if (skusToDelete.length > 0) {
                await tx.pmsGlobalSku.deleteMany({
                    where: { skuId: { in: skusToDelete as string[] } }
                });
            }

            // B5. 执行更新或新增
            for (const sku of dto.skus) {
                if (sku.skuId && existingSkuIds.includes(sku.skuId)) {
                    // 更新现有 SKU
                    await tx.pmsGlobalSku.update({
                        where: { skuId: sku.skuId },
                        data: {
                            specValues: sku.specValues || {},
                            skuImage: sku.skuImage,
                            guidePrice: sku.guidePrice,
                            distMode: sku.distMode,
                            guideRate: sku.guideRate,
                            minDistRate: sku.minDistRate,
                            maxDistRate: sku.maxDistRate,
                        }
                    });
                } else {
                    // 创建新 SKU
                    await tx.pmsGlobalSku.create({
                        data: {
                            productId: id,
                            specValues: sku.specValues || {},
                            skuImage: sku.skuImage,
                            guidePrice: sku.guidePrice,
                            distMode: sku.distMode,
                            guideRate: sku.guideRate,
                            minDistRate: sku.minDistRate,
                            maxDistRate: sku.maxDistRate,
                        }
                    });
                }
            }

            // C. 处理属性值 (全量覆盖策略)
            // 先删除现有属性值
            await tx.pmsProductAttrValue.deleteMany({
                where: { productId: id }
            });

            // 重新创建属性值
            if (dto.attrs && dto.attrs.length > 0) {
                const attrIds = dto.attrs.map(a => a.attrId);
                const attrDefinitions = await tx.pmsAttribute.findMany({
                    where: { attrId: { in: attrIds } }
                });

                const attrValueData = dto.attrs.map((item) => {
                    const def = attrDefinitions.find(d => d.attrId === item.attrId);
                    return {
                        productId: id,
                        attrId: item.attrId,
                        attrName: def ? def.name : 'Unknown',
                        value: item.value
                    };
                });

                await tx.pmsProductAttrValue.createMany({
                    data: attrValueData
                });
            }

            return product;
        });

        return Result.ok(product);
    }
}
