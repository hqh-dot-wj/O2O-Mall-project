import { PrismaClient, ProductType, DistributionMode, Status, DelFlag, PublishStatus, AttrUsageType } from '@prisma/client';

const prisma = new PrismaClient();
const DEFAULT_TENANT = '000000';

async function clearDatabase() {
    console.log('--- Cleaning up database ---');
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
    // 1. Create Brands (Rich Variety)
    // ==========================================
    console.log('Seeding Brands...');
    const brandsData = [
        // Digital
        { name: '苹果 (Apple)', logo: 'https://picsum.photos/200/200?random=1' },
        { name: '华为 (Huawei)', logo: 'https://picsum.photos/200/200?random=2' },
        { name: '小米 (Xiaomi)', logo: 'https://picsum.photos/200/200?random=3' },
        // Clothing
        { name: '耐克 (Nike)', logo: 'https://picsum.photos/200/200?random=4' },
        { name: '优衣库 (Uniqlo)', logo: 'https://picsum.photos/200/200?random=5' },
        { name: '阿迪达斯 (Adidas)', logo: 'https://picsum.photos/200/200?random=6' },
        // Food
        { name: '三只松鼠', logo: 'https://picsum.photos/200/200?random=7' },
        { name: '良品铺子', logo: 'https://picsum.photos/200/200?random=8' },
        { name: '都乐 (Dole)', logo: 'https://picsum.photos/200/200?random=9' }
    ];

    const brandsMap = new Map();
    for (const b of brandsData) {
        const brand = await prisma.pmsBrand.create({ data: b });
        brandsMap.set(b.name, brand);
    }
    console.log(`Created ${brandsMap.size} brands.`);

    // ==========================================
    // 2. Create Attribute Templates
    // ==========================================
    console.log('Seeding Attribute Templates...');

    // 2.1 Digital Template
    const digitalTemplate = await prisma.pmsAttrTemplate.create({
        data: {
            name: '数码产品通用模板',
            attributes: {
                create: [
                    { name: '颜色', usageType: AttrUsageType.SPEC, inputType: 1, sort: 0, inputList: '黑色,白色,蓝色,金色', applyType: 0 },
                    { name: '存储容量', usageType: AttrUsageType.SPEC, inputType: 1, sort: 1, inputList: '128G,256G,512G', applyType: 0 },
                    { name: '屏幕尺寸', usageType: AttrUsageType.PARAM, inputType: 0, sort: 2, applyType: 1 },
                    { name: '网络制式', usageType: AttrUsageType.PARAM, inputType: 1, sort: 3, inputList: '5G,4G,Wi-Fi', applyType: 1 }
                ]
            }
        },
        include: { attributes: true }
    });

    // 2.2 Clothing Template
    const clothingTemplate = await prisma.pmsAttrTemplate.create({
        data: {
            name: '服装通用模板',
            attributes: {
                create: [
                    { name: '颜色', usageType: AttrUsageType.SPEC, inputType: 1, sort: 0, inputList: '黑,白,灰,红,蓝', applyType: 0 },
                    { name: '尺码', usageType: AttrUsageType.SPEC, inputType: 1, sort: 1, inputList: 'S,M,L,XL,XXL', applyType: 0 },
                    { name: '面料成分', usageType: AttrUsageType.PARAM, inputType: 1, sort: 2, inputList: '棉,涤纶,羊毛,桑蚕丝', applyType: 1 },
                    { name: '适用季节', usageType: AttrUsageType.PARAM, inputType: 1, sort: 3, inputList: '春,夏,秋,冬', applyType: 1 }
                ]
            }
        },
        include: { attributes: true }
    });

    // 2.3 Fresh Food Template
    const foodTemplate = await prisma.pmsAttrTemplate.create({
        data: {
            name: '生鲜食品模板',
            attributes: {
                create: [
                    { name: '口味', usageType: AttrUsageType.SPEC, inputType: 1, sort: 0, inputList: '原味,香辣,五香', applyType: 0 },
                    { name: '包装规格', usageType: AttrUsageType.SPEC, inputType: 1, sort: 1, inputList: '盒装,袋装,散装,礼盒', applyType: 0 },
                    { name: '产地', usageType: AttrUsageType.PARAM, inputType: 0, sort: 2, applyType: 1 },
                    { name: '保质期', usageType: AttrUsageType.PARAM, inputType: 0, sort: 3, applyType: 1 },
                    { name: '储存方式', usageType: AttrUsageType.PARAM, inputType: 1, sort: 4, inputList: '常温,冷藏,冷冻', applyType: 1 }
                ]
            }
        },
        include: { attributes: true }
    });

    // 2.4 Service Template
    const serviceTemplate = await prisma.pmsAttrTemplate.create({
        data: {
            name: '上门服务模板',
            attributes: {
                create: [
                    { name: '服务级别', usageType: AttrUsageType.SPEC, inputType: 1, sort: 0, inputList: '初级,中级,高级', applyType: 2 },
                    { name: '服务时长', usageType: AttrUsageType.PARAM, inputType: 0, sort: 1, applyType: 2 },
                    { name: '含清洁剂', usageType: AttrUsageType.PARAM, inputType: 1, sort: 2, inputList: '是,否', applyType: 2 }
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

    // Root Categories
    const catElectronics = await prisma.pmsCategory.create({ data: { name: '数码', level: 1, sort: 1, bindType: ProductType.REAL } });
    const catClothing = await prisma.pmsCategory.create({ data: { name: '服饰', level: 1, sort: 2, bindType: ProductType.REAL } });
    const catFood = await prisma.pmsCategory.create({ data: { name: '食品', level: 1, sort: 3, bindType: ProductType.REAL } });
    const catService = await prisma.pmsCategory.create({ data: { name: '服务', level: 1, sort: 4, bindType: ProductType.SERVICE } });

    // Sub Categories
    const subPhone = await prisma.pmsCategory.create({
        data: { name: '手机', parentId: catElectronics.catId, level: 2, sort: 1, bindType: ProductType.REAL, attrTemplateId: digitalTemplate.templateId }
    });
    const subMens = await prisma.pmsCategory.create({
        data: { name: '男装', parentId: catClothing.catId, level: 2, sort: 1, bindType: ProductType.REAL, attrTemplateId: clothingTemplate.templateId }
    });
    const subSnacks = await prisma.pmsCategory.create({
        data: { name: '休闲零食', parentId: catFood.catId, level: 2, sort: 1, bindType: ProductType.REAL, attrTemplateId: foodTemplate.templateId }
    });
    const subCleaning = await prisma.pmsCategory.create({
        data: { name: '日常保洁', parentId: catService.catId, level: 2, sort: 1, bindType: ProductType.SERVICE, attrTemplateId: serviceTemplate.templateId }
    });


    // ==========================================
    // 4. Create Products & SKUs
    // ==========================================
    console.log('Seeding Products...');

    // --- Helper to create product ---
    async function createProduct(config: any) {
        const { name, categoryId, brandName, template, specData, paramData, type } = config;
        const brand = brandsMap.get(brandName);

        const skuSpecs = specData.map((s: any) => ({ name: s.name, values: s.values }));

        const product = await prisma.pmsProduct.create({
            data: {
                name: name,
                subTitle: '热门爆款，限时特惠',
                type: type || ProductType.REAL,
                categoryId: categoryId,
                brandId: brand?.brandId,
                mainImages: [`https://picsum.photos/800/800?random=${Math.random()}`],
                specDef: skuSpecs, // JSON definition
                detailHtml: `<p>${name} 的详细介绍...</p>`,
                tenantProducts: {
                    create: { tenantId: DEFAULT_TENANT, status: PublishStatus.ON_SHELF }
                }
            }
        });

        // Create Param Attributes Values
        for (const [key, val] of Object.entries(paramData)) {
            const attr = template.attributes.find((a: any) => a.name === key);
            if (attr) {
                await prisma.pmsProductAttrValue.create({
                    data: {
                        productId: product.productId,
                        attrId: attr.attrId,
                        attrName: attr.name,
                        value: String(val)
                    }
                });
            }
        }

        // Generate SKUs (Cartesian product of specData)
        // Simple case: max 2 specs supported for seed script simplicity
        const s1 = specData[0];
        const s2 = specData[1];

        const tp = await prisma.pmsTenantProduct.findFirst({ where: { tenantId: DEFAULT_TENANT, productId: product.productId } });

        if (s1 && s2) {
            for (const v1 of s1.values) {
                for (const v2 of s2.values) {
                    await createSku(product.productId, tp!.id, { [s1.name]: v1, [s2.name]: v2 });
                }
            }
        } else if (s1) {
            for (const v1 of s1.values) {
                await createSku(product.productId, tp!.id, { [s1.name]: v1 });
            }
        }
    }

    async function createSku(productId: string, tenantProductId: string, specValues: any) {
        // Randomly select distribution mode
        const modes = [DistributionMode.RATIO, DistributionMode.FIXED, DistributionMode.NONE];
        const distMode = modes[Math.floor(Math.random() * modes.length)];

        let guideRate = 0;
        let minDistRate = 0;
        let maxDistRate = 0;

        if (distMode === DistributionMode.RATIO) {
            guideRate = Number((Math.random() * 0.3).toFixed(2)); // 0% - 30%
            // Min is 0 to guide
            minDistRate = Number((Math.random() * guideRate).toFixed(2));
            // Max is guide to 50%
            maxDistRate = Number((guideRate + Math.random() * (50 - guideRate)).toFixed(2));
            if (maxDistRate > 50) maxDistRate = 50;

        } else if (distMode === DistributionMode.FIXED) {
            guideRate = Math.floor(Math.random() * 50) + 5; // 5 - 55 yuan
            // Min is 0 to guide
            minDistRate = Math.floor(Math.random() * guideRate);
            // Max is guide to guide + 50
            maxDistRate = guideRate + Math.floor(Math.random() * 50);
        }

        const globalSku = await prisma.pmsGlobalSku.create({
            data: {
                productId: productId,
                specValues: specValues,
                guidePrice: Math.floor(Math.random() * 500) + 100,
                skuImage: `https://picsum.photos/400/400?random=${Math.random()}`,
                distMode: distMode,
                guideRate: guideRate,
                minDistRate: minDistRate,
                maxDistRate: maxDistRate
            }
        });

        await prisma.pmsTenantSku.create({
            data: {
                tenantProductId: tenantProductId,
                globalSkuId: globalSku.skuId,
                price: Number(globalSku.guidePrice) * 1.1, // Tenant marks up 10%
                stock: 999,
                distMode: distMode, // Default to follow global setting, but can be overridden
                distRate: guideRate
            }
        });
    }

    // --- 4.1 Create Digital Products ---
    await createProduct({
        name: 'iPhone 15 Pro',
        categoryId: subPhone.catId,
        brandName: '苹果 (Apple)',
        template: digitalTemplate,
        specData: [
            { name: '颜色', values: ['黑色', '蓝色'] },
            { name: '存储容量', values: ['256G', '512G'] }
        ],
        paramData: { '屏幕尺寸': '6.1英寸', '网络制式': '5G' }
    });

    await createProduct({
        name: '小米 14 Ultra',
        categoryId: subPhone.catId,
        brandName: '小米 (Xiaomi)',
        template: digitalTemplate,
        specData: [
            { name: '颜色', values: ['白色', '黑色'] },
            { name: '存储容量', values: ['512G'] }
        ],
        paramData: { '屏幕尺寸': '6.7英寸', '网络制式': '5G' }
    });

    // --- 4.2 Create Clothing Products ---
    await createProduct({
        name: '男子运动速干T恤',
        categoryId: subMens.catId,
        brandName: '耐克 (Nike)',
        template: clothingTemplate,
        specData: [
            { name: '颜色', values: ['黑', '白', '灰'] },
            { name: '尺码', values: ['M', 'L', 'XL'] }
        ],
        paramData: { '面料成分': '涤纶', '适用季节': '夏' }
    });

    await createProduct({
        name: '休闲纯棉卫衣',
        categoryId: subMens.catId,
        brandName: '优衣库 (Uniqlo)',
        template: clothingTemplate,
        specData: [
            { name: '颜色', values: ['蓝', '红'] },
            { name: '尺码', values: ['S', 'M', 'L'] }
        ],
        paramData: { '面料成分': '棉', '适用季节': '秋' }
    });

    // --- 4.3 Create Food Products ---
    await createProduct({
        name: '每日坚果礼盒',
        categoryId: subSnacks.catId,
        brandName: '三只松鼠',
        template: foodTemplate,
        specData: [
            { name: '包装规格', values: ['礼盒', '袋装'] }
        ],
        paramData: { '产地': '安徽', '保质期': '180天', '储存方式': '常温' }
    });

    await createProduct({
        name: '菲律宾进口香蕉',
        categoryId: subSnacks.catId,
        brandName: '都乐 (Dole)',
        template: foodTemplate,
        specData: [
            { name: '包装规格', values: ['散装', '盒装'] }
        ],
        paramData: { '产地': '菲律宾', '保质期': '7天', '储存方式': '冷藏' }
    });

    // --- 4.4 Create Service Products ---
    await createProduct({
        name: '家庭深度大扫除',
        categoryId: subCleaning.catId,
        brandName: null, // Service has no brand usually
        template: serviceTemplate,
        type: ProductType.SERVICE,
        specData: [
            { name: '服务级别', values: ['初级', '高级'] }
        ],
        paramData: { '服务时长': '240', '含清洁剂': '是' }
    });

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
