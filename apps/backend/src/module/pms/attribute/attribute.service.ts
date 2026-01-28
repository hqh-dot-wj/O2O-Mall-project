import { Injectable } from '@nestjs/common';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { PaginationHelper } from 'src/common/utils/pagination.helper';
import { CreateTemplateDto } from './dto/attribute.dto';
import { AttributeRepository } from './attribute.repository';
import { TemplateRepository } from './template.repository';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 属性服务层
 * 处理属性模板和属性相关的业务逻辑
 */
@Injectable()
export class AttributeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attrRepo: AttributeRepository,
    private readonly templateRepo: TemplateRepository,
  ) {}

  /**
   * 创建模板 + 属性 (事务处理)
   */
  @Transactional()
  async create(dto: CreateTemplateDto) {
    // 创建模板
    const template = await this.templateRepo.create({
      name: dto.name,
    });

    // 批量创建属性
    if (dto.attributes && dto.attributes.length > 0) {
      for (const attr of dto.attributes) {
        await this.attrRepo.create({
          name: attr.name,
          usageType: attr.usageType,
          applyType: attr.applyType,
          inputType: attr.inputType,
          inputList: attr.inputList,
          sort: attr.sort,
          template: { connect: { templateId: template.templateId } },
        });
      }
    }

    return Result.ok(template);
  }

  /**
   * 查询详情 (包含属性列表)
   */
  async findOne(id: number) {
    const template = await this.templateRepo.findOneWithAttributes(id);
    BusinessException.throwIf(!template, '属性模板不存在', ResponseCode.NOT_FOUND);
    return Result.ok(template);
  }

  /**
   * 列表查询模板
   */
  async findAll(query: { pageNum?: number; pageSize?: number; name?: string }) {
    const { skip, take, pageNum, pageSize } = PaginationHelper.getPagination(query);

    const where: any = {};
    if (query.name) {
      where.name = { contains: query.name };
    }

    const { rows, total } = await this.templateRepo.findPage({
      where,
      pageNum,
      pageSize,
      orderBy: 'createTime',
      order: 'desc',
    });

    return Result.page(rows, total, pageNum, pageSize);
  }

  /**
   * 更新模板 (包含属性的增删改)
   */
  @Transactional()
  async update(id: number, dto: CreateTemplateDto) {
    // 1. 更新模板名称
    await this.templateRepo.update(id, { name: dto.name });

    // 2. 处理属性
    if (dto.attributes) {
      // 获取要保留的属性ID
      const keepIds = dto.attributes.filter((a) => a.attrId).map((a) => a.attrId);

      // 删除不在列表中的属性
      await this.attrRepo.deleteMany({
        templateId: id,
        attrId: { notIn: keepIds as number[] },
      });

      // 更新现有属性或创建新属性
      for (const attr of dto.attributes) {
        if (attr.attrId) {
          // 更新现有属性
          await this.attrRepo.update(attr.attrId, {
            name: attr.name,
            usageType: attr.usageType,
            applyType: attr.applyType,
            inputType: attr.inputType,
            inputList: attr.inputList,
            sort: attr.sort,
          });
        } else {
          // 创建新属性
          await this.attrRepo.create({
            name: attr.name,
            usageType: attr.usageType,
            applyType: attr.applyType,
            inputType: attr.inputType,
            inputList: attr.inputList,
            sort: attr.sort,
            template: { connect: { templateId: id } },
          });
        }
      }
    }

    // 返回更新后的模板
    const result = await this.templateRepo.findOneWithAttributes(id);
    return Result.ok(result);
  }

  /**
   * 删除模板
   */
  @Transactional()
  async remove(id: number) {
    // 检查模板是否被分类使用
    const isUsed = await this.templateRepo.isUsedByCategories(id);
    BusinessException.throwIf(isUsed, '该属性模板已被分类使用，无法删除', ResponseCode.BUSINESS_ERROR);

    await this.templateRepo.delete(id);
    return Result.ok();
  }

  /**
   * 根据分类ID获取属性列表
   */
  async getByCategory(catId: number) {
    const attributes = await this.attrRepo.findByCategoryId(catId);
    return Result.ok(attributes);
  }
}
