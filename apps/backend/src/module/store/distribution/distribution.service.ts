import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { UpdateDistConfigDto } from './dto/update-dist-config.dto';
import { ListConfigLogsDto } from './dto/list-config-logs.dto';
import { CommissionPreviewDto } from './dto/commission-preview.dto';
import { DistConfigVo, DistConfigLogVo } from './vo/dist-config.vo';
import { BusinessConstants } from 'src/common/constants/business.constants';
import { DistributionLogItem } from 'src/common/types';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { PaginationHelper } from 'src/common/utils/pagination.helper';
import { ProductConfigService } from './services/product-config.service';

@Injectable()
export class DistributionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productConfigService: ProductConfigService,
  ) {}

  /**
   * 获取分销规则配置
   * @param tenantId 租户ID
   * @returns 分销规则配置信息
   */
  async getConfig(tenantId: string): Promise<Result<DistConfigVo | null>> {
    const config = await this.prisma.sysDistConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      // 返回默认配置（含跨店配置）
      return Result.ok({
        id: 0,
        level1Rate: BusinessConstants.DISTRIBUTION.DEFAULT_LEVEL1_RATE * 100,
        level2Rate: BusinessConstants.DISTRIBUTION.DEFAULT_LEVEL2_RATE * 100,
        enableLV0: true,
        enableCrossTenant: false,
        crossTenantRate: BusinessConstants.DISTRIBUTION.DEFAULT_CROSS_TENANT_RATE * 100, // 100% 无折扣
        crossMaxDaily: BusinessConstants.DISTRIBUTION.DEFAULT_CROSS_DAILY_LIMIT,
        commissionBaseType: 'ORIGINAL_PRICE',
        maxCommissionRate: 50,
        createTime: new Date().toISOString(),
      });
    }

    return Result.ok({
      id: config.id,
      level1Rate: Number(config.level1Rate) * 100,
      level2Rate: Number(config.level2Rate) * 100,
      enableLV0: config.enableLV0,
      enableCrossTenant: config.enableCrossTenant ?? false,
      crossTenantRate: Number(config.crossTenantRate ?? 1) * 100,
      crossMaxDaily: Number(config.crossMaxDaily ?? BusinessConstants.DISTRIBUTION.DEFAULT_CROSS_DAILY_LIMIT),
      commissionBaseType: config.commissionBaseType ?? 'ORIGINAL_PRICE',
      maxCommissionRate: Number(config.maxCommissionRate ?? 0.5) * 100,
      createTime: config.createTime.toISOString(),
    });
  }

  /**
   * 更新分销规则配置
   * @param tenantId 租户ID
   * @param dto 更新参数
   * @param operator 操作人
   * @returns 更新结果
   */
  @Transactional()
  async updateConfig(tenantId: string, dto: UpdateDistConfigDto, operator: string): Promise<Result<boolean>> {
    // 校验比例总和不能超过 100%
    const totalRate = dto.level1Rate + dto.level2Rate;
    BusinessException.throwIf(totalRate > 100, '一级和二级分佣比例之和不能超过100%', ResponseCode.PARAM_INVALID);

    const level1Rate = dto.level1Rate / 100;
    const level2Rate = dto.level2Rate / 100;
    const crossTenantRate = (dto.crossTenantRate ?? 100) / 100;
    const maxCommissionRate = dto.maxCommissionRate != null ? dto.maxCommissionRate / 100 : 0.5;

    const updatePayload = {
      level1Rate,
      level2Rate,
      enableLV0: dto.enableLV0,
      enableCrossTenant: dto.enableCrossTenant ?? false,
      crossTenantRate,
      crossMaxDaily: dto.crossMaxDaily ?? BusinessConstants.DISTRIBUTION.DEFAULT_CROSS_DAILY_LIMIT,
      ...(dto.commissionBaseType != null && { commissionBaseType: dto.commissionBaseType }),
      maxCommissionRate,
      updateBy: operator,
    };
    const createPayload = {
      tenantId,
      ...updatePayload,
      createBy: operator,
    };

    await this.prisma.sysDistConfig.upsert({
      where: { tenantId },
      update: updatePayload as Prisma.SysDistConfigUpdateInput,
      create: createPayload as Prisma.SysDistConfigCreateInput,
    });

    // 记录变更日志（审计）
    await this.prisma.sysDistConfigLog.create({
      data: {
        tenantId,
        level1Rate: new Prisma.Decimal(level1Rate),
        level2Rate: new Prisma.Decimal(level2Rate),
        enableLV0: dto.enableLV0,
        enableCrossTenant: dto.enableCrossTenant ?? false,
        crossTenantRate: new Prisma.Decimal(crossTenantRate),
        crossMaxDaily: new Prisma.Decimal(dto.crossMaxDaily ?? BusinessConstants.DISTRIBUTION.DEFAULT_CROSS_DAILY_LIMIT),
        commissionBaseType: dto.commissionBaseType ?? null,
        maxCommissionRate: new Prisma.Decimal(maxCommissionRate),
        operator,
      },
    });

    return Result.ok(true, '更新成功');
  }

  /**
   * 获取分销规则变更历史
   * @param tenantId 租户ID
   * @param query 分页参数
   * @returns 变更历史列表
   */
  async getConfigLogs(tenantId: string, query: ListConfigLogsDto): Promise<Result<{ rows: DistConfigLogVo[]; total: number }>> {
    const { skip, take } = PaginationHelper.getPagination(query);

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.sysDistConfigLog.findMany({
        where: { tenantId },
        orderBy: { createTime: 'desc' },
        skip,
        take,
      }),
      this.prisma.sysDistConfigLog.count({
        where: { tenantId },
      }),
    ]);

    const rows = logs.map((log) => ({
      id: Number(log.id),
      configId: Number(log.id),
      level1Rate: Number(log.level1Rate) * 100,
      level2Rate: Number(log.level2Rate) * 100,
      enableLV0: log.enableLV0,
      enableCrossTenant: log.enableCrossTenant ?? false,
      crossTenantRate: Number(log.crossTenantRate ?? 1) * 100,
      crossMaxDaily: Number(log.crossMaxDaily ?? BusinessConstants.DISTRIBUTION.DEFAULT_CROSS_DAILY_LIMIT),
      commissionBaseType: log.commissionBaseType ?? undefined,
      maxCommissionRate: log.maxCommissionRate ? Number(log.maxCommissionRate) * 100 : undefined,
      operator: log.operator,
      createTime: log.createTime.toISOString(),
    }));

    return Result.ok({ rows, total });
  }

  /**
   * 佣金预估 (前端提示用)
   * @param dto 预估参数（包含门店ID、SKU列表、分享人ID）
   * @returns 佣金预估信息
   */
  async getCommissionPreview(dto: CommissionPreviewDto) {
    const { tenantId, items, shareUserId } = dto;

    // 获取门店信息
    const tenant = await this.prisma.sysTenant.findUnique({
      where: { tenantId },
      select: { companyName: true },
    });

    if (!tenant) {
      return Result.ok({
        tenantName: '未知门店',
        commissionRate: '0%',
        isLocalReferrer: true,
        isCrossEnabled: false,
        estimatedAmount: 0,
        notice: null,
      });
    }

    // 获取门店分销配置
    const distConfig = await this.prisma.sysDistConfig.findUnique({
      where: { tenantId },
    });

    const tenantConfig = {
      level1Rate: distConfig?.level1Rate
        ? Number(distConfig.level1Rate)
        : BusinessConstants.DISTRIBUTION.DEFAULT_LEVEL1_RATE,
      enableCrossTenant: distConfig?.enableCrossTenant ?? false,
      crossTenantRate: distConfig?.crossTenantRate
        ? Number(distConfig.crossTenantRate)
        : BusinessConstants.DISTRIBUTION.DEFAULT_CROSS_TENANT_RATE,
      commissionBaseType: distConfig?.commissionBaseType ?? 'ORIGINAL_PRICE',
    };

    // 判断是否跨店
    let isLocal = true;
    let notice: string | null = null;
    let crossTenantRate = 1;

    if (shareUserId) {
      const shareUser = await this.prisma.umsMember.findUnique({
        where: { memberId: shareUserId },
        select: { tenantId: true },
      });

      if (shareUser) {
        isLocal = shareUser.tenantId === tenantId;

        if (!isLocal) {
          if (tenantConfig.enableCrossTenant) {
            // 跨店且开启
            crossTenantRate = tenantConfig.crossTenantRate;
            notice = `当前下单门店为【${tenant.companyName}】，预计佣金按该店标准执行`;
          } else {
            // 跨店但未开启
            crossTenantRate = 0;
            notice = `【${tenant.companyName}】未开启跨店分销，本单不产生佣金`;
          }
        }
      }
    }

    // 计算预估佣金金额（使用商品级配置）
    let estimatedAmount = 0;
    let avgRate = tenantConfig.level1Rate; // 用于显示平均比例

    if (items && items.length > 0 && crossTenantRate > 0) {
      // 批量查询SKU信息
      const skuIds = items.map((item) => item.skuId);
      const skus = await this.prisma.pmsTenantSku.findMany({
        where: {
          id: { in: skuIds },
          tenantId,
          isActive: true,
        },
        include: {
          globalSku: {
            include: {
              product: {
                select: {
                  categoryId: true,
                },
              },
            },
          },
        },
      });

      const skuMap = new Map(skus.map((s) => [s.id, s]));
      let totalRate = 0;
      let validItemCount = 0;

      // 根据佣金基数类型和商品级配置计算
      for (const item of items) {
        const sku = skuMap.get(item.skuId);
        if (!sku) continue;

        const quantity = item.quantity ?? 1;

        // 获取该商品的有效配置（商品级 > 品类级 > 租户默认）
        const productId = sku.id;
        const categoryId = sku.globalSku.product.categoryId;
        const effectiveConfig = await this.productConfigService.getEffectiveConfig(tenantId, String(productId), categoryId);

        if (!effectiveConfig) continue;

        const level1Rate = effectiveConfig.level1Rate;
        const commissionBaseType = effectiveConfig.commissionBaseType;

        let basePrice = 0;
        if (commissionBaseType === 'ORIGINAL_PRICE') {
          basePrice = Number(sku.globalSku.guidePrice);
        } else if (commissionBaseType === 'ACTUAL_PAID') {
          basePrice = Number(sku.price);
        }
        // ZERO 类型不计算佣金

        // 应用跨店折扣
        const effectiveRate = level1Rate * crossTenantRate;
        estimatedAmount += basePrice * quantity * effectiveRate;

        totalRate += effectiveRate;
        validItemCount++;
      }

      // 计算平均比例用于显示
      if (validItemCount > 0) {
        avgRate = totalRate / validItemCount;
      }
    } else if (crossTenantRate === 0) {
      // 跨店但未开启，佣金率为0
      avgRate = 0;
    }

    return Result.ok({
      tenantName: tenant.companyName,
      commissionRate: `${(avgRate * 100).toFixed(0)}%`,
      isLocalReferrer: isLocal,
      isCrossEnabled: tenantConfig.enableCrossTenant,
      estimatedAmount: Number(estimatedAmount.toFixed(2)),
      notice,
    });
  }
}
