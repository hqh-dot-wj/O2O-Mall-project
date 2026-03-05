import { Injectable } from '@nestjs/common';
import { Prisma, SysDistConfig, SysDistProductConfig, CommissionBaseType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { CreateProductConfigDto } from '../dto/create-product-config.dto';
import { UpdateProductConfigDto } from '../dto/update-product-config.dto';
import { ListProductConfigDto } from '../dto/list-product-config.dto';
import { ProductConfigVo } from '../vo/product-config.vo';
import { PaginationHelper } from 'src/common/utils/pagination.helper';
import { Transactional } from 'src/common/decorators/transactional.decorator';

@Injectable()
export class ProductConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建商品级分佣配置
   */
  @Transactional()
  async create(tenantId: string, dto: CreateProductConfigDto, operator: string): Promise<Result<ProductConfigVo>> {
    // 校验：productId 和 categoryId 必须有且仅有一个
    BusinessException.throwIf(
      !dto.productId && !dto.categoryId,
      'productId 和 categoryId 必须提供其中一个',
      ResponseCode.PARAM_INVALID,
    );
    BusinessException.throwIf(
      !!(dto.productId && dto.categoryId),
      'productId 和 categoryId 不能同时提供',
      ResponseCode.PARAM_INVALID,
    );

    // 校验：比例之和不能超过 100%
    if (dto.level1Rate !== undefined && dto.level2Rate !== undefined) {
      const totalRate = dto.level1Rate + dto.level2Rate;
      BusinessException.throwIf(totalRate > 100, '一级和二级分佣比例之和不能超过100%', ResponseCode.PARAM_INVALID);
    }

    // 检查是否已存在配置
    const existing = await this.prisma.sysDistProductConfig.findFirst({
      where: {
        tenantId,
        ...(dto.productId ? { productId: dto.productId } : { categoryId: dto.categoryId }),
        isActive: true,
      },
    });

    BusinessException.throwIf(
      !!existing,
      dto.productId ? '该商品已存在分佣配置' : '该品类已存在分佣配置',
      ResponseCode.BUSINESS_ERROR,
    );

    // 创建配置
    const config = await this.prisma.sysDistProductConfig.create({
      data: {
        tenantId,
        productId: dto.productId ?? null,
        categoryId: dto.categoryId ?? null,
        level1Rate: dto.level1Rate !== undefined ? new Prisma.Decimal(dto.level1Rate / 100) : null,
        level2Rate: dto.level2Rate !== undefined ? new Prisma.Decimal(dto.level2Rate / 100) : null,
        commissionBaseType: (dto.commissionBaseType ?? null) as CommissionBaseType | null,
        createBy: operator,
        updateBy: operator,
      },
    });

    return Result.ok(this.toVo(config), '创建成功');
  }

  /**
   * 更新商品级分佣配置
   */
  @Transactional()
  async update(
    tenantId: string,
    id: number,
    dto: UpdateProductConfigDto,
    operator: string,
  ): Promise<Result<ProductConfigVo>> {
    // 查询配置是否存在
    const config = await this.prisma.sysDistProductConfig.findFirst({
      where: { id, tenantId },
    });

    BusinessException.throwIfNull(config, '配置不存在', ResponseCode.NOT_FOUND);

    // 校验：比例之和不能超过 100%
    if (dto.level1Rate !== undefined || dto.level2Rate !== undefined) {
      const level1 = dto.level1Rate ?? (config.level1Rate ? Number(config.level1Rate) * 100 : 0);
      const level2 = dto.level2Rate ?? (config.level2Rate ? Number(config.level2Rate) * 100 : 0);
      const totalRate = level1 + level2;
      BusinessException.throwIf(totalRate > 100, '一级和二级分佣比例之和不能超过100%', ResponseCode.PARAM_INVALID);
    }

    // 更新配置
    const updated = await this.prisma.sysDistProductConfig.update({
      where: { id },
      data: {
        ...(dto.level1Rate !== undefined && { level1Rate: new Prisma.Decimal(dto.level1Rate / 100) }),
        ...(dto.level2Rate !== undefined && { level2Rate: new Prisma.Decimal(dto.level2Rate / 100) }),
        ...(dto.commissionBaseType && { commissionBaseType: dto.commissionBaseType as CommissionBaseType }),
        updateBy: operator,
      },
    });

    return Result.ok(this.toVo(updated), '更新成功');
  }

  /**
   * 删除商品级分佣配置（软删除）
   */
  @Transactional()
  async delete(tenantId: string, id: number, operator: string): Promise<Result<boolean>> {
    const config = await this.prisma.sysDistProductConfig.findFirst({
      where: { id, tenantId },
    });

    BusinessException.throwIfNull(config, '配置不存在', ResponseCode.NOT_FOUND);

    await this.prisma.sysDistProductConfig.update({
      where: { id },
      data: {
        isActive: false,
        updateBy: operator,
      },
    });

    return Result.ok(true, '删除成功');
  }

  /**
   * 查询商品级分佣配置列表
   */
  async findAll(
    tenantId: string,
    query: ListProductConfigDto,
  ): Promise<Result<{ rows: ProductConfigVo[]; total: number }>> {
    const { skip, take } = PaginationHelper.getPagination(query);

    const where: Prisma.SysDistProductConfigWhereInput = {
      tenantId,
      ...(query.productId && { productId: query.productId }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
    };

    const [configs, total] = await this.prisma.$transaction([
      this.prisma.sysDistProductConfig.findMany({
        where,
        orderBy: { createTime: 'desc' },
        skip,
        take,
      }),
      this.prisma.sysDistProductConfig.count({ where }),
    ]);

    const rows = configs.map((config) => this.toVo(config));

    return Result.ok({ rows, total });
  }

  /**
   * 查询单个商品级分佣配置
   */
  async findOne(tenantId: string, id: number): Promise<Result<ProductConfigVo>> {
    const config = await this.prisma.sysDistProductConfig.findFirst({
      where: { id, tenantId },
    });

    BusinessException.throwIfNull(config, '配置不存在', ResponseCode.NOT_FOUND);

    return Result.ok(this.toVo(config));
  }

  /**
   * 获取商品的有效分佣配置
   * 优先级：商品级 > 品类级 > 租户默认
   */
  async getEffectiveConfig(tenantId: string, productId: string, categoryId?: string) {
    // 1. 查询租户默认配置
    const tenantConfig = await this.prisma.sysDistConfig.findUnique({
      where: { tenantId },
    });

    if (!tenantConfig) {
      return null;
    }

    // 2. 查询商品级配置
    if (productId) {
      const productConfig = await this.prisma.sysDistProductConfig.findFirst({
        where: { tenantId, productId, isActive: true },
      });

      if (productConfig) {
        return this.mergeConfig(tenantConfig, productConfig);
      }
    }

    // 3. 查询品类级配置
    if (categoryId) {
      const categoryConfig = await this.prisma.sysDistProductConfig.findFirst({
        where: { tenantId, categoryId, isActive: true },
      });

      if (categoryConfig) {
        return this.mergeConfig(tenantConfig, categoryConfig);
      }
    }

    // 4. 返回租户默认配置
    return {
      level1Rate: Number(tenantConfig.level1Rate),
      level2Rate: Number(tenantConfig.level2Rate),
      commissionBaseType: tenantConfig.commissionBaseType,
      enableLV0: tenantConfig.enableLV0,
      enableCrossTenant: tenantConfig.enableCrossTenant,
      crossTenantRate: Number(tenantConfig.crossTenantRate),
      crossMaxDaily: Number(tenantConfig.crossMaxDaily),
      maxCommissionRate: Number(tenantConfig.maxCommissionRate),
    };
  }

  /**
   * 合并配置（商品/品类配置覆盖租户默认值）
   */
  private mergeConfig(tenantConfig: SysDistConfig, productConfig: SysDistProductConfig) {
    return {
      level1Rate: productConfig.level1Rate ? Number(productConfig.level1Rate) : Number(tenantConfig.level1Rate),
      level2Rate: productConfig.level2Rate ? Number(productConfig.level2Rate) : Number(tenantConfig.level2Rate),
      commissionBaseType: productConfig.commissionBaseType ?? tenantConfig.commissionBaseType,
      // 其他字段使用租户配置
      enableLV0: tenantConfig.enableLV0,
      enableCrossTenant: tenantConfig.enableCrossTenant,
      crossTenantRate: Number(tenantConfig.crossTenantRate),
      crossMaxDaily: Number(tenantConfig.crossMaxDaily),
      maxCommissionRate: Number(tenantConfig.maxCommissionRate),
    };
  }

  /**
   * 转换为 VO
   */
  private toVo(config: SysDistProductConfig): ProductConfigVo {
    return {
      id: config.id,
      productId: config.productId ?? undefined,
      categoryId: config.categoryId ?? undefined,
      level1Rate: config.level1Rate ? Number(config.level1Rate) * 100 : undefined,
      level2Rate: config.level2Rate ? Number(config.level2Rate) * 100 : undefined,
      commissionBaseType: config.commissionBaseType ?? undefined,
      isActive: config.isActive,
      createBy: config.createBy,
      createTime: config.createTime.toISOString(),
      updateBy: config.updateBy,
      updateTime: config.updateTime.toISOString(),
    };
  }


    /**
     * 批量导入商品级分佣配置
     * 支持创建和更新，已存在的配置会被更新
     */
    @Transactional()
    async batchImport(
      tenantId: string,
      items: Array<{
        productId?: string;
        categoryId?: string;
        level1Rate?: number;
        level2Rate?: number;
        commissionBaseType?: string;
      }>,
      operator: string,
    ): Promise<Result<{ success: number; failed: number; errors: string[] }>> {
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const [index, item] of items.entries()) {
        try {
          // 校验：productId 和 categoryId 必须有且仅有一个
          if (!item.productId && !item.categoryId) {
            throw new Error('productId 和 categoryId 必须提供其中一个');
          }
          if (item.productId && item.categoryId) {
            throw new Error('productId 和 categoryId 不能同时提供');
          }

          // 校验：比例之和不能超过 100%
          if (item.level1Rate !== undefined && item.level2Rate !== undefined) {
            const totalRate = item.level1Rate + item.level2Rate;
            if (totalRate > 100) {
              throw new Error('一级和二级分佣比例之和不能超过100%');
            }
          }

          // 查找是否已存在配置
          const existing = await this.prisma.sysDistProductConfig.findFirst({
            where: {
              tenantId,
              ...(item.productId ? { productId: item.productId } : { categoryId: item.categoryId }),
            },
          });

          if (existing) {
            // 更新现有配置
            await this.prisma.sysDistProductConfig.update({
              where: { id: existing.id },
              data: {
                ...(item.level1Rate !== undefined && { level1Rate: new Prisma.Decimal(item.level1Rate / 100) }),
                ...(item.level2Rate !== undefined && { level2Rate: new Prisma.Decimal(item.level2Rate / 100) }),
                ...(item.commissionBaseType && { commissionBaseType: item.commissionBaseType as CommissionBaseType }),
                isActive: true, // 重新激活
                updateBy: operator,
              },
            });
          } else {
            // 创建新配置
            await this.prisma.sysDistProductConfig.create({
              data: {
                tenantId,
                productId: item.productId ?? null,
                categoryId: item.categoryId ?? null,
                level1Rate: item.level1Rate !== undefined ? new Prisma.Decimal(item.level1Rate / 100) : null,
                level2Rate: item.level2Rate !== undefined ? new Prisma.Decimal(item.level2Rate / 100) : null,
                commissionBaseType: (item.commissionBaseType as CommissionBaseType) ?? null,
                createBy: operator,
                updateBy: operator,
              },
            });
          }

          success++;
        } catch (error) {
          failed++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push(`第 ${index + 1} 行: ${errorMsg}`);
        }
      }

      return Result.ok(
        { success, failed, errors },
        `批量导入完成：成功 ${success} 条，失败 ${failed} 条`,
      );
    }

}
