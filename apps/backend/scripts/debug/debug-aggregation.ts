import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking Product-Activity Aggregation...');

    // 1. Get a test tenant & product
    const tenantId = '100001'; // Ensure this tenant exists
    const product = await prisma.pmsTenantProduct.findFirst({
        where: { tenantId },
        include: { product: true }
    });

    if (!product) {
        console.error('❌ No tenant product found for', tenantId);
        return;
    }

    const serviceId = product.productId;
    console.log(`📦 Found Product: ${product.product.name} (${serviceId})`);

    // 2. Create a dummy Marketing Activity (Group Buy)
    // Check if template exists
    const template = await prisma.playTemplate.findUnique({ where: { code: 'COURSE_GROUP_BUY' } });
    if (!template) {
        console.log('⚠️ Template COURSE_GROUP_BUY not found, seeding...');
        // (Assuming seed ran, but if not, skip)
    }

    // Create/Upsert Config
    const config = await prisma.storePlayConfig.upsert({
        where: { id: 'debug_config_001' },
        update: {
            status: 'ON_SHELF',
            rules: {
                price: 99,
                minCount: 2,
                maxCount: 5,
                totalLessons: 10,
                dayLessons: 1
            }
        },
        create: {
            id: 'debug_config_001',
            tenantId,
            storeId: 'ST_DUBUG',
            serviceId,
            serviceType: 'SERVICE',
            templateCode: 'COURSE_GROUP_BUY',
            stockMode: 'LAZY_CHECK',
            status: 'ON_SHELF',
            rules: {
                price: 99,
                minCount: 2,
                maxCount: 5,
                totalLessons: 10,
                dayLessons: 1
            }
        }
    });
    console.log('✅ Created/Updated Marketing Config:', config.id);

    // 3. Simulate Client API Logic
    console.log('🚀 Simulating C-Side API Call...');
    const activeConfigs = await prisma.storePlayConfig.findMany({
        where: {
            tenantId,
            serviceId,
            status: 'ON_SHELF'
        }
    });

    console.log('📊 Active Activities:', JSON.stringify(activeConfigs, null, 2));

    // 4. Validate Logic
    if (activeConfigs.length > 0 && activeConfigs[0].templateCode === 'COURSE_GROUP_BUY') {
        console.log('🎉 SUCCESS: Product activity aggregation is working on DB level.');
    } else {
        console.error('❌ FAILURE: Config not found or status mismatch.');
    }
}

main().finally(() => prisma.$disconnect());
