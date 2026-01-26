import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MarketingStockMode, ProductType } from '@prisma/client';
import { StorePlayConfigRepository } from './config.repository';
import { CreateStorePlayConfigDto, ListStorePlayConfigDto, UpdateStorePlayConfigDto } from './dto/config.dto';
import { Result } from 'src/common/response/result';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { PlayTemplateRepository } from '../template/template.repository';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { PmsProductService } from 'src/module/pms/product.service';
import { PlayStrategyFactory } from '../play/play.factory';
import { FormatDateFields } from 'src/common/utils';

/**
 * 门店营销商品配置服务
 *
 * @description 处理门店端对营销商品的配置、库存策略选择及上下架管理
 */
@Injectable()
export class StorePlayConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: StorePlayConfigRepository,
    private readonly templateRepo: PlayTemplateRepository,
    private readonly productService: PmsProductService,
    private readonly strategyFactory: PlayStrategyFactory,
  ) {}

  /**
   * 分页查询门店营销配置
   * @description 组合商品库基本信息展示，方便门店查看配置情况。
   */
  async findAll(query: ListStorePlayConfigDto) {
    const { rows, total } = await this.repo.search(query);

    // ✅ 中文注释：批量查询关联商品名称，减少单次循环查库的 N+1 问题 (内存组装模式)
    const serviceIds = rows.map((r) => r.serviceId);

    let productMap = new Map<string, any>();
    if (serviceIds.length > 0) {
      const products = await this.prisma.pmsProduct.findMany({
        where: { productId: { in: serviceIds } },
        select: {
          productId: true,
          name: true,
          publishStatus: true,
          mainImages: true,
          type: true,
        },
      });
      productMap = new Map(products.map((p: any) => [p.productId, p]));
    }

    const list = rows.map((row) => {
      const product = productMap.get(row.serviceId);
      const rules = row.rules as any;
      return {
        ...row,
        productName: product?.name || '未知商品',
        productStatus: product?.publishStatus, // ON_SHELF / OFF_SHELF
        productImage: product?.mainImages?.[0] || '',
        productType: product?.type,
        ruleName: rules?.name || row.templateCode, // 优先显示规则名
      };
    });

    return Result.page(FormatDateFields(list), total);
  }

  /**
   * 查询单条配置详情
   * @param id 配置ID
   */
  async findOne(id: string) {
    const config = await this.repo.findById(id);
    BusinessException.throwIfNull(config, '配置不存在');

    // ✅ 中文注释：加载策略特有的展示增强数据（如渲染规则预览）
    const strategy = this.strategyFactory.getStrategy(config.templateCode);
    let displayData = null;
    if (strategy.getDisplayData) {
      displayData = await strategy.getDisplayData(config);
    }

    return Result.ok(
      FormatDateFields({
        ...config,
        displayData,
      }),
    );
  }

  /**
   * 创建营销商品配置
   * @param dto 配置数据
   * @param tenantId 租户ID
   */
  @Transactional()
  async create(dto: CreateStorePlayConfigDto, tenantId: string) {
    // 1. 校验模板的有效性 - 必须是系统中已定义且启用的玩法
    const template = await this.templateRepo.findByCode(dto.templateCode);
    BusinessException.throwIfNull(template, '指定的营销玩法模板不存在或已下架');

    // 1.1 策略级参数校验 (New)
    const strategy = this.strategyFactory.getStrategy(dto.templateCode);
    if (strategy.validateConfig) {
      await strategy.validateConfig(dto);
    }

    // 2. 校验商品存在性 (支持 SPU ID 或 SKU ID)
    let productData = await this.prisma.pmsProduct.findUnique({ where: { productId: dto.serviceId } });

    // 如果不是 SPU ID，尝试作为 SKU ID 查询
    if (!productData) {
      const sku = await this.prisma.pmsGlobalSku.findUnique({
        where: { skuId: dto.serviceId },
        include: { product: true },
      });
      if (sku && sku.product) {
        productData = sku.product;
      }
    }

    BusinessException.throwIfNull(productData, '关联的基础商品或服务不存在');

    // 3. 自动判定库存策略 (实物=强互斥, 服务=弱互斥)
    const stockMode = productData.type === 'REAL' ? MarketingStockMode.STRONG_LOCK : MarketingStockMode.LAZY_CHECK;

    // 4. 执行持久化
    const config = await this.repo.create({
      ...dto,
      tenantId,
      stockMode, // 强制覆盖
    } as any);
    return Result.ok(FormatDateFields(config), '配置创建成功');
  }

  /**
   * 更新营销配置
   */
  @Transactional()
  async update(id: string, dto: UpdateStorePlayConfigDto) {
    const config = await this.repo.findById(id);
    BusinessException.throwIfNull(config, '待更新的营销配置记录不存在');

    const updated = await this.repo.update(id, dto);
    return Result.ok(FormatDateFields(updated), '配置更新成功');
  }

  /**
   * 删除营销配置
   */
  async delete(id: string) {
    const config = await this.repo.findById(id);
    BusinessException.throwIfNull(config, '待删除的记录不存在');

    await this.repo.softDelete(id);
    return Result.ok(null, '删除成功');
  }

  /**
   * 更新营销配置状态
   */
  async updateStatus(id: string, status: string) {
    const config = await this.repo.findById(id);
    BusinessException.throwIfNull(config, '配置不存在');

    const updated = await this.repo.update(id, { status } as any);
    return Result.ok(FormatDateFields(updated), '状态更新成功');
  }
}
