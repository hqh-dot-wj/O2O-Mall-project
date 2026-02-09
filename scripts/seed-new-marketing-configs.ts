import { PrismaClient, PublishStatus, ProductType, MarketingStockMode } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding New Marketing Configurations...');

  // 使用测试租户
  const tenantId = '100006'; // 长沙天心区家政服务中心

  // 查找可用的商品
  const serviceProduct = await prisma.pmsTenantProduct.findFirst({
    where: { tenantId, product: { type: ProductType.SERVICE } },
    include: { product: true },
  });

  const realProduct = await prisma.pmsTenantProduct.findFirst({
    where: { tenantId, product: { type: ProductType.REAL } },
    include: { product: true },
  });

  if (!serviceProduct || !realProduct) {
    console.error('❌ No suitable products found for tenant 100006');
    return;
  }

  console.log(`📦 Service Product: ${serviceProduct.product.name}`);
  console.log(`📦 Real Product: ${realProduct.product.name}`);

  // 1. 创建课程拼团配置（带新字段）
  console.log('\n📝 Creating Course Group Buy Config...');
  const courseConfig = await prisma.storePlayConfig.create({
    data: {
      tenantId,
      storeId: tenantId,
      serviceId: serviceProduct.productId,
      serviceType: ProductType.SERVICE,
      templateCode: 'COURSE_GROUP_BUY',
      status: PublishStatus.ON_SHELF,
      stockMode: MarketingStockMode.LAZY_CHECK,
      rules: {
        name: '瑜伽体验课 3人拼班',
        price: 199,
        minCount: 3,
        maxCount: 10,
        totalLessons: 8,
        dayLessons: 1,
        validDays: 60,
        joinDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天后截止
        classStartTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10天后开课
        classEndTime: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), // 20天后结课
        classAddress: '长沙市天心区芙蓉中路二段XX号瑜伽馆3楼',
        leaderDiscount: 20,
        leaderFree: false,
        leaderMustBeDistributor: false,
      },
    },
  });
  console.log(`✅ Course Group Buy Config created: ${courseConfig.id}`);

  // 2. 创建限时秒杀配置
  console.log('\n📝 Creating Flash Sale Config...');
  const flashSaleConfig = await prisma.storePlayConfig.create({
    data: {
      tenantId,
      storeId: tenantId,
      serviceId: realProduct.productId,
      serviceType: ProductType.REAL,
      templateCode: 'FLASH_SALE',
      status: PublishStatus.ON_SHELF,
      stockMode: MarketingStockMode.STRONG_LOCK, // 秒杀必须强锁定
      rules: {
        name: '清洁剂限时秒杀',
        flashPrice: 299,
        totalStock: 100,
        limitPerUser: 2,
        startTime: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1小时后开始
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // 25小时后结束（24小时秒杀）
      },
    },
  });
  console.log(`✅ Flash Sale Config created: ${flashSaleConfig.id}`);

  // 3. 创建满减活动配置
  console.log('\n📝 Creating Full Reduction Config...');
  const fullReductionConfig = await prisma.storePlayConfig.create({
    data: {
      tenantId,
      storeId: tenantId,
      serviceId: realProduct.productId, // 满减可以不绑定具体商品，这里仅作示例
      serviceType: ProductType.REAL,
      templateCode: 'FULL_REDUCTION',
      status: PublishStatus.ON_SHELF,
      stockMode: MarketingStockMode.LAZY_CHECK,
      rules: {
        name: '全场满减优惠',
        tiers: [
          { threshold: 300, discount: 50 },
          { threshold: 500, discount: 100 },
          { threshold: 1000, discount: 200 },
        ],
        applicableScope: 'ALL',
        stackable: false,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天有效期
      },
    },
  });
  console.log(`✅ Full Reduction Config created: ${fullReductionConfig.id}`);

  console.log('\n🎉 Marketing configurations seeding completed!');
  console.log('\n📋 Created Configs:');
  console.log(`   1. 课程拼团: ${courseConfig.id}`);
  console.log(`   2. 限时秒杀: ${flashSaleConfig.id}`);
  console.log(`   3. 满减活动: ${fullReductionConfig.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding configs:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
