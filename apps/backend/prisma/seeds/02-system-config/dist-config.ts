/**
 * 分佣配置：一级 4%，二级 6%
 */
import { PrismaClient } from '@prisma/client';

export async function seedDistConfig(prisma: PrismaClient) {
  console.log('[02-System] 分佣配置 (4% / 6%)...');

  await prisma.sysDistConfig.upsert({
    where: { tenantId: '000000' },
    create: {
      tenantId: '000000',
      level1Rate: 0.04,
      level2Rate: 0.06,
      enableLV0: true,
      enableCrossTenant: false,
      crossTenantRate: 1.0,
      crossMaxDaily: 500,
      commissionBaseType: 'ORIGINAL_PRICE',
      maxCommissionRate: 0.5,
      createBy: 'admin',
      updateBy: 'admin',
    },
    update: { level1Rate: 0.04, level2Rate: 0.06, updateBy: 'admin' },
  });

  await prisma.sysDistLevel.createMany({
    data: [
      { tenantId: '000000', levelId: 0, levelName: '普通用户', level1Rate: 0, level2Rate: 0, sort: 0, isActive: true, createBy: 'admin', updateBy: 'admin' },
      { tenantId: '000000', levelId: 1, levelName: '初级分销员', level1Rate: 0.04, level2Rate: 0.06, sort: 1, isActive: true, createBy: 'admin', updateBy: 'admin' },
      { tenantId: '000000', levelId: 2, levelName: '中级分销员', level1Rate: 0.05, level2Rate: 0.07, sort: 2, isActive: true, createBy: 'admin', updateBy: 'admin' },
    ],
    skipDuplicates: true,
  });
  console.log('  ✓ 分佣 4% / 6%');
}
