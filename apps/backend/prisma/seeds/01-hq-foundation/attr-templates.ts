/**
 * 属性模板与属性定义（百货、素质教育，属性丰富）
 */
import { PrismaClient, AttrUsageType } from '@prisma/client';

export async function seedAttrTemplates(prisma: PrismaClient) {
  console.log('[01-HQ] 属性模板与属性...');

  // 百货实物模板
  const t1 = await prisma.pmsAttrTemplate.upsert({
    where: { templateId: 1 },
    update: { name: '百货商品参数' },
    create: { templateId: 1, name: '百货商品参数' },
  });

  const realAttrs = [
    { attrId: 1, name: '材质', usageType: AttrUsageType.PARAM, applyType: 1, inputType: 1, inputList: '塑料,金属,木质,棉质,玻璃', sort: 1 },
    { attrId: 2, name: '规格', usageType: AttrUsageType.SPEC, applyType: 1, inputType: 1, inputList: '500ml,1000ml,2000ml', sort: 2 },
    { attrId: 3, name: '颜色', usageType: AttrUsageType.SPEC, applyType: 1, inputType: 1, inputList: '白色,蓝色,粉色,绿色', sort: 3 },
    { attrId: 4, name: '产地', usageType: AttrUsageType.PARAM, applyType: 1, inputType: 0, inputList: null, sort: 4 },
  ];

  for (const a of realAttrs) {
    await prisma.pmsAttribute.upsert({
      where: { attrId: a.attrId },
      update: {},
      create: {
        attrId: a.attrId,
        templateId: t1.templateId,
        name: a.name,
        usageType: a.usageType,
        applyType: a.applyType,
        inputType: a.inputType,
        inputList: a.inputList ?? undefined,
        sort: a.sort,
      },
    });
  }

  // 素质教育服务模板
  const t2 = await prisma.pmsAttrTemplate.upsert({
    where: { templateId: 2 },
    update: { name: '素质教育课程参数' },
    create: { templateId: 2, name: '素质教育课程参数' },
  });

  const serviceAttrs = [
    { attrId: 101, name: '班型', usageType: AttrUsageType.SPEC, applyType: 2, inputType: 1, inputList: '小班(6-8人),中班(10-12人),一对一', sort: 1 },
    { attrId: 102, name: '级别', usageType: AttrUsageType.SPEC, applyType: 2, inputType: 1, inputList: '启蒙,初级,中级,高级', sort: 2 },
    { attrId: 103, name: '课时包', usageType: AttrUsageType.SPEC, applyType: 2, inputType: 1, inputList: '10节,20节,36节,48节', sort: 3 },
    { attrId: 104, name: '适用年龄', usageType: AttrUsageType.PARAM, applyType: 2, inputType: 1, inputList: '4-6岁,7-9岁,10-12岁,青少年,成人', sort: 4 },
  ];

  for (const a of serviceAttrs) {
    await prisma.pmsAttribute.upsert({
      where: { attrId: a.attrId },
      update: {},
      create: {
        attrId: a.attrId,
        templateId: t2.templateId,
        name: a.name,
        usageType: a.usageType,
        applyType: a.applyType,
        inputType: a.inputType,
        inputList: a.inputList ?? undefined,
        sort: a.sort,
      },
    });
  }

  // 关联分类与模板
  await prisma.pmsCategory.updateMany({ where: { catId: { in: [101, 102, 103, 104, 105] } }, data: { attrTemplateId: t1.templateId } });
  await prisma.pmsCategory.updateMany({ where: { catId: { in: [201, 202, 203, 204, 205] } }, data: { attrTemplateId: t2.templateId } });

  console.log(`  ✓ 2 个模板, 8 个属性`);
}
