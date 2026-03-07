/**
 * 租户选品：门店从选品中心导入商品，设置价格与库存
 */
import { PrismaClient, PublishStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const TENANT_IDS = ['100001', '100002', '100003'];
const PRODUCT_IDS = ['prod-goods-001', 'prod-goods-002', 'course-art-001', 'course-art-002', 'course-sport-001'];

export async function seedTenantProducts(prisma: PrismaClient) {
  console.log('[04-Selection] 租户选品...');

  for (const tenantId of TENANT_IDS) {
    const products = await prisma.pmsProduct.findMany({
      where: { productId: { in: PRODUCT_IDS }, publishStatus: PublishStatus.ON_SHELF },
      include: { globalSkus: true },
    });

    for (const prod of products) {
      const existing = await prisma.pmsTenantProduct.findUnique({
        where: { tenantId_productId: { tenantId, productId: prod.productId } },
      });
      if (existing) continue;

      const tp = await prisma.pmsTenantProduct.create({
        data: {
          tenantId,
          productId: prod.productId,
          status: PublishStatus.ON_SHELF,
          isHot: Math.random() > 0.7,
          sort: 0,
          customTitle: null,
          overrideRadius: null,
        },
      });

      for (const gs of prod.globalSkus) {
        const price = Number(gs.guidePrice) * (0.95 + Math.random() * 0.15);
        await prisma.pmsTenantSku.create({
          data: {
            tenantId,
            tenantProductId: tp.id,
            globalSkuId: gs.skuId,
            price: new Decimal(price.toFixed(2)),
            stock: prod.type === 'REAL' ? Math.floor(Math.random() * 50) + 10 : 999,
            isActive: true,
            distMode: 'RATIO',
            distRate: new Decimal(1), // 100% 参与分佣基数，使 L1(4%)+L2(6%)=10% 占商品价
            isExchangeProduct: false,
            version: 0,
            pointsRatio: 100,
            isPromotionProduct: false,
          },
        });
      }
    }
  }
  console.log(`  ✓ ${TENANT_IDS.length} 个租户已选品`);
}
