import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeoService } from 'src/module/lbs/geo/geo.service';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { MatchTenantVo, NearbyTenantVo } from './vo';

@Injectable()
export class ClientLocationService {
    private readonly logger = new Logger(ClientLocationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly geoService: GeoService,
    ) { }

    /**
     * 根据坐标匹配归属租户
     * 使用 PostGIS 电子围栏判断用户位于哪个服务站点
     */
    async matchTenantByLocation(lat: number, lng: number): Promise<MatchTenantVo> {
        // 1. 利用 GeoService 查找归属站点
        const station = await this.geoService.findStationByPoint(lat, lng);

        if (!station) {
            throw new BusinessException(ResponseCode.DATA_NOT_FOUND, '抱歉，该地址暂未开通服务');
        }

        // 2. 查询租户详情
        const tenant = await this.prisma.sysTenant.findUnique({
            where: { tenantId: station.tenantId },
        });

        if (!tenant) {
            throw new BusinessException(ResponseCode.DATA_NOT_FOUND, '服务商家信息不存在');
        }

        return {
            tenantId: tenant.tenantId,
            companyName: tenant.companyName,
        };
    }

    /**
     * 获取附近租户列表
     * 按距离排序，用于手动切换租户
     */
    async getNearbyTenants(lat: number, lng: number, radiusKm = 50): Promise<NearbyTenantVo[]> {
        // 查询所有有地理配置的租户
        const tenantsWithGeo = await this.prisma.sysTenantGeo.findMany({
            where: {
                latitude: { not: null },
                longitude: { not: null },
            },
            include: {
                tenant: {
                    select: {
                        tenantId: true,
                        companyName: true,
                        status: true,
                    },
                },
            },
        });

        // 计算距离并过滤
        const results: NearbyTenantVo[] = [];

        for (const geo of tenantsWithGeo) {
            if (!geo.latitude || !geo.longitude || !geo.tenant) continue;
            if (geo.tenant.status !== 'NORMAL') continue;

            // 计算距离 (使用 Haversine 公式简化计算，避免多次数据库查询)
            const distance = this.calculateDistanceSimple(lat, lng, geo.latitude, geo.longitude);
            const distanceKm = distance / 1000;

            if (distanceKm <= radiusKm) {
                results.push({
                    tenantId: geo.tenant.tenantId,
                    companyName: geo.tenant.companyName,
                    distance: Math.round(distanceKm * 10) / 10, // 保留一位小数
                });
            }
        }

        // 按距离排序
        results.sort((a, b) => a.distance - b.distance);

        return results;
    }

    /**
     * 简化的 Haversine 距离计算 (单位: 米)
     */
    private calculateDistanceSimple(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371000; // 地球半径 (米)
        const toRad = (deg: number) => (deg * Math.PI) / 180;

        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }
}
