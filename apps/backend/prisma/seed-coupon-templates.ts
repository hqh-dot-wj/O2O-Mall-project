/**
 * 优惠券模板种子数据
 *
 * 运行方式（在 apps/backend 目录下）：
 * npx ts-node prisma/seed-coupon-templates.ts
 *
 * 或使用 tsx：
 * npx tsx prisma/seed-coupon-templates.ts
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

const DEFAULT_TENANT_ID = '000000';

async function main() {
  console.log('🌱 开始写入优惠券模板种子数据...\n');

  const templates = [
    {
      tenantId: DEFAULT_TENANT_ID,
      name: '新人满100减20',
      description: '新用户专享，满100元可用',
      type: 'DISCOUNT' as const,
      discountAmount: new Decimal(20),
      minOrderAmount: new Decimal(100),
      totalStock: 5000,
      remainingStock: 5000,
      limitPerUser: 1,
      validityType: 'RELATIVE' as const,
      validDays: 30,
      status: 'ACTIVE' as const,
      createBy: 'seed',
      applicableProducts: [],
      applicableCategories: [],
      memberLevels: [],
    },
    {
      tenantId: DEFAULT_TENANT_ID,
      name: '全场9折券',
      description: '全场商品享9折',
      type: 'PERCENTAGE' as const,
      discountPercent: 90,
      minOrderAmount: new Decimal(0),
      totalStock: 3000,
      remainingStock: 3000,
      limitPerUser: 2,
      validityType: 'RELATIVE' as const,
      validDays: 7,
      status: 'ACTIVE' as const,
      createBy: 'seed',
      applicableProducts: [],
      applicableCategories: [],
      memberLevels: [],
    },
    {
      tenantId: DEFAULT_TENANT_ID,
      name: '周末满200减50',
      description: '周末专享满减',
      type: 'DISCOUNT' as const,
      discountAmount: new Decimal(50),
      minOrderAmount: new Decimal(200),
      totalStock: 1000,
      remainingStock: 1000,
      limitPerUser: 1,
      validityType: 'FIXED' as const,
      startTime: new Date(),
      endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE' as const,
      createBy: 'seed',
      applicableProducts: [],
      applicableCategories: [],
      memberLevels: [],
    },
  ];

  for (const t of templates) {
    const existing = await prisma.mktCouponTemplate.findFirst({
      where: { tenantId: t.tenantId, name: t.name },
    });
    if (existing) {
      console.log(`  ⏭️ 已存在: ${t.name}`);
      continue;
    }
    await prisma.mktCouponTemplate.create({
      data: t,
    });
    console.log(`  ✅ 已创建: ${t.name}`);
  }

  console.log('\n✅ 优惠券模板种子数据写入完成。');
}

main()
  .catch((e) => {
    console.error('❌ 执行失败:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
