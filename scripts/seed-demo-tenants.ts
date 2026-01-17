import { PrismaClient, Status, DelFlag } from '@prisma/client';

const prisma = new PrismaClient();

// Password: '123456'
const PASSWORD_HASH = '$2b$10$UrJrjy0kxyrTO1UvhRVsvex35mB1s1jzAraIA9xtzPmlLmRtZXEXS';

// Full menu permissions from the default package
const FULL_MENU_IDS = '1,2,3,4,100,101,102,103,104,105,106,107,108,109,110,112,113,114,115,116,117,118,119,120,500,501,1000,1001,1002,1003,1004,1005,1006,1007,1008,1009,1010,1011,1012,1013,1014,1015,1016,1017,1018,1019,1020,1021,1022,1023,1024,1025,1026,1027,1028,1029,1030,1031,1032,1033,1034,1035,1036,1037,1038,1039,1040,1041,1042,1043,1044,1045,1046,1047,1048,1049,1050,1051,1052,1053,1054,1055,1056,1057,1058,1059,1060,1061,1062,1063,1064,1065,1066,1067,1068,1069,1070,1071,1072,1073,1074,1075,1076,1077,1078';

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

    // 2. Define Tenants
    const tenants = [
        { id: '100001', name: '武汉分公司', pkgId: 2, contact: '张经理', phone: '13800100001', region: '420100' },
        { id: '100002', name: '长沙分公司', pkgId: 3, contact: '李经理', phone: '13800100002', region: '430100' },
        { id: '100003', name: '零售加盟店', pkgId: 2, contact: '王店长', phone: '13800100003', region: '440100' },
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

    console.log('--- Demo Tenants Seeding Completed ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
