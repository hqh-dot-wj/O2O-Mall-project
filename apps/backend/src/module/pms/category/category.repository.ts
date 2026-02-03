import { Injectable } from '@nestjs/common';
import { PmsCategory, Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/common/repository/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 分类仓储层
 * 封装商品分类相关的数据访问逻辑，继承BaseRepository提供通用CRUD操作
 * 支持树形结构的分类管理
 *
 * @class CategoryRepository
 * @extends {BaseRepository<PmsCategory, Prisma.PmsCategoryCreateInput, Prisma.PmsCategoryUpdateInput>}
 */
@Injectable()
export class CategoryRepository extends BaseRepository<
  PmsCategory,
  Prisma.PmsCategoryCreateInput,
  Prisma.PmsCategoryUpdateInput
> {
  /**
   * 构造函数
   * @param prisma - Prisma服务实例
   * @param cls - CLS上下文服务，用于事务管理
   */
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'pmsCategory', 'catId');
  }

  /**
   * 获取自动租户过滤条件
   * 商品分类是全局共享的，不进行租户隔离
   */
  protected getTenantWhere(): Record<string, any> {
    return {};
  }

  /**
   * 查询所有分类（用于构建树形结构）
   * @returns 所有分类的数组
   */
  async findAllForTree(): Promise<PmsCategory[]> {
    return this.findAll();
  }

  /**
   * 检查指定分类是否有子分类
   * 用于删除前的校验，防止删除有子分类的父分类
   * @param catId - 分类ID
   * @returns true表示有子分类，false表示没有子分类
   */
  async hasChildren(catId: number): Promise<boolean> {
    const count = await this.count({ parentId: catId });
    return count > 0;
  }

  /**
   * 检查分类是否被商品引用
   * 用于删除前的校验，防止删除正在使用的分类
   * @param catId - 分类ID
   * @returns true表示被引用，false表示未被引用
   */
  async isUsedByProducts(catId: number): Promise<boolean> {
    const count = await this.prisma.pmsProduct.count({
      where: { categoryId: catId },
    });
    return count > 0;
  }
}
