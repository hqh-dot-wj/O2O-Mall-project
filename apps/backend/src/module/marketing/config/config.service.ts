import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MarketingStockMode, PublishStatus, ProductType } from '@prisma/client';
import { StorePlayConfigRepository } from './config.repository';
import { CreateStorePlayConfigDto, ListStorePlayConfigDto, UpdateStorePlayConfigDto } from './dto/config.dto';
import { Result } from 'src/common/response/result';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { PlayTemplateRepository } from '../template/template.repository';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { PmsProductService } from 'src/module/pms/product.service';
import { PlayStrategyFactory } from '../play/play.factory';
import { FormatDateFields } from 'src/common/utils';
import { checkConflict, ConflictType } from './activity-conflict.matrix';

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

    // 3. 检查活动互斥规则 (New)
    await this.checkActivityConflict(dto.serviceId, dto.templateCode, tenantId);

    // 4. 自动判定库存策略 (实物=强互斥, 服务=弱互斥)
    const stockMode = productData.type === 'REAL' ? MarketingStockMode.STRONG_LOCK : MarketingStockMode.LAZY_CHECK;

    // 5. 执行持久化
    const config = await this.repo.create({
      ...dto,
      tenantId,
      storeId: dto.storeId || tenantId, // 如果没有传 storeId，使用 tenantId
      stockMode, // 强制覆盖
    } as any);
    return Result.ok(FormatDateFields(config), '配置创建成功');
  }

  /**
   * 检查活动互斥规则
   * @description 防止同一商品创建冲突的营销活动
   */
  private async checkActivityConflict(serviceId: string, newTemplateCode: string, tenantId: string): Promise<void> {
    // 查询该商品已有的活动配置（仅查询启用状态）
    const existingConfigs = await this.prisma.storePlayConfig.findMany({
      where: {
        serviceId,
        tenantId,
        status: PublishStatus.ON_SHELF,
        delFlag: 'NORMAL',
      },
      select: {
        id: true,
        templateCode: true,
        rules: true,
      },
    });

    // 检查每个已存在的活动是否与新活动冲突
    for (const existing of existingConfigs) {
      const { conflict, rule } = checkConflict(existing.templateCode, newTemplateCode);

      if (conflict) {
        const existingName = (existing.rules as any)?.name || existing.templateCode;
        throw new BusinessException(
          409,
          `该商品已有【${existingName}】活动，与【${newTemplateCode}】冲突。原因：${rule?.reason}`,
        );
      }
    }
  }

  /**
   * 更新营销配置
   * 
   * @description
   * 更新营销配置，如果规则发生变更，会自动保存历史版本到 rulesHistory 字段。
   * 
   * 版本控制机制：
   * 1. 检查 rules 字段是否发生变更
   * 2. 如果变更，将旧版本保存到 rulesHistory 数组
   * 3. 每个历史版本包含：version（版本号）、rules（规则内容）、updateTime（更新时间）、operator（操作人）
   * 4. 历史版本按时间倒序排列（最新的在前）
   * 
   * @param id - 配置ID
   * @param dto - 更新数据
   * @param operatorId - 操作人ID（可选）
   * @returns 更新后的配置
   * 
   * @验证需求 FR-7.1
   */
  @Transactional()
  async update(id: string, dto: UpdateStorePlayConfigDto, operatorId?: string) {
    const config = await this.repo.findById(id);
    BusinessException.throwIfNull(config, '待更新的营销配置记录不存在');

    // 检查规则是否发生变更
    const rulesChanged = dto.rules && JSON.stringify(dto.rules) !== JSON.stringify(config.rules);
    
    let updateData = { ...dto };
    
    // 如果规则发生变更，保存历史版本
    if (rulesChanged) {
      const rulesHistory = await this.saveRulesHistory(config, operatorId);
      updateData = {
        ...updateData,
        rulesHistory: rulesHistory as any,
      };
    }

    const updated = await this.repo.update(id, updateData);
    return Result.ok(FormatDateFields(updated), '配置更新成功');
  }

  /**
   * 保存规则历史版本
   * 
   * @description
   * 将当前规则保存到历史版本数组中。
   * 
   * 历史版本格式：
   * ```typescript
   * {
   *   version: number,        // 版本号（从1开始递增）
   *   rules: any,            // 规则内容
   *   updateTime: string,    // 更新时间（ISO格式）
   *   operator: string       // 操作人ID
   * }
   * ```
   * 
   * @param config - 当前配置对象
   * @param operatorId - 操作人ID
   * @returns 更新后的历史版本数组
   * 
   * @private
   * @验证需求 FR-7.1
   */
  private async saveRulesHistory(config: any, operatorId?: string): Promise<any[]> {
    // 获取现有历史版本
    const existingHistory = (config.rulesHistory as any[]) || [];
    
    // 计算新版本号（最新版本号 + 1）
    const latestVersion = existingHistory.length > 0 
      ? Math.max(...existingHistory.map((h: any) => h.version || 0))
      : 0;
    const newVersion = latestVersion + 1;
    
    // 创建新的历史版本记录
    const historyRecord = {
      version: newVersion,
      rules: config.rules,
      updateTime: new Date().toISOString(),
      operator: operatorId || 'system',
    };
    
    // 将新记录添加到历史版本数组的开头（最新的在前）
    const updatedHistory = [historyRecord, ...existingHistory];
    
    // 限制历史版本数量（最多保留50个版本）
    const maxHistoryCount = 50;
    if (updatedHistory.length > maxHistoryCount) {
      updatedHistory.splice(maxHistoryCount);
    }
    
    return updatedHistory;
  }

  /**
   * 回滚到指定版本
   * 
   * @description
   * 将活动配置回滚到历史版本。
   * 
   * 回滚流程：
   * 1. 查询配置和历史版本
   * 2. 验证目标版本是否存在
   * 3. 将当前规则保存到历史版本
   * 4. 将目标版本的规则设置为当前规则
   * 5. 更新配置
   * 
   * @param id - 配置ID
   * @param targetVersion - 目标版本号
   * @param operatorId - 操作人ID（可选）
   * @returns 回滚后的配置
   * 
   * @throws {BusinessException} 如果配置不存在或目标版本不存在
   * 
   * @example
   * ```typescript
   * // 回滚到版本3
   * await configService.rollbackToVersion('config-123', 3, 'admin-456');
   * ```
   * 
   * @验证需求 FR-7.1
   */
  @Transactional()
  async rollbackToVersion(id: string, targetVersion: number, operatorId?: string) {
    // 1. 查询配置
    const config = await this.repo.findById(id);
    BusinessException.throwIfNull(config, '配置不存在');

    // 2. 获取历史版本
    const rulesHistory = (config.rulesHistory as any[]) || [];
    
    // 3. 查找目标版本
    const targetHistoryRecord = rulesHistory.find((h: any) => h.version === targetVersion);
    if (!targetHistoryRecord) {
      throw new BusinessException(404, `版本 ${targetVersion} 不存在`);
    }

    // 4. 保存当前规则到历史版本（作为回滚前的快照）
    const updatedHistory = await this.saveRulesHistory(config, operatorId);

    // 5. 将目标版本的规则设置为当前规则
    const updated = await this.repo.update(id, {
      rules: targetHistoryRecord.rules,
      rulesHistory: updatedHistory as any,
    });

    return Result.ok(
      FormatDateFields(updated),
      `成功回滚到版本 ${targetVersion}`,
    );
  }

  /**
   * 获取规则历史版本列表
   * 
   * @description
   * 查询活动配置的所有历史版本。
   * 
   * @param id - 配置ID
   * @returns 历史版本列表（按时间倒序）
   * 
   * @example
   * ```typescript
   * const history = await configService.getRulesHistory('config-123');
   * 
   * // 返回格式：
   * // [
   * //   { version: 3, rules: {...}, updateTime: '2024-02-06T10:00:00Z', operator: 'admin-1' },
   * //   { version: 2, rules: {...}, updateTime: '2024-02-05T15:30:00Z', operator: 'admin-2' },
   * //   { version: 1, rules: {...}, updateTime: '2024-02-04T09:00:00Z', operator: 'admin-1' }
   * // ]
   * ```
   * 
   * @验证需求 FR-7.1
   */
  async getRulesHistory(id: string) {
    const config = await this.repo.findById(id);
    BusinessException.throwIfNull(config, '配置不存在');

    const rulesHistory = (config.rulesHistory as any[]) || [];
    
    return Result.ok({
      configId: id,
      currentRules: config.rules,
      history: rulesHistory,
      totalVersions: rulesHistory.length,
    });
  }

  /**
   * 比较两个版本的差异
   * 
   * @description
   * 比较当前版本和指定历史版本的规则差异。
   * 
   * @param id - 配置ID
   * @param targetVersion - 目标版本号
   * @returns 版本差异信息
   * 
   * @example
   * ```typescript
   * const diff = await configService.compareVersions('config-123', 2);
   * 
   * // 返回格式：
   * // {
   * //   currentVersion: { rules: {...}, updateTime: '...' },
   * //   targetVersion: { version: 2, rules: {...}, updateTime: '...' },
   * //   hasChanges: true
   * // }
   * ```
   * 
   * @验证需求 FR-7.1
   */
  async compareVersions(id: string, targetVersion: number) {
    const config = await this.repo.findById(id);
    BusinessException.throwIfNull(config, '配置不存在');

    const rulesHistory = (config.rulesHistory as any[]) || [];
    const targetHistoryRecord = rulesHistory.find((h: any) => h.version === targetVersion);
    
    if (!targetHistoryRecord) {
      throw new BusinessException(404, `版本 ${targetVersion} 不存在`);
    }

    // 比较当前规则和目标版本规则
    const currentRulesStr = JSON.stringify(config.rules);
    const targetRulesStr = JSON.stringify(targetHistoryRecord.rules);
    const hasChanges = currentRulesStr !== targetRulesStr;

    return Result.ok({
      currentVersion: {
        rules: config.rules,
        updateTime: config.updateTime,
      },
      targetVersion: {
        version: targetHistoryRecord.version,
        rules: targetHistoryRecord.rules,
        updateTime: targetHistoryRecord.updateTime,
        operator: targetHistoryRecord.operator,
      },
      hasChanges,
    });
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
