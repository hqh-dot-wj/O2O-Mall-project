import { Injectable } from '@nestjs/common';
import { PmsAttrTemplate, Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/common/repository/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 属性模板仓储层
 * 封装商品属性模板相关的数据访问逻辑，继承BaseRepository提供通用CRUD操作
 * 属性模板用于管理一组相关的属性定义，可以关联到商品分类
 *
 * @class TemplateRepository
 * @extends {BaseRepository<PmsAttrTemplate, Prisma.PmsAttrTemplateCreateInput, Prisma.PmsAttrTemplateUpdateInput>}
 */
@Injectable()
export class TemplateRepository extends BaseRepository<
  PmsAttrTemplate,
  Prisma.PmsAttrTemplateCreateInput,
  Prisma.PmsAttrTemplateUpdateInput
> {
  /**
   * 构造函数
   * @param prisma - Prisma服务实例
   * @param cls - CLS上下文服务，用于事务管理
   */
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'pmsAttrTemplate', 'templateId');
  }

  /**
   * 查询模板详情（包含属性列表）
   * 关联查询该模板下的所有属性，按排序号升序排列
   * @param templateId - 模板ID
   * @returns 模板详情对象（包含attributes数组）或null
   */
  async findOneWithAttributes(templateId: number) {
    return this.prisma.pmsAttrTemplate.findUnique({
      where: { templateId },
      include: {
        attributes: { orderBy: { sort: 'asc' } },
      },
    });
  }

  /**
   * 检查模板是否被分类使用
   * 用于删除前的校验，防止删除正在使用的模板
   * @param templateId - 模板ID
   * @returns true表示被使用，false表示未被使用
   */
  async isUsedByCategories(templateId: number): Promise<boolean> {
    const count = await this.prisma.pmsCategory.count({
      where: { attrTemplateId: templateId },
    });
    return count > 0;
  }
}
