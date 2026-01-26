import { PrismaClient, ProductType, DistributionMode, Status, DelFlag, PublishStatus, AttrUsageType, OrderStatus, OrderType, PayStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();
const DEFAULT_TENANT = '000000';

async function clearDatabase() {
    console.log('--- Cleaning up database ---');
    await prisma.finCommission.deleteMany();
    await prisma.omsOrderItem.deleteMany();
    await prisma.omsOrder.deleteMany();
    await prisma.omsCartItem.deleteMany();
    await prisma.pmsProductAttrValue.deleteMany();
    await prisma.pmsTenantSku.deleteMany();
    await prisma.pmsGlobalSku.deleteMany();
    await prisma.pmsTenantProduct.deleteMany();
    await prisma.pmsProduct.deleteMany();
    await prisma.pmsCategory.deleteMany();
    await prisma.pmsAttribute.deleteMany();
    await prisma.pmsAttrTemplate.deleteMany();
    await prisma.pmsBrand.deleteMany();
    console.log('Database cleaned.');
}

async function main() {
    console.log('--- Starting rich database seeding ---');

    await clearDatabase();

    // ==========================================
    // 1. Create Brands
    // ==========================================
    console.log('Seeding Brands...');
    const brandsData = [
        { name: '苹果 (Apple)', logo: 'https://picsum.photos/200/200?random=1' },
        { name: '华为 (Huawei)', logo: 'https://picsum.photos/200/200?random=2' },
        { name: '小米 (Xiaomi)', logo: 'https://picsum.photos/200/200?random=3' },
        { name: '耐克 (Nike)', logo: 'https://picsum.photos/200/200?random=4' },
        { name: '优衣库 (Uniqlo)', logo: 'https://picsum.photos/200/200?random=5' },
        { name: '三只松鼠', logo: 'https://picsum.photos/200/200?random=7' },
        { name: '良品铺子', logo: 'https://picsum.photos/200/200?random=8' },
        { name: '都乐 (Dole)', logo: 'https://picsum.photos/200/200?random=9' },
        { name: '海尔 (Haier)', logo: 'https://picsum.photos/200/200?random=10' },
        { name: '欧莱雅 (L\'Oreal)', logo: 'https://picsum.photos/200/200?random=11' }
    ];

    const brandsMap = new Map();
    for (const b of brandsData) {
        const brand = await prisma.pmsBrand.create({ data: b });
        brandsMap.set(b.name, brand);
    }

    // ==========================================
    // 2. Create Attribute Templates
    // ==========================================
    console.log('Seeding Attribute Templates...');

    const digitalTemplate = await prisma.pmsAttrTemplate.create({
        data: {
            name: '数码产品通用模板',
            attributes: {
                create: [
                    { name: '颜色', usageType: AttrUsageType.SPEC, inputType: 1, sort: 0, inputList: '黑色,白色,蓝色,金色', applyType: 0 },
                    { name: '存储容量', usageType: AttrUsageType.SPEC, inputType: 1, sort: 1, inputList: '128G,256G,512G', applyType: 0 },
                    { name: '屏幕尺寸', usageType: AttrUsageType.PARAM, inputType: 0, sort: 2, applyType: 1 }
                ]
            }
        },
        include: { attributes: true }
    });

    const clothingTemplate = await prisma.pmsAttrTemplate.create({
        data: {
            name: '服装通用模板',
            attributes: {
                create: [
                    { name: '颜色', usageType: AttrUsageType.SPEC, inputType: 1, sort: 0, inputList: '黑,白,灰,红,蓝', applyType: 0 },
                    { name: '尺码', usageType: AttrUsageType.SPEC, inputType: 1, sort: 1, inputList: 'S,M,L,XL,XXL', applyType: 0 }
                ]
            }
        },
        include: { attributes: true }
    });

    console.log('Templates created.');

    // ==========================================
    // 3. Create Categories
    // ==========================================
    console.log('Seeding Categories...');

    const catElectronics = await prisma.pmsCategory.create({ data: { name: '数码', level: 1, sort: 1, bindType: ProductType.REAL } });
    const catClothing = await prisma.pmsCategory.create({ data: { name: '服饰', level: 1, sort: 2, bindType: ProductType.REAL } });
    const catFood = await prisma.pmsCategory.create({ data: { name: '食品', level: 1, sort: 3, bindType: ProductType.REAL } });
    const catBeauty = await prisma.pmsCategory.create({ data: { name: '美妆', level: 1, sort: 4, bindType: ProductType.REAL } });
    const catService = await prisma.pmsCategory.create({ data: { name: '服务', level: 1, sort: 5, bindType: ProductType.SERVICE } });

    const subPhone = await prisma.pmsCategory.create({ data: { name: '手机', parentId: catElectronics.catId, level: 2, sort: 1, bindType: ProductType.REAL, attrTemplateId: digitalTemplate.templateId } });
    const subComputer = await prisma.pmsCategory.create({ data: { name: '电脑', parentId: catElectronics.catId, level: 2, sort: 2, bindType: ProductType.REAL } });
    const subMens = await prisma.pmsCategory.create({ data: { name: '男装', parentId: catClothing.catId, level: 2, sort: 1, bindType: ProductType.REAL, attrTemplateId: clothingTemplate.templateId } });
    const subSnacks = await prisma.pmsCategory.create({ data: { name: '休闲零食', parentId: catFood.catId, level: 2, sort: 1, bindType: ProductType.REAL } });
    const subFruit = await prisma.pmsCategory.create({ data: { name: '新鲜水果', parentId: catFood.catId, level: 2, sort: 2, bindType: ProductType.REAL } });
    const subCleaning = await prisma.pmsCategory.create({ data: { name: '日常保洁', parentId: catService.catId, level: 2, sort: 1, bindType: ProductType.SERVICE } });

    // ==========================================
    // 4. Create Products & SKUs
    // ==========================================
    console.log('Seeding Products and SKUs...');

    const allProducts: any[] = [];
    const allSkus: any[] = [];
    const allTenantSkus: any[] = [];

    // Helper functions
    async function quickAddProduct(name: string, catId: number, brandName: string | null, type: ProductType, specData: any) {
        const product = await prisma.pmsProduct.create({
            data: {
                name,
                subTitle: `${name} - 优质选品，品质保障`,
                type,
                categoryId: catId,
                brandId: brandName ? brandsMap.get(brandName)?.brandId : null,
                mainImages: [`https://picsum.photos/800/800?random=${Math.random()}`],
                specDef: specData,
                detailHtml: `<p>${name} 的详细介绍，正品保证，售后无忧。</p>`,
                publishStatus: PublishStatus.ON_SHELF,
                tenantProducts: {
                    create: { tenantId: DEFAULT_TENANT, status: PublishStatus.ON_SHELF }
                }
            }
        });

        const tp = await prisma.pmsTenantProduct.findFirst({ where: { tenantId: DEFAULT_TENANT, productId: product.productId } });

        // Simple SKU Generation
        for (const spec of specData) {
            for (const val of spec.values) {
                const guidePrice = Math.floor(Math.random() * 1000) + 10;
                const globalSku = await prisma.pmsGlobalSku.create({
                    data: {
                        productId: product.productId,
                        specValues: { [spec.name]: val },
                        guidePrice: new Decimal(guidePrice),
                        skuImage: `https://picsum.photos/400/400?random=${Math.random()}`,
                        distMode: DistributionMode.RATIO,
                        guideRate: 0.1
                    }
                });

                const tSku = await prisma.pmsTenantSku.create({
                    data: {
                        tenantId: DEFAULT_TENANT,
                        tenantProductId: tp!.id,
                        globalSkuId: globalSku.skuId,
                        price: new Decimal(guidePrice * 1.1),
                        stock: 100,
                        distMode: DistributionMode.RATIO,
                        distRate: 0.1
                    }
                });
                allSkus.push(globalSku);
                allTenantSkus.push(tSku);
            }
        }
        allProducts.push(product);
    }

    await quickAddProduct('iPhone 15', subPhone.catId, '苹果 (Apple)', ProductType.REAL, [{ name: '颜色', values: ['黑色', '白色'] }]);
    await quickAddProduct('Mate 60 Pro', subPhone.catId, '华为 (Huawei)', ProductType.REAL, [{ name: '颜色', values: ['青色', '黑色'] }]);
    await quickAddProduct('MacBook Pro', subComputer.catId, '苹果 (Apple)', ProductType.REAL, [{ name: '规格', values: ['14英寸', '16英寸'] }]);
    await quickAddProduct('运动速干衣', subMens.catId, '耐克 (Nike)', ProductType.REAL, [{ name: '尺码', values: ['M', 'L', 'XL'] }]);
    await quickAddProduct('每日坚果', subSnacks.catId, '三只松鼠', ProductType.REAL, [{ name: '规格', values: ['30袋装', '60袋装'] }]);
    await quickAddProduct('红富士苹果', subFruit.catId, '都乐 (Dole)', ProductType.REAL, [{ name: '重量', values: ['5kg', '10kg'] }]);
    await quickAddProduct('家庭深度保洁', subCleaning.catId, null, ProductType.SERVICE, [{ name: '时长', values: ['2小时', '4小时'] }]);

    // ==========================================
    // 5. Seed Orders and Cart Items
    // ==========================================
    console.log('Seeding Orders and Cart items...');

    const members = await prisma.umsMember.findMany({ take: 30 });
    const tenants = ['000000', '100001', '100002'];

    if (members.length > 0) {
        for (let i = 0; i < 20; i++) {
            const member = members[i % members.length];
            const tenantId = tenants[i % tenants.length];
            const sku = allTenantSkus[Math.floor(Math.random() * allTenantSkus.length)];
            const gSku = allSkus.find(s => s.skuId === sku.globalSkuId);
            const product = allProducts.find(p => p.productId === gSku.productId);

            // Create Order
            const totalAmount = sku.price;
            const order = await prisma.omsOrder.create({
                data: {
                    orderSn: `SN${Date.now()}${i}`,
                    memberId: member.memberId,
                    tenantId: tenantId,
                    orderType: product.type === ProductType.REAL ? OrderType.PRODUCT : OrderType.SERVICE,
                    totalAmount: totalAmount,
                    payAmount: totalAmount,
                    status: i % 4 === 0 ? OrderStatus.COMPLETED : (i % 4 === 1 ? OrderStatus.PAID : OrderStatus.PENDING_PAY),
                    payStatus: i % 4 <= 1 ? PayStatus.PAID : PayStatus.UNPAID,
                    receiverName: member.nickname || '匿名用户',
                    receiverPhone: member.mobile || '13800000000',
                    receiverAddress: '长沙市岳麓区麓谷企业广场',
                    items: {
                        create: {
                            productId: product.productId,
                            productName: product.name,
                            productImg: product.mainImages[0],
                            skuId: sku.id,
                            specData: gSku.specValues,
                            price: sku.price,
                            quantity: 1,
                            totalAmount: sku.price
                        }
                    }
                }
            });
        }

        // Create Cart Items
        for (let i = 20; i < 30; i++) {
            const member = members[i % members.length];
            const sku = allTenantSkus[Math.floor(Math.random() * allTenantSkus.length)];
            const gSku = allSkus.find(s => s.skuId === sku.globalSkuId);
            const product = allProducts.find(p => p.productId === gSku.productId);

            await prisma.omsCartItem.create({
                data: {
                    memberId: member.memberId,
                    tenantId: sku.tenantId || DEFAULT_TENANT,
                    productId: product.productId,
                    skuId: sku.id,
                    quantity: Math.floor(Math.random() * 3) + 1,
                    productName: product.name,
                    productImg: product.mainImages[0],
                    price: sku.price,
                    specData: gSku.specValues
                }
            });
        }
    }

    console.log('--- Rich seeding completed successfully! ---');
}

main()
    .catch((e) => {
        console.error('Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
