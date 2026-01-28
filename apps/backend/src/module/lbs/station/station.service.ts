import { Injectable } from '@nestjs/common';
import { GeoService } from '../geo/geo.service';
import { StationRepository } from './station.repository';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { CreateStationDto } from './dto/station.dto';

/**
 * 服务站管理服务 (Station Service)
 * 处理服务站网点基础信息、地理围栏 (Geo Fence) 同步及维护
 */
@Injectable()
export class StationService {
  constructor(
    private readonly repo: StationRepository,
    private readonly geoService: GeoService,
  ) { }

  /**
   * 创建服务站及其地理围栏
   * @param data 创建数据 (含网点信息及围栏坐标)
   * @returns 创建的服务站对象
   */
  @Transactional()
  async create(data: CreateStationDto) {
    const { tenantId, name, address, location, fence } = data as any; // DTO has location object, but raw data might be flattened or different. 
    // Wait, DTO definition: location: StationPointDto {lng, lat}.
    // Schema: SysStation { latitude, longitude }.
    // Need mapping.

    // Check if input data matches DTO structure (nested) or flat structure from previous implementation?
    // Previous implementation: const { tenantId, name, address, latitude, longitude, fence } = data;
    // We should assume data comes from Controller validated DTO? I'll assume flat-ish usage or handle mapping.
    // The previous code destructured latitude/longitude.
    // If I use CreateStationDto, it has `location: { lng, lat }`.
    // I will support both or map DTO to Entity.

    // Mapping DTO to Entity data
    // If data is CreateStationDto:
    let lat = data.location?.lat;
    let lng = data.location?.lng;

    // If legacy call passes flat data (not using DTO class instance strictly?):
    if (!lat && (data as any).latitude) lat = (data as any).latitude;
    if (!lng && (data as any).longitude) lng = (data as any).longitude;

    const station = await this.repo.create({
      tenantId: (data as any).tenantId, // tenantId usually from context, but previous code took it from data.
      name: data.name,
      address: data.address,
      latitude: lat,
      longitude: lng,
    } as any);

    // 2. 如果提供了围栏数据，则同步创建空间地理围栏记录
    if (fence && fence.points && fence.points.length > 0) {
      // DTO: points: [{lat, lng}, ...]
      // GeoService.toPolygonWKT expects [[lng, lat], ...] array (coordinates).
      // Need transformation.
      const coordinates = fence.points.map((p: any) => [p.lng, p.lat]);
      const polygonCoords = [coordinates]; // Ring 1

      const wkt = this.geoService.toPolygonWKT(polygonCoords);
      await this.repo.createFenceWithGeom(station.stationId, 'SERVICE', wkt);
    } else if ((data as any).fence && (data as any).fence.coordinates) {
      // Legacy support for raw coordinates if passed
      // Previous code: fence.coordinates
      // ... logic ...
      let polygonCoords = (data as any).fence.coordinates;
      if (Array.isArray(polygonCoords[0]) && Array.isArray(polygonCoords[0][0])) {
        polygonCoords = polygonCoords[0];
      }
      const wkt = this.geoService.toPolygonWKT(polygonCoords);
      await this.repo.createFenceWithGeom(station.stationId, 'SERVICE', wkt);
    }

    return station;
  }

  /**
   * 查询服务站列表
   * @param tenantId 可选租户 ID 过滤
   */
  async findAll(tenantId?: string) {
    return this.repo.findMany({
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
   */
  @Transactional()
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
    let station = await this.repo.findOne({ tenantId });

    const stationData = {
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
    };

    if (station) {
      // 存在则更新
      station = await this.repo.update(station.stationId, stationData as any);
    } else {
      // 不存在则创建
      station = await this.repo.create({
        tenantId,
        name: `主营网点`,
        ...stationData,
      } as any);
    }

    // 2. 更新地理围栏 (如果数据中有围栏定义)
    if (data.fence && data.fence.coordinates && data.fence.coordinates.length > 0) {
      // 清理旧的服务区围栏
      await this.repo.deleteFencesByStationId(station.stationId, 'SERVICE');

      let ringCoords: number[][];

      // 处理 GeoJSON rings 标准: [ [[lng,lat],...] ]
      if (Array.isArray(data.fence.coordinates[0]) && Array.isArray(data.fence.coordinates[0][0])) {
        ringCoords = data.fence.coordinates[0] as number[][];
      } else {
        ringCoords = data.fence.coordinates as any as number[][];
      }

      const wkt = this.geoService.toPolygonWKT(ringCoords);
      await this.repo.createFenceWithGeom(station.stationId, 'SERVICE', wkt);
    }

    return station;
  }
}
