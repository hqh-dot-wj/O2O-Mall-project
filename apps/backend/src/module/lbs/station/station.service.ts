import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeoService } from '../geo/geo.service';

/**
 * 服务站管理服务 (Station Service)
 * 处理服务站网点基础信息、地理围栏 (Geo Fence) 同步及维护
 */
@Injectable()
export class StationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geoService: GeoService,
  ) { }

  /**
   * 创建服务站及其地理围栏
   * @param data 创建数据 (含网点信息及围栏坐标)
   * @returns 创建的服务站对象
   */
  async create(data: any) {
    const { tenantId, name, address, latitude, longitude, fence } = data;

    // 1. 创建服务站基础信息
    const station = await this.prisma.sysStation.create({
      data: {
        tenantId,
        name,
        address,
        latitude,
        longitude,
      },
    });

    // 2. 如果提供了围栏数据，则同步创建空间地理围栏记录
    if (fence && fence.coordinates && fence.coordinates.length > 0) {
      let polygonCoords = fence.coordinates;
      // 处理 GeoJSON 多边形标准：取第一个环(外环)
      if (Array.isArray(polygonCoords[0]) && Array.isArray(polygonCoords[0][0])) {
        polygonCoords = polygonCoords[0];
      }

      const wkt = this.geoService.toPolygonWKT(polygonCoords);

      // ✅ 使用参数化查询，防止 SQL 注入
      await this.prisma.$executeRaw`
         INSERT INTO sys_geo_fence (station_id, type, geom)
         VALUES (${station.stationId}, 'SERVICE', ST_GeomFromText(${wkt}, 4326));
      `;
    }

    return station;
  }

  /**
   * 查询服务站列表
   * @param tenantId 可选租户 ID 过滤
   */
  async findAll(tenantId?: string) {
    return this.prisma.sysStation.findMany({
      where: tenantId ? { tenantId } : {},
    });
  }

  /**
   * 根据地理位置查询最近的服务站
   * @param lat 纬度
   * @param lng 经度
   */
  async findNearby(lat: number, lng: number) {
    return this.geoService.findStationByPoint(lat, lng);
  }

  /**
   * 同步/更新租户的主站点信息 (O2O 适配器使用)
   * 采用 “覆盖更新” 策略，确保每个租户至少有一个主营网点
   * @param tenantId 租户 ID
   * @param data 更新的数据 (含地址、经纬度、围栏)
   */
  async upsertMainStation(
    tenantId: string,
    data: {
      address?: string;
      latitude?: number;
      longitude?: number;
      fence?: { type: 'Polygon'; coordinates: number[][][] };
      regionCode?: string;
    },
  ) {
    // 1. 查找租户现有的网点
    let station = await this.prisma.sysStation.findFirst({
      where: { tenantId },
    });

    const stationData = {
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
    };

    if (station) {
      // 存在则更新
      station = await this.prisma.sysStation.update({
        where: { stationId: station.stationId },
        data: stationData,
      });
    } else {
      // 不存在则创建
      station = await this.prisma.sysStation.create({
        data: {
          tenantId,
          name: `主营网点`,
          ...stationData,
        },
      });
    }

    // 2. 更新地理围栏 (如果数据中有围栏定义)
    if (data.fence && data.fence.coordinates && data.fence.coordinates.length > 0) {
      // 清理旧的服务区围栏 (一个站点目前只支持一个 SERVICE 类型围栏)
      await this.prisma.sysGeoFence.deleteMany({
        where: { stationId: station.stationId, type: 'SERVICE' },
      });

      let ringCoords: number[][];

      // 处理 GeoJSON rings 标准: [ [[lng,lat],...] ]
      if (Array.isArray(data.fence.coordinates[0]) && Array.isArray(data.fence.coordinates[0][0])) {
        ringCoords = data.fence.coordinates[0] as number[][];
      } else {
        ringCoords = data.fence.coordinates as any as number[][];
      }

      const wkt = this.geoService.toPolygonWKT(ringCoords);

      // ✅ 使用参数化查询，防止 SQL 注入
      await this.prisma.$executeRaw`
        INSERT INTO sys_geo_fence (station_id, type, geom)
        VALUES (${station.stationId}, 'SERVICE', ST_GeomFromText(${wkt}, 4326));
      `;
    }

    return station;
  }
}
