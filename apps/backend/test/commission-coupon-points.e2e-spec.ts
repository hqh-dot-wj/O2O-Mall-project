import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from '../src/app.module';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * 优惠券和积分分佣计算 - 端到端测试
 * 
 * 测试完整的订单流程：
 * 1. 创建订单（使用优惠券/积分）
 * 2. 支付订单
 * 3. 验证佣金计算
 * 4. 验证佣金结算
 */
describe('Commission with Coupon & Points (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  // 测试数据
  const testTenantId = '00000';
  const testMember1 = 'test_member_001'; // 下单人
  const testMember2 = 'test_member_002'; // L1推荐人（C1）
  const testMember3 = 'test_member_003'; // L2推荐人（C2）

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // 准备测试数据
    await setupTestData();

    // 获取认证 token（根据你的认证方式调整）
    authToken = await getAuthToken();
  });

  afterAll(async () => {
    // 清理测试数据
    await cleanupTestData();
    await app.close();
  });

  /**
   * 准备测试数据
   */
  async function setupTestData() {
    // 1. 创建测试租户
    await prisma.sysTenant.upsert({
      where: { tenantId: testTenantId },
      create: {
        tenantId: testTenantId,
        tenantName: '测试租户',
        contactName: '测试',
        contactPhone: '13800138000',
        status: 'NORMAL',
      },
      update: {},
    });

    // 2. 创建分销配置
    await prisma.sysDistConfig.upsert({
      where: { tenantId: testTenantId },
      create: {
        tenantId: testTenantId,
        level1Rate: new Decimal(0.10),
        level2Rate: new Decimal(0.05),
        enableLV0: true,
        enableCrossTenant: false,
        commissionBaseType: 'ORIGINAL_PRICE',
        maxCommissionRate: new Decimal(0.50),
      },
      update: {
        commissionBaseType: 'ORIGINAL_PRICE',
        maxCommissionRate: new Decimal(0.50),
      },
    });

    // 3. 创建测试会员
    await prisma.umsMember.upsert({
      where: { memberId: testMember3 },
      create: {
        memberId: testMember3,
        tenantId: testTenantId,
        nickname: '测试会员3（C2）',
        mobile: '13800138003',
        levelId: 2, // C2
        parentId: null,
        indirectParentId: null,
      },
      update: {},
    });

    await prisma.umsMember.upsert({
      where: { memberId: testMember2 },
      create: {
        memberId: testMember2,
        tenantId: testTenantId,
        nickname: '测试会员2（C1）',
        mobile: '13800138002',
        levelId: 1, // C1
        parentId: testMember3,
        indirectParentId: null,
      },
      update: {},
    });

    await prisma.umsMember.upsert({
      where: { memberId: testMember1 },
      create: {
        memberId: testMember1,
        tenantId: testTenantId,
        nickname: '测试会员1',
        mobile: '13800138001',
        levelId: 0, // 普通会员
        parentId: testMember2,
        indirectParentId: testMember3,
      },
      update: {},
    });

    // 4. 创建测试商品和SKU
    const product = await prisma.pmsTenantProduct.upsert({
      where: { id: 'test_product_001' },
      create: {
        id: 'test_product_001',
        tenantId: testTenantId,
        globalProductId: 'global_prod_001',
        name: '测试商品',
        price: new Decimal(100),
        stock: 1000,
        status: 'ON_SHELF',
      },
      update: {},
    });

    await prisma.pmsTenantSku.upsert({
      where: { id: 'test_sku_001' },
      create: {
        id: 'test_sku_001',
        tenantId: testTenantId,
        tenantProductId: product.id,
        globalSkuId: 'global_sku_001',
        price: new Decimal(100),
        stock: 1000,
        isActive: true,
        distMode: 'RATIO',
        distRate: new Decimal(1.0),
        isExchangeProduct: false,
      },
      update: {
        isExchangeProduct: false,
      },
    });

    // 5. 创建兑换商品SKU
    await prisma.pmsTenantSku.upsert({
      where: { id: 'test_sku_exchange' },
      create: {
        id: 'test_sku_exchange',
        tenantId: testTenantId,
        tenantProductId: product.id,
        globalSkuId: 'global_sku_002',
        price: new Decimal(50),
        stock: 1000,
        isActive: true,
        distMode: 'NONE',
        distRate: new Decimal(0),
        isExchangeProduct: true, // 兑换商品
      },
      update: {
        isExchangeProduct: true,
      },
    });

    // 6. 创建优惠券模板
    await prisma.mktCouponTemplate.upsert({
      where: { id: 'test_coupon_template_001' },
      create: {
        id: 'test_coupon_template_001',
        tenantId: testTenantId,
        name: '测试优惠券',
        type: 'DISCOUNT',
        discountAmount: new Decimal(20),
        minOrderAmount: new Decimal(50),
        minActualPayAmount: new Decimal(10), // 最低实付10元
        totalStock: 1000,
        remainingStock: 1000,
        limitPerUser: 10,
        validityType: 'RELATIVE',
        validDays: 30,
        status: 'ACTIVE',
        createBy: 'test',
      },
      update: {},
    });

    // 7. 创建积分规则
    await prisma.mktPointsRule.upsert({
      where: { tenantId: testTenantId },
      create: {
        tenantId: testTenantId,
        orderPointsEnabled: true,
        orderPointsRatio: new Decimal(1),
        orderPointsBase: new Decimal(1),
        pointsRedemptionEnabled: true,
        pointsRedemptionRatio: new Decimal(100),
        pointsRedemptionBase: new Decimal(1),
      },
      update: {},
    });
  }

  /**
   * 清理测试数据
   */
  async function cleanupTestData() {
    await prisma.finCommission.deleteMany({
      where: { tenantId: testTenantId },
    });
    await prisma.omsOrderItem.deleteMany({
      where: { tenantId: testTenantId },
    });
    await prisma.omsOrder.deleteMany({
      where: { tenantId: testTenantId },
    });
    await prisma.mktUserCoupon.deleteMany({
      where: { tenantId: testTenantId },
    });
    await prisma.mktCouponTemplate.deleteMany({
      where: { tenantId: testTenantId },
    });
    await prisma.pmsTenantSku.deleteMany({
      where: { tenantId: testTenantId },
    });
    await prisma.pmsTenantProduct.deleteMany({
      where: { tenantId: testTenantId },
    });
    await prisma.umsMember.deleteMany({
      where: { tenantId: testTenantId },
    });
    await prisma.sysDistConfig.deleteMany({
      where: { tenantId: testTenantId },
    });
  }

  /**
   * 获取认证 token
   */
  async function getAuthToken(): Promise<string> {
    // 根据你的认证方式实现
    // 这里假设使用 JWT
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        mobile: '13800138001',
        password: 'test123',
      });

    return response.body.data.token;
  }

  describe('场景1: 正常商品 + 优惠券（基于原价）', () => {
    it('应该正确计算佣金', async () => {
      // 1. 发放优惠券
      const couponResponse = await request(app.getHttpServer())
        .post('/client/marketing/coupon/claim/test_coupon_template_001')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const userCouponId = couponResponse.body.data.id;

      // 2. 创建订单
      const orderResponse = await request(app.getHttpServer())
        .post('/client/order/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              skuId: 'test_sku_001',
              quantity: 1,
            },
          ],
          userCouponId,
          pointsUsed: 0,
        })
        .expect(201);

      const orderId = orderResponse.body.data.id;

      // 3. 支付订单
      await request(app.getHttpServer())
        .post(`/client/order/${orderId}/pay`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          payType: 'WECHAT',
        })
        .expect(200);

      // 4. 等待异步佣金计算完成
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 5. 验证佣金记录
      const commissions = await prisma.finCommission.findMany({
        where: { orderId },
        orderBy: { level: 'asc' },
      });

      expect(commissions).toHaveLength(2);

      // L1 佣金验证
      const l1Commission = commissions[0];
      expect(l1Commission.beneficiaryId).toBe(testMember2);
      expect(l1Commission.level).toBe(1);
      expect(l1Commission.amount.toNumber()).toBe(10); // 100 × 10%
      expect(l1Commission.commissionBase.toNumber()).toBe(100);
      expect(l1Commission.commissionBaseType).toBe('ORIGINAL_PRICE');
      expect(l1Commission.orderOriginalPrice.toNumber()).toBe(100);
      expect(l1Commission.orderActualPaid.toNumber()).toBe(80); // 100 - 20
      expect(l1Commission.couponDiscount.toNumber()).toBe(20);
      expect(l1Commission.isCapped).toBe(false);

      // L2 佣金验证
      const l2Commission = commissions[1];
      expect(l2Commission.beneficiaryId).toBe(testMember3);
      expect(l2Commission.level).toBe(2);
      expect(l2Commission.amount.toNumber()).toBe(5); // 100 × 5%
      expect(l2Commission.isCapped).toBe(false);
    });
  });

  describe('场景2: 大额优惠触发熔断', () => {
    it('应该触发熔断保护并缩减佣金', async () => {
      // 1. 创建大额优惠券
      const bigCouponTemplate = await prisma.mktCouponTemplate.create({
        data: {
          tenantId: testTenantId,
          name: '大额优惠券',
          type: 'DISCOUNT',
          discountAmount: new Decimal(90),
          minOrderAmount: new Decimal(100),
          minActualPayAmount: new Decimal(1),
          totalStock: 100,
          remainingStock: 100,
          limitPerUser: 1,
          validityType: 'RELATIVE',
          validDays: 30,
          status: 'ACTIVE',
          createBy: 'test',
        },
      });

      // 2. 发放优惠券
      const userCoupon = await prisma.mktUserCoupon.create({
        data: {
          tenantId: testTenantId,
          memberId: testMember1,
          templateId: bigCouponTemplate.id,
          couponName: bigCouponTemplate.name,
          couponType: bigCouponTemplate.type,
          discountAmount: bigCouponTemplate.discountAmount,
          minOrderAmount: bigCouponTemplate.minOrderAmount,
          startTime: new Date(),
          endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'UNUSED',
          distributionType: 'MANUAL',
        },
      });

      // 3. 创建订单
      const orderResponse = await request(app.getHttpServer())
        .post('/client/order/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              skuId: 'test_sku_001',
              quantity: 1,
            },
          ],
          userCouponId: userCoupon.id,
          pointsUsed: 0,
        })
        .expect(201);

      const orderId = orderResponse.body.data.id;

      // 4. 支付订单
      await request(app.getHttpServer())
        .post(`/client/order/${orderId}/pay`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          payType: 'WECHAT',
        })
        .expect(200);

      // 5. 等待异步佣金计算完成
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 6. 验证佣金记录
      const commissions = await prisma.finCommission.findMany({
        where: { orderId },
        orderBy: { level: 'asc' },
      });

      expect(commissions).toHaveLength(2);

      // 验证熔断
      const totalCommission = commissions.reduce(
        (sum, c) => sum.add(c.amount),
        new Decimal(0),
      );

      // 实付10元，最大允许5元（50%）
      expect(totalCommission.toNumber()).toBeCloseTo(5, 2);
      expect(commissions[0].isCapped).toBe(true);
      expect(commissions[1].isCapped).toBe(true);
    });
  });

  describe('场景3: 兑换商品不分佣', () => {
    it('应该不产生佣金记录', async () => {
      // 1. 创建兑换券
      const exchangeCouponTemplate = await prisma.mktCouponTemplate.create({
        data: {
          tenantId: testTenantId,
          name: '兑换券',
          type: 'EXCHANGE',
          minOrderAmount: new Decimal(0),
          minActualPayAmount: new Decimal(0),
          exchangeProductId: 'test_product_001',
          exchangeSkuId: 'test_sku_exchange',
          totalStock: 100,
          remainingStock: 100,
          limitPerUser: 1,
          validityType: 'RELATIVE',
          validDays: 30,
          status: 'ACTIVE',
          createBy: 'test',
        },
      });

      const userCoupon = await prisma.mktUserCoupon.create({
        data: {
          tenantId: testTenantId,
          memberId: testMember1,
          templateId: exchangeCouponTemplate.id,
          couponName: exchangeCouponTemplate.name,
          couponType: exchangeCouponTemplate.type,
          minOrderAmount: new Decimal(0),
          startTime: new Date(),
          endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'UNUSED',
          distributionType: 'MANUAL',
        },
      });

      // 2. 创建订单（兑换商品）
      const orderResponse = await request(app.getHttpServer())
        .post('/client/order/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              skuId: 'test_sku_exchange', // 兑换商品
              quantity: 1,
            },
          ],
          userCouponId: userCoupon.id,
          pointsUsed: 0,
        })
        .expect(201);

      const orderId = orderResponse.body.data.id;

      // 3. 支付订单
      await request(app.getHttpServer())
        .post(`/client/order/${orderId}/pay`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          payType: 'WECHAT',
        })
        .expect(200);

      // 4. 等待异步佣金计算完成
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 5. 验证：不应该有佣金记录
      const commissions = await prisma.finCommission.findMany({
        where: { orderId },
      });

      expect(commissions).toHaveLength(0);
    });
  });

  describe('场景4: 混合订单', () => {
    it('应该仅对正常商品计算佣金', async () => {
      // 创建订单（包含正常商品和兑换商品）
      const orderResponse = await request(app.getHttpServer())
        .post('/client/order/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              skuId: 'test_sku_001', // 正常商品
              quantity: 1,
            },
            {
              skuId: 'test_sku_exchange', // 兑换商品
              quantity: 1,
            },
          ],
          pointsUsed: 0,
        })
        .expect(201);

      const orderId = orderResponse.body.data.id;

      // 支付订单
      await request(app.getHttpServer())
        .post(`/client/order/${orderId}/pay`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          payType: 'WECHAT',
        })
        .expect(200);

      // 等待异步佣金计算完成
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 验证佣金记录
      const commissions = await prisma.finCommission.findMany({
        where: { orderId },
        orderBy: { level: 'asc' },
      });

      expect(commissions).toHaveLength(2);

      // 分佣基数应该只包含正常商品（100元）
      expect(commissions[0].commissionBase.toNumber()).toBe(100);
      expect(commissions[0].amount.toNumber()).toBe(10);
      expect(commissions[1].amount.toNumber()).toBe(5);
    });
  });

  describe('场景5: 基于实付金额分佣', () => {
    it('应该基于实付金额计算佣金', async () => {
      // 1. 修改分销配置为基于实付
      await prisma.sysDistConfig.update({
        where: { tenantId: testTenantId },
        data: {
          commissionBaseType: 'ACTUAL_PAID',
        },
      });

      // 2. 发放优惠券
      const couponResponse = await request(app.getHttpServer())
        .post('/client/marketing/coupon/claim/test_coupon_template_001')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const userCouponId = couponResponse.body.data.id;

      // 3. 创建订单
      const orderResponse = await request(app.getHttpServer())
        .post('/client/order/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              skuId: 'test_sku_001',
              quantity: 1,
            },
          ],
          userCouponId,
          pointsUsed: 0,
        })
        .expect(201);

      const orderId = orderResponse.body.data.id;

      // 4. 支付订单
      await request(app.getHttpServer())
        .post(`/client/order/${orderId}/pay`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          payType: 'WECHAT',
        })
        .expect(200);

      // 5. 等待异步佣金计算完成
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 6. 验证佣金记录
      const commissions = await prisma.finCommission.findMany({
        where: { orderId },
        orderBy: { level: 'asc' },
      });

      expect(commissions).toHaveLength(2);

      // 分佣基数 = 100 × (80/100) = 80元
      expect(commissions[0].commissionBase.toNumber()).toBeCloseTo(80, 2);
      expect(commissions[0].commissionBaseType).toBe('ACTUAL_PAID');
      expect(commissions[0].amount.toNumber()).toBeCloseTo(8, 2); // 80 × 10%
      expect(commissions[1].amount.toNumber()).toBeCloseTo(4, 2); // 80 × 5%

      // 恢复配置
      await prisma.sysDistConfig.update({
        where: { tenantId: testTenantId },
        data: {
          commissionBaseType: 'ORIGINAL_PRICE',
        },
      });
    });
  });
});
