import { PrismaClient, PublishStatus, ProductType, MarketingStockMode } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Cleaning up Marketing Data ---');
    // 1. Delete existing configurations
    await prisma.storePlayConfig.deleteMany();
    await prisma.playInstance.deleteMany();
    console.log('Cleared StorePlayConfig and PlayInstance tables.');

    console.log('--- Seeding Marketing Data ---');

    // 2. Fetch necessary data
    // Pick a demo tenant
    const tenantId = '100006'; // 长沙天心区家政服务中心
    const tenant = await prisma.sysTenant.findUnique({ where: { tenantId } });

    if (!tenant) {
        console.error('Tenant 100006 not found. Please run seed-demo-tenants.ts first.');
        return;
    }

    // Find products for this tenant
    // Product 1: 家庭深度保洁 (Service)
    const product1 = await prisma.pmsTenantProduct.findFirst({
        where: { tenantId, product: { name: { contains: '家庭' } } },
        include: { product: true }
    });

    // Product 3: 洁霸多功能清洁剂 (Real)
    const product3 = await prisma.pmsTenantProduct.findFirst({
        where: { tenantId, product: { name: { contains: '洁霸' } } },
        include: { product: true }
    });

    if (!product1 || !product3) {
        console.error('Products not found for tenant 100006.');
        return;
    }

    // 3. Create Group Buy (拼团) for Real Product
    // Original Price ~28.00
    console.log('Creating Group Buy for Product: Clean Agent (Real)');
    await prisma.storePlayConfig.create({
        data: {
            tenantId,
            storeId: tenantId,
            serviceId: product3.productId, // Bound to Product ID
            serviceType: ProductType.REAL,
            templateCode: 'GROUP_BUY',
            // name field removed
            status: PublishStatus.ON_SHELF,
            stockMode: MarketingStockMode.STRONG_LOCK,
            rules: {
                price: 19.90, // Valid price > 0
                minCount: 2,  // Valid count >= 2
                maxCount: 5,
                validDays: 1,
                limitPerUser: 1,
                startTime: new Date().toISOString(),
                endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                name: '清洁剂限时拼团' // Storing name in rules
            }
        }
    });

    // 4. Create Course Group Buy (课程拼团) for Service Product
    // Original Price ~150.00
    console.log('Creating Course Group Buy for Service: Cleaning Service (Service)');
    await prisma.storePlayConfig.create({
        data: {
            tenantId,
            storeId: tenantId,
            serviceId: product1.productId,
            serviceType: ProductType.SERVICE,
            templateCode: 'COURSE_GROUP_BUY',
            // name field removed
            status: PublishStatus.ON_SHELF,
            stockMode: MarketingStockMode.LAZY_CHECK,
            rules: {
                price: 128.00, // Valid price
                minCount: 3,   // Valid count
                maxCount: 10,
                totalLessons: 1, // Valid lessons
                dayLessons: 1,
                startTime: new Date().toISOString(),
                endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                joinDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
                name: '保洁服务三人团'
            }
        }
    });

    // 5. Create an Offline/Expired Activity (for testing status)
    await prisma.storePlayConfig.create({
        data: {
            tenantId,
            storeId: tenantId,
            serviceId: product3.productId,
            serviceType: ProductType.REAL,
            templateCode: 'GROUP_BUY',
            status: PublishStatus.OFF_SHELF, // Already offline
            stockMode: MarketingStockMode.STRONG_LOCK,
            rules: {
                price: 9.90,
                minCount: 5,
                name: '已结束的活动'
            }
        }
    });

    console.log('--- Marketing Data Seeded Successfully ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
