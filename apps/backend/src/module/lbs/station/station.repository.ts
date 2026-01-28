import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SoftDeleteRepository } from 'src/common/repository/base.repository';
import { SysStation, Prisma, SysGeoFence } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { CreateStationDto, UpdateStationDto } from './dto/station.dto';

@Injectable()
export class StationRepository extends SoftDeleteRepository<SysStation, CreateStationDto, UpdateStationDto> {
    constructor(prisma: PrismaService, cls: ClsService) {
        super(prisma, cls, 'sysStation', 'stationId');
    }

    /**
     * 创建围栏
     */
    async createFence(data: any): Promise<SysGeoFence> {
        return this.prisma.sysGeoFence.create({ data });
    }

    /**
   * 更新围栏
   */
    async updateFence(id: number, data: any): Promise<SysGeoFence> {
        return this.prisma.sysGeoFence.update({
            where: { fenceId: id },
            data,
        });
    }

    /**
     * 查找围栏
     */
    async findFence(id: number): Promise<SysGeoFence | null> {
        return this.prisma.sysGeoFence.findUnique({
            where: { fenceId: id },
        });
    }

    /**
   * 创建围栏 (带 Geometry)
   */
    async createFenceWithGeom(stationId: number, type: string, wkt: string) {
        // ✅ 使用参数化查询
        await this.prisma.$executeRaw`
      INSERT INTO sys_geo_fence (station_id, type, geom)
      VALUES (${stationId}, ${type}, ST_GeomFromText(${wkt}, 4326));
    `;
    }

    /**
   * 删除站点的所有围栏
   */
    async deleteFencesByStationId(stationId: number, type?: string) {
        if (type) {
            await this.prisma.sysGeoFence.deleteMany({
                where: { stationId, type },
            });
        } else {
            await this.prisma.sysGeoFence.deleteMany({
                where: { stationId },
            });
        }
    }
}
