import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { UpdateDistConfigDto } from './dto/update-dist-config.dto';
import { DistConfigVo, DistConfigLogVo } from './vo/dist-config.vo';
import { BusinessConstants } from 'src/common/constants/business.constants';

@Injectable()
export class DistributionService {
  constructor(private readonly prisma: PrismaService) {}

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
      enableCrossTenant: (config as any).enableCrossTenant ?? false,
      crossTenantRate: Number((config as any).crossTenantRate ?? 1) * 100,
      crossMaxDaily: Number((config as any).crossMaxDaily ?? BusinessConstants.DISTRIBUTION.DEFAULT_CROSS_DAILY_LIMIT),
      commissionBaseType: config.commissionBaseType ?? 'ORIGINAL_PRICE',
      maxCommissionRate: Number((config as any).maxCommissionRate ?? 0.5) * 100,
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
      update: updatePayload as any,
      create: createPayload as any,
    });

    // 记录变更日志（审计）
    await this.prisma.sysDistConfigLog.create({
      data: {
        tenantId,
        level1Rate,
        level2Rate,
        enableLV0: dto.enableLV0,
        enableCrossTenant: dto.enableCrossTenant ?? false,
        crossTenantRate,
        crossMaxDaily: dto.crossMaxDaily ?? BusinessConstants.DISTRIBUTION.DEFAULT_CROSS_DAILY_LIMIT,
        operator,
      } as any,
    });

    return Result.ok(true, '更新成功');
  }

  /**
   * 获取分销规则变更历史
   * @param tenantId 租户ID
   * @returns 变更历史列表
   */
  async getConfigLogs(tenantId: string): Promise<Result<DistConfigLogVo[]>> {
    const logs = await this.prisma.sysDistConfigLog.findMany({
      where: { tenantId },
      orderBy: { createTime: 'desc' },
      take: 20,
    });

    const result = logs.map((log: any) => ({
      id: log.id,
      configId: log.id,
      level1Rate: Number(log.level1Rate) * 100,
      level2Rate: Number(log.level2Rate) * 100,
      enableLV0: log.enableLV0,
      enableCrossTenant: log.enableCrossTenant ?? false,
      crossTenantRate: Number(log.crossTenantRate ?? 1) * 100,
      crossMaxDaily: Number(log.crossMaxDaily ?? BusinessConstants.DISTRIBUTION.DEFAULT_CROSS_DAILY_LIMIT),
      operator: log.operator,
      createTime: log.createTime.toISOString(),
    }));

    return Result.ok(result);
  }

  /**
   * 佣金预估 (前端提示用)
   * @param tenantId 下单门店ID
   * @param shareUserId 分享人ID (可选)
   * @returns 佣金预估信息
   */
  async getCommissionPreview(tenantId: string, shareUserId?: string) {
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

    const config = {
      level1Rate: distConfig?.level1Rate
        ? Number(distConfig.level1Rate)
        : BusinessConstants.DISTRIBUTION.DEFAULT_LEVEL1_RATE,
      enableCrossTenant: (distConfig as any)?.enableCrossTenant ?? false,
      crossTenantRate: (distConfig as any)?.crossTenantRate
        ? Number((distConfig as any).crossTenantRate)
        : BusinessConstants.DISTRIBUTION.DEFAULT_CROSS_TENANT_RATE,
    };

    // 判断是否跨店
    let isLocal = true;
    let notice: string | null = null;
    let effectiveRate = config.level1Rate;

    if (shareUserId) {
      const shareUser = await this.prisma.umsMember.findUnique({
        where: { memberId: shareUserId },
        select: { tenantId: true },
      });

      if (shareUser) {
        isLocal = shareUser.tenantId === tenantId;

        if (!isLocal) {
          if (config.enableCrossTenant) {
            // 跨店且开启
            effectiveRate = config.level1Rate * config.crossTenantRate;
            notice = `当前下单门店为【${tenant.companyName}】，预计佣金按该店标准执行`;
          } else {
            // 跨店但未开启
            effectiveRate = 0;
            notice = `【${tenant.companyName}】未开启跨店分销，本单不产生佣金`;
          }
        }
      }
    }

    return Result.ok({
      tenantName: tenant.companyName,
      commissionRate: `${(effectiveRate * 100).toFixed(0)}%`,
      isLocalReferrer: isLocal,
      isCrossEnabled: config.enableCrossTenant,
      estimatedAmount: 0, // 需要传入商品列表计算
      notice,
    });
  }
}
