import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SoftDeleteRepository } from 'src/common/repository/base.repository';
import { StorePlayConfig, Prisma, PublishStatus } from '@prisma/client';
import { CreateStorePlayConfigDto, ListStorePlayConfigDto, UpdateStorePlayConfigDto } from './dto/config.dto';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class StorePlayConfigRepository extends SoftDeleteRepository<
  StorePlayConfig,
  CreateStorePlayConfigDto,
  UpdateStorePlayConfigDto
> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'storePlayConfig');
  }

  async search(query: ListStorePlayConfigDto) {
    const where: Prisma.StorePlayConfigWhereInput = {};

    if (query.storeId) {
      where.storeId = query.storeId;
    }

    if (query.templateCode) {
      where.templateCode = query.templateCode;
    }

    if (query.status) {
      where.status = query.status;
    }

    return this.findPage({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      where,
      orderBy: 'createTime',
      order: 'desc',
    });
  }

  // 快捷上下架
  async updateStatus(id: string, status: PublishStatus) {
    return this.update(id, { status } as any);
  }
}
