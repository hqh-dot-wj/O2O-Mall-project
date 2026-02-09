import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { OrderIntegrationService } from '../../src/module/marketing/integration/integration.service';
import { CouponTemplateService } from '../../src/module/marketing/coupon/template/template.service';
import { CouponDistributionService } from '../../src/module/marketing/coupon/distribution/distribution.service';
import { PointsAccountService } from '../../src/module/marketing/points/account/account.service';
import { CouponType, PointsTransactionType } from '@prisma/client';

/**
 * 订单集成测试
 * 
 * @description 测试优惠券和积分在订单中的联合使用
 */
describe('订单集成测试', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let integrationService: OrderIntegrationService;
  let templateService: CouponTemplateService;
  let distributionService: CouponDistributionService;
  let accountService: PointsAccountService;

  const testTenantId = 'test-tenant-001';
  const testMemberId = 'test-member-001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      // 导入必要的模块
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    integrationService = moduleFixture.get<OrderIntegrationService>(OrderIntegrationService);
    templateService = moduleFixture.get<CouponTemplateService>(CouponTemplateService);
    distributionService = moduleFixture.get<CouponDistributionService>(CouponDistributionService);
    accountService = moduleFixture.get<PointsAccountService>(PointsAccountService);
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.mktCouponUsage.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.mktUserCoupon.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.mktCouponTemplate.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.mktPointsTransaction.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.mktPointsAccount.deleteMany({ where: { tenantId: testTenantId } });
    await app.close();
  });

  describe('场景1: 优惠券和积分同时使用', () => {
    let templateId: string;
    let userCouponId: string;
    const orderId = 'order-001';

    beforeAll(async () => {
      // 准备：创建优惠券模板
      const template = await templateService.createTemplate({
        templateName: '满100减20',
        type: CouponType.FULL_REDUCTION,
        discountAmount: 20,
        minOrderAmount: 100,
        totalStock: 100,
        perUserLimit: 1,
        validityType: 'FIXED_DAYS',
        validityDays: 30,
        isEnabled: true,
      });
      templateId = template.data.id;

      // 准备：用户领取优惠券
      const coupon = await distributionService.claimCoupon(testMemberId, templateId);
      userCouponId = coupon.data.id;

      // 准备：用户有1000积分
      await accountService.getOrCreateAccount(testMemberId);
      await accountService.addPoints({
        memberId: testMemberId,
        amount: 1000,
        type: PointsTransactionType.EARN_ADMIN,
        remark: '测试充值',
      });
    });

    it('步骤1: 计算订单优惠（优惠券+积分）', async () => {
      const result = await integrationService.calculateOrderDiscount(testMemberId, {
        items: [
          { productId: 'prod-001', price: 100, quantity: 2 }, // 200元
        ],
        userCouponId,
        pointsToUse: 500, // 使用500积分
      });

      expect(result.code).toBe(200);
      expect(result.data.originalAmount).toBe(200);
      expect(result.data.couponDiscount).toBe(20); // 优惠券减20
      expect(result.data.pointsDiscount).toBeGreaterThan(0); // 积分抵扣
      expect(result.data.finalAmount).toBeLessThan(200);
      
      // 验证计算顺序：先优惠券，后积分
      const afterCoupon = 200 - 20; // 180
      expect(result.data.pointsDiscount).toBeLessThanOrEqual(afterCoupon);
    });

    it('步骤2: 订单创建（锁定优惠券和冻结积分）', async () => {
      await integrationService.handleOrderCreated(orderId, {
        memberId: testMemberId,
        orderAmount: 200,
        userCouponId,
        pointsUsed: 500,
      });

      // 验证优惠券已锁定
      const coupon = await prisma.mktUserCoupon.findUnique({
        where: { id: userCouponId },
      });
      expect(coupon.status).toBe('LOCKED');

      // 验证积分已冻结
      const balance = await accountService.getBalance(testMemberId);
      expect(balance.data.frozenPoints).toBe(500);
      expect(balance.data.availablePoints).toBe(500);
    });

    it('步骤3: 订单支付（使用优惠券和扣减积分）', async () => {
      await integrationService.handleOrderPaid(orderId);

      // 验证优惠券已使用
      const coupon = await prisma.mktUserCoupon.findUnique({
        where: { id: userCouponId },
      });
      expect(coupon.status).toBe('USED');

      // 验证积分已扣减
      const balance = await accountService.getBalance(testMemberId);
      expect(balance.data.frozenPoints).toBe(0);
      expect(balance.data.availablePoints).toBeLessThan(1000);
    });

    it('步骤4: 验证消费积分已发放', async () => {
      const transactions = await prisma.mktPointsTransaction.findMany({
        where: {
          memberId: testMemberId,
          type: PointsTransactionType.EARN_ORDER,
        },
      });

      expect(transactions.length).toBeGreaterThan(0);
    });
  });

  describe('场景2: 订单取消流程', () => {
    let templateId: string;
    let userCouponId: string;
    const orderId = 'order-cancel-001';

    beforeAll(async () => {
      // 创建优惠券并领取
      const template = await templateService.createTemplate({
        templateName: '测试取消券',
        type: CouponType.FULL_REDUCTION,
        discountAmount: 10,
        minOrderAmount: 50,
        totalStock: 100,
        perUserLimit: 1,
        validityType: 'FIXED_DAYS',
        validityDays: 30,
        isEnabled: true,
      });
      templateId = template.data.id;

      const coupon = await distributionService.claimCoupon(testMemberId, templateId);
      userCouponId = coupon.data.id;

      // 充值积分
      await accountService.addPoints({
        memberId: testMemberId,
        amount: 300,
        type: PointsTransactionType.EARN_ADMIN,
        remark: '测试充值',
      });
    });

    it('步骤1: 创建订单（锁定资源）', async () => {
      await integrationService.handleOrderCreated(orderId, {
        memberId: testMemberId,
        orderAmount: 100,
        userCouponId,
        pointsUsed: 200,
      });

      const coupon = await prisma.mktUserCoupon.findUnique({
        where: { id: userCouponId },
      });
      expect(coupon.status).toBe('LOCKED');

      const balance = await accountService.getBalance(testMemberId);
      expect(balance.data.frozenPoints).toBe(200);
    });

    it('步骤2: 取消订单（解锁资源）', async () => {
      await integrationService.handleOrderCancelled(orderId);

      // 验证优惠券已解锁
      const coupon = await prisma.mktUserCoupon.findUnique({
        where: { id: userCouponId },
      });
      expect(coupon.status).toBe('AVAILABLE');

      // 验证积分已解冻
      const balance = await accountService.getBalance(testMemberId);
      expect(balance.data.frozenPoints).toBe(0);
    });

    it('步骤3: 验证可以再次使用', async () => {
      // 可以再次创建订单
      const result = await integrationService.calculateOrderDiscount(testMemberId, {
        items: [{ productId: 'prod-001', price: 100, quantity: 1 }],
        userCouponId,
        pointsToUse: 200,
      });

      expect(result.code).toBe(200);
    });
  });

  describe('场景3: 订单退款流程', () => {
    let templateId: string;
    let userCouponId: string;
    const orderId = 'order-refund-001';

    beforeAll(async () => {
      // 创建优惠券并领取
      const template = await templateService.createTemplate({
        templateName: '测试退款券',
        type: CouponType.FULL_REDUCTION,
        discountAmount: 15,
        minOrderAmount: 80,
        totalStock: 100,
        perUserLimit: 1,
        validityType: 'FIXED_DAYS',
        validityDays: 30,
        isEnabled: true,
      });
      templateId = template.data.id;

      const coupon = await distributionService.claimCoupon(testMemberId, templateId);
      userCouponId = coupon.data.id;

      // 充值积分
      await accountService.addPoints({
        memberId: testMemberId,
        amount: 400,
        type: PointsTransactionType.EARN_ADMIN,
        remark: '测试充值',
      });
    });

    it('步骤1: 完成订单支付', async () => {
      // 创建订单
      await integrationService.handleOrderCreated(orderId, {
        memberId: testMemberId,
        orderAmount: 150,
        userCouponId,
        pointsUsed: 300,
      });

      // 支付订单
      await integrationService.handleOrderPaid(orderId);

      const coupon = await prisma.mktUserCoupon.findUnique({
        where: { id: userCouponId },
      });
      expect(coupon.status).toBe('USED');
    });

    it('步骤2: 订单退款', async () => {
      const balanceBefore = await accountService.getBalance(testMemberId);
      const pointsBefore = balanceBefore.data.availablePoints;

      await integrationService.handleOrderRefunded(orderId);

      // 验证优惠券已返还
      const coupon = await prisma.mktUserCoupon.findUnique({
        where: { id: userCouponId },
      });
      expect(coupon.status).toBe('AVAILABLE');

      // 验证积分已返还
      const balanceAfter = await accountService.getBalance(testMemberId);
      expect(balanceAfter.data.availablePoints).toBeGreaterThan(pointsBefore);
    });

    it('步骤3: 验证消费积分已扣减', async () => {
      // 查询是否有扣减消费积分的记录
      const transactions = await prisma.mktPointsTransaction.findMany({
        where: {
          memberId: testMemberId,
          relatedId: orderId,
          amount: { lt: 0 },
        },
      });

      expect(transactions.length).toBeGreaterThan(0);
    });
  });

  describe('场景4: 边界情况测试', () => {
    it('测试1: 订单金额不足优惠券门槛', async () => {
      const template = await templateService.createTemplate({
        templateName: '满200减50',
        type: CouponType.FULL_REDUCTION,
        discountAmount: 50,
        minOrderAmount: 200,
        totalStock: 100,
        perUserLimit: 1,
        validityType: 'FIXED_DAYS',
        validityDays: 30,
        isEnabled: true,
      });

      const coupon = await distributionService.claimCoupon(testMemberId, template.data.id);

      // 订单金额只有150，不满足200的门槛
      await expect(
        integrationService.calculateOrderDiscount(testMemberId, {
          items: [{ productId: 'prod-001', price: 150, quantity: 1 }],
          userCouponId: coupon.data.id,
          pointsToUse: 0,
        })
      ).rejects.toThrow('订单金额未达到使用门槛');
    });

    it('测试2: 积分不足', async () => {
      await expect(
        integrationService.calculateOrderDiscount(testMemberId, {
          items: [{ productId: 'prod-001', price: 100, quantity: 1 }],
          pointsToUse: 999999, // 超过账户余额
        })
      ).rejects.toThrow('积分余额不足');
    });

    it('测试3: 优惠后金额为0', async () => {
      const template = await templateService.createTemplate({
        templateName: '全额兑换券',
        type: CouponType.EXCHANGE,
        discountAmount: 0,
        minOrderAmount: 0,
        totalStock: 100,
        perUserLimit: 1,
        validityType: 'FIXED_DAYS',
        validityDays: 30,
        isEnabled: true,
      });

      const coupon = await distributionService.claimCoupon(testMemberId, template.data.id);

      const result = await integrationService.calculateOrderDiscount(testMemberId, {
        items: [{ productId: 'prod-001', price: 50, quantity: 1 }],
        userCouponId: coupon.data.id,
        pointsToUse: 0,
      });

      expect(result.data.finalAmount).toBe(0);
    });

    it('测试4: 积分抵扣超过最大比例', async () => {
      // 假设规则限制积分最多抵扣50%
      const result = await integrationService.calculateOrderDiscount(testMemberId, {
        items: [{ productId: 'prod-001', price: 100, quantity: 1 }],
        pointsToUse: 10000, // 尝试全额抵扣
      });

      // 验证实际抵扣金额不超过50%
      expect(result.data.pointsDiscount).toBeLessThanOrEqual(50);
    });
  });

  describe('场景5: 并发订单创建', () => {
    let templateId: string;
    let userCouponId: string;

    beforeAll(async () => {
      const template = await templateService.createTemplate({
        templateName: '并发测试券',
        type: CouponType.FULL_REDUCTION,
        discountAmount: 5,
        minOrderAmount: 30,
        totalStock: 100,
        perUserLimit: 1,
        validityType: 'FIXED_DAYS',
        validityDays: 30,
        isEnabled: true,
      });
      templateId = template.data.id;

      const coupon = await distributionService.claimCoupon(testMemberId, templateId);
      userCouponId = coupon.data.id;
    });

    it('测试: 同一优惠券不能被多个订单同时锁定', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          integrationService.handleOrderCreated(`order-concurrent-${i}`, {
            memberId: testMemberId,
            orderAmount: 50,
            userCouponId,
            pointsUsed: 0,
          }).catch(err => ({ error: err.message }))
        );
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => !r.error).length;

      // 应该只有1个成功
      expect(successCount).toBe(1);
    });
  });
});
