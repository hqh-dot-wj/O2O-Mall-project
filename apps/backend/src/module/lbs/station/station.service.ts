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
}
