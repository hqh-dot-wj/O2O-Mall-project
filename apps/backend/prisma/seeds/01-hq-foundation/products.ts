/**
 * 总部商品：百货 + 素质教育，属性丰富
 * 含 PmsProductAttrValue 商品属性值（关联 attr-templates 定义的属性）
 */
import { PrismaClient, ProductType, PublishStatus, DelFlag } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const IMG = 'https://via.placeholder.com/400x400?text=Product';

// 百货商品属性：attrId 1=材质 2=规格 3=颜色 4=产地 (PARAM/SPEC)
const GOODS_ATTRS: Record<string, Array<{ attrId: number; attrName: string; value: string }>> = {
  'prod-goods-001': [
    { attrId: 1, attrName: '材质', value: '塑料' },
    { attrId: 2, attrName: '规格', value: '500ml/1000ml' },
    { attrId: 3, attrName: '颜色', value: '透明' },
    { attrId: 4, attrName: '产地', value: '中国' },
  ],
  'prod-goods-002': [
    { attrId: 1, attrName: '材质', value: '塑料+金属' },
    { attrId: 2, attrName: '规格', value: '标准装' },
    { attrId: 3, attrName: '颜色', value: '蓝色/粉色' },
    { attrId: 4, attrName: '产地', value: '中国' },
  ],
  'prod-goods-003': [
    { attrId: 1, attrName: '材质', value: '乳膏' },
    { attrId: 2, attrName: '规格', value: '50g/100g' },
    { attrId: 3, attrName: '颜色', value: '白色' },
    { attrId: 4, attrName: '产地', value: '中国' },
  ],
  'prod-goods-004': [
    { attrId: 1, attrName: '材质', value: '棉质无纺布' },
    { attrId: 2, attrName: '规格', value: '80抽*6包/12包' },
    { attrId: 3, attrName: '颜色', value: '白色' },
    { attrId: 4, attrName: '产地', value: '中国' },
  ],
  'prod-goods-005': [
    { attrId: 1, attrName: '材质', value: '塑料' },
    { attrId: 2, attrName: '规格', value: '标准版' },
    { attrId: 3, attrName: '颜色', value: '白色/黑色' },
    { attrId: 4, attrName: '产地', value: '中国' },
  ],
  'prod-goods-006': [
    { attrId: 1, attrName: '材质', value: '食品级' },
    { attrId: 2, attrName: '规格', value: '250g/500g' },
    { attrId: 3, attrName: '颜色', value: '本色' },
    { attrId: 4, attrName: '产地', value: '新疆' },
  ],
};

// 素质教育课程属性：attrId 101=班型 102=级别 103=课时包 104=适用年龄
const COURSE_ATTRS: Record<string, Array<{ attrId: number; attrName: string; value: string }>> = {
  'course-art-001': [
    { attrId: 101, attrName: '班型', value: '小班(6-8人)/一对一' },
    { attrId: 102, attrName: '级别', value: '启蒙' },
    { attrId: 103, attrName: '课时包', value: '按学期' },
    { attrId: 104, attrName: '适用年龄', value: '4-12岁' },
  ],
  'course-art-002': [
    { attrId: 101, attrName: '班型', value: '小班' },
    { attrId: 102, attrName: '级别', value: '启蒙班/初级班' },
    { attrId: 103, attrName: '课时包', value: '按学期' },
    { attrId: 104, attrName: '适用年龄', value: '4-10岁' },
  ],
  'course-sport-001': [
    { attrId: 101, attrName: '班型', value: '小班' },
    { attrId: 102, attrName: '级别', value: '入门' },
    { attrId: 103, attrName: '课时包', value: '10节/20节' },
    { attrId: 104, attrName: '适用年龄', value: '6-12岁' },
  ],
  'course-lang-001': [
    { attrId: 101, attrName: '班型', value: '小班/一对一' },
    { attrId: 102, attrName: '级别', value: '启蒙' },
    { attrId: 103, attrName: '课时包', value: '按学期' },
    { attrId: 104, attrName: '适用年龄', value: '4-8岁' },
  ],
  'course-stem-001': [
    { attrId: 101, attrName: '班型', value: '小班' },
    { attrId: 102, attrName: '级别', value: '入门' },
    { attrId: 103, attrName: '课时包', value: '12节/24节' },
    { attrId: 104, attrName: '适用年龄', value: '7-12岁' },
  ],
  'course-math-001': [
    { attrId: 101, attrName: '班型', value: '小班' },
    { attrId: 102, attrName: '级别', value: '启蒙/初级' },
    { attrId: 103, attrName: '课时包', value: '按学期' },
    { attrId: 104, attrName: '适用年龄', value: '5-10岁' },
  ],
};

export async function seedProducts(prisma: PrismaClient) {
  console.log('[01-HQ] 总部商品与 SKU...');

  // 百货实物商品
  const goods = [
    { productId: 'prod-goods-001', categoryId: 101, brandId: 1, name: '洁霸多功能清洁剂', subTitle: '去污力强，温和不伤手', type: 'REAL' as ProductType, weight: 1000, isFreeShip: false, specs: [{ name: '规格', values: ['500ml', '1000ml'] }, { name: '香型', values: ['柠檬', '薰衣草'] }], skus: [{ specValues: { 规格: '500ml', 香型: '柠檬' }, guidePrice: 19.9, costPrice: 8, skuImage: IMG }, { specValues: { 规格: '1000ml', 香型: '柠檬' }, guidePrice: 32.9, costPrice: 12, skuImage: IMG }] },
    { productId: 'prod-goods-002', categoryId: 101, brandId: 2, name: '旋转拖把套装', subTitle: '360度旋转，轻松清洁', type: 'REAL' as ProductType, weight: 2000, isFreeShip: true, specs: [{ name: '颜色', values: ['蓝色', '粉色'] }], skus: [{ specValues: { 颜色: '蓝色' }, guidePrice: 89, costPrice: 35, skuImage: IMG }, { specValues: { 颜色: '粉色' }, guidePrice: 89, costPrice: 35, skuImage: IMG }] },
    { productId: 'prod-goods-003', categoryId: 102, brandId: null, name: '儿童保湿面霜', subTitle: '温和配方，四季适用', type: 'REAL' as ProductType, weight: 150, isFreeShip: false, specs: [{ name: '规格', values: ['50g', '100g'] }], skus: [{ specValues: { 规格: '50g' }, guidePrice: 49, costPrice: 18, skuImage: IMG }, { specValues: { 规格: '100g' }, guidePrice: 79, costPrice: 28, skuImage: IMG }] },
    { productId: 'prod-goods-004', categoryId: 103, brandId: 5, name: '婴儿棉柔巾', subTitle: '无酒精无香料', type: 'REAL' as ProductType, weight: 500, isFreeShip: true, specs: [{ name: '规格', values: ['80抽*6包', '80抽*12包'] }], skus: [{ specValues: { 规格: '80抽*6包' }, guidePrice: 39, costPrice: 15, skuImage: IMG }, { specValues: { 规格: '80抽*12包' }, guidePrice: 69, costPrice: 25, skuImage: IMG }] },
    { productId: 'prod-goods-005', categoryId: 104, brandId: 3, name: '无线蓝牙耳机', subTitle: '长续航降噪', type: 'REAL' as ProductType, weight: 80, isFreeShip: true, specs: [{ name: '颜色', values: ['白色', '黑色'] }], skus: [{ specValues: { 颜色: '白色' }, guidePrice: 199, costPrice: 80, skuImage: IMG }, { specValues: { 颜色: '黑色' }, guidePrice: 199, costPrice: 80, skuImage: IMG }] },
    { productId: 'prod-goods-006', categoryId: 105, brandId: null, name: '有机坚果礼盒', subTitle: '每日坚果，营养均衡', type: 'REAL' as ProductType, weight: 800, isFreeShip: false, specs: [{ name: '规格', values: ['250g', '500g'] }], skus: [{ specValues: { 规格: '250g' }, guidePrice: 59, costPrice: 25, skuImage: IMG }, { specValues: { 规格: '500g' }, guidePrice: 99, costPrice: 42, skuImage: IMG }] },
  ];

  for (const g of goods) {
    const product = await prisma.pmsProduct.upsert({
      where: { productId: g.productId },
      update: {},
      create: {
        productId: g.productId,
        categoryId: g.categoryId,
        brandId: g.brandId,
        name: g.name,
        subTitle: g.subTitle,
        mainImages: [IMG],
        detailHtml: `<h2>${g.name}</h2><p>${g.subTitle}</p>`,
        type: g.type,
        weight: g.weight,
        isFreeShip: g.isFreeShip,
        specDef: { specs: g.specs },
        publishStatus: PublishStatus.ON_SHELF,
        delFlag: DelFlag.NORMAL,
      },
    });

    for (const a of GOODS_ATTRS[g.productId] ?? []) {
      const exists = await prisma.pmsProductAttrValue.findFirst({
        where: { productId: product.productId, attrId: a.attrId },
      });
      if (!exists) {
        await prisma.pmsProductAttrValue.create({
          data: { productId: product.productId, attrId: a.attrId, attrName: a.attrName, value: a.value },
        });
      }
    }

    for (let i = 0; i < g.skus.length; i++) {
      const sku = g.skus[i];
      await prisma.pmsGlobalSku.upsert({
        where: { skuId: `${g.productId}-${i}` },
        update: {},
        create: {
          skuId: `${g.productId}-${i}`,
          productId: product.productId,
          specValues: sku.specValues,
          skuImage: (sku as { skuImage?: string }).skuImage ?? null,
          guidePrice: new Decimal(sku.guidePrice),
          distMode: 'RATIO',
          guideRate: new Decimal(1),
          minDistRate: new Decimal(0.05),
          maxDistRate: new Decimal(1),
          costPrice: new Decimal(sku.costPrice),
        },
      });
    }
  }

  // 素质教育课程
  const courses = [
    { productId: 'course-art-001', categoryId: 201, name: '少儿声乐启蒙课', subTitle: '专业声乐老师，培养音乐素养', duration: 60, radius: 10000, specs: [{ name: '班型', values: ['小班(6-8人)', '一对一'] }], skus: [{ specValues: { 班型: '小班(6-8人)' }, guidePrice: 3800, skuImage: IMG }, { specValues: { 班型: '一对一' }, guidePrice: 6800, skuImage: IMG }] },
    { productId: 'course-art-002', categoryId: 201, name: '少儿中国舞培训', subTitle: '培养形体美感和艺术气质', duration: 90, radius: 10000, specs: [{ name: '级别', values: ['启蒙班', '初级班'] }], skus: [{ specValues: { 级别: '启蒙班' }, guidePrice: 3600, skuImage: IMG }, { specValues: { 级别: '初级班' }, guidePrice: 4200, skuImage: IMG }] },
    { productId: 'course-sport-001', categoryId: 202, name: '少儿篮球训练营', subTitle: '体能+球技，全面发展', duration: 90, radius: 8000, specs: [{ name: '课时包', values: ['10节', '20节'] }], skus: [{ specValues: { 课时包: '10节' }, guidePrice: 1200, skuImage: IMG }, { specValues: { 课时包: '20节' }, guidePrice: 2200, skuImage: IMG }] },
    { productId: 'course-lang-001', categoryId: 203, name: '少儿英语启蒙', subTitle: '情境教学，自然习得', duration: 45, radius: 10000, specs: [{ name: '班型', values: ['小班', '一对一'] }], skus: [{ specValues: { 班型: '小班' }, guidePrice: 4800, skuImage: IMG }, { specValues: { 班型: '一对一' }, guidePrice: 8800, skuImage: IMG }] },
    { productId: 'course-stem-001', categoryId: 204, name: '少儿编程入门', subTitle: 'Scratch图形化编程', duration: 60, radius: 10000, specs: [{ name: '课时包', values: ['12节', '24节'] }], skus: [{ specValues: { 课时包: '12节' }, guidePrice: 1680, skuImage: IMG }, { specValues: { 课时包: '24节' }, guidePrice: 2980, skuImage: IMG }] },
    { productId: 'course-math-001', categoryId: 205, name: '数学思维训练', subTitle: '逻辑推理与问题解决', duration: 60, radius: 10000, specs: [{ name: '级别', values: ['启蒙', '初级'] }], skus: [{ specValues: { 级别: '启蒙' }, guidePrice: 3200, skuImage: IMG }, { specValues: { 级别: '初级' }, guidePrice: 3800, skuImage: IMG }] },
  ];

  for (const c of courses) {
    const product = await prisma.pmsProduct.upsert({
      where: { productId: c.productId },
      update: {},
      create: {
        productId: c.productId,
        categoryId: c.categoryId,
        brandId: null,
        name: c.name,
        subTitle: c.subTitle,
        mainImages: [IMG],
        detailHtml: `<h2>${c.name}</h2><p>${c.subTitle}</p>`,
        type: 'SERVICE',
        serviceDuration: c.duration,
        serviceRadius: c.radius,
        needBooking: true,
        specDef: { specs: c.specs },
        publishStatus: PublishStatus.ON_SHELF,
        delFlag: DelFlag.NORMAL,
      },
    });

    for (const a of COURSE_ATTRS[c.productId] ?? []) {
      const exists = await prisma.pmsProductAttrValue.findFirst({
        where: { productId: product.productId, attrId: a.attrId },
      });
      if (!exists) {
        await prisma.pmsProductAttrValue.create({
          data: { productId: product.productId, attrId: a.attrId, attrName: a.attrName, value: a.value },
        });
      }
    }

    for (let i = 0; i < c.skus.length; i++) {
      const sku = c.skus[i];
      await prisma.pmsGlobalSku.upsert({
        where: { skuId: `${c.productId}-${i}` },
        update: {},
        create: {
          skuId: `${c.productId}-${i}`,
          productId: product.productId,
          specValues: sku.specValues,
          skuImage: (sku as { skuImage?: string }).skuImage ?? null,
          guidePrice: new Decimal(sku.guidePrice),
          distMode: 'RATIO',
          guideRate: new Decimal(1),
          minDistRate: new Decimal(0.05),
          maxDistRate: new Decimal(1),
          costPrice: new Decimal(0),
        },
      });
    }
  }

  console.log(`  ✓ ${goods.length} 百货商品 + ${courses.length} 素质教育课程（含属性值）`);
}
