import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions';
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
  ) {}

  /**
   * 创建服务站及其地理围栏
   * @param data 创建数据 (含网点信息及围栏坐标)
   * @returns 创建的服务站对象
   */
  @Transactional()
  async create(data: CreateStationDto) {
    const tenantId = (data as any).tenantId;
    const lat = data.location?.lat ?? (data as any).latitude;
    const lng = data.location?.lng ?? (data as any).longitude;

    BusinessException.throwIf(!tenantId, 'tenantId 不能为空');
    BusinessException.throwIf(lat === undefined || lat === null, '站点纬度不能为空');
    BusinessException.throwIf(lng === undefined || lng === null, '站点经度不能为空');

    const station = await this.repo.create({
      tenantId,
      name: data.name,
      address: data.address,
      latitude: lat,
      longitude: lng,
    } as any);

    const ringCoordinates = this.extractFenceRingCoordinates(data);
    if (ringCoordinates.length > 0) {
      const wkt = this.geoService.toPolygonWKT(ringCoordinates);
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

  private extractFenceRingCoordinates(data: CreateStationDto): number[][] {
    const dtoPoints = data.fence?.points;
    if (Array.isArray(dtoPoints) && dtoPoints.length > 0) {
      return dtoPoints.map((point) => [point.lng, point.lat]);
    }

    const legacyCoordinates = (data as any).fence?.coordinates;
    if (!Array.isArray(legacyCoordinates) || legacyCoordinates.length === 0) {
      return [];
    }

    if (Array.isArray(legacyCoordinates[0]) && Array.isArray(legacyCoordinates[0][0])) {
      return legacyCoordinates[0] as number[][];
    }

    return legacyCoordinates as number[][];
  }
}
