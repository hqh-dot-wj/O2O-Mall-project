import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeoService } from '../geo/geo.service';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response';
import { LbsMetricsService } from '../monitoring/lbs-metrics.service';

/**
 * 统一位置准入服务
 * 提供统一的位置准入判断逻辑，避免围栏与半径规则冲突
 */
@Injectable()
export class AdmissionService {
  private readonly logger = new Logger(AdmissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geoService: GeoService,
    private readonly metricsService: LbsMetricsService,
  ) {}

  /**
   * 检查位置是否在服务范围内（统一准入模型）
   * 优先级：围栏 > 半径
   * @param tenantId 租户ID
   * @param lat 纬度
   * @param lng 经度
   * @returns 是否在服务范围内
   * @throws BusinessException 超出服务范围时抛出异常
   */
  async checkLocationAdmission(tenantId: string, lat: number, lng: number): Promise<boolean> {
    const startTime = Date.now();
    let success = false;

    try {
      // 1. 查询租户配置
      const tenant = await this.prisma.sysTenant.findUnique({
        where: { tenantId },
        include: { geoConfig: true },
      });

      BusinessException.throwIfNull(tenant, '租户不存在');
      BusinessException.throwIf(tenant.status !== 'NORMAL', '租户不可用');

      // 2. 优先使用围栏判断
      const stationMatch = await this.geoService.findStationByPoint(lat, lng);
      if (stationMatch && stationMatch.tenantId === tenantId) {
        this.logger.debug(`位置命中围栏: tenantId=${tenantId}, station=${stationMatch.stationId}`);
        await this.metricsService.recordFenceHit(stationMatch.stationId);
        success = true;
        return true;
      }

      // 3. 降级到半径判断（如果配置了半径）
      if (tenant.geoConfig?.latitude && tenant.geoConfig?.longitude && tenant.geoConfig?.serviceRadius) {
        const distance = await this.geoService.calculateDistance(
          Number(tenant.geoConfig.latitude),
          Number(tenant.geoConfig.longitude),
          lat,
          lng,
        );

        if (distance <= tenant.geoConfig.serviceRadius) {
          this.logger.debug(`位置命中半径: tenantId=${tenantId}, distance=${distance}m`);
          await this.metricsService.recordRadiusFallback();
          success = true;
          return true;
        }
      }

      // 4. 都不满足，抛出异常
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '超出服务范围，无法配送/服务');
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const latency = Date.now() - startTime;
      await this.metricsService.recordMatchRequest(success, latency);
    }
  }

  /**
   * 检查位置是否在服务范围内（不抛异常版本）
   * @param tenantId 租户ID
   * @param lat 纬度
   * @param lng 经度
   * @returns 是否在服务范围内
   */
  async isLocationInRange(tenantId: string, lat: number, lng: number): Promise<boolean> {
    try {
      await this.checkLocationAdmission(tenantId, lat, lng);
      return true;
    } catch (error) {
      return false;
    }
  }
}
