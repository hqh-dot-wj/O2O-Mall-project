import { Injectable } from '@nestjs/common';
import { PmsAttribute, Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/common/repository/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 属性仓储层
 * 封装商品属性相关的数据访问逻辑，继承BaseRepository提供通用CRUD操作
 * 属性用于描述商品的特征（如颜色、尺寸、材质等）
 * 
 * @class AttributeRepository
 * @extends {BaseRepository<PmsAttribute, Prisma.PmsAttributeCreateInput, Prisma.PmsAttributeUpdateInput>}
 */
@Injectable()
export class AttributeRepository extends BaseRepository<
  PmsAttribute,
  Prisma.PmsAttributeCreateInput,
  Prisma.PmsAttributeUpdateInput
> {
  /**
   * 构造函数
   * @param prisma - Prisma服务实例
   * @param cls - CLS上下文服务，用于事务管理
   */
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'pmsAttribute', 'attrId');
  }

  /**
   * 根据模板ID查询该模板下的所有属性
   * 按排序号升序排列
   * @param templateId - 属性模板ID
   * @returns 属性列表
   */
  async findByTemplateId(templateId: number) {
    return this.findMany({
      where: { templateId },
      orderBy: { sort: 'asc' },
    });
  }

  /**
   * 根据分类ID查询属性（通过模板关联）
   * 先查询分类关联的模板ID，再查询该模板下的所有属性
   * @param categoryId - 分类ID
   * @returns 属性列表，如果分类未关联模板则返回空数组
   */
  async findByCategoryId(categoryId: number) {
    const category = await this.prisma.pmsCategory.findUnique({
      where: { catId: categoryId },
      select: { attrTemplateId: true },
    });

    if (!category?.attrTemplateId) return [];

    return this.findByTemplateId(category.attrTemplateId);
  }

  /**
   * 批量检查属性ID是否存在
   * 用于创建/更新商品时验证属性ID的有效性
   * @param attrIds - 属性ID数组
   * @returns 验证结果对象，包含是否全部有效和无效的ID列表
   */
  async validateAttrIds(attrIds: number[]): Promise<{ valid: boolean; invalidIds: number[] }> {
    const existingAttrs = await this.findMany({
      where: { attrId: { in: attrIds } },
      select: { attrId: true },
    });

    const existingIds = new Set(existingAttrs.map((attr) => attr.attrId));
    const invalidIds = attrIds.filter((id) => !existingIds.has(id));

    return {
      valid: invalidIds.length === 0,
      invalidIds,
    };
  }
}
