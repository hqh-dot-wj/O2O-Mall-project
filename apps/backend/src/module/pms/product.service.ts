import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { PaginationHelper } from 'src/common/utils/pagination.helper';
import { CreateProductDto, ListProductDto, ProductType, CreateAttrValueDto } from './dto';
import { ProductRepository } from './product/product.repository';
import { SkuRepository } from './product/sku.repository';
import { AttributeRepository } from './attribute/attribute.repository';
import { PrismaService } from 'src/prisma/prisma.service';

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
  private async createSkus(productId: string, skus: any[]) {
    const skuData = skus.map((sku: any) => ({
      productId,
      specValues: sku.specValues || {},
      skuImage: sku.skuImage,
      guidePrice: sku.guidePrice,
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

    const attrValueData = attrs.map((item: CreateAttrValueDto) => {
      const def = attrDefinitions.find((d: any) => d.attrId === item.attrId);
      return {
        productId,
        attrId: item.attrId,
        attrName: def!.name, // 已验证存在，可以断言非空
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
    const { name, categoryId } = query;

    // 构建查询条件
    const where: Prisma.PmsProductWhereInput = {};
    if (name) {
      where.name = { contains: name };
    }
    if (categoryId) {
      where.categoryId = Number(categoryId);
    }

    // 使用Repository查询
    const list = await this.productRepo.findWithRelations(where, skip, take);
    const total = await this.productRepo.countWithConditions(where);

    // 数据映射：转换为前端期望的 VO 格式
    const formattedList = list.map((item: any) => ({
      ...item,
      albumPics: item.mainImages ? item.mainImages.join(',') : '',
      publishStatus: item.publishStatus === 'ON_SHELF' ? '1' : '0',
      price: item.globalSkus?.[0]?.guidePrice || 0,
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
    const product = await this.productRepo.findOneWithDetails(id);
    BusinessException.throwIf(!product, '商品不存在', ResponseCode.NOT_FOUND);

    return Result.ok({
      ...product,
      attrs: product.attrValues.map((av: any) => ({
        attrId: av.attrId,
        value: av.value,
      })),
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
  @Transactional()
  async update(id: string, dto: CreateProductDto) {
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

    // 3. 更新商品基础信息
    const product = await this.productRepo.update(id, {
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

    // 4. 处理 SKU 变动 (增删改)
    await this.updateSkus(id, dto.skus);

    // 5. 处理属性值 (全量覆盖策略)
    await this.updateAttrValues(id, dto.attrs);

    return Result.ok(product);
  }

  /**
   * 更新SKU列表（增删改）
   * @param productId - 商品ID
   * @param skus - SKU数据数组
   */
  private async updateSkus(productId: string, skus: any[]) {
    // 获取现有 SKU ID 列表
    const existingSkus = await this.skuRepo.findByProductId(productId);
    const existingSkuIds = existingSkus.map((s) => s.skuId);

    // 识别需要保留/更新的 SKU ID
    const incomingSkuIds = skus.filter((s: any) => s.skuId).map((s: any) => s.skuId);

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
}
