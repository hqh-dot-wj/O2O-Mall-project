import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Prisma, GenTable, DelFlag, GenTableColumn } from '@prisma/client';
import { SoftDeleteRepository } from 'src/common/repository/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';

export type GenTableWithColumns = GenTable & { columns: GenTableColumn[] };


/**
 * 代码生成表仓储层
 *
 * @description 封装代码生成表的数据访问逻辑
 */
@Injectable()
export class ToolRepository extends SoftDeleteRepository<
  GenTable,
  Prisma.GenTableCreateInput,
  Prisma.GenTableUpdateInput,
  Prisma.GenTableDelegate
> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'genTable');
  }

  /**
   * 分页查询生成表列表
   */
  async findPageWithColumns(
    where: Prisma.GenTableWhereInput,
    skip: number,
    take: number,
    orderBy?: Prisma.GenTableOrderByWithRelationInput,
  ): Promise<{ list: GenTable[]; total: number }> {
    const [list, total] = await this.prisma.$transaction([
      this.delegate.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { tableId: 'desc' },
      }),
      this.delegate.count({ where }),
    ]);

    return { list, total };
  }

  /**
   * 查询生成表详情（包含列信息）
   */
  async findByIdWithColumns(tableId: number): Promise<GenTableWithColumns | null> {
    return this.prisma.genTable.findUnique({
      where: { tableId },
      include: {
        columns: {
          orderBy: { sort: 'asc' },
        },
      },
    }) as unknown as Promise<GenTableWithColumns | null>;
  }

  /**
   * 根据表名查询生成表（包含列信息）
   */
  async findByTableNameWithColumns(tableName: string): Promise<GenTableWithColumns | null> {
    return this.prisma.genTable.findFirst({
      where: { tableName },
      include: {
        columns: {
          orderBy: { sort: 'asc' },
        },
      },
    }) as unknown as Promise<GenTableWithColumns | null>;
  }

  /**
   * 批量查询生成表（包含列信息）
   */
  async findManyWithColumns(tableIds: number[]): Promise<GenTableWithColumns[]> {
    return this.prisma.genTable.findMany({
      where: {
        tableId: { in: tableIds },
      },
      include: {
        columns: {
          orderBy: { sort: 'asc' },
        },
      },
    }) as unknown as Promise<GenTableWithColumns[]>;
  }

  /**
   * 检查表名是否已存在
   */
  async existsByTableName(tableName: string, excludeId?: number): Promise<boolean> {
    const where: Prisma.GenTableWhereInput = {
      tableName,
      delFlag: DelFlag.NORMAL,
    };

    if (excludeId) {
      where.tableId = { not: excludeId };
    }

    const count = await this.delegate.count({ where });
    return count > 0;
  }
}
