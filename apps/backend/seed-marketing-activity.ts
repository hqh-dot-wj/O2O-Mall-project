import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Marketing Activities for Testing...');

    // 1. Find a valid Tenant & Product (Targeting 100006)
    const targetTenantId = '100006';
    // Try to find a product that is ON_SHELF
    const tenantProduct = await prisma.pmsTenantProduct.findFirst({
        where: {
            tenantId: targetTenantId,
            status: 'ON_SHELF',
            product: { publishStatus: 'ON_SHELF' }
        },
        include: { product: true }
    });

    if (!tenantProduct) {
        console.error(`❌ No valid ON_SHELF product found for tenant ${targetTenantId}.`);
        return;
    }

    const { tenantId } = tenantProduct;
    const serviceId = tenantProduct.productId;
    const productName = tenantProduct.product.name;

    console.log(`📦 Target Product: [${productName}] (ID: ${serviceId}) in Tenant: ${tenantId}`);

    // 2. Clean up old test configs for this product (Optional, to keep it clean)
    await prisma.storePlayConfig.updateMany({
        where: { serviceId },
        data: { status: 'OFF_SHELF' } // Soft disable old ones
    });
    console.log('🧹 Disabled old activities for this product.');

    // 3. Scenario A: 普通全民拼团 (Ordinary Group Buy)
    // 规则: 2人团, 拼团价 9.9, 团长减 2元
    const configA = await prisma.storePlayConfig.create({
        data: {
            tenantId,
            storeId: tenantId, // Align Store with Tenant
            serviceId,
            serviceType: tenantProduct.product.type || 'SERVICE', // REAL or SERVICE
            templateCode: 'COURSE_GROUP_BUY', // Using the existing template code
            stockMode: 'LAZY_CHECK',
            status: 'ON_SHELF',
            rules: {
                name: "🔥 全民体验课 (测试A)",
                price: 9.9,
                minCount: 2,
                maxCount: 10,
                leaderDiscount: 2, // 团长优惠 2元
                joinDeadline: new Date(Date.now() + 7 * 24 * 3600 * 1000), // 7天后
                totalLessons: 1,
                dayLessons: 1,
                validDays: 30
            }
        }
    });
    console.log(`✅ Created Scenario A (Ordinary): ${configA.id}`);

    // 4. Scenario C: 分销员专属免单团 (Distributor Only)
    // 规则: 3人团, 拼团价 99, 团长必须是分销员且免单
    const configC = await prisma.storePlayConfig.create({
        data: {
            tenantId,
            storeId: tenantId, // Align Store with Tenant
            serviceId,
            serviceType: tenantProduct.product.type || 'SERVICE',
            templateCode: 'COURSE_GROUP_BUY',
            stockMode: 'LAZY_CHECK',
            status: 'ON_SHELF',
            rules: {
                name: "💎 推广员免单团 (测试C)",
                price: 99,
                minCount: 3,
                maxCount: 20,
                leaderMustBeDistributor: true, // 核心限制
                leaderFree: true,              // 核心特权
                joinDeadline: new Date(Date.now() + 30 * 24 * 3600 * 1000),
                totalLessons: 10,
                dayLessons: 1,
                validDays: 90
            }
        }
    });
    console.log(`✅ Created Scenario C (Distributor VIP): ${configC.id}`);

    console.log('\n🚀 Done! You can now check the Client App.');
    console.log('   Expected Behavior:');
    console.log('   1. Ordinary User: Sees BOTH, but for (C) cannot check "Start Group" (or button hidden/disabled).');
    console.log('   2. Distributor User: Sees BOTH, for (C) price is 0 when starting group.');
}

main().finally(() => prisma.$disconnect());
