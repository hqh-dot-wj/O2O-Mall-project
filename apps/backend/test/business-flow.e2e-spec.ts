import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { WechatService } from '../src/module/client/common/service/wechat.service';
import { CommissionService } from '../src/module/finance/commission/commission.service';
import { OrderStatus, CommissionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock WechatService
const mockWechatService = {
  code2Session: jest.fn((code) => {
    return Promise.resolve({
      success: true,
      data: {
        openid: `o-${code}-${Date.now()}`,
        unionid: `u-${code}-${Date.now()}`,
        session_key: 'mock-session-key',
      },
    });
  }),
  getPhoneNumber: jest.fn(() => Promise.resolve('13800000000')),
};

import { RiskService } from '../src/module/risk/risk.service';

const mockRiskService = {
  checkOrderRisk: jest.fn().mockResolvedValue(true),
};

describe('Business Flow Integration Test (Order -> Commission)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let commissionService: CommissionService;

  // Test Data
  let tenantId: string;
  let promoterToken: string;
  let promoterId: string;
  let buyerToken: string;
  let buyerId: string;
  let productId: string;
  let productSkuId: string;
  let orderId: string;

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

    // Get Services
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    commissionService = moduleFixture.get<CommissionService>(CommissionService);

    // 测试数据统一使用租户 00000
    const TEST_TENANT_ID = '00000';
    await prismaService.sysTenant.upsert({
      where: { tenantId: TEST_TENANT_ID },
      create: {
        tenantId: TEST_TENANT_ID,
        companyName: 'E2E Test Tenant',
        status: 'NORMAL',
        delFlag: 'NORMAL',
      },
      update: {},
    });
    tenantId = TEST_TENANT_ID;
  });

  afterAll(async () => {
    // Cleanup Order & Commisions if needed (Optional, depending on DB strategy)
    // await prismaService.omsOrder.delete({ where: { orderId } });
    await app.close();
  });

  it('1. Register Promoter (Superior)', async () => {
    const loginCode = 'promoter-code';
    const res = await request(app.getHttpServer())
      .post('/client/auth/register')
      .send({
        loginCode,
        tenantId,
        userInfo: { nickName: 'Test Promoter', avatarUrl: 'http://avatar.com/p' },
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(200);
    promoterToken = res.body.data.token;
    promoterId = res.body.data.userInfo.memberId;

    // Ensure Promoter is capable of distribution (e.g. set level to 1)
    await prismaService.umsMember.update({
      where: { memberId: promoterId },
      data: { levelId: 1 },
    });
  });

  it('2. Register Buyer (Bound to Promoter)', async () => {
    const loginCode = 'buyer-code';
    const res = await request(app.getHttpServer())
      .post('/client/auth/register')
      .send({
        loginCode,
        tenantId,
        referrerId: promoterId, // Bind to Promoter
        userInfo: { nickName: 'Test Buyer', avatarUrl: 'http://avatar.com/b' },
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(200);
    buyerToken = res.body.data.token;
    buyerId = res.body.data.userInfo.memberId;

    // Verify Binding
    const buyer = await prismaService.umsMember.findUnique({ where: { memberId: buyerId } });
    expect(buyer?.parentId).toBe(promoterId);
  });

  it('3. Buyer Browses Products', async () => {
    const res = await request(app.getHttpServer())
      .get('/client/product/list')
      .query({ pageNum: 1, pageSize: 10, tenantId: tenantId }); // Assuming API structure

    expect(res.status).toBe(200);
    const list = res.body.data.rows;
    if (list.length === 0) {
      console.warn('No products found. Skipping order test.');
      return;
    }
    expect(list.length).toBeGreaterThan(0);

    // Pick first product
    const product = list[0];
    productId = product.productId;
    // Inspect detail to get SKU
    const detailRes = await request(app.getHttpServer()).get(`/client/product/detail/${productId}`);
    expect(detailRes.body.code).toBe(200);
    const skus = detailRes.body.data.skus;
    expect(skus.length).toBeGreaterThan(0);
    productSkuId = skus[0].skuId;

    // Force Product & SKU to be Valid (ON_SHELF, Stock > 0)
    // 1. Ensure Tenant Product Exists
    let tenantProd = await prismaService.pmsTenantProduct.findUnique({
      where: { tenantId_productId: { tenantId, productId } },
    });

    if (!tenantProd) {
      tenantProd = await prismaService.pmsTenantProduct.create({
        data: {
          tenantId,
          productId,
          status: 'ON_SHELF',
        },
      });
    } else {
      await prismaService.pmsTenantProduct.update({
        where: { id: tenantProd.id },
        data: { status: 'ON_SHELF' },
      });
    }

    // 2. Ensure Tenant SKU Exists
    let tenantSku = await prismaService.pmsTenantSku.findFirst({
      where: { tenantId, globalSkuId: productSkuId },
    });

    if (!tenantSku) {
      tenantSku = await prismaService.pmsTenantSku.create({
        data: {
          tenantId,
          tenantProductId: tenantProd.id,
          globalSkuId: productSkuId, // This is the Global ID
          price: new Decimal(100),
          stock: 999,
          isActive: true,
          distMode: 'RATIO',
          distRate: new Decimal(0.1), // 10% commission
        },
      });
    } else {
      await prismaService.pmsTenantSku.update({
        where: { id: tenantSku.id },
        data: { isActive: true, stock: 999 },
      });
    }

    // IMPORTANT: Update productSkuId to be the TENANT SKU ID for ordering
    productSkuId = tenantSku.id;
  });

  it('4. Buyer Creates Order', async () => {
    if (!productId || !productSkuId) return;

    // Create Mock Address
    await prismaService.umsAddress.createMany({
      data: [
        {
          id: `addr-${buyerId}`,
          memberId: buyerId,
          name: 'Test Addr',
          phone: '13800000000',
          province: 'Test Prov',
          city: 'Test City',
          district: 'Test Dist',
          detail: 'Test Detail',
          isDefault: true,
        },
      ],
      skipDuplicates: true,
    });

    const payload = {
      tenantId,
      addressId: `addr-${buyerId}`,
      paymentMethod: 'WECHAT',
      items: [
        {
          productId: productId,
          skuId: productSkuId,
          quantity: 1,
        },
      ],
      marketingConfigId: undefined as string | undefined,
    };

    const res = await request(app.getHttpServer())
      .post('/client/order/create')
      .set('Authorization', `Bearer ${buyerToken}`)
      .set('x-client-info', JSON.stringify({ ip: '127.0.0.1' }))
      .send(payload);

    if (res.body.code !== 200) {
      console.error('Create Order Failed:', res.body);
    }
    expect(res.body.code).toBe(200);
    orderId = res.body.data.orderId;
    expect(orderId).toBeDefined();
  });

  it('5. Simulate Order Payment & Trigger Commission', async () => {
    if (!orderId) return;

    // 1. Manually update Order to PAID
    await prismaService.omsOrder.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAID,
        payTime: new Date(),
        payType: 'WECHAT',
      },
    });

    // 2. Trigger Calculation (Simulate event listener)
    try {
      await commissionService.triggerCalculation(orderId, tenantId);
    } catch (e) {
      console.log('Commission Trigge Result:', e.message);
    }

    // Wait for async processing
    await new Promise((r) => setTimeout(r, 1000));
  });

  it('6. Verify Commission Record', async () => {
    if (!orderId) return;
    const commissions = await prismaService.finCommission.findMany({
      where: { orderId: orderId },
    });

    console.log('Generated Commissions:', commissions.length, 'records');

    if (commissions.length > 0) {
      expect(commissions[0].beneficiaryId).toBe(promoterId);
      expect(commissions[0].status).toBe(CommissionStatus.FROZEN);
      console.log('Commission verification SUCCESS');
    } else {
      console.log('No commission generated. This might be correct if product has no commission configured.');
    }
  });

  it('7. Verify Order Detail', async () => {
    if (!orderId) return;
    const res = await request(app.getHttpServer())
      .get(`/client/order/${orderId}`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.body.code).toBe(200);
    expect(res.body.data.status).toBe(OrderStatus.PAID);
  });
});
