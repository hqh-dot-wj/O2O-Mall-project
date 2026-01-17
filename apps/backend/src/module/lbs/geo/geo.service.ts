import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class GeoService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * 将 GeoJSON 坐标数组转换为 WKT Polygon 字符串
     * @param coordinates 经纬度数组 [[lng, lat], ...]
     */
    toPolygonWKT(coordinates: number[][]): string {
        if (!coordinates || coordinates.length < 3) {
            throw new Error('Polygon must have at least 3 points');
        }
        // Ensure the polygon is closed (first point == last point)
        const first = coordinates[0];
        const last = coordinates[coordinates.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
            coordinates.push(first);
        }

        const points = coordinates.map(p => `${p[0]} ${p[1]}`).join(',');
        return `POLYGON((${points}))`;
    }

    /**
     * 判断点是否在围栏内
     * @param lat 纬度
     * @param lng 经度
     * @returns 所在的服务站 ID (如有重叠，返回第一个)
     */
    async findStationByPoint(lat: number, lng: number): Promise<{ stationId: number; name: string; tenantId: string } | null> {
        const pointWKT = `POINT(${lng} ${lat})`;
        const sql = `
      SELECT s.station_id as "stationId", s.name, s.tenant_id as "tenantId"
      FROM sys_geo_fence f
      JOIN sys_station s ON f.station_id = s.station_id
      WHERE ST_Contains(f.geom, ST_GeomFromText('${pointWKT}', 4326))
      LIMIT 1;
    `;

        const result = await this.prisma.$queryRawUnsafe<any[]>(sql);
        if (result && result.length > 0) {
            return result[0];
        }
    }

    /**
     * 计算两点间的距离 (单位: 米)
     * 使用 PostGIS ST_DistanceSphere (基于球体模型，适合地球表面距离)
     * @param lat1 点1纬度
     * @param lng1 点1经度
     * @param lat2 点2纬度
     * @param lng2 点2经度
     */
    async calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): Promise<number> {
        // Construct points
        const p1 = `POINT(${lng1} ${lat1})`;
        const p2 = `POINT(${lng2} ${lat2})`;

        const sql = `
            SELECT ST_DistanceSphere(
                ST_GeomFromText('${p1}', 4326),
                ST_GeomFromText('${p2}', 4326)
            ) as distance;
        `;

        const result = await this.prisma.$queryRawUnsafe<{ distance: number }[]>(sql);
        if (result && result.length > 0) {
            return result[0].distance;
        }
        return 0;
    }
}
