import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 地理信息服务 (Geo Service)
 * 处理空间计算、WKT 转换及 PostGIS 空间运算符操作
 */
@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 将 GeoJSON 坐标数组转换为 WKT Polygon 字符串
   * @param coordinates 经纬度数组 [[lng, lat], ...]
   * @returns WKT 格式的多边形字符串: POLYGON((lng1 lat1, lng2 lat2, ...))
   */
  toPolygonWKT(coordinates: number[][]): string {
    if (!coordinates || coordinates.length < 3) {
      throw new Error('多边形必须至少包含 3 个点');
    }
    // 确保多边形闭合 (第一个点必须等于最后一个点)
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coordinates.push(first);
    }

    const points = coordinates.map((p) => `${p[0]} ${p[1]}`).join(',');
    return `POLYGON((${points}))`;
  }

  /**
   * 判断经纬度点是否在地理围栏内
   * 采用参数化查询防止 SQL 注入
   * @param lat 纬度
   * @param lng 经度
   * @returns 匹配到的服务站信息 (stationId, name, tenantId)
   */
  async findStationByPoint(
    lat: number,
    lng: number,
  ): Promise<{ stationId: number; name: string; tenantId: string } | null> {
    const pointWKT = `POINT(${lng} ${lat})`;

    // ✅ 使用参数化查询，防止 SQL 注入
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT s.station_id as "stationId", s.name, s.tenant_id as "tenantId"
      FROM sys_geo_fence f
      JOIN sys_station s ON f.station_id = s.station_id
      WHERE ST_Contains(f.geom, ST_GeomFromText(${pointWKT}, 4326))
      LIMIT 1;
    `;

    if (result && result.length > 0) {
      return result[0];
    }
    return null;
  }

  /**
   * 计算地球表面两点间的直线距离 (单位: 米)
   * 使用 PostGIS ST_DistanceSphere (基于球体模型)
   * 采用参数化查询防止 SQL 注入
   * @param lat1 点1纬度
   * @param lng1 点1经度
   * @param lat2 点2纬度
   * @param lng2 点2经度
   */
  async calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): Promise<number> {
    const p1 = `POINT(${lng1} ${lat1})`;
    const p2 = `POINT(${lng2} ${lat2})`;

    // ✅ 使用参数化查询，防止 SQL 注入
    const result = await this.prisma.$queryRaw<{ distance: number }[]>`
      SELECT ST_DistanceSphere(
        ST_GeomFromText(${p1}, 4326),
        ST_GeomFromText(${p2}, 4326)
      ) as distance;
    `;

    if (result && result.length > 0) {
      return result[0].distance;
    }
    return 0;
  }
}
