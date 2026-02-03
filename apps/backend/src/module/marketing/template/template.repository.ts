import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SoftDeleteRepository } from 'src/common/repository/base.repository';
import { PlayTemplate, Prisma } from '@prisma/client';
import { CreatePlayTemplateDto, ListPlayTemplateDto, UpdatePlayTemplateDto } from './dto/template.dto';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class PlayTemplateRepository extends SoftDeleteRepository<
  PlayTemplate,
  CreatePlayTemplateDto,
  UpdatePlayTemplateDto
> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'playTemplate', 'id', null);
  }

  async search(query: ListPlayTemplateDto) {
    const where: Prisma.PlayTemplateWhereInput = {};

    if (query.name) {
      where.name = { contains: query.name };
    }

    if (query.code) {
      where.code = { contains: query.code };
    }

    // Call base findPage which expects query options, not the DTO itself
    return this.findPage({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      where,
      orderBy: 'createTime',
      order: 'desc',
    });
  }

  async findByCode(code: string) {
    return this.findOne({ code });
  }
}
