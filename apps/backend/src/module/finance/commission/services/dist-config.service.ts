import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { BusinessConstants } from 'src/common/constants/business.constants';
import { DistributionConfig } from 'src/common/types/finance.types';

/**
 * 分销配置服务
 * 职责：获取和管理租户分销配置
 */
@Injectable()
export class DistConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取租户分销配置
   */
  async getDistConfig(tenantId: string): Promise<DistributionConfig> {
    const config = await this.prisma.sysDistConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      // 返回默认配置（含跨店配置）
      return {
        level1Rate: new Decimal(BusinessConstants.DISTRIBUTION.DEFAULT_LEVEL1_RATE),
        level2Rate: new Decimal(BusinessConstants.DISTRIBUTION.DEFAULT_LEVEL2_RATE),
        enableLV0: true,
        enableCrossTenant: false, // 默认不开启跨店
        crossTenantRate: new Decimal(BusinessConstants.DISTRIBUTION.DEFAULT_CROSS_TENANT_RATE),
        crossMaxDaily: new Decimal(BusinessConstants.DISTRIBUTION.DEFAULT_CROSS_DAILY_LIMIT),
        commissionBaseType: 'ORIGINAL_PRICE' as const, // 默认基于原价
        maxCommissionRate: new Decimal(0.5), // 默认最大50%
      };
    }

    return {
      ...config,
      // 确保新字段有默认值（兼容旧数据）
      enableCrossTenant: config.enableCrossTenant ?? false,
      crossTenantRate: config.crossTenantRate ?? new Decimal(BusinessConstants.DISTRIBUTION.DEFAULT_CROSS_TENANT_RATE),
      crossMaxDaily: config.crossMaxDaily ?? new Decimal(BusinessConstants.DISTRIBUTION.DEFAULT_CROSS_DAILY_LIMIT),
      commissionBaseType: config.commissionBaseType ?? 'ORIGINAL_PRICE',
      maxCommissionRate: config.maxCommissionRate ?? new Decimal(0.5),
    };
  }
}
