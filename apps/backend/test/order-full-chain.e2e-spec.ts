/**
 * 用户下单全链路 E2E 测试（分佣 + 积分 + 优惠券）
 *
 * 覆盖：用户注册 → 下单（不同分佣/积分/优惠券组合）→ 支付(mockSuccess) → 断言订单、分佣、优惠券、积分
 *
 * 运行：npm run test:e2e -- order-full-chain.e2e-spec.ts
 * 依赖：DB 已执行迁移（含 oms_order_item.points_ratio/earned_points）；Redis 可用；多租户启用时需传 tenant-id header
 *
 * ---------- 各场景预期数值一览（便于对照）----------
 * 公共：商品单价 100，数量 1 → 订单原价 totalAmount = 100。
 * 分佣规则：L1 10%、L2 5%，基数类型见各场景。积分规则：10 积分 = 1 元（pointsRedemptionRatio=10, base=1）。
 * 优惠券模板：满 100 减 20（discountAmount=20, minOrderAmount=50）。
 *
 * 场景1 仅分佣：无券无积分 → 实付 100；分佣基数 100，L1 佣金 10、L2 佣金 5。
 * 场景2 分佣+券：用券减 20 → 实付 80、couponDiscount 20；分佣按原价，基数 100，L1=10、L2=5。
 * 场景3 分佣+积分：用 100 积分 → 积分抵扣 10 元，实付 90；分佣基数 100，L1=10、L2=5；积分账户扣 100、获得消费积分。
 * 场景4 分佣+券+积分：用券 20 + 50 积分(抵 5 元) → 实付 75、couponDiscount 20、pointsUsed 50、pointsDiscount 5；分佣基数 100，L1=10、L2=5。
 * 场景5 基于实付分佣：用券减 20 → 实付 80；分佣基数=实付 80，L1=8、L2=4。
 * 场景6 自购不返佣：下单人=分享人 → 无佣金记录。
 * 场景7 C2 无上级：L1 为 C2 且无上级 → 仅 1 条佣金，金额 15（L1+L2 合并）。
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { WechatService } from '../src/module/client/common/service/wechat.service';
import { RiskService } from '../src/module/risk/risk.service';
import { CommissionService } from '../src/module/finance/commission/commission.service';
import { Decimal } from '@prisma/client/runtime/library';
import { OrderStatus, PayStatus, CommissionStatus, UserCouponStatus } from '@prisma/client';

const mockWechatService = {
  code2Session: jest.fn((code: string) =>
    Promise.resolve({
      success: true,
      data: {
        openid: `o-${code}-${Date.now()}`,
        unionid: `u-${code}-${Date.now()}`,
        session_key: 'mock-session-key',
      },
    }),
  ),
  getPhoneNumber: jest.fn(() => Promise.resolve('13800000000')),
};

const mockRiskService = {
  checkOrderRisk: jest.fn().mockResolvedValue(undefined),
};

const TEST_TENANT_ID = '00000'; // VarChar(20)，测试数据统一租户
const TEST_SKU_ID = 'fchain_sku_001';
const TEST_PRODUCT_ID = 'fchain_prod_001';
const TEST_GLOBAL_SKU_ID = 'fchain_global_sku_001';
const TEST_COUPON_TEMPLATE_ID = 'fchain_coupon_tpl_001';

describe('Order Full Chain (Commission + Points + Coupon) e2e', () => {
  jest.setTimeout(30000);

  let app: INestApplication;
  let prisma: PrismaService;
  let commissionService: CommissionService;

  let l2Token: string;
  let l2Id: string;
  let l1Token: string;
  let l1Id: string;
  let buyerToken: string;
  let buyerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(WechatService)
      .useValue(mockWechatService)
      .overrideProvider(RiskService)
      .useValue(mockRiskService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    commissionService = moduleFixture.get<CommissionService>(CommissionService);

    await setupTestData();
    await registerUsers();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    await prisma.sysTenant.upsert({
      where: { tenantId: TEST_TENANT_ID },
      create: {
        tenantId: TEST_TENANT_ID,
        companyName: 'Full Chain Test Tenant',
        status: 'NORMAL',
        delFlag: 'NORMAL',
      },
      update: {},
    });

    await prisma.sysDistConfig.upsert({
      where: { tenantId: TEST_TENANT_ID },
      create: {
        tenantId: TEST_TENANT_ID,
        level1Rate: new Decimal(0.1),
        level2Rate: new Decimal(0.05),
        enableLV0: true,
        enableCrossTenant: false,
        commissionBaseType: 'ORIGINAL_PRICE',
        maxCommissionRate: new Decimal(0.5),
      },
      update: {
        commissionBaseType: 'ORIGINAL_PRICE',
        level1Rate: new Decimal(0.1),
        level2Rate: new Decimal(0.05),
      },
    });

    const category = await prisma.pmsCategory.findFirst();
    if (!category) throw new Error('No PmsCategory in DB, seed at least one.');

    const product = await prisma.pmsProduct.upsert({
      where: { productId: TEST_PRODUCT_ID },
      create: {
        productId: TEST_PRODUCT_ID,
        categoryId: category.catId,
        name: 'Full Chain Test Product',
        mainImages: [],
        detailHtml: '<p>Test</p>',
        type: 'REAL',
        specDef: {},
        publishStatus: 'ON_SHELF',
        delFlag: 'NORMAL',
      },
      update: { publishStatus: 'ON_SHELF', delFlag: 'NORMAL' },
    });

    await prisma.pmsGlobalSku.upsert({
      where: { skuId: TEST_GLOBAL_SKU_ID },
      create: {
        skuId: TEST_GLOBAL_SKU_ID,
        productId: product.productId,
        specValues: {},
        guidePrice: new Decimal(100),
        distMode: 'RATIO',
        guideRate: new Decimal(1),
      },
      update: {},
    });

    const tenantProduct = await prisma.pmsTenantProduct.upsert({
      where: { tenantId_productId: { tenantId: TEST_TENANT_ID, productId: product.productId } },
      create: {
        tenantId: TEST_TENANT_ID,
        productId: product.productId,
        status: 'ON_SHELF',
      },
      update: { status: 'ON_SHELF' },
    });

    await prisma.pmsTenantSku.upsert({
      where: { id: TEST_SKU_ID },
      create: {
        id: TEST_SKU_ID,
        tenantId: TEST_TENANT_ID,
        tenantProductId: tenantProduct.id,
        globalSkuId: TEST_GLOBAL_SKU_ID,
        price: new Decimal(100),
        stock: 999,
        isActive: true,
        distMode: 'RATIO',
        distRate: new Decimal(1),
        isExchangeProduct: false,
        pointsRatio: 100,
      },
      update: { stock: 999, isActive: true },
    });

    await prisma.mktPointsRule.upsert({
      where: { tenantId: TEST_TENANT_ID },
      create: {
        tenantId: TEST_TENANT_ID,
        orderPointsEnabled: true,
        orderPointsRatio: new Decimal(1),
        orderPointsBase: new Decimal(1),
        pointsRedemptionEnabled: true,
        pointsRedemptionRatio: new Decimal(10),
        pointsRedemptionBase: new Decimal(1),
        systemEnabled: true,
        createBy: 'test',
      },
      update: { pointsRedemptionRatio: new Decimal(10) },
    });

    await prisma.mktCouponTemplate.upsert({
      where: { id: TEST_COUPON_TEMPLATE_ID },
      create: {
        id: TEST_COUPON_TEMPLATE_ID,
        tenantId: TEST_TENANT_ID,
        name: 'Full Chain 满100减20',
        type: 'DISCOUNT',
        discountAmount: new Decimal(20),
        minOrderAmount: new Decimal(50),
        minActualPayAmount: new Decimal(10),
        applicableProducts: [],
        applicableCategories: [],
        memberLevels: [],
        validityType: 'RELATIVE',
        validDays: 30,
        totalStock: 1000,
        remainingStock: 1000,
        limitPerUser: 10,
        status: 'ACTIVE',
        createBy: 'test',
      },
      update: { remainingStock: 1000 },
    });
  }

  async function registerUsers() {
    const resL2 = await request(app.getHttpServer())
      .post('/client/auth/register')
      .send({
        loginCode: 'l2-code',
        tenantId: TEST_TENANT_ID,
        userInfo: { nickName: 'L2', avatarUrl: 'http://a.com/l2' },
      });
    expect(resL2.status).toBe(201);
    expect(resL2.body.code).toBe(200);
    l2Token = resL2.body.data.token;
    l2Id = resL2.body.data.userInfo.memberId;

    await prisma.umsMember.update({
      where: { memberId: l2Id },
      data: { levelId: 2 },
    });

    const resL1 = await request(app.getHttpServer())
      .post('/client/auth/register')
      .send({
        loginCode: 'l1-code',
        tenantId: TEST_TENANT_ID,
        referrerId: l2Id,
        userInfo: { nickName: 'L1', avatarUrl: 'http://a.com/l1' },
      });
    expect(resL1.status).toBe(201);
    l1Token = resL1.body.data.token;
    l1Id = resL1.body.data.userInfo.memberId;

    await prisma.umsMember.update({
      where: { memberId: l1Id },
      data: { levelId: 1 },
    });

    const resBuyer = await request(app.getHttpServer())
      .post('/client/auth/register')
      .send({
        loginCode: 'buyer-code',
        tenantId: TEST_TENANT_ID,
        referrerId: l1Id,
        userInfo: { nickName: 'Buyer', avatarUrl: 'http://a.com/b' },
      });
    expect(resBuyer.status).toBe(201);
    buyerToken = resBuyer.body.data.token;
    buyerId = resBuyer.body.data.userInfo.memberId;
  }

  async function cleanupTestData() {
    const memberIds = [l2Id, l1Id, buyerId].filter(Boolean);
    if (memberIds.length === 0) return;

    await prisma.finCommission.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.omsOrderItem.deleteMany({
      where: { order: { memberId: { in: memberIds } } },
    });
    await prisma.omsOrder.deleteMany({ where: { memberId: { in: memberIds } } });
    await prisma.mktCouponUsage.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.mktUserCoupon.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.mktPointsTransaction.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.mktPointsAccount.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.mktCouponTemplate.deleteMany({ where: { id: TEST_COUPON_TEMPLATE_ID } });
    await prisma.mktPointsRule.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.pmsTenantSku.deleteMany({ where: { id: TEST_SKU_ID } });
    await prisma.pmsTenantProduct.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.sysDistConfig.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.sysSocialUser.deleteMany({ where: { memberId: { in: memberIds } } });
    await prisma.umsMember.deleteMany({ where: { memberId: { in: memberIds } } });
  }

  function createOrderBody(opts: { userCouponId?: string; pointsUsed?: number }) {
    const body: Record<string, unknown> = {
      tenantId: TEST_TENANT_ID,
      items: [{ skuId: TEST_SKU_ID, quantity: 1 }],
      receiverName: 'Test',
      receiverPhone: '13800000000',
      receiverAddress: 'Test Address',
      ...(opts.userCouponId && { userCouponId: opts.userCouponId }),
      ...(opts.pointsUsed != null && opts.pointsUsed > 0 && { pointsUsed: opts.pointsUsed }),
    };
    return body;
  }

  function auth(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  function tenantHeader() {
    return { 'tenant-id': TEST_TENANT_ID };
  }

  async function createOrder(opts: { userCouponId?: string; pointsUsed?: number } = {}) {
    const res = await request(app.getHttpServer())
      .post('/client/order/create')
      .set(auth(buyerToken))
      .set(tenantHeader())
      .set('x-client-info', JSON.stringify({ ipaddr: '127.0.0.1' }))
      .send(createOrderBody(opts));
    expect([200, 201]).toContain(res.status);
    expect(res.body.code).toBe(200);
    expect(res.body.data?.orderId).toBeDefined();
    return res.body.data.orderId as string;
  }

  async function mockPay(orderId: string) {
    const res = await request(app.getHttpServer())
      .post('/client/payment/mock-success')
      .set(auth(buyerToken))
      .set(tenantHeader())
      .send({ orderId });
    expect([200, 201]).toContain(res.status);
    expect(res.body.code).toBe(200);
    const order = await prisma.omsOrder.findUnique({ where: { id: orderId } });
    if (order) {
      await commissionService.calculateCommission(orderId, order.tenantId);
    }
  }

  async function waitForCommission() {
    await new Promise((r) => setTimeout(r, 500));
  }

  describe('1. 仅分佣', () => {
    it('订单 PAID，L1/L2 佣金正确，无券无积分', async () => {
      // 预期：实付 100，L1 佣金 10、L2 佣金 5，分佣基数 100
      const orderId = await createOrder();
      await mockPay(orderId);
      await waitForCommission();

      const order = await prisma.omsOrder.findUnique({ where: { id: orderId } });
      expect(order?.status).toBe(OrderStatus.PAID);
      expect(order?.payStatus).toBe(PayStatus.PAID);
      expect(Number(order?.payAmount)).toBe(100);
      expect(order?.userCouponId).toBeNull();
      expect(order?.pointsUsed).toBe(0);

      const commissions = await prisma.finCommission.findMany({
        where: { orderId },
        orderBy: { level: 'asc' },
      });
      expect(commissions).toHaveLength(2);
      expect(commissions[0].beneficiaryId).toBe(l1Id);
      expect(commissions[0].level).toBe(1);
      expect(commissions[0].status).toBe(CommissionStatus.FROZEN);
      expect(Number(commissions[0].amount)).toBe(10);
      expect(Number(commissions[0].commissionBase)).toBe(100);
      expect(commissions[1].beneficiaryId).toBe(l2Id);
      expect(commissions[1].level).toBe(2);
      expect(Number(commissions[1].amount)).toBe(5);
    });
  });

  describe('2. 分佣 + 优惠券', () => {
    it('订单 payAmount、couponDiscount 正确，券已使用，分佣按原价', async () => {
      // 预期：券减 20 → 实付 80，分佣基数 100，L1=10、L2=5
      const template = await prisma.mktCouponTemplate.findUnique({
        where: { id: TEST_COUPON_TEMPLATE_ID },
      });
      expect(template).toBeDefined();
      const startTime = new Date();
      const endTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const userCoupon = await prisma.mktUserCoupon.create({
        data: {
          tenantId: TEST_TENANT_ID,
          memberId: buyerId,
          templateId: TEST_COUPON_TEMPLATE_ID,
          couponName: template!.name,
          couponType: template!.type,
          discountAmount: template!.discountAmount,
          minOrderAmount: template!.minOrderAmount,
          startTime,
          endTime,
          status: 'UNUSED',
          distributionType: 'MANUAL',
        },
      });
      const userCouponId = userCoupon.id;

      const orderId = await createOrder({ userCouponId });
      await mockPay(orderId);
      await waitForCommission();

      const order = await prisma.omsOrder.findUnique({ where: { id: orderId } });
      expect(order?.status).toBe(OrderStatus.PAID);
      expect(Number(order?.payAmount)).toBe(80);
      expect(Number(order?.couponDiscount)).toBe(20);
      expect(order?.userCouponId).toBe(userCouponId);

      const coupon = await prisma.mktUserCoupon.findUnique({ where: { id: userCouponId } });
      expect(coupon?.status).toBe(UserCouponStatus.USED);

      const commissions = await prisma.finCommission.findMany({
        where: { orderId },
        orderBy: { level: 'asc' },
      });
      expect(commissions).toHaveLength(2);
      expect(Number(commissions[0].commissionBase)).toBe(100);
      expect(Number(commissions[0].amount)).toBe(10);
      expect(Number(commissions[1].amount)).toBe(5);
    });
  });

  describe('3. 分佣 + 积分', () => {
    it('积分扣减与消费积分发放正确，分佣按原价', async () => {
      // 预期：用 100 积分抵 10 元，实付 90；分佣基数 100，L1=10、L2=5
      await prisma.mktPointsAccount.upsert({
        where: {
          tenantId_memberId: { tenantId: TEST_TENANT_ID, memberId: buyerId },
        },
        create: {
          tenantId: TEST_TENANT_ID,
          memberId: buyerId,
          totalPoints: 500,
          availablePoints: 500,
          frozenPoints: 0,
          usedPoints: 0,
          expiredPoints: 0,
          version: 0,
        },
        update: { availablePoints: 500, totalPoints: 500 },
      });

      const orderId = await createOrder({ pointsUsed: 100 });
      await mockPay(orderId);
      await waitForCommission();

      const order = await prisma.omsOrder.findUnique({ where: { id: orderId } });
      expect(order?.pointsUsed).toBe(100);
      expect(Number(order?.pointsDiscount)).toBe(10);
      expect(Number(order?.payAmount)).toBe(90);

      const account = await prisma.mktPointsAccount.findUnique({
        where: { tenantId_memberId: { tenantId: TEST_TENANT_ID, memberId: buyerId } },
      });
      expect(account).toBeDefined();
      expect(account!.usedPoints).toBeGreaterThanOrEqual(100);

      const commissions = await prisma.finCommission.findMany({
        where: { orderId },
        orderBy: { level: 'asc' },
      });
      expect(commissions).toHaveLength(2);
      expect(Number(commissions[0].commissionBase)).toBe(100);
      expect(Number(commissions[0].amount)).toBe(10);
      expect(Number(commissions[1].amount)).toBe(5);
    });
  });

  describe('4. 分佣 + 券 + 积分', () => {
    it('最终实付、用券、扣积分、获得积分、分佣均正确', async () => {
      // 预期：券减 20 + 50 积分抵 5 元 → 实付 75，分佣基数 100，L1=10、L2=5
      const template = await prisma.mktCouponTemplate.findUnique({
        where: { id: TEST_COUPON_TEMPLATE_ID },
      });
      expect(template).toBeDefined();
      const startTime = new Date();
      const endTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const userCoupon = await prisma.mktUserCoupon.create({
        data: {
          tenantId: TEST_TENANT_ID,
          memberId: buyerId,
          templateId: TEST_COUPON_TEMPLATE_ID,
          couponName: template!.name,
          couponType: template!.type,
          discountAmount: template!.discountAmount,
          minOrderAmount: template!.minOrderAmount,
          startTime,
          endTime,
          status: 'UNUSED',
          distributionType: 'MANUAL',
        },
      });
      const userCouponId = userCoupon.id;

      await prisma.mktPointsAccount.upsert({
        where: {
          tenantId_memberId: { tenantId: TEST_TENANT_ID, memberId: buyerId },
        },
        create: {
          tenantId: TEST_TENANT_ID,
          memberId: buyerId,
          totalPoints: 500,
          availablePoints: 500,
          frozenPoints: 0,
          usedPoints: 0,
          expiredPoints: 0,
          version: 0,
        },
        update: { availablePoints: 500, totalPoints: 500 },
      });

      const orderId = await createOrder({ userCouponId, pointsUsed: 50 });
      await mockPay(orderId);
      await waitForCommission();

      const order = await prisma.omsOrder.findUnique({ where: { id: orderId } });
      expect(order?.status).toBe(OrderStatus.PAID);
      expect(Number(order?.couponDiscount)).toBe(20);
      expect(order?.pointsUsed).toBe(50);
      expect(Number(order?.pointsDiscount)).toBe(5);
      expect(Number(order?.payAmount)).toBe(75);

      const coupon = await prisma.mktUserCoupon.findUnique({ where: { id: userCouponId } });
      expect(coupon?.status).toBe(UserCouponStatus.USED);

      const commissions = await prisma.finCommission.findMany({
        where: { orderId },
        orderBy: { level: 'asc' },
      });
      expect(commissions).toHaveLength(2);
      expect(Number(commissions[0].commissionBase)).toBe(100);
      expect(Number(commissions[0].amount)).toBe(10);
      expect(Number(commissions[1].amount)).toBe(5);
    });
  });

  describe('5. 基于实付分佣', () => {
    it('ACTUAL_PAID 时分佣基数按实付比例', async () => {
      // 预期：用券实付 80，分佣基数=80，L1=8、L2=4
      await prisma.sysDistConfig.update({
        where: { tenantId: TEST_TENANT_ID },
        data: { commissionBaseType: 'ACTUAL_PAID' },
      });

      const template = await prisma.mktCouponTemplate.findUnique({
        where: { id: TEST_COUPON_TEMPLATE_ID },
      });
      expect(template).toBeDefined();
      const startTime = new Date();
      const endTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const userCoupon = await prisma.mktUserCoupon.create({
        data: {
          tenantId: TEST_TENANT_ID,
          memberId: buyerId,
          templateId: TEST_COUPON_TEMPLATE_ID,
          couponName: template!.name,
          couponType: template!.type,
          discountAmount: template!.discountAmount,
          minOrderAmount: template!.minOrderAmount,
          startTime,
          endTime,
          status: 'UNUSED',
          distributionType: 'MANUAL',
        },
      });
      const userCouponId = userCoupon.id;

      const orderId = await createOrder({ userCouponId });
      await mockPay(orderId);
      await waitForCommission();

      const commissions = await prisma.finCommission.findMany({
        where: { orderId },
        orderBy: { level: 'asc' },
      });
      expect(commissions).toHaveLength(2);
      expect(commissions[0].commissionBaseType).toBe('ACTUAL_PAID');
      expect(Number(commissions[0].commissionBase)).toBeCloseTo(80, 1);
      expect(Number(commissions[0].amount)).toBeCloseTo(8, 1);
      expect(Number(commissions[1].amount)).toBeCloseTo(4, 1);

      await prisma.sysDistConfig.update({
        where: { tenantId: TEST_TENANT_ID },
        data: { commissionBaseType: 'ORIGINAL_PRICE' },
      });
    });
  });

  describe('6. 自购不返佣', () => {
    it('下单人即分享人时无 FinCommission', async () => {
      // 预期：实付 100，佣金 0 条
      const orderId = await createOrder();
      await prisma.omsOrder.update({
        where: { id: orderId },
        data: { shareUserId: buyerId },
      });
      await mockPay(orderId);
      await waitForCommission();

      const commissions = await prisma.finCommission.findMany({ where: { orderId } });
      expect(commissions).toHaveLength(0);
    });
  });

  describe('7. C2 无上级时 L1 拿满 L1+L2', () => {
    it('L1 为 C2 且无上级时仅一条佣金且金额为 L1+L2', async () => {
      // 预期：实付 100，仅 1 条佣金，金额 15（L1+L2 合并）
      const resL1Only = await request(app.getHttpServer())
        .post('/client/auth/register')
        .send({
          loginCode: 'c2-no-superior',
          tenantId: TEST_TENANT_ID,
          userInfo: { nickName: 'C2Only', avatarUrl: 'http://a.com/c2' },
        });
      expect(resL1Only.status).toBe(201);
      const c2OnlyId = resL1Only.body.data.userInfo.memberId;
      await prisma.umsMember.update({
        where: { memberId: c2OnlyId },
        data: { levelId: 2 },
      });

      const resChild = await request(app.getHttpServer())
        .post('/client/auth/register')
        .send({
          loginCode: 'child-of-c2',
          tenantId: TEST_TENANT_ID,
          referrerId: c2OnlyId,
          userInfo: { nickName: 'Child', avatarUrl: 'http://a.com/child' },
        });
      expect(resChild.status).toBe(201);
      const childToken = resChild.body.data.token;

      const createRes = await request(app.getHttpServer())
        .post('/client/order/create')
        .set(auth(childToken))
        .set(tenantHeader())
        .set('x-client-info', JSON.stringify({ ipaddr: '127.0.0.1' }))
        .send(createOrderBody({}));
      expect([200, 201]).toContain(createRes.status);
      expect(createRes.body.code).toBe(200);
      const orderId = createRes.body.data.orderId;
      const payRes = await request(app.getHttpServer())
        .post('/client/payment/mock-success')
        .set(auth(childToken))
        .set(tenantHeader())
        .send({ orderId });
      expect([200, 201]).toContain(payRes.status);
      expect(payRes.body.code).toBe(200);
      await waitForCommission();

      const commissions = await prisma.finCommission.findMany({
        where: { orderId },
        orderBy: { level: 'asc' },
      });
      expect(commissions).toHaveLength(1);
      expect(commissions[0].beneficiaryId).toBe(c2OnlyId);
      expect(commissions[0].level).toBe(1);
      expect(Number(commissions[0].amount)).toBe(15);

      await prisma.finCommission.deleteMany({ where: { orderId } });
      await prisma.omsOrderItem.deleteMany({ where: { orderId } });
      await prisma.omsOrder.deleteMany({ where: { id: orderId } });
      const childId = resChild.body.data.userInfo.memberId;
      await prisma.sysSocialUser.deleteMany({
        where: { memberId: { in: [c2OnlyId, childId] } },
      });
      await prisma.umsMember.deleteMany({
        where: { memberId: { in: [c2OnlyId, childId] } },
      });
    });
  });
});
