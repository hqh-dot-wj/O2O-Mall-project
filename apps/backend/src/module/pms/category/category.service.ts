import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { Result } from 'src/common/response';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get category tree
   */
  async findTree() {
    const categories = await this.prisma.pmsCategory.findMany({
      orderBy: { sort: 'asc' },
      include: {
        attrTemplate: {
          select: { name: true },
        },
      },
    });
    return Result.ok(this.buildTree(categories));
  }

  /**
   * Get flat category list
   */
  async findAll(query: { name?: string; parentId?: string; pageNum?: string; pageSize?: string }) {
    const pageNum = query.pageNum ? Number(query.pageNum) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;
    const skip = (pageNum - 1) * pageSize;

    const where: Prisma.PmsCategoryWhereInput = {};
    if (query.name) {
      where.name = { contains: query.name };
    }
    if (query.parentId !== undefined) {
      const pId = Number(query.parentId);
      where.parentId = pId === 0 ? null : pId;
    }

    const [records, total] = await Promise.all([
      this.prisma.pmsCategory.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { sort: 'asc' },
        include: {
          attrTemplate: {
            select: { name: true },
          },
        },
      }),
      this.prisma.pmsCategory.count({ where }),
    ]);

    return Result.page(records, total, pageNum, pageSize);
  }

  /**
   * Build tree structure
   */
  private buildTree(items: any[], parentId: number | null = null) {
    const tree: any[] = [];
    for (const item of items) {
      if (item.parentId === parentId) {
        const children = this.buildTree(items, item.catId);
        if (children.length) {
          item.children = children;
        } else {
          item.children = undefined;
        }
        tree.push(item);
      }
    }
    return tree;
  }

  async create(data: Prisma.PmsCategoryCreateInput) {
    const res = await this.prisma.pmsCategory.create({ data });
    return Result.ok(res);
  }

  async update(id: number, data: Prisma.PmsCategoryUpdateInput) {
    const res = await this.prisma.pmsCategory.update({
      where: { catId: id },
      data,
    });
    return Result.ok(res);
  }

  async remove(id: number) {
    // Check if has children
    const count = await this.prisma.pmsCategory.count({
      where: { parentId: id },
    });
    if (count > 0) {
      throw new BadRequestException('Cannot delete category with children');
    }
    // Check if has products
    const prodCount = await this.prisma.pmsProduct.count({
      where: { categoryId: id },
    });
    if (prodCount > 0) {
      throw new BadRequestException('Cannot delete category with products');
    }

    const res = await this.prisma.pmsCategory.delete({
      where: { catId: id },
    });
    return Result.ok(res);
  }
}
