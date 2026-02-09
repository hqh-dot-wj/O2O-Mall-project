import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { CouponTemplateService } from '../../src/module/marketing/coupon/template/template.service';
import { CouponDistributionService } from '../../src/module/marketing/coupon/distribution/distribution.service';
import { CouponUsageService } from '../../src/module/marketing/coupon/usage/usage.service';
import { CouponType, UserCouponStatus } from '@prisma/client';

/**
 * 优惠券完整流程集成测试
 * 
 * @description 测试优惠券从创建到使用的完整流程
 */
describe('优惠券完整流程集成测试', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let templateService: CouponTemplateService;
  let distributionService: CouponDistributionService;
  let usageService: CouponUsageService;

  const testTenantId = 'test-tenant-001';
  const testMemberId = 'test-member-001';
  const testOrderId = 'test-order-001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      // 导入必要的模块
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    templateService = moduleFixture.get<CouponTemplateService>(CouponTemplateService);
    distributionService = moduleFixture.get<CouponDistributionService>(CouponDistributionService);
    usageService = moduleFixture.get<CouponUsageService>(CouponUsageService);
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.mktCouponUsage.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.mktUserCoupon.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.mktCouponTemplate.deleteMany({ where: { tenantId: testTenantId } });
    await app.close();
  });

  describe('场景1: 满减券完整流程', () => {
    let templateId: string;
    let userCouponId: string;

    it('步骤1: 创建满减券模板', async () => {
      const result = await templateService.createTemplate({
        templateName: '测试满减券',
        type: CouponType.FULL_REDUCTION,
        discountAmount: 10,
        minOrderAmount: 100,
        totalStock: 100,
        perUserLimit: 1,
        validityType: 'FIXED_DAYS',
        validityDays: 30,
        isEnabled: true,
      });

      expect(result.code).toBe(200);
      expect(result.data).toHaveProperty('id');
      templateId = result.data.id;
    });

    it('步骤2: 用户领取优惠券', async () => {
      const result = await distributionService.claimCoupon(testMemberId, templateId);

      expect(result.code).toBe(200);
      expect(result.data).toHaveProperty('id');
      expect(result.data.status).toBe(UserCouponStatus.AVAILABLE);
      userCouponId = result.data.id;
    });

    it('步骤3: 验证优惠券可用', async () => {
      const result = await usageService.validateCoupon(userCouponId, {
        orderAmount: 150,
        items: [],
      });

      expect(result.code).toBe(200);
      expect(result.data.isValid).toBe(true);
    });

    it('步骤4: 计算优惠金额', async () => {
      const discount = await usageService.calculateDiscount(userCouponId, 150);

      expect(discount).toBe(10);
    });

    it('步骤5: 锁定优惠券（订单创建）', async () => {
      const result = await usageService.lockCoupon(userCouponId, testOrderId);

      expect(result.code).toBe(200);
      expect(result.data.status).toBe(UserCouponStatus.LOCKED);
    });

    it('步骤6: 使用优惠券（订单支付）', async () => {
      const result = await usageService.useCoupon(userCouponId, testOrderId, 10);

      expect(result.code).toBe(200);
      expect(result.data.status).toBe(UserCouponStatus.USED);
    });

    it('步骤7: 验证使用记录', async () => {
      const usage = await prisma.mktCouponUsage.findFirst({
        where: {
          userCouponId,
          orderId: testOrderId,
        },
      });

      expect(usage).toBeDefined();
      expect(usage.discountAmount).toBe(10);
    });
  });

  describe('场景2: 优惠券退款流程', () => {
    let templateId: string;
    let userCouponId: string;
    const refundOrderId = 'test-order-002';

    it('步骤1: 创建并领取优惠券', async () => {
      const template = await templateService.createTemplate({
        templateName: '测试退款券',
        type: CouponType.FULL_REDUCTION,
        discountAmount: 20,
        minOrderAmount: 200,
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

    it('步骤2: 使用优惠券', async () => {
      await usageService.lockCoupon(userCouponId, refundOrderId);
      await usageService.useCoupon(userCouponId, refundOrderId, 20);

      const coupon = await prisma.mktUserCoupon.findUnique({
        where: { id: userCouponId },
      });
      expect(coupon.status).toBe(UserCouponStatus.USED);
    });

    it('步骤3: 退款返还优惠券', async () => {
      const result = await usageService.refundCoupon(userCouponId, refundOrderId);

      expect(result.code).toBe(200);
      expect(result.data.status).toBe(UserCouponStatus.AVAILABLE);
    });

    it('步骤4: 验证可以再次使用', async () => {
      const result = await usageService.validateCoupon(userCouponId, {
        orderAmount: 250,
        items: [],
      });

      expect(result.code).toBe(200);
      expect(result.data.isValid).toBe(true);
    });
  });

  describe('场景3: 并发领取测试', () => {
    let templateId: string;

    it('步骤1: 创建限量优惠券', async () => {
      const result = await templateService.createTemplate({
        templateName: '限量优惠券',
        type: CouponType.FULL_REDUCTION,
        discountAmount: 5,
        minOrderAmount: 50,
        totalStock: 10, // 只有10张
        perUserLimit: 1,
        validityType: 'FIXED_DAYS',
        validityDays: 30,
        isEnabled: true,
      });
      templateId = result.data.id;
    });

    it('步骤2: 100个用户并发领取', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          distributionService.claimCoupon(`member-${i}`, templateId)
            .catch(err => ({ error: err.message }))
        );
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.code === 200).length;
      const failCount = results.filter(r => r.error).length;

      // 应该只有10个成功，90个失败
      expect(successCount).toBe(10);
      expect(failCount).toBe(90);
    });

    it('步骤3: 验证库存正确', async () => {
      const template = await prisma.mktCouponTemplate.findUnique({
        where: { id: templateId },
      });

      expect(template.remainingStock).toBe(0);
      expect(template.claimedCount).toBe(10);
    });
  });
});
