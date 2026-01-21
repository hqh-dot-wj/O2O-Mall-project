import { PrismaClient, Status, DelFlag, ProductType, OrderType, OrderStatus, PayStatus, MemberStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// Password: '123456'
const PASSWORD_HASH = '$2b$10$UrJrjy0kxyrTO1UvhRVsvex35mB1s1jzAraIA9xtzPmlLmRtZXEXS';

// Full menu permissions from the default package
const FULL_MENU_IDS = '1,2,3,4,100,101,102,103,104,105,106,107,108,109,110,112,113,114,115,116,117,118,119,120,500,501,1000,1001,1002,1003,1004,1005,1006,1007,1008,1009,1010,1011,1012,1013,1014,1015,1016,1017,1018,1019,1020,1021,1022,1023,1024,1025,1026,1027,1028,1029,1030,1031,1032,1033,1034,1035,1036,1037,1038,1039,1040,1041,1042,1043,1044,1045,1046,1047,1048,1049,1050,1051,1052,1053,1054,1055,1056,1057,1058,1059,1060,1061,1062,1063,1064,1065,1066,1067,1068,1069,1070,1071,1072,1073,1074,1075,1076,1077,1078';

// --- Member Seed Helpers ---
const SURNAMES = ['张', '李', '王', '刘', '陈', '杨', '黄', '赵', '周', '吴', '郑', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '罗'];
const GIVEN_NAMES = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀兰', '霞', '平', '刚', '桂英', '慧'];
const getRandomAvatar = (seed: number) => `https://picsum.photos/seed/${seed}/200/200`;
const generateMobile = (index: number) => {
    const prefixes = ['138', '139', '137', '136', '135', '188', '187', '159', '158', '152', '151', '150', '186', '185', '183', '182', '181', '180'];
    const prefix = prefixes[index % prefixes.length];
    const suffix = String(10000000 + Math.floor(Math.random() * 89999999)).slice(1);
    return prefix + suffix;
};
const generateNickname = () => {
    const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
    const givenName = GIVEN_NAMES[Math.floor(Math.random() * GIVEN_NAMES.length)];
    return surname + givenName;
};

async function seedMembersInternal(prisma: PrismaClient, tenantIds: string[], countPerTenant: number = 10) {
    console.log(`--- Seeding UmsMember Data for ${tenantIds.length} tenants ---`);
    const members: any[] = [];
    for (const tenantId of tenantIds) {
        const memberIds: string[] = [];
        for (let i = 0; i < countPerTenant; i++) {
            memberIds.push(`mem-${tenantId}-${String(i + 1).padStart(3, '0')}-${Date.now().toString().slice(-6)}${i}`);
        }
        for (let i = 0; i < countPerTenant; i++) {
            let referrerId: string | null = null;
            if (i >= 2) {
                const referrerIndex = Math.floor(Math.random() * i);
                referrerId = memberIds[referrerIndex];
            }
            members.push({
                memberId: memberIds[i],
                tenantId: tenantId,
                nickname: generateNickname(),
                avatar: getRandomAvatar(1000 + i + parseInt(tenantId.slice(-3) || '0')),
                mobile: generateMobile(i + parseInt(tenantId.slice(-3) || '0')),
                password: '$2b$10$UrJrjy0kxyrTO1UvhRVsvex35mB1s1jzAraIA9xtzPmlLmRtZXEXS', // 123456
                status: MemberStatus.NORMAL,
                levelId: Math.floor(Math.random() * 5) + 1,
                balance: new Decimal(Math.floor(Math.random() * 100000) / 100),
                frozenBalance: new Decimal(Math.floor(Math.random() * 20000) / 100),
                points: Math.floor(Math.random() * 20000),
                referrerId,
            });
        }
    }
    const firstBatch = members.filter(m => !m.referrerId);
    const secondBatch = members.filter(m => m.referrerId);
    await prisma.umsMember.createMany({ data: firstBatch, skipDuplicates: true });
    await prisma.umsMember.createMany({ data: secondBatch, skipDuplicates: true });
    console.log(`--- Seeded ${members.length} UmsMember records successfully! ---`);
    return members;
}

async function main() {
    console.log('--- Starting Demo Tenants Seeding ---');

    // 1. Create Packages
    console.log('Seeding Packages...');
    const pkgProfessional = await prisma.sysTenantPackage.upsert({
        where: { packageId: 2 },
        update: {},
        create: {
            packageId: 2,
            packageName: '专业版套餐',
            menuIds: FULL_MENU_IDS,
            menuCheckStrictly: true,
            status: Status.NORMAL,
            delFlag: DelFlag.NORMAL,
            createBy: 'admin',
            remark: '适合中型企业，包含完整功能'
        }
    });

    const pkgEnterprise = await prisma.sysTenantPackage.upsert({
        where: { packageId: 3 },
        update: {},
        create: {
            packageId: 3,
            packageName: '企业版套餐',
            menuIds: FULL_MENU_IDS,
            menuCheckStrictly: true,
            status: Status.NORMAL,
            delFlag: DelFlag.NORMAL,
            createBy: 'admin',
            remark: '适合大型集团，无限制'
        }
    });

    // 2. Define Tenants (租户列表)
    // 区域代码: 430103-天心区, 430104-岳麓区, 430105-开福区, 430112-望城区, 430111-雨花区, 110105-北京朝阳区, 440106-广州天河区, 310115-上海浦东新区
    const tenants = [
        { id: '100001', name: '长沙天心区家政服务中心', pkgId: 2, contact: '张经理', phone: '13800430103', region: '430103' },
        { id: '100002', name: '长沙岳麓生活馆', pkgId: 3, contact: '李经理', phone: '13800430104', region: '430104' },
        { id: '100003', name: '长沙开福区便民服务站', pkgId: 2, contact: '王店长', phone: '13800430105', region: '430105' },
        { id: '100004', name: '长沙望城区O2O服务点', pkgId: 2, contact: '刘主管', phone: '13800430112', region: '430112' },
        { id: '100005', name: '长沙雨花区加盟店', pkgId: 3, contact: '陈经理', phone: '13800430111', region: '430111' },
        {
            id: '100006',
            name: '北京朝阳区服务中心',
            pkgId: 3,
            contact: '赵经理',
            phone: '13800110105',
            region: '110105',
            address: '北京市朝阳区建国路88号',
            latitude: 39.92,
            longitude: 116.46,
            serviceRadius: 10000
        },
        {
            id: '100007',
            name: '广州天河区旗舰店',
            pkgId: 3,
            contact: '孙店长',
            phone: '13800440106',
            region: '440106',
            address: '广州市天河区天河路200号',
            latitude: 23.13,
            longitude: 113.32,
            serviceRadius: 8000
        },
        {
            id: '100008',
            name: '上海浦东科技生活馆',
            pkgId: 3,
            contact: '周经理',
            phone: '13800310115',
            region: '310115',
            address: '上海市浦东新区世纪大道1号',
            latitude: 31.23,
            longitude: 121.50,
            serviceRadius: 12000
        },
        {
            id: '100009',
            name: '长沙市芙蓉区品牌中心',
            pkgId: 2,
            contact: '马主任',
            phone: '13800430102',
            region: '430102',
            address: '长沙市芙蓉区五一大道100号',
            latitude: 28.19,
            longitude: 112.98,
            serviceRadius: 5000
        }
    ];

    for (const t of tenants) {
        // 2.1 Upsert Tenant
        const tenant = await prisma.sysTenant.upsert({
            where: { tenantId: t.id },
            update: {
                // Update basic info if exists
                packageId: t.pkgId,
                companyName: t.name
            },
            create: {
                tenantId: t.id,
                companyName: t.name,
                contactUserName: t.contact,
                contactPhone: t.phone,
                packageId: t.pkgId,
                status: Status.NORMAL,
                delFlag: DelFlag.NORMAL,
                createBy: 'admin',
                accountCount: 10,
                expireTime: new Date('2030-12-31'),
                regionCode: t.region,
                isDirect: t.id !== '100003', // Demo: 100003 is franchise
                remark: 'Demo Tenant'
            }
        });
        console.log(`Synced Tenant: ${t.name} (${t.id})`);

        // 2.1.1 Create Tenant Geo Config (if tenant has location data)
        if ('latitude' in t && 'longitude' in t) {
            await prisma.sysTenantGeo.upsert({
                where: { tenantId: t.id },
                update: {
                    address: t.address || null,
                    latitude: t.latitude,
                    longitude: t.longitude,
                    serviceRadius: t.serviceRadius || 5000
                },
                create: {
                    tenantId: t.id,
                    address: t.address || null,
                    latitude: t.latitude,
                    longitude: t.longitude,
                    serviceRadius: t.serviceRadius || 5000
                }
            });
            console.log(`  ✓ Geo Config: lat=${t.latitude}, lng=${t.longitude}, radius=${t.serviceRadius}m`);
        }


        // 2.2 Create/Find Admin User
        // Note: Using a unique convention for demo purpose: admin_{tenantId}
        const adminUserName = `admin_${t.id}`;

        let user = await prisma.sysUser.findFirst({
            where: { tenantId: t.id, userName: adminUserName }
        });

        if (!user) {
            console.log(`Initializing data for tenant ${t.id}...`);

            // 2.3 Create Root Department
            const dept = await prisma.sysDept.create({
                data: {
                    tenantId: t.id,
                    parentId: 0,
                    ancestors: '0',
                    deptName: t.name, // Root dept same as company name
                    orderNum: 0,
                    leader: t.contact,
                    phone: t.phone,
                    status: Status.NORMAL,
                    delFlag: DelFlag.NORMAL,
                    createBy: 'admin'
                }
            });

            // 2.4 Create Sub-Departments
            const subDepts = ['市场部', '技术部', '财务部'];
            for (const [index, deptName] of subDepts.entries()) {
                await prisma.sysDept.create({
                    data: {
                        tenantId: t.id,
                        parentId: dept.deptId,
                        ancestors: `0,${dept.deptId}`,
                        deptName: deptName,
                        orderNum: index + 1,
                        status: Status.NORMAL,
                        delFlag: DelFlag.NORMAL,
                        createBy: 'admin'
                    }
                });
            }

            // 2.5 Create Admin Role
            const role = await prisma.sysRole.create({
                data: {
                    tenantId: t.id,
                    roleName: '超级管理员',
                    roleKey: 'admin',
                    roleSort: 1,
                    dataScope: '1', // All data
                    status: Status.NORMAL,
                    delFlag: DelFlag.NORMAL,
                    createBy: 'admin'
                }
            });

            // Also create a "Common Staff" role
            await prisma.sysRole.create({
                data: {
                    tenantId: t.id,
                    roleName: '普通员工',
                    roleKey: 'staff',
                    roleSort: 2,
                    dataScope: '2', // Custom data scope
                    status: Status.NORMAL,
                    delFlag: DelFlag.NORMAL,
                    createBy: 'admin'
                }
            });

            // 2.6 Create Admin User
            user = await prisma.sysUser.create({
                data: {
                    tenantId: t.id,
                    deptId: dept.deptId,
                    userName: adminUserName,
                    nickName: `${t.contact}`,
                    userType: '00',
                    email: `admin${t.id}@example.com`,
                    phonenumber: t.phone,
                    sex: '1',
                    password: PASSWORD_HASH,
                    status: Status.NORMAL,
                    delFlag: DelFlag.NORMAL,
                    createBy: 'admin',
                    remark: '系统自动生成管理员'
                }
            });

            // 2.7 Assign Role to User
            await prisma.sysUserRole.create({
                data: {
                    userId: user.userId,
                    roleId: role.roleId
                }
            });

            console.log(`Created Admin User: ${adminUserName} / 123456`);
        } else {
            console.log(`User ${adminUserName} already exists, skipping initialization.`);
        }
    }

    // 3. Seed Product Categories (商品分类)
    console.log('Seeding Product Categories...');

    // 一级分类 - 家政服务
    const catService = await prisma.pmsCategory.upsert({
        where: { catId: 1 },
        update: {
            name: '家政服务',
            level: 1,
            icon: '🏠',
            sort: 1,
            bindType: 'SERVICE'
        },
        create: {
            catId: 1,
            name: '家政服务',
            level: 1,
            icon: '🏠',
            sort: 1,
            bindType: 'SERVICE'
        }
    });

    // 二级分类 - 家政服务子类
    const catCleaning = await prisma.pmsCategory.upsert({
        where: { catId: 101 },
        update: {
            parentId: catService.catId,
            name: '保洁服务',
            level: 2,
            icon: '🧹',
            sort: 1,
            bindType: 'SERVICE'
        },
        create: {
            catId: 101,
            parentId: catService.catId,
            name: '保洁服务',
            level: 2,
            icon: '🧹',
            sort: 1,
            bindType: 'SERVICE'
        }
    });

    const catRepair = await prisma.pmsCategory.upsert({
        where: { catId: 102 },
        update: {},
        create: {
            catId: 102,
            parentId: catService.catId,
            name: '维修服务',
            level: 2,
            icon: '🔧',
            sort: 2,
            bindType: 'SERVICE'
        }
    });

    // 一级分类 - 生活用品
    const catGoods = await prisma.pmsCategory.upsert({
        where: { catId: 2 },
        update: {
            name: '生活用品',
            level: 1,
            icon: '🛒',
            sort: 2,
            bindType: 'REAL'
        },
        create: {
            catId: 2,
            name: '生活用品',
            level: 1,
            icon: '🛒',
            sort: 2,
            bindType: 'REAL'
        }
    });

    // 二级分类 - 生活用品子类
    const catCleaningGoods = await prisma.pmsCategory.upsert({
        where: { catId: 201 },
        update: {},
        create: {
            catId: 201,
            parentId: catGoods.catId,
            name: '清洁用品',
            level: 2,
            icon: '🧴',
            sort: 1,
            bindType: 'REAL'
        }
    });

    // 4. Seed Brands (品牌)
    console.log('Seeding Brands...');
    const brandA = await prisma.pmsBrand.upsert({
        where: { brandId: 1 },
        update: {},
        create: {
            brandId: 1,
            name: '洁霸',
            logo: 'https://via.placeholder.com/100x100?text=JieBa'
        }
    });

    const brandB = await prisma.pmsBrand.upsert({
        where: { brandId: 2 },
        update: {},
        create: {
            brandId: 2,
            name: '威猛先生',
            logo: 'https://via.placeholder.com/100x100?text=WeiMeng'
        }
    });

    // 5. Seed Products (商品标准库)
    console.log('Seeding Products...');

    // 服务商品 1: 家庭保洁
    const product1 = await prisma.pmsProduct.upsert({
        where: { productId: 'prod-001' },
        update: {},
        create: {
            productId: 'prod-001',
            categoryId: catCleaning.catId,
            name: '家庭深度保洁',
            subTitle: '专业团队上门，让家焕然一新',
            mainImages: [
                'https://via.placeholder.com/400x400?text=Cleaning1',
                'https://via.placeholder.com/400x400?text=Cleaning2'
            ],
            detailHtml: '<h2>服务介绍</h2><p>专业保洁团队，提供深度清洁服务</p>',
            type: 'SERVICE',
            serviceDuration: 180, // 3小时
            serviceRadius: 5000,
            needBooking: true,
            specDef: JSON.parse('{"specs": [{"name": "服务时长", "values": ["3小时", "5小时"]}, {"name": "服务人数", "values": ["1人", "2人"]}]}'),
            publishStatus: 'ON_SHELF'
        }
    });

    // 服务商品 2: 空调维修
    const product2 = await prisma.pmsProduct.upsert({
        where: { productId: 'prod-002' },
        update: {},
        create: {
            productId: 'prod-002',
            categoryId: catRepair.catId,
            name: '空调维修保养',
            subTitle: '专业师傅，快速上门',
            mainImages: [
                'https://via.placeholder.com/400x400?text=Repair1'
            ],
            detailHtml: '<h2>服务介绍</h2><p>空调清洗、维修、加氟一站式服务</p>',
            type: 'SERVICE',
            serviceDuration: 120,
            serviceRadius: 8000,
            needBooking: true,
            specDef: JSON.parse('{"specs": [{"name": "服务类型", "values": ["清洗", "维修", "加氟"]}]}'),
            publishStatus: 'ON_SHELF'
        }
    });

    // 实物商品 1: 清洁剂
    const product3 = await prisma.pmsProduct.upsert({
        where: { productId: 'prod-003' },
        update: {},
        create: {
            productId: 'prod-003',
            categoryId: catCleaningGoods.catId,
            brandId: brandA.brandId,
            name: '洁霸多功能清洁剂',
            subTitle: '去污力强，温和不伤手',
            mainImages: [
                'https://via.placeholder.com/400x400?text=Cleaner1'
            ],
            detailHtml: '<h2>产品介绍</h2><p>多功能清洁，适用于厨房、浴室等多个场景</p>',
            type: 'REAL',
            weight: 1000,
            isFreeShip: false,
            specDef: JSON.parse('{"specs": [{"name": "规格", "values": ["500ml", "1000ml"]}]}'),
            publishStatus: 'ON_SHELF'
        }
    });

    // 实物商品 2: 拖把
    const product4 = await prisma.pmsProduct.upsert({
        where: { productId: 'prod-004' },
        update: {},
        create: {
            productId: 'prod-004',
            categoryId: catCleaningGoods.catId,
            brandId: brandB.brandId,
            name: '旋转拖把套装',
            subTitle: '360度旋转，轻松清洁',
            mainImages: [
                'https://via.placeholder.com/400x400?text=Mop1'
            ],
            detailHtml: '<h2>产品介绍</h2><p>不锈钢杆，耐用持久，配2个拖布头</p>',
            type: 'REAL',
            weight: 2000,
            isFreeShip: true,
            specDef: JSON.parse('{"specs": [{"name": "颜色", "values": ["蓝色", "粉色"]}]}'),
            publishStatus: 'ON_SHELF'
        }
    });

    // 6. Seed Global SKUs (标准SKU)
    console.log('Seeding Global SKUs...');

    const sku1_1 = await prisma.pmsGlobalSku.upsert({
        where: { skuId: 'sku-001-1' },
        update: {},
        create: {
            skuId: 'sku-001-1',
            productId: product1.productId,
            specValues: JSON.parse('{"服务时长": "3小时", "服务人数": "1人"}'),
            guidePrice: 150.00,
            distMode: 'RATIO',
            guideRate: 0.10,
            minDistRate: 0.05,
            maxDistRate: 0.20,
            costPrice: 80.00
        }
    });

    const sku1_2 = await prisma.pmsGlobalSku.upsert({
        where: { skuId: 'sku-001-2' },
        update: {},
        create: {
            skuId: 'sku-001-2',
            productId: product1.productId,
            specValues: JSON.parse('{"服务时长": "5小时", "服务人数": "2人"}'),
            guidePrice: 380.00,
            distMode: 'RATIO',
            guideRate: 0.10,
            minDistRate: 0.05,
            maxDistRate: 0.20,
            costPrice: 200.00
        }
    });

    const sku2_1 = await prisma.pmsGlobalSku.upsert({
        where: { skuId: 'sku-002-1' },
        update: {},
        create: {
            skuId: 'sku-002-1',
            productId: product2.productId,
            specValues: JSON.parse('{"服务类型": "清洗"}'),
            guidePrice: 80.00,
            distMode: 'FIXED',
            guideRate: 10.00,
            minDistRate: 5.00,
            maxDistRate: 15.00,
            costPrice: 30.00
        }
    });

    const sku2_2 = await prisma.pmsGlobalSku.upsert({
        where: { skuId: 'sku-002-2' },
        update: {},
        create: {
            skuId: 'sku-002-2',
            productId: product2.productId,
            specValues: JSON.parse('{"服务类型": "维修"}'),
            guidePrice: 150.00,
            distMode: 'RATIO',
            guideRate: 0.12,
            minDistRate: 0.08,
            maxDistRate: 0.20,
            costPrice: 50.00
        }
    });

    const sku3_1 = await prisma.pmsGlobalSku.upsert({
        where: { skuId: 'sku-003-1' },
        update: {},
        create: {
            skuId: 'sku-003-1',
            productId: product3.productId,
            specValues: JSON.parse('{"规格": "500ml"}'),
            guidePrice: 28.00,
            distMode: 'RATIO',
            guideRate: 0.15,
            minDistRate: 0.10,
            maxDistRate: 0.25,
            costPrice: 12.00
        }
    });

    const sku3_2 = await prisma.pmsGlobalSku.upsert({
        where: { skuId: 'sku-003-2' },
        update: {},
        create: {
            skuId: 'sku-003-2',
            productId: product3.productId,
            specValues: JSON.parse('{"规格": "1000ml"}'),
            guidePrice: 48.00,
            distMode: 'RATIO',
            guideRate: 0.15,
            minDistRate: 0.10,
            maxDistRate: 0.25,
            costPrice: 20.00
        }
    });

    const sku4_1 = await prisma.pmsGlobalSku.upsert({
        where: { skuId: 'sku-004-1' },
        update: {},
        create: {
            skuId: 'sku-004-1',
            productId: product4.productId,
            specValues: JSON.parse('{"颜色": "蓝色"}'),
            guidePrice: 89.00,
            distMode: 'RATIO',
            guideRate: 0.18,
            minDistRate: 0.12,
            maxDistRate: 0.30,
            costPrice: 35.00
        }
    });

    const sku4_2 = await prisma.pmsGlobalSku.upsert({
        where: { skuId: 'sku-004-2' },
        update: {},
        create: {
            skuId: 'sku-004-2',
            productId: product4.productId,
            specValues: JSON.parse('{"颜色": "粉色"}'),
            guidePrice: 89.00,
            distMode: 'RATIO',
            guideRate: 0.18,
            minDistRate: 0.12,
            maxDistRate: 0.30,
            costPrice: 35.00
        }
    });

    // 7. Seed Tenant Products & SKUs (为每个租户上架部分商品)
    console.log('Seeding Tenant Products and SKUs...');

    for (const t of tenants) {
        console.log(`Adding products for tenant: ${t.name}...`);

        // 每个租户上架商品1和商品3
        const tenantProd1 = await prisma.pmsTenantProduct.upsert({
            where: {
                tenantId_productId: {
                    tenantId: t.id,
                    productId: product1.productId
                }
            },
            update: {},
            create: {
                tenantId: t.id,
                productId: product1.productId,
                status: 'ON_SHELF',
                isHot: true,
                sort: 1
            }
        });

        const tenantProd3 = await prisma.pmsTenantProduct.upsert({
            where: {
                tenantId_productId: {
                    tenantId: t.id,
                    productId: product3.productId
                }
            },
            update: {},
            create: {
                tenantId: t.id,
                productId: product3.productId,
                status: 'ON_SHELF',
                isHot: false,
                sort: 2
            }
        });

        // 为租户商品添加SKU价格
        await prisma.pmsTenantSku.upsert({
            where: { id: `tenant-sku-${t.id}-001-1` },
            update: {},
            create: {
                id: `tenant-sku-${t.id}-001-1`,
                tenantProductId: tenantProd1.id,
                globalSkuId: sku1_1.skuId,
                price: 158.00, // 租户自定价
                stock: -1, // 服务类不限库存
                isActive: true,
                distMode: 'RATIO',
                distRate: 0.12
            }
        });

        await prisma.pmsTenantSku.upsert({
            where: { id: `tenant-sku-${t.id}-001-2` },
            update: {},
            create: {
                id: `tenant-sku-${t.id}-001-2`,
                tenantProductId: tenantProd1.id,
                globalSkuId: sku1_2.skuId,
                price: 398.00,
                stock: -1,
                isActive: true,
                distMode: 'RATIO',
                distRate: 0.12
            }
        });

        await prisma.pmsTenantSku.upsert({
            where: { id: `tenant-sku-${t.id}-003-1` },
            update: {},
            create: {
                id: `tenant-sku-${t.id}-003-1`,
                tenantProductId: tenantProd3.id,
                globalSkuId: sku3_1.skuId,
                price: 29.90,
                stock: 100, // 实物商品有库存
                isActive: true,
                distMode: 'RATIO',
                distRate: 0.16
            }
        });

        await prisma.pmsTenantSku.upsert({
            where: { id: `tenant-sku-${t.id}-003-2` },
            update: {},
            create: {
                id: `tenant-sku-${t.id}-003-2`,
                tenantProductId: tenantProd3.id,
                globalSkuId: sku3_2.skuId,
                price: 49.90,
                stock: 80,
                isActive: true,
                distMode: 'RATIO',
                distRate: 0.16
            }
        });
    }

    // 8. Seed Members for all tenants
    console.log('Seeding Members for all tenants...');
    const tenantIds = tenants.map(t => t.id);
    const members = await seedMembersInternal(prisma, tenantIds, 5); // 5 members per tenant

    // 9. Seed Orders for all tenants
    console.log('Seeding Orders for all tenants...');
    await seedOrders(prisma, members);

    console.log('--- Demo Tenants Seeding Completed ---');
}

async function seedOrders(prisma: PrismaClient, members: any[]) {
    for (const member of members) {
        // Find tenant products and SKUs for this member's tenant
        const tenantProducts = await prisma.pmsTenantProduct.findMany({
            where: { tenantId: member.tenantId, status: 'ON_SHELF' },
            include: {
                product: true,
                skus: {
                    where: { isActive: true },
                    include: { globalSku: true }
                }
            }
        });

        if (tenantProducts.length === 0) continue;

        // Create 1-2 orders for each member
        const orderCount = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < orderCount; i++) {
            const tp = tenantProducts[Math.floor(Math.random() * tenantProducts.length)] as any;
            const tSku = tp.skus[Math.floor(Math.random() * tp.skus.length)] as any;

            if (!tSku) continue;

            const totalAmount = tSku.price;
            const orderStatus = i % 2 === 0 ? OrderStatus.COMPLETED : OrderStatus.PAID;
            const payStatus = PayStatus.PAID;

            await prisma.omsOrder.create({
                data: {
                    orderSn: `SN${Date.now()}${Math.floor(Math.random() * 1000)}`,
                    memberId: member.memberId,
                    tenantId: member.tenantId,
                    orderType: tp.product.type === 'REAL' ? OrderType.PRODUCT : OrderType.SERVICE,
                    totalAmount: totalAmount,
                    payAmount: totalAmount,
                    status: orderStatus,
                    payStatus: payStatus,
                    receiverName: member.nickname,
                    receiverPhone: member.mobile,
                    receiverAddress: '长沙市某某区某某街道',
                    items: {
                        create: {
                            productId: tp.productId,
                            productName: tp.product.name,
                            productImg: tp.product.mainImages[0],
                            skuId: tSku.id,
                            specData: tSku.globalSku.specValues as any,
                            price: tSku.price,
                            quantity: 1,
                            totalAmount: tSku.price
                        }
                    }
                }
            });
        }
    }
    console.log(`--- Seeded random orders for ${members.length} members ---`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
