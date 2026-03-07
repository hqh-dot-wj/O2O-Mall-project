/**
 * 租户营销配置：积分规则、优惠券模板、分佣
 */
import { PrismaClient, CouponType, CouponValidityType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const now = new Date();
const startTime = new Date(now.getFullYear(), now.getMonth(), 1);
const endTime = new Date(now.getFullYear(), now.getMonth() + 3, 0);

export async function seedTenantMarketing(prisma: PrismaClient) {
  console.log('[04-Selection] 租户营销配置...');

  const tenantIds = ['000000', '100001', '100002'];

  for (const tenantId of tenantIds) {
    await prisma.mktPointsRule.upsert({
      where: { tenantId },
      update: {},
      create: {
        tenantId,
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
        maxPointsPerOrder: 5000,
        maxDiscountPercentOrder: 50,
        systemEnabled: true,
        createBy: 'admin',
        updateBy: null,
      },
    });

    await prisma.sysDistConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        level1Rate: new Decimal(0.04),
        level2Rate: new Decimal(0.06),
        enableLV0: true,
        enableCrossTenant: false,
        crossTenantRate: new Decimal(1.0),
        crossMaxDaily: new Decimal(500),
        commissionBaseType: 'ORIGINAL_PRICE',
        maxCommissionRate: new Decimal(0.5),
        createBy: 'admin',
        updateBy: 'admin',
      },
      update: {},
    });
  }

  const coupons = [
    { name: '新人满100减20', type: CouponType.DISCOUNT, discountAmount: 20, minOrderAmount: 100 },
    { name: '满200减40', type: CouponType.DISCOUNT, discountAmount: 40, minOrderAmount: 200 },
    { name: '9折折扣券', type: CouponType.PERCENTAGE, discountPercent: 90, maxDiscountAmount: 50, minOrderAmount: 0 },
  ];

  for (const tenantId of ['000000', '100001']) {
    for (const c of coupons) {
      const exists = await prisma.mktCouponTemplate.findFirst({ where: { tenantId, name: c.name } });
      if (exists) continue;
      await prisma.mktCouponTemplate.create({
        data: {
          tenantId,
          name: c.name,
          description: c.name,
          type: c.type,
          discountAmount: c.discountAmount ? new Decimal(c.discountAmount) : null,
          discountPercent: c.discountPercent ?? null,
          maxDiscountAmount: c.maxDiscountAmount ? new Decimal(c.maxDiscountAmount) : null,
          minOrderAmount: new Decimal(c.minOrderAmount),
          minActualPayAmount: null,
          applicableProducts: [],
          applicableCategories: [],
          memberLevels: [],
          exchangeProductId: null,
          exchangeSkuId: null,
          validityType: CouponValidityType.FIXED,
          startTime,
          endTime,
          validDays: null,
          totalStock: 1000,
          remainingStock: 1000,
          limitPerUser: 1,
          status: 'ACTIVE',
          createBy: 'admin',
          updateBy: null,
        },
      });
    }
  }
  console.log('  ✓ 积分规则、分佣、优惠券');
}
