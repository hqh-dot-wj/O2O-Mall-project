import { PrismaClient, ProductType, PublishStatus } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 课程类服务商品种子脚本
 * 
 * 功能：
 * 1. 创建课程分类（声乐、舞蹈、美术、乐器等）
 * 2. 创建课程类服务商品
 * 3. 创建商品 SKU（不同课时包）
 * 
 * 使用方法：
 * ```bash
 * cd apps/backend
 * npx ts-node prisma/seed-course-products.ts
 * ```
 */

async function main() {
  console.log('🎓 开始创建课程类服务商品...\n');

  // ==========================================
  // 第一步：创建课程分类
  // ==========================================
  console.log('📂 第一步：创建课程分类...\n');

  // 一级分类：教育培训
  const catEducation = await prisma.pmsCategory.upsert({
    where: { catId: 1000 },
    update: {},
    create: {
      catId: 1000,
      name: '教育培训',
      level: 1,
      parentId: null,
      icon: 'i-carbon-education',
      sort: 1,
    },
  });
  console.log(`   ✅ 一级分类: ${catEducation.name}`);

  // 二级分类：艺术培训
  const catArt = await prisma.pmsCategory.upsert({
    where: { catId: 1001 },
    update: {},
    create: {
      catId: 1001,
      name: '艺术培训',
      level: 2,
      parentId: catEducation.catId,
      icon: 'i-carbon-music',
      sort: 1,
    },
  });
  console.log(`   ✅ 二级分类: ${catArt.name}`);

  // 二级分类：体育培训
  const catSports = await prisma.pmsCategory.upsert({
    where: { catId: 1002 },
    update: {},
    create: {
      catId: 1002,
      name: '体育培训',
      level: 2,
      parentId: catEducation.catId,
      icon: 'i-carbon-basketball',
      sort: 2,
    },
  });
  console.log(`   ✅ 二级分类: ${catSports.name}`);

  // 二级分类：语言培训
  const catLanguage = await prisma.pmsCategory.upsert({
    where: { catId: 1003 },
    update: {},
    create: {
      catId: 1003,
      name: '语言培训',
      level: 2,
      parentId: catEducation.catId,
      icon: 'i-carbon-language',
      sort: 3,
    },
  });
  console.log(`   ✅ 二级分类: ${catLanguage.name}\n`);

  // ==========================================
  // 第二步：创建课程商品
  // ==========================================
  console.log('📝 第二步：创建课程商品...\n');

  const courses = [
    // 1. 声乐课程
    {
      productId: 'course-vocal-001',
      categoryId: catArt.catId,
      name: '少儿声乐启蒙课',
      subTitle: '专业声乐老师，培养音乐素养',
      mainImages: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
        'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400',
      ],
      detailHtml: `
        <h2>课程介绍</h2>
        <p>专业声乐老师授课，小班教学，针对4-12岁儿童设计的声乐启蒙课程。</p>
        <h3>课程内容</h3>
        <ul>
          <li>基础发声练习</li>
          <li>音准节奏训练</li>
          <li>儿歌演唱</li>
          <li>舞台表演技巧</li>
        </ul>
        <h3>课程特色</h3>
        <ul>
          <li>小班教学，每班6-8人</li>
          <li>专业声乐教室，设备齐全</li>
          <li>定期汇报演出</li>
          <li>免费试听一节课</li>
        </ul>
      `,
      type: ProductType.SERVICE,
      serviceDuration: 60, // 每节课60分钟
      serviceRadius: 10000, // 10公里
      needBooking: true,
      specDef: {
        specs: [
          { name: '班型', values: ['小班(6-8人)', '一对一'] },
        ],
      },
      publishStatus: PublishStatus.ON_SHELF,
    },

    // 2. 舞蹈课程
    {
      productId: 'course-dance-001',
      categoryId: catArt.catId,
      name: '少儿中国舞培训',
      subTitle: '专业舞蹈老师，培养优雅气质',
      mainImages: [
        'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=400',
        'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=400',
      ],
      detailHtml: `
        <h2>课程介绍</h2>
        <p>专业中国舞教师授课，针对4-12岁儿童，培养形体美感和艺术气质。</p>
        <h3>课程内容</h3>
        <ul>
          <li>基本功训练（软开度、力量）</li>
          <li>身韵组合</li>
          <li>民族民间舞</li>
          <li>舞蹈剧目</li>
        </ul>
        <h3>课程特色</h3>
        <ul>
          <li>专业舞蹈教室，配备把杆和镜子</li>
          <li>小班教学，每班8-10人</li>
          <li>可参加考级</li>
          <li>定期汇报演出</li>
        </ul>
      `,
      type: ProductType.SERVICE,
      serviceDuration: 90, // 每节课90分钟
      serviceRadius: 10000,
      needBooking: true,
      specDef: {
        specs: [
          { name: '级别', values: ['启蒙班', '初级班', '中级班'] },
        ],
      },
      publishStatus: PublishStatus.ON_SHELF,
    },

    // 3. 拉丁舞课程
    {
      productId: 'course-dance-002',
      categoryId: catArt.catId,
      name: '少儿拉丁舞培训',
      subTitle: '激情四溢，展现自信风采',
      mainImages: [
        'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=400',
      ],
      detailHtml: `
        <h2>课程介绍</h2>
        <p>专业拉丁舞教师授课，学习伦巴、恰恰、牛仔等舞种，培养孩子的节奏感和表现力。</p>
        <h3>课程内容</h3>
        <ul>
          <li>拉丁舞基本步伐</li>
          <li>伦巴、恰恰、牛仔舞</li>
          <li>音乐节奏训练</li>
          <li>舞台表演</li>
        </ul>
      `,
      type: ProductType.SERVICE,
      serviceDuration: 90,
      serviceRadius: 10000,
      needBooking: true,
      specDef: {
        specs: [
          { name: '班型', values: ['小班', '一对一'] },
        ],
      },
      publishStatus: PublishStatus.ON_SHELF,
    },

    // 4. 钢琴课程
    {
      productId: 'course-piano-001',
      categoryId: catArt.catId,
      name: '钢琴一对一课程',
      subTitle: '专业钢琴老师，从零基础到考级',
      mainImages: [
        'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400',
      ],
      detailHtml: `
        <h2>课程介绍</h2>
        <p>一对一钢琴教学，根据学员水平定制课程，可参加钢琴考级。</p>
        <h3>课程内容</h3>
        <ul>
          <li>钢琴基础指法</li>
          <li>五线谱识谱</li>
          <li>练习曲、乐曲演奏</li>
          <li>考级辅导</li>
        </ul>
        <h3>课程特色</h3>
        <ul>
          <li>一对一教学，针对性强</li>
          <li>专业三角钢琴</li>
          <li>可参加钢琴考级</li>
          <li>定期音乐会</li>
        </ul>
      `,
      type: ProductType.SERVICE,
      serviceDuration: 45, // 一对一课程45分钟
      serviceRadius: 10000,
      needBooking: true,
      specDef: {
        specs: [
          { name: '级别', values: ['启蒙', '初级(1-3级)', '中级(4-6级)', '高级(7-10级)'] },
        ],
      },
      publishStatus: PublishStatus.ON_SHELF,
    },

    // 5. 吉他课程
    {
      productId: 'course-guitar-001',
      categoryId: catArt.catId,
      name: '民谣吉他培训',
      subTitle: '从零开始，轻松弹唱',
      mainImages: [
        'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400',
      ],
      detailHtml: `
        <h2>课程介绍</h2>
        <p>民谣吉他教学，适合青少年和成人，从基础到弹唱，轻松学会吉他。</p>
        <h3>课程内容</h3>
        <ul>
          <li>吉他基础知识</li>
          <li>和弦练习</li>
          <li>节奏型训练</li>
          <li>流行歌曲弹唱</li>
        </ul>
      `,
      type: ProductType.SERVICE,
      serviceDuration: 60,
      serviceRadius: 10000,
      needBooking: true,
      specDef: {
        specs: [
          { name: '班型', values: ['小班(4-6人)', '一对一'] },
        ],
      },
      publishStatus: PublishStatus.ON_SHELF,
    },

    // 6. 美术课程
    {
      productId: 'course-art-001',
      categoryId: catArt.catId,
      name: '少儿创意美术',
      subTitle: '激发创造力，培养艺术思维',
      mainImages: [
        'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400',
      ],
      detailHtml: `
        <h2>课程介绍</h2>
        <p>创意美术课程，通过绘画、手工等多种形式，培养孩子的创造力和艺术素养。</p>
        <h3>课程内容</h3>
        <ul>
          <li>线描、水彩、水粉</li>
          <li>创意手工</li>
          <li>色彩搭配</li>
          <li>作品创作</li>
        </ul>
      `,
      type: ProductType.SERVICE,
      serviceDuration: 90,
      serviceRadius: 10000,
      needBooking: true,
      specDef: {
        specs: [
          { name: '年龄段', values: ['3-6岁', '7-12岁'] },
        ],
      },
      publishStatus: PublishStatus.ON_SHELF,
    },

    // 7. 书法课程
    {
      productId: 'course-calligraphy-001',
      categoryId: catArt.catId,
      name: '少儿硬笔书法',
      subTitle: '规范书写，提升专注力',
      mainImages: [
        'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400',
      ],
      detailHtml: `
        <h2>课程介绍</h2>
        <p>硬笔书法教学，规范汉字书写，培养良好的书写习惯和专注力。</p>
        <h3>课程内容</h3>
        <ul>
          <li>正确握笔姿势</li>
          <li>基本笔画练习</li>
          <li>汉字结构</li>
          <li>作品创作</li>
        </ul>
      `,
      type: ProductType.SERVICE,
      serviceDuration: 60,
      serviceRadius: 10000,
      needBooking: true,
      specDef: {
        specs: [
          { name: '班型', values: ['小班(8-10人)'] },
        ],
      },
      publishStatus: PublishStatus.ON_SHELF,
    },

    // 8. 英语口语课程
    {
      productId: 'course-english-001',
      categoryId: catLanguage.catId,
      name: '少儿英语口语',
      subTitle: '外教授课，纯正发音',
      mainImages: [
        'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400',
      ],
      detailHtml: `
        <h2>课程介绍</h2>
        <p>外教口语课程，纯英文环境，培养孩子的英语思维和口语表达能力。</p>
        <h3>课程内容</h3>
        <ul>
          <li>日常口语对话</li>
          <li>情景模拟</li>
          <li>英文绘本阅读</li>
          <li>英文歌曲</li>
        </ul>
      `,
      type: ProductType.SERVICE,
      serviceDuration: 60,
      serviceRadius: 10000,
      needBooking: true,
      specDef: {
        specs: [
          { name: '班型', values: ['小班(6-8人)', '一对一'] },
        ],
      },
      publishStatus: PublishStatus.ON_SHELF,
    },

    // 9. 跆拳道课程
    {
      productId: 'course-taekwondo-001',
      categoryId: catSports.catId,
      name: '少儿跆拳道',
      subTitle: '强身健体，培养意志力',
      mainImages: [
        'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400',
      ],
      detailHtml: `
        <h2>课程介绍</h2>
        <p>专业跆拳道教练授课，培养孩子的身体素质和意志品质。</p>
        <h3>课程内容</h3>
        <ul>
          <li>基本功训练</li>
          <li>品势练习</li>
          <li>实战技巧</li>
          <li>考级辅导</li>
        </ul>
      `,
      type: ProductType.SERVICE,
      serviceDuration: 90,
      serviceRadius: 10000,
      needBooking: true,
      specDef: {
        specs: [
          { name: '级别', values: ['白带', '黄带', '绿带', '蓝带'] },
        ],
      },
      publishStatus: PublishStatus.ON_SHELF,
    },

    // 10. 篮球课程
    {
      productId: 'course-basketball-001',
      categoryId: catSports.catId,
      name: '少儿篮球训练',
      subTitle: '专业教练，培养团队精神',
      mainImages: [
        'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400',
      ],
      detailHtml: `
        <h2>课程介绍</h2>
        <p>专业篮球教练授课，系统训练篮球技能，培养团队协作精神。</p>
        <h3>课程内容</h3>
        <ul>
          <li>运球、传球、投篮基本功</li>
          <li>战术配合</li>
          <li>体能训练</li>
          <li>实战对抗</li>
        </ul>
      `,
      type: ProductType.SERVICE,
      serviceDuration: 90,
      serviceRadius: 10000,
      needBooking: true,
      specDef: {
        specs: [
          { name: '年龄段', values: ['6-9岁', '10-12岁', '13-15岁'] },
        ],
      },
      publishStatus: PublishStatus.ON_SHELF,
    },
  ];

  // 批量创建课程商品
  let successCount = 0;
  for (const course of courses) {
    try {
      await prisma.pmsProduct.upsert({
        where: { productId: course.productId },
        update: {},
        create: course,
      });
      console.log(`   ✅ ${course.name}`);
      successCount++;
    } catch (error: any) {
      console.error(`   ❌ 创建 ${course.name} 失败:`, error.message);
    }
  }

  console.log(`\n   成功创建 ${successCount}/${courses.length} 个课程商品\n`);

  // ==========================================
  // 第三步：创建商品 SKU
  // ==========================================
  console.log('📦 第三步：创建商品 SKU...\n');

  // SKU 价格配置（单节课价格）
  const skuPrices: Record<string, Record<string, number>> = {
    'course-vocal-001': {
      '小班(6-8人)': 100,
      '一对一': 200,
    },
    'course-dance-001': {
      '启蒙班': 100,
      '初级班': 100,
      '中级班': 125,
    },
    'course-dance-002': {
      '小班': 100,
      '一对一': 200,
    },
    'course-piano-001': {
      '启蒙': 150,
      '初级(1-3级)': 180,
      '中级(4-6级)': 220,
      '高级(7-10级)': 280,
    },
    'course-guitar-001': {
      '小班(4-6人)': 100,
      '一对一': 150,
    },
    'course-art-001': {
      '3-6岁': 100,
      '7-12岁': 100,
    },
    'course-calligraphy-001': {
      '小班(8-10人)': 83,
    },
    'course-english-001': {
      '小班(6-8人)': 100,
      '一对一': 200,
    },
    'course-taekwondo-001': {
      '白带': 100,
      '黄带': 100,
      '绿带': 125,
      '蓝带': 125,
    },
    'course-basketball-001': {
      '6-9岁': 100,
      '10-12岁': 100,
      '13-15岁': 125,
    },
  };

  let skuCount = 0;
  for (const course of courses) {
    const product = await prisma.pmsProduct.findUnique({
      where: { productId: course.productId },
    });

    if (!product) continue;

    const specs = (course.specDef as any).specs;
    const spec1Values = specs[0].values;

    // 生成所有规格组合
    for (const val1 of spec1Values) {
      const specKey = val1;
      const price = skuPrices[course.productId]?.[specKey] || 100;

      const skuId = `${course.productId}-${val1.replace(/[^a-zA-Z0-9]/g, '')}`;

      try {
        await prisma.pmsGlobalSku.upsert({
          where: { skuId },
          update: {},
          create: {
            skuId,
            productId: product.productId,
            specValues: { [specs[0].name]: val1 },
            guidePrice: price,
          },
        });
        skuCount++;
      } catch (error: any) {
        console.error(`   ❌ 创建 SKU ${skuId} 失败:`, error.message);
      }
    }
  }

  console.log(`   ✅ 成功创建 ${skuCount} 个 SKU\n`);

  // ==========================================
  // 第四步：验证结果
  // ==========================================
  console.log('🔍 第四步：验证结果...\n');

  const stats = {
    categories: await prisma.pmsCategory.count({
      where: { catId: { gte: 1000 } },
    }),
    products: await prisma.pmsProduct.count({
      where: { productId: { startsWith: 'course-' } },
    }),
    skus: await prisma.pmsGlobalSku.count({
      where: { skuId: { startsWith: 'course-' } },
    }),
  };

  console.log('📊 创建统计：');
  console.log(`   课程分类: ${stats.categories} 个`);
  console.log(`   课程商品: ${stats.products} 个`);
  console.log(`   商品 SKU: ${stats.skus} 个\n`);

  // 显示所有课程
  const allCourses = await prisma.pmsProduct.findMany({
    where: { productId: { startsWith: 'course-' } },
    include: {
      category: true,
      globalSkus: true,
    },
    orderBy: { productId: 'asc' },
  });

  console.log('📋 课程商品列表：\n');
  allCourses.forEach((course, index) => {
    const prices = course.globalSkus.map((s) => Number(s.guidePrice));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    console.log(`   ${index + 1}. ${course.name}`);
    console.log(`      分类: ${course.category?.name || '未分类'}`);
    console.log(`      课时: ${course.serviceDuration}分钟/节`);
    console.log(`      SKU数: ${course.globalSkus.length} 个`);
    console.log(`      价格区间: ¥${minPrice} - ¥${maxPrice}`);
    console.log('');
  });

  console.log('🎉 课程商品创建完成！\n');
}

main()
  .catch((e) => {
    console.error('\n❌ 脚本执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
