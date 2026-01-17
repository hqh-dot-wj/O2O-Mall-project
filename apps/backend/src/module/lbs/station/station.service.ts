import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service'; // Fix import later if needed
import { GeoService } from '../geo/geo.service';

@Injectable()
export class StationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly geoService: GeoService,
    ) { }

    async create(data: any) {
        const { tenantId, name, address, latitude, longitude, fence } = data;

        // 1. Create Station
        const station = await this.prisma.sysStation.create({
            data: {
                tenantId,
                name,
                address,
                latitude,
                longitude,
            },
        });

        // 2. Create Fence if provided
        if (fence && fence.coordinates && fence.coordinates.length > 0) {
            // Expect fence.coordinates to be number[][] i.e., [[lng, lat], ...]
            // Wait, usually GeoJSON Polygon coords are number[][][] (Ring arrays).
            // Frontend usually sends [ [[lng, lat]] ] for single polygon.
            // Let's assume input is simple polygon coordinates [[lng,lat], ...] for now or handle Ring.

            let polygonCoords = fence.coordinates;
            // If it's a 3D array (GeoJSON Polygon standard), take the first ring (outer ring)
            if (Array.isArray(polygonCoords[0]) && Array.isArray(polygonCoords[0][0])) {
                polygonCoords = polygonCoords[0];
            }

            const wkt = this.geoService.toPolygonWKT(polygonCoords);

            await this.prisma.$executeRawUnsafe(`
         INSERT INTO sys_geo_fence (station_id, type, geom)
         VALUES (${station.stationId}, 'SERVICE', ST_GeomFromText('${wkt}', 4326));
       `);
        }

        return station;
    }

    async findAll(tenantId?: string) {
        return this.prisma.sysStation.findMany({
            where: tenantId ? { tenantId } : {},
        });
    }

    async findNearby(lat: number, lng: number) {
        return this.geoService.findStationByPoint(lat, lng);
    }

    /**
     * 同步/更新租户的主站点信息 (O2O Adapter)
     */
    async upsertMainStation(tenantId: string, data: {
        address?: string;
        latitude?: number;
        longitude?: number;
        fence?: { type: 'Polygon', coordinates: number[][][] };
        regionCode?: string;
    }) {
        // 1. 查找该租户下的任意站点 (假设第一个为主站点)
        let station = await this.prisma.sysStation.findFirst({
            where: { tenantId }
        });

        const stationData = {
            latitude: data.latitude,
            longitude: data.longitude,
            address: data.address,
        };

        if (station) {
            // Update
            station = await this.prisma.sysStation.update({
                where: { stationId: station.stationId },
                data: stationData
            });
        } else {
            // Create
            station = await this.prisma.sysStation.create({
                data: {
                    tenantId,
                    name: `主营网点`, // 默认名称
                    ...stationData
                }
            });
        }

        // 2. 更新围栏 (如果有)
        if (data.fence && data.fence.coordinates && data.fence.coordinates.length > 0) {
            // 先删除旧围栏 (简单这粗暴策略: 一个站点只有一个服务区围栏)
            // 注意: 实际业务中可能要保留多个，这里为了 Adapter 简单化，只保留一个 SERVICE 类型的
            await this.prisma.sysGeoFence.deleteMany({
                where: { stationId: station.stationId, type: 'SERVICE' }
            });

            let ringCoords: number[][]; // Coordinates for the outer ring

            // Handle GeoJSON standard 3D array (Rings) - we only support single polygon (outer ring) for now
            // standard: [ [[lng,lat],[lng,lat],...], [[hole],[hole]] ]
            if (Array.isArray(data.fence.coordinates[0]) && Array.isArray(data.fence.coordinates[0][0])) {
                ringCoords = data.fence.coordinates[0] as number[][];
            } else {
                // In case it's mistakenly passed as 2D
                ringCoords = data.fence.coordinates as any as number[][];
            }

            const wkt = this.geoService.toPolygonWKT(ringCoords);

            await this.prisma.$executeRawUnsafe(`
                INSERT INTO sys_geo_fence (station_id, type, geom)
                VALUES (${station.stationId}, 'SERVICE', ST_GeomFromText('${wkt}', 4326));
            `);
        }

        return station;
    }
}
