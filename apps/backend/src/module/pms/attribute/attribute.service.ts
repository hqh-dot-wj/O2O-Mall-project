import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTemplateDto } from './dto/attribute.dto';
import { Result } from 'src/common/response';

@Injectable()
export class AttributeService {
  constructor(private prisma: PrismaService) {}

  // 1. 创建模板 + 属性 (事务处理)
  async create(dto: CreateTemplateDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      // 先建模板头
      const template = await tx.pmsAttrTemplate.create({
        data: { name: dto.name },
      });

      // 再批量建属性
      if (dto.attributes && dto.attributes.length > 0) {
        await tx.pmsAttribute.createMany({
          data: dto.attributes.map((attr) => ({
            templateId: template.templateId,
            name: attr.name,
            usageType: attr.usageType,
            applyType: attr.applyType,
            inputType: attr.inputType,
            inputList: attr.inputList,
            sort: attr.sort,
          })),
        });
      }
      return template;
    });

    return Result.ok(result);
  }

  // 2. 查询详情 (包含属性列表)
  async findOne(id: number) {
    const template = await this.prisma.pmsAttrTemplate.findUnique({
      where: { templateId: id },
      include: {
        attributes: { orderBy: { sort: 'asc' } }, // 按排序查出来
      },
    });
    return Result.ok(template);
  }

  // 3. 列表查询模板
  async findAll(query: { pageNum?: number; pageSize?: number; name?: string }) {
    const pageNum = query.pageNum ? Number(query.pageNum) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;
    const skip = (pageNum - 1) * pageSize;

    const where: any = {};
    if (query.name) {
      where.name = { contains: query.name };
    }

    const [list, total] = await Promise.all([
      this.prisma.pmsAttrTemplate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createTime: 'desc' },
        include: {
          _count: {
            select: { attributes: true },
          },
        },
      }),
      this.prisma.pmsAttrTemplate.count({ where }),
    ]);

    return Result.page(list, total, pageNum, pageSize);
  }

  // 4. 更新模板 (包含属性的增删改)
  // 简单策略: 修改名字，如果有属性变动，建议前端逻辑是将整个属性列表传回来?
  // 或者为了简化，这里暂时只支持更新模板名字，属性的单独管理?
  // 按照 drr.md 的描述，只给出了 create 的逻辑。
  // 我们补充一个 update 逻辑。
  async update(id: number, dto: CreateTemplateDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update Template Name
      await tx.pmsAttrTemplate.update({
        where: { templateId: id },
        data: { name: dto.name },
      });

      // 2. Handle Attributes
      if (dto.attributes) {
        // IDs to keep
        const keepIds = dto.attributes.filter((a) => a.attrId).map((a) => a.attrId);

        // Delete attributes that are not in the list
        // Note: If attribute is used by PmsProductAttrValue, this might fail if foreign key is restricted.
        // Assuming CASCADE or app logic handles it, or it will throw error properly.
        await tx.pmsAttribute.deleteMany({
          where: {
            templateId: id,
            attrId: { notIn: keepIds as number[] },
          },
        });

        // Update existing or Create new
        for (const attr of dto.attributes) {
          if (attr.attrId) {
            await tx.pmsAttribute.update({
              where: { attrId: attr.attrId },
              data: {
                name: attr.name,
                usageType: attr.usageType,
                applyType: attr.applyType,
                inputType: attr.inputType,
                inputList: attr.inputList,
                sort: attr.sort,
              },
            });
          } else {
            await tx.pmsAttribute.create({
              data: {
                templateId: id,
                name: attr.name,
                usageType: attr.usageType,
                applyType: attr.applyType,
                inputType: attr.inputType,
                inputList: attr.inputList,
                sort: attr.sort,
              },
            });
          }
        }
      }
      return await tx.pmsAttrTemplate.findUnique({
        where: { templateId: id },
        include: { attributes: true },
      });
    });

    return Result.ok(result);
  }

  // 5. 删除模板
  async remove(id: number) {
    await this.prisma.pmsAttrTemplate.delete({
      where: { templateId: id },
    });
    return Result.ok();
  }

  async getByCategory(catId: number) {
    const category = await this.prisma.pmsCategory.findUnique({
      where: { catId },
      select: { attrTemplateId: true },
    });

    if (!category || !category.attrTemplateId) return Result.ok([]);

    const attributes = await this.prisma.pmsAttribute.findMany({
      where: { templateId: category.attrTemplateId },
      orderBy: { sort: 'asc' },
    });
    return Result.ok(attributes);
  }
}
