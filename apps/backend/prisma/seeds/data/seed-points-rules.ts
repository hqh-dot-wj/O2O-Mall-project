/**
 * 积分规则种子数据
 *
 * 运行方式（在 apps/backend 目录下）：
 * npx ts-node prisma/seed-points-rules.ts
 *
 * 或使用 tsx：
 * npx tsx prisma/seed-points-rules.ts
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

const DEFAULT_TENANT_ID = '000000';
const SEED_BY = 'seed';

async function main() {
  console.log('🌱 开始写入积分规则种子数据...\n');

  const defaultRule = {
    tenantId: DEFAULT_TENANT_ID,
    orderPointsEnabled: true,
    orderPointsRatio: new Decimal(1),
    orderPointsBase: new Decimal(1),
    signinPointsEnabled: true,
    signinPointsAmount: 10,
    pointsValidityEnabled: false,
    pointsValidityDays: null,
    pointsRedemptionEnabled: true,
    pointsRedemptionRatio: new Decimal(100),
    pointsRedemptionBase: new Decimal(1),
    maxPointsPerOrder: null,
    maxDiscountPercentOrder: 50,
    systemEnabled: true,
    createBy: SEED_BY,
  };

  const existing = await prisma.mktPointsRule.findUnique({
    where: { tenantId: DEFAULT_TENANT_ID },
  });

  if (existing) {
    console.log(`  ⏭ 租户 ${DEFAULT_TENANT_ID} 已存在积分规则，跳过`);
  } else {
    await prisma.mktPointsRule.create({
      data: defaultRule,
    });
    console.log(`  ✅ 已为租户 ${DEFAULT_TENANT_ID} 创建默认积分规则`);
  }

  // 可选：为其他测试租户创建规则
  const testTenantIds = ['000001', '000002'];
  for (const tenantId of testTenantIds) {
    const tenantExists = await prisma.sysTenant.findUnique({
      where: { tenantId },
    });
    if (!tenantExists) continue;

    const existingRule = await prisma.mktPointsRule.findUnique({
      where: { tenantId },
    });
    if (existingRule) {
      console.log(`  ⏭ 租户 ${tenantId} 已存在积分规则，跳过`);
      continue;
    }

    await prisma.mktPointsRule.create({
      data: {
        ...defaultRule,
        tenantId,
      },
    });
    console.log(`  ✅ 已为租户 ${tenantId} 创建积分规则`);
  }

  console.log('\n✅ 积分规则种子数据写入完成');
}

main()
  .catch((e) => {
    console.error('❌ 写入失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
