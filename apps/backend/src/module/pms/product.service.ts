import { Injectable } from '@nestjs/common';
import { Prisma, PublishStatus } from '@prisma/client';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { PaginationHelper } from 'src/common/utils/pagination.helper';
import {
  CreateProductDto,
  UpdateProductDto,
  UpdateProductStatusDto,
  ListProductDto,
  ProductType,
  CreateAttrValueDto,
  CreateSkuDto,
} from './dto';
import { ProductRepository } from './product/product.repository';
import { SkuRepository } from './product/sku.repository';
import { AttributeRepository } from './attribute/attribute.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductSyncProducer } from '../store/product/product-sync.queue';

/**
 * 商品管理服务层
 * 处理商品的创建、更新、查询等核心业务逻辑
 */
@Injectable()
export class PmsProductService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly skuRepo: SkuRepository,
    private readonly attrRepo: AttributeRepository,
    private readonly prisma: PrismaService,
    private readonly productSyncProducer: ProductSyncProducer,
  ) {}

  /**
   * 创建商品
   * 包含商品基本信息、SKU、属性值的事务创建
   *
   * @param dto - 创建商品 DTO
   * @returns 创建成功的商品信息
   */
  @Transactional()
  async create(dto: CreateProductDto) {
    // 1. 业务逻辑校验
    BusinessException.throwIf(
      dto.type === ProductType.SERVICE && !dto.serviceDuration,
      '服务类商品必须填写服务时长',
      ResponseCode.PARAM_INVALID,
    );

    // 2. 验证属性ID是否存在
    if (dto.attrs && dto.attrs.length > 0) {
      await this.validateAttributes(dto.attrs);
    }

    // 3. 创建商品主表信息
    const product = await this.productRepo.create({
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
      category: { connect: { catId: dto.categoryId } },
      ...(dto.brandId && { brand: { connect: { brandId: dto.brandId } } }),
    });

    // 4. 创建SKU
    if (dto.skus && dto.skus.length > 0) {
      await this.createSkus(product.productId, dto.skus);
    }

    // 5. 创建属性值
    if (dto.attrs && dto.attrs.length > 0) {
      await this.createAttrValues(product.productId, dto.attrs);
    }

    return Result.ok(product);
  }

  /**
   * 验证属性ID是否存在
   */
  private async validateAttributes(attrs: CreateAttrValueDto[]) {
    const attrIds = attrs.map((a) => a.attrId);
    const validation = await this.attrRepo.validateAttrIds(attrIds);

    BusinessException.throwIf(
      !validation.valid,
      `属性ID不存在: ${validation.invalidIds.join(', ')}`,
      ResponseCode.PARAM_INVALID,
    );
  }

  /**
   * 创建SKU列表
   * @param productId - 商品ID
   * @param skus - SKU数据数组
   */
  private async createSkus(productId: string, skus: CreateSkuDto[]) {
    const skuData = skus.map((sku) => ({
      productId,
      specValues: sku.specValues || {},
      skuImage: sku.skuImage,
      guidePrice: sku.guidePrice,
      costPrice: sku.costPrice || 0,
      distMode: sku.distMode,
      guideRate: sku.guideRate,
      minDistRate: sku.minDistRate,
      maxDistRate: sku.maxDistRate,
    }));

    await this.skuRepo.createMany(skuData);
  }

  /**
   * 创建属性值列表
   * @param productId - 商品ID
   * @param attrs - 属性值数组
   */
  private async createAttrValues(productId: string, attrs: CreateAttrValueDto[]) {
    // 查询属性定义名称
    const attrIds = attrs.map((a) => a.attrId);
    const attrDefinitions = await this.attrRepo.findMany({
      where: { attrId: { in: attrIds } },
      select: { attrId: true, name: true },
    });

    const attrValueData = attrs.map((item) => {
      const def = attrDefinitions.find((d) => d.attrId === item.attrId);
      if (!def) {
        throw new BusinessException(ResponseCode.BUSINESS_ERROR, `属性 ${item.attrId} 不存在`);
      }
      return {
        productId,
        attrId: item.attrId,
        attrName: def.name,
        value: item.value,
      };
    });

    await this.prisma.pmsProductAttrValue.createMany({
      data: attrValueData,
    });
  }

  /**
   * 分页查询商品列表
   *
   * @param query - 查询参数 DTO
   * @returns 分页后的商品列表 VO
   */
  async findAll(query: ListProductDto) {
    const { skip, take } = PaginationHelper.getPagination(query);
    const { name, categoryId, publishStatus } = query;

    // 构建查询条件
    const where: Prisma.PmsProductWhereInput = {};
    if (name) {
      where.name = { contains: name };
    }
    if (categoryId) {
      where.categoryId = Number(categoryId);
    }
    if (publishStatus) {
      where.publishStatus = publishStatus as Prisma.PmsProductWhereInput['publishStatus'];
    }

    // 使用Repository查询
    const list = await this.productRepo.findWithRelations(where, skip, take);
    const total = await this.productRepo.countWithConditions(where);

    // 数据映射：转换为前端期望的 VO 格式
    type ProductWithRelations = Awaited<ReturnType<typeof this.productRepo.findWithRelations>>[number];
    const formattedList = list.map((item: ProductWithRelations) => {
      const minPrice =
        item.globalSkus && item.globalSkus.length > 0
          ? Math.min(...item.globalSkus.map((sku: { guidePrice: number }) => sku.guidePrice))
          : 0;

      return {
        ...item,
        albumPics: item.mainImages ? item.mainImages.join(',') : '',
        publishStatus: item.publishStatus === 'ON_SHELF' ? '1' : '0',
        price: minPrice,
      };
    });

    return Result.page(formattedList, total);
  }

  /**
   * 查询商品详情
   *
   * @param id - 商品ID
   * @returns 商品详情 VO
   */
  async findOne(id: string) {
    const product = await this.productRepo.findOneWithDetails(id);
    BusinessException.throwIf(!product, '商品不存在', ResponseCode.NOT_FOUND);
    const validProduct = product; // 类型收窄：throwIf 保证非空

    return Result.ok({
      ...validProduct,
      attrs: validProduct.attrValues.map((av: { attrId: number; value: string }) => ({
        attrId: av.attrId,
        value: av.value,
      })),
    });
  }

  /**
   * 更新商品信息
   * 支持部分更新，仅更新传入的字段
   *
   * @param id - 商品ID
   * @param dto - 更新商品 DTO
   * @returns 更新后的商品信息
   */
  @Transactional()
  async update(id: string, dto: UpdateProductDto) {
    // 1. 检查商品是否存在
    const existing = await this.productRepo.findById(id);
    BusinessException.throwIfNull(existing, '商品不存在', ResponseCode.NOT_FOUND);

    // 2. 业务逻辑校验
    if (dto.type !== undefined || dto.serviceDuration !== undefined) {
      const productType = dto.type ?? existing.type;
      const serviceDuration = dto.serviceDuration ?? existing.serviceDuration;

      BusinessException.throwIf(
        productType === ProductType.SERVICE && !serviceDuration,
        '服务类商品必须填写服务时长',
        ResponseCode.PARAM_INVALID,
      );
    }

    // 3. 验证属性ID是否存在
    if (dto.attrs && dto.attrs.length > 0) {
      await this.validateAttributes(dto.attrs);
    }

    // 4. 构建更新数据（仅包含传入的字段）
    const updateData: Prisma.PmsProductUpdateInput = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.subTitle !== undefined) updateData.subTitle = dto.subTitle;
    if (dto.mainImages !== undefined) updateData.mainImages = dto.mainImages;
    if (dto.detailHtml !== undefined) updateData.detailHtml = dto.detailHtml;
    if (dto.type !== undefined) updateData.type = dto.type as ProductType;
    if (dto.weight !== undefined) updateData.weight = dto.weight;
    if (dto.isFreeShip !== undefined) updateData.isFreeShip = dto.isFreeShip;
    if (dto.serviceDuration !== undefined) updateData.serviceDuration = dto.serviceDuration;
    if (dto.serviceRadius !== undefined) updateData.serviceRadius = dto.serviceRadius;
    if (dto.publishStatus !== undefined) updateData.publishStatus = dto.publishStatus as PublishStatus;
    if (dto.categoryId !== undefined) updateData.category = { connect: { catId: dto.categoryId } };
    if (dto.brandId !== undefined) updateData.brand = { connect: { brandId: dto.brandId } };

    // 更新 needBooking（根据 type 自动设置）
    if (dto.type !== undefined) {
      updateData.needBooking = dto.type === ProductType.SERVICE;
    }

    // 更新 specDef（转换为 Prisma JsonValue）
    if (dto.specDef !== undefined) {
      updateData.specDef = dto.specDef as unknown as Prisma.InputJsonValue;
    }

    // 5. 更新商品基础信息
    const product = await this.productRepo.update(id, updateData);

    // 6. 处理 SKU 变动（仅在传入时更新）
    if (dto.skus !== undefined) {
      await this.updateSkus(id, dto.skus);
    }

    // 7. 处理属性值（仅在传入时更新）
    if (dto.attrs !== undefined) {
      await this.updateAttrValues(id, dto.attrs);
    }

    return Result.ok(product);
  }

  /**
   * 更新SKU列表（增删改）
   * @param productId - 商品ID
   * @param skus - SKU数据数组
   */
  private async updateSkus(productId: string, skus: CreateSkuDto[]) {
    // 获取现有 SKU ID 列表
    const existingSkus = await this.skuRepo.findByProductId(productId);
    const existingSkuIds = existingSkus.map((s) => s.skuId);

    // 识别需要保留/更新的 SKU ID
    const incomingSkuIds = skus.filter((s) => s.skuId).map((s) => s.skuId!);

    // 识别需要删除的 SKU ID
    const skusToDelete = existingSkuIds.filter((id) => !incomingSkuIds.includes(id));

    // 执行删除
    if (skusToDelete.length > 0) {
      await this.skuRepo.deleteMany({ skuId: { in: skusToDelete } });
    }

    // 执行更新或新增
    for (const sku of skus) {
      if (sku.skuId && existingSkuIds.includes(sku.skuId)) {
        // 更新现有 SKU
        await this.skuRepo.update(sku.skuId, {
          specValues: sku.specValues || {},
          skuImage: sku.skuImage,
          guidePrice: sku.guidePrice,
          costPrice: sku.costPrice || 0,
          distMode: sku.distMode,
          guideRate: sku.guideRate,
          minDistRate: sku.minDistRate,
          maxDistRate: sku.maxDistRate,
        });
      } else {
        // 创建新 SKU
        await this.skuRepo.create({
          specValues: sku.specValues || {},
          skuImage: sku.skuImage,
          guidePrice: sku.guidePrice,
          costPrice: sku.costPrice || 0,
          distMode: sku.distMode,
          guideRate: sku.guideRate,
          minDistRate: sku.minDistRate,
          maxDistRate: sku.maxDistRate,
          product: { connect: { productId } },
        });
      }
    }
  }

  /**
   * 更新属性值列表（全量覆盖）
   * @param productId - 商品ID
   * @param attrs - 属性值数组
   */
  private async updateAttrValues(productId: string, attrs: CreateAttrValueDto[]) {
    // 先删除现有属性值
    await this.prisma.pmsProductAttrValue.deleteMany({
      where: { productId },
    });

    // 重新创建属性值
    if (attrs && attrs.length > 0) {
      await this.createAttrValues(productId, attrs);
    }
  }

  /**
   * 删除商品
   * 包含级联校验：检查是否有门店已导入该商品
   *
   * @param id - 商品ID
   * @returns 删除结果
   */
  @Transactional()
  async remove(id: string) {
    // 1. 检查商品是否存在
    const product = await this.productRepo.findOneWithDetails(id);
    BusinessException.throwIfNull(product, '商品不存在', ResponseCode.NOT_FOUND);

    // 2. 级联校验：检查是否有门店已导入该商品
    const tenantCount = await this.prisma.pmsTenantProduct.count({
      where: { productId: id },
    });

    BusinessException.throwIf(
      tenantCount > 0,
      `该商品已被 ${tenantCount} 家门店导入，请先通知门店移除后再删除`,
      ResponseCode.BUSINESS_ERROR,
    );

    // 3. 删除关联数据（事务内）
    // 删除属性值
    await this.prisma.pmsProductAttrValue.deleteMany({ where: { productId: id } });

    // 删除 SKU
    await this.skuRepo.deleteMany({ productId: id });

    // 删除商品主表
    await this.productRepo.delete(id);

    return Result.ok(null, '商品已删除');
  }

  /**
   * 更新商品发布状态
   * 独立的发布/下架端点，当下架时通知门店同步
     *
     * @param id - 商品ID
     * @param dto - 更新状态 DTO
     * @returns 更新后的商品信息
     */
    async updateStatus(id: string, dto: UpdateProductStatusDto) {
      // 1. 检查商品是否存在
      const existing = await this.productRepo.findById(id);
      BusinessException.throwIfNull(existing, '商品不存在', ResponseCode.NOT_FOUND);

      // 2. 如果状态未变化，直接返回
      if (existing.publishStatus === dto.publishStatus) {
        return Result.ok(existing, '商品状态未变化');
      }

      // 3. 更新发布状态
      const product = await this.productRepo.update(id, {
        publishStatus: dto.publishStatus,
      });

      // 4. 如果是下架操作，通知门店同步
      if (dto.publishStatus === PublishStatus.OFF_SHELF) {
        await this.productSyncProducer.notifyOffShelf(id);
      }

      return Result.ok(product, '商品状态已更新');
    }
}
