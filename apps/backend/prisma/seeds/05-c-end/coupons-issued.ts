/**
 * 已发放优惠券
 */
import { PrismaClient, CouponDistributionType, CouponType } from '@prisma/client';

export async function seedCouponsIssued(prisma: PrismaClient) {
  console.log('[05-CEnd] 发放优惠券...');

  const members = await prisma.umsMember.findMany({ take: 8, select: { memberId: true, tenantId: true } });
  const templates = await prisma.mktCouponTemplate.findMany({ take: 3, where: { status: 'ACTIVE' } });

  if (members.length === 0 || templates.length === 0) return;

  const now = new Date();
  let count = 0;

  for (const m of members) {
    const tpl = templates[count % templates.length];
    const start = new Date(now);
    const end = new Date(now);
    end.setDate(end.getDate() + 30);

    const exists = await prisma.mktUserCoupon.findFirst({
      where: { memberId: m.memberId, templateId: tpl.id },
    });
    if (exists) continue;

    await prisma.mktUserCoupon.create({
      data: {
        tenantId: m.tenantId,
        memberId: m.memberId,
        templateId: tpl.id,
        couponName: tpl.name,
        couponType: tpl.type as CouponType,
        discountAmount: tpl.discountAmount,
        discountPercent: tpl.discountPercent,
        maxDiscountAmount: tpl.maxDiscountAmount,
        minOrderAmount: tpl.minOrderAmount,
        startTime: start,
        endTime: end,
        distributionType: CouponDistributionType.MANUAL,
        distributionSource: '种子数据',
      },
    });
    count++;
  }
  console.log(`  ✓ 发放 ${count} 张优惠券`);
}
