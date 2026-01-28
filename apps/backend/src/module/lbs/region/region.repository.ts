import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/repository/base.repository';
import { SysRegion, Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class RegionRepository extends BaseRepository<SysRegion> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'sysRegion', 'code'); // Primary key is 'code'
  }

  /**
   * 查找所有根节点
   */
  async findRoots() {
    return this.findMany({
      where: {
        OR: [{ parentCode: null }, { parentCode: '' }, { level: 1 }],
      },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * 查找子节点
   */
  async findChildren(parentCode: string) {
    return this.findMany({
      where: { parentCode },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * 查找所有区域（用于构建树）
   */
  async findAllRegions() {
    return this.findMany({
      orderBy: { code: 'asc' },
    });
  }
}
