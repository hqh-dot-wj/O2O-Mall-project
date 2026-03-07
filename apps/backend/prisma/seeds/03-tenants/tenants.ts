/**
 * 开通租户：不同套餐、直营/加盟
 */
import { PrismaClient, Status, DelFlag } from '@prisma/client';

const PASSWORD_HASH = '$2b$10$UrJrjy0kxyrTO1UvhRVsvex35mB1s1jzAraIA9xtzPmlLmRtZXEXS'; // 123456

const FULL_MENU_IDS =
  '1,2,3,4,5,6,7,8,100,101,102,103,104,105,106,107,108,109,110,112,113,114,115,116,117,118,119,120,121,122,123,124,125,200,201,202,203,204,205,210,211,212,213,220,221,222,223,224,225,226,227,228,230,231,232,240,250,251,260,261,262,263,264,265,266,267,268,269,270,271,272,273,280,281,282,283,284,500,501,1000,1001,1002,1003,1004,1005,1006,1007,1008,1009,1010,1011,1012,1013,1014,1015,1016,1017,1018,1019,1020,1021,1022,1023,1024,1025,1026,1027,1028,1029,1030,1031,1032,1033,1034,1035,1036,1037,1038,1039,1040,1041,1042,1043,1044,1045,1046,1047,1048,1049,1050,1051,1052,1053,1054,1055,1056,1057,1058,1059,1060,1061,1062,1063,1064,1065,1066,1067,1068,1069,1070,1071,1072,1073,1074,1075,1076,1077,1078';

export async function seedTenants(prisma: PrismaClient) {
  console.log('[03-Tenants] 租户开通...');

  for (const pkgId of [2, 3]) {
    await prisma.sysTenantPackage.upsert({
      where: { packageId: pkgId },
      update: {},
      create: {
        packageId: pkgId,
        packageName: pkgId === 2 ? '专业版套餐' : '企业版套餐',
        menuIds: FULL_MENU_IDS,
        menuCheckStrictly: true,
        status: Status.NORMAL,
        delFlag: DelFlag.NORMAL,
        createBy: 'admin',
        remark: pkgId === 2 ? '适合中型门店' : '适合大型门店',
      },
    });
  }

  const tenants = [
    { id: '100001', name: '长沙天心区服务中心', pkgId: 2, contact: '张经理', phone: '13800430103', region: '430103', isDirect: true },
    { id: '100002', name: '长沙岳麓生活馆', pkgId: 3, contact: '李经理', phone: '13800430104', region: '430104', isDirect: true },
    { id: '100003', name: '长沙开福区便民服务站', pkgId: 2, contact: '王店长', phone: '13800430105', region: '430105', isDirect: false },
    { id: '100004', name: '北京朝阳区旗舰店', pkgId: 3, contact: '赵经理', phone: '13800110105', region: '110105', isDirect: true },
    { id: '100005', name: '广州天河区体验中心', pkgId: 3, contact: '孙店长', phone: '13800440106', region: '440106', isDirect: true },
  ];

  for (const t of tenants) {
    await prisma.sysTenant.upsert({
      where: { tenantId: t.id },
      update: { packageId: t.pkgId, companyName: t.name },
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
        isDirect: t.isDirect,
        remark: 'Demo 租户',
      },
    });

    const adminUserName = `admin_${t.id}`;
    const existingUser = await prisma.sysUser.findFirst({ where: { tenantId: t.id, userName: adminUserName } });
    if (!existingUser) {
      const dept = await prisma.sysDept.create({
        data: {
          tenantId: t.id,
          parentId: 0,
          ancestors: '0',
          deptName: t.name,
          orderNum: 0,
          leader: t.contact,
          phone: t.phone,
          status: Status.NORMAL,
          delFlag: DelFlag.NORMAL,
          createBy: 'admin',
        },
      });

      const role = await prisma.sysRole.create({
        data: {
          tenantId: t.id,
          roleName: '超级管理员',
          roleKey: 'admin',
          roleSort: 1,
          dataScope: '1',
          status: Status.NORMAL,
          delFlag: DelFlag.NORMAL,
          createBy: 'admin',
        },
      });

      const user = await prisma.sysUser.create({
        data: {
          tenantId: t.id,
          deptId: dept.deptId,
          userName: adminUserName,
          nickName: t.contact,
          userType: '00',
          email: `admin${t.id}@example.com`,
          phonenumber: t.phone,
          sex: '1',
          password: PASSWORD_HASH,
          status: Status.NORMAL,
          delFlag: DelFlag.NORMAL,
          createBy: 'admin',
          remark: '租户管理员',
        },
      });

      await prisma.sysUserRole.create({ data: { userId: user.userId, roleId: role.roleId } });
      console.log(`  ✓ ${t.name} (${t.id}) admin: ${adminUserName} / 123456`);
    }
  }
}
