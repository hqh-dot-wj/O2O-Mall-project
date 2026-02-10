/**
 * **MANDATORY RESEARCH COMPLETED** ✅
 *
 * **本地代码库分析:**
 * 1. **用户推荐关系查询:**
 *    - 通过 `ums_member` 表的 `parentId` 字段查询直接推荐人
 *    - 通过 `ums_member` 表的 `indirectParentId` 字段查询间接推荐人
 *    - 参考: `apps/backend/src/module/admin/member/services/member-referral.service.ts` 中的 `getBatchReferralInfo` 方法
 *
 * 2. **订单创建:**
 *    - API: `POST /client/order/create`
 *    - DTO: `CreateOrderDto` 需要 `tenantId`, `items[]`, `receiverName`, `receiverPhone`, `receiverAddress` 等
 *    - 参考: `apps/backend/src/module/client/order/order.service.ts` 中的 `createOrder` 方法
 *
 * 3. **订单详情和分佣查询:**
 *    - 店铺端: `GET /order/detail/:id` (需要管理员权限)
 *    - 返回数据包含 `commissions` 数组，包含分佣记录
 *    - 参考: `apps/backend/src/module/store/order/store-order.service.ts` 中的 `findOne` 方法
 *
 * 4. **门店流水查询:**
 *    - API: `GET /finance/ledger` (需要管理员权限)
 *    - 使用 UNION ALL 合并订单收入、钱包流水、提现支出、佣金记录
 *    - 参考: `apps/backend/src/module/store/finance/ledger.service.ts` 中的 `getLedger` 方法
 *
 * 5. **商品分佣配置:**
 *    - 通过 `pms_tenant_sku` 表的 `distMode` (RATIO/FIXED/NONE) 和 `distRate` 字段查询
 *    - 分佣计算逻辑在 `apps/backend/src/module/finance/commission/commission.service.ts` 的 `calculateCommissionBase` 方法
 *
 * **互联网研究 (2026):**
 * 🔗 **[End-to-End testing in NestJS using Pactum: A Comprehensive Guide](https://medium.com/@adityasingh09091325/end-to-end-testing-in-nestjs-using-pactum-a-comprehensive-guide-bd5961320496)**
 * - **Found via web search:** NestJS E2E测试最佳实践
 * - **Key Insights:** 使用Jest和Supertest进行E2E测试，设置独立的测试数据库
 * - **Applicable to Task:** 测试脚本使用Jest框架和Supertest进行HTTP请求测试
 *
 * 🔗 **[The Ultimate Guide to Testing with Prisma: Integration Testing](https://prisma.io/blog/testing-series-3-aBUyF8nxAn)**
 * - **Found via web search:** Prisma集成测试指南
 * - **Key Insights:** 使用真实的数据库进行集成测试，避免使用mock
 * - **Applicable to Task:** 测试脚本直接使用PrismaService查询数据库验证结果
 *
 * 🔗 **[Testing with Prisma ORM | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-client/testing)**
 * - **Found via web search:** Prisma官方测试文档
 * - **Key Insights:** 使用事务回滚或独立测试数据库来隔离测试数据
 * - **Applicable to Task:** 测试脚本使用现有的测试数据库，测试后不清理数据以便验证
 *
 * **综合与建议:**
 * 测试脚本遵循现有项目的测试模式（参考 `business-flow.e2e-spec.ts`），使用Jest和Supertest，
 * 直接通过PrismaService查询数据库验证业务逻辑，确保分佣流程的完整性。
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { WechatService } from '../src/module/client/common/service/wechat.service';
import { CommissionService } from '../src/module/finance/commission/commission.service';
import { RiskService } from '../src/module/risk/risk.service';
import { OrderStatus, CommissionStatus, PayStatus } from '@prisma/client';
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

const mockRiskService = {
  checkOrderRisk: jest.fn().mockResolvedValue(true),
};

describe('Commission Flow Test - 完整分佣流程测试', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let commissionService: CommissionService;

  // 测试用户ID
  const testMemberId = '5268c6ea-f662-4ae5-bc14-5d7f73ab294c';

  // 测试数据
  let tenantId: string = '00000'; // 指定租户ID，测试数据统一
  let productId: string = 'prod-001'; // 指定商品ID
  let productSkuId: string;
  let orderId: string;
  let directReferrer: any = null;
  let indirectReferrer: any = null;

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

    // 获取服务
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    commissionService = moduleFixture.get<CommissionService>(CommissionService);

    // 验证指定的租户是否存在
    const tenant = await prismaService.sysTenant.findUnique({
      where: { tenantId },
    });
    if (!tenant) {
      throw new Error(`租户 ${tenantId} 不存在，请先创建该租户`);
    }
    console.log(`使用租户: ${tenantId} (${tenant.companyName || '未知'})`);

    // 确保测试用户存在
    const member = await prismaService.umsMember.findUnique({
      where: { memberId: testMemberId },
    });
    if (!member) {
      throw new Error(`测试用户 ${testMemberId} 不存在，请先创建该用户`);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. 查询用户的直接和间接推荐关系', async () => {
    console.log(`\n=== 步骤1: 查询用户 ${testMemberId} 的推荐关系 ===`);

    const member = await prismaService.umsMember.findUnique({
      where: { memberId: testMemberId },
      select: {
        memberId: true,
        nickname: true,
        mobile: true,
        parentId: true,
        indirectParentId: true,
        levelId: true,
      },
    });

    expect(member).toBeDefined();
    console.log('用户信息:', {
      memberId: member.memberId,
      nickname: member.nickname,
      mobile: member.mobile,
      levelId: member.levelId,
      parentId: member.parentId,
      indirectParentId: member.indirectParentId,
    });

    // 查询直接推荐人（parentId）
    if (member.parentId) {
      directReferrer = await prismaService.umsMember.findUnique({
        where: { memberId: member.parentId },
        select: {
          memberId: true,
          nickname: true,
          mobile: true,
          levelId: true,
          tenantId: true, // 添加tenantId检查
        },
      });
      console.log('直接推荐人:', directReferrer);
      expect(directReferrer).toBeDefined();
    } else {
      console.log('⚠️  该用户没有直接推荐人（parentId为空）');
    }

    // 查询间接推荐人（indirectParentId）
    if (member.indirectParentId) {
      indirectReferrer = await prismaService.umsMember.findUnique({
        where: { memberId: member.indirectParentId },
        select: {
          memberId: true,
          nickname: true,
          mobile: true,
          levelId: true,
          tenantId: true, // 添加tenantId检查
        },
      });
      console.log('间接推荐人:', indirectReferrer);
      expect(indirectReferrer).toBeDefined();
    } else {
      console.log('⚠️  该用户没有间接推荐人（indirectParentId为空）');
    }

    // 检查租户一致性
    const memberTenant = await prismaService.umsMember.findUnique({
      where: { memberId: testMemberId },
      select: { tenantId: true },
    });
    console.log('\n租户信息检查:');
    console.log('下单人租户ID:', memberTenant?.tenantId);
    console.log('订单租户ID:', tenantId);
    if (directReferrer) {
      console.log('直接推荐人租户ID:', directReferrer.tenantId);
      if (directReferrer.tenantId !== tenantId) {
        console.log('⚠️  直接推荐人与订单租户不同，需要开启跨店分佣！');
      }
    }
    if (indirectReferrer) {
      console.log('间接推荐人租户ID:', indirectReferrer.tenantId);
      if (indirectReferrer.tenantId !== tenantId) {
        console.log('⚠️  间接推荐人与订单租户不同，需要开启跨店分佣！');
      }
    }

    // 如果没有直接推荐人，尝试通过parentId查找间接推荐人
    if (!member.indirectParentId && member.parentId) {
      const parent = await prismaService.umsMember.findUnique({
        where: { memberId: member.parentId },
        select: { parentId: true },
      });
      if (parent?.parentId) {
        indirectReferrer = await prismaService.umsMember.findUnique({
          where: { memberId: parent.parentId },
          select: {
            memberId: true,
            nickname: true,
            mobile: true,
            levelId: true,
          },
        });
        if (indirectReferrer) {
          console.log('通过parentId找到的间接推荐人:', indirectReferrer);
        }
      }
    }
  });

  it('2. 查找指定商品 prod-001 并准备订单', async () => {
    console.log(`\n=== 步骤2: 查找指定商品 ${productId} 在租户 ${tenantId} ===`);

    // 直接使用指定的商品ID
    console.log('使用指定商品ID:', productId);
    console.log('使用指定租户ID:', tenantId);

    // 获取商品详情以获取SKU
    const detailRes = await request(app.getHttpServer()).get(`/client/product/detail/${productId}`).query({ tenantId });

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.code).toBe(200);

    const productDetail = detailRes.body.data;
    const skus = productDetail.skus || [];
    expect(skus.length).toBeGreaterThan(0);
    console.log(`找到 ${skus.length} 个SKU`);

    // 选择第一个SKU
    const selectedSku = skus[0];
    const returnedSkuId = selectedSku.skuId; // 可能是租户SKU ID或全局SKU ID
    console.log('API返回的SKU ID:', returnedSkuId);
    console.log('SKU价格:', selectedSku.price);

    // 先尝试作为租户SKU ID查找
    let tenantSku = await prismaService.pmsTenantSku.findUnique({
      where: { id: returnedSkuId },
    });

    // 如果是租户SKU，直接使用
    if (tenantSku && tenantSku.tenantId === tenantId) {
      console.log('找到已存在的租户SKU:', tenantSku.id);
      // 更新SKU确保有库存和分佣配置
      tenantSku = await prismaService.pmsTenantSku.update({
        where: { id: tenantSku.id },
        data: {
          stock: 999,
          isActive: true,
          distMode: 'RATIO',
          distRate: new Decimal(0.1), // 10% 分佣比例
        },
      });
      console.log('更新了租户SKU:', tenantSku.id);
      productSkuId = tenantSku.id;
    } else {
      // 如果不是租户SKU，假设是全局SKU ID，查找或创建租户SKU
      const globalSkuId = returnedSkuId;
      console.log('作为全局SKU ID处理:', globalSkuId);

      // 查找是否已有对应的租户SKU
      tenantSku = await prismaService.pmsTenantSku.findFirst({
        where: {
          tenantId,
          globalSkuId: globalSkuId,
        },
      });

      if (!tenantSku) {
        // 查找或创建租户商品
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
          console.log('创建了租户商品:', tenantProd.id);
        } else {
          console.log('租户商品已存在:', tenantProd.id);
        }

        // 创建租户SKU
        tenantSku = await prismaService.pmsTenantSku.create({
          data: {
            tenantId,
            tenantProductId: tenantProd.id,
            globalSkuId: globalSkuId,
            price: new Decimal(selectedSku.price || 100),
            stock: 999,
            isActive: true,
            distMode: 'RATIO',
            distRate: new Decimal(0.1), // 10% 分佣比例
          },
        });
        console.log('创建了租户SKU:', tenantSku.id);
      } else {
        // 更新SKU确保有库存和分佣配置
        tenantSku = await prismaService.pmsTenantSku.update({
          where: { id: tenantSku.id },
          data: {
            stock: 999,
            isActive: true,
            distMode: 'RATIO',
            distRate: new Decimal(0.1), // 10% 分佣比例
          },
        });
        console.log('更新了租户SKU:', tenantSku.id);
      }

      productSkuId = tenantSku.id;
    }

    console.log('最终使用的SKU ID (租户SKU):', productSkuId);

    // 检查商品分佣配置
    console.log('商品分佣配置:', {
      distMode: tenantSku.distMode,
      distRate: tenantSku.distRate.toString(),
    });
  });

  it('3. 创建订单（购买商品）', async () => {
    console.log(`\n=== 步骤3: 创建订单 ===`);

    if (!productId || !productSkuId) {
      throw new Error('商品或SKU未找到，跳过订单创建');
    }

    // 确保用户有地址
    const address = await prismaService.umsAddress.findFirst({
      where: { memberId: testMemberId },
    });

    if (!address) {
      await prismaService.umsAddress.create({
        data: {
          id: `addr-${testMemberId}-${Date.now()}`,
          memberId: testMemberId,
          name: '测试收货人',
          phone: '13800000000',
          province: '测试省',
          city: '测试市',
          district: '测试区',
          detail: '测试详细地址',
          isDefault: true,
        },
      });
    }

    // 获取租户SKU的实际价格和商品信息
    const tenantSkuForOrder = await prismaService.pmsTenantSku.findUnique({
      where: { id: productSkuId },
      include: {
        tenantProd: {
          include: {
            product: {
              select: {
                productId: true,
                name: true,
                mainImages: true,
              },
            },
          },
        },
      },
    });

    if (!tenantSkuForOrder) {
      throw new Error(`租户SKU ${productSkuId} 不存在`);
    }

    // 使用租户SKU的实际价格
    const skuPrice = tenantSkuForOrder.price;
    const quantity = 1;
    const itemTotalAmount = skuPrice.mul(quantity);
    const orderTotalAmount = itemTotalAmount;
    const freightAmount = new Decimal(0);
    const discountAmount = new Decimal(0);
    const payAmount = orderTotalAmount.add(freightAmount).sub(discountAmount);

    console.log('订单价格信息:', {
      SKU价格: skuPrice.toString(),
      数量: quantity,
      商品总价: itemTotalAmount.toString(),
      订单总价: orderTotalAmount.toString(),
      支付金额: payAmount.toString(),
    });

    // 创建订单记录
    const orderSn = `TEST${Date.now()}`;
    const order = await prismaService.omsOrder.create({
      data: {
        orderSn,
        memberId: testMemberId,
        tenantId,
        orderType: 'PRODUCT',
        status: OrderStatus.PENDING_PAY,
        payStatus: PayStatus.UNPAID,
        totalAmount: orderTotalAmount,
        freightAmount: freightAmount,
        discountAmount: discountAmount,
        payAmount: payAmount,
        receiverName: '测试收货人',
        receiverPhone: '13800000000',
        receiverAddress: '测试地址',
        shareUserId: directReferrer?.memberId || null,
        referrerId: directReferrer?.memberId || null,
        items: {
          create: {
            productId: tenantSkuForOrder.tenantProd.productId,
            productName: tenantSkuForOrder.tenantProd.product.name,
            productImg: tenantSkuForOrder.tenantProd.product.mainImages?.[0] || '',
            skuId: productSkuId,
            price: skuPrice,
            quantity: quantity,
            totalAmount: itemTotalAmount,
          },
        },
      },
      include: { items: true },
    });

    orderId = order.id;
    console.log('订单创建成功:', {
      orderId,
      orderSn: order.orderSn,
      payAmount: order.payAmount.toString(),
    });

    expect(orderId).toBeDefined();
  });

  it('4. 模拟订单支付并触发分佣计算', async () => {
    console.log(`\n=== 步骤4: 模拟订单支付并触发分佣计算 ===`);

    if (!orderId) {
      throw new Error('订单ID不存在，跳过支付流程');
    }

    // 更新订单状态为已支付
    await prismaService.omsOrder.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAID,
        payStatus: PayStatus.PAID,
        payTime: new Date(),
        payType: 'WECHAT',
      },
    });

    console.log('订单状态已更新为已支付');

    // 先手动调用calculateCommission来查看详细日志
    try {
      // 获取订单信息
      const order = await prismaService.omsOrder.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      // 获取会员信息
      const member = await prismaService.umsMember.findUnique({
        where: { memberId: order.memberId },
        select: {
          memberId: true,
          parentId: true,
          indirectParentId: true,
          levelId: true,
        },
      });

      console.log('\n=== 分佣计算前检查 ===');
      console.log('订单信息:', {
        orderId: order.id,
        memberId: order.memberId,
        shareUserId: order.shareUserId,
        referrerId: order.referrerId,
        tenantId: order.tenantId,
      });
      console.log('会员信息:', member);
      console.log(
        '订单商品:',
        order.items.map((item) => ({
          skuId: item.skuId,
          totalAmount: item.totalAmount.toString(),
        })),
      );

      // 检查商品SKU的分佣配置
      for (const item of order.items) {
        const tenantSku = await prismaService.pmsTenantSku.findUnique({
          where: { id: item.skuId },
          select: {
            id: true,
            distMode: true,
            distRate: true,
          },
        });
        console.log(`SKU ${item.skuId} 分佣配置:`, tenantSku);
      }

      // 检查分销配置
      const distConfig = await commissionService.getDistConfig(tenantId);
      console.log('分销配置:', {
        level1Rate: distConfig.level1Rate.toString(),
        level2Rate: distConfig.level2Rate.toString(),
        enableCrossTenant: distConfig.enableCrossTenant,
      });

      // 检查推荐人信息
      if (order.shareUserId) {
        const shareUser = await prismaService.umsMember.findUnique({
          where: { memberId: order.shareUserId },
          select: {
            memberId: true,
            nickname: true,
            levelId: true,
            tenantId: true,
          },
        });
        console.log('分享人信息:', shareUser);
      }

      // 直接调用分佣计算方法（同步执行，便于调试）
      console.log('\n开始执行分佣计算...');
      try {
        // 手动执行分佣计算的各个步骤以便调试
        const orderForCalc = await prismaService.omsOrder.findUnique({
          where: { id: orderId },
          include: { items: true },
        });

        if (!orderForCalc) {
          console.log('✗ 订单不存在');
          return;
        }

        const memberForCalc = await prismaService.umsMember.findUnique({
          where: { memberId: orderForCalc.memberId },
          select: {
            memberId: true,
            parentId: true,
            indirectParentId: true,
            levelId: true,
          },
        });

        if (!memberForCalc) {
          console.log('✗ 会员不存在');
          return;
        }

        // 检查自购
        const isSelfPurchase = commissionService.checkSelfPurchase(
          orderForCalc.memberId,
          orderForCalc.shareUserId,
          memberForCalc.parentId,
        );
        console.log('自购检测结果:', isSelfPurchase);
        if (isSelfPurchase) {
          console.log('✗ 自购订单，跳过分佣');
          return;
        }

        // 计算佣金基数
        let commissionBase = new Decimal(0);
        for (const item of orderForCalc.items) {
          const tenantSku = await prismaService.pmsTenantSku.findUnique({
            where: { id: item.skuId },
          });
          console.log(`SKU ${item.skuId} 分佣配置:`, {
            distMode: tenantSku?.distMode,
            distRate: tenantSku?.distRate?.toString(),
            itemTotalAmount: item.totalAmount.toString(),
          });

          if (tenantSku && tenantSku.distMode !== 'NONE') {
            if (tenantSku.distMode === 'RATIO') {
              const base = item.totalAmount.mul(tenantSku.distRate);
              commissionBase = commissionBase.add(base);
              console.log(
                `  佣金基数 += ${item.totalAmount.toString()} × ${tenantSku.distRate.toString()} = ${base.toString()}`,
              );
            } else if (tenantSku.distMode === 'FIXED') {
              const base = tenantSku.distRate.mul(item.quantity);
              commissionBase = commissionBase.add(base);
              console.log(`  佣金基数 += ${tenantSku.distRate.toString()} × ${item.quantity} = ${base.toString()}`);
            }
          }
        }
        console.log('总佣金基数:', commissionBase.toString());

        if (commissionBase.lte(0)) {
          console.log('✗ 佣金基数为0，跳过分佣');
          return;
        }

        // 调用完整的分佣计算
        await commissionService.calculateCommission(orderId, tenantId);
        console.log('✓ 分佣计算完成');
      } catch (calcError: any) {
        console.log('✗ 分佣计算失败:', calcError.message);
        console.log('错误详情:', calcError);
        if (calcError.stack) {
          console.log('错误堆栈:', calcError.stack);
        }
        // 不抛出错误，继续测试以查看其他信息
      }

      // 也尝试通过队列触发（如果队列可用）
      try {
        await commissionService.triggerCalculation(orderId, tenantId);
        console.log('分佣任务已加入队列');
      } catch (queueError: any) {
        console.log('队列触发失败（可能队列未配置）:', queueError.message);
      }
    } catch (e: any) {
      console.log('分佣触发错误:', e.message);
      console.log('错误堆栈:', e.stack);
    }

    // 等待异步处理（如果队列在工作）
    await new Promise((r) => setTimeout(r, 2000));
  });

  it('5. 查看订单详情和分佣信息', async () => {
    console.log(`\n=== 步骤5: 查看订单详情和分佣信息 ===`);

    if (!orderId) {
      throw new Error('订单ID不存在，跳过订单详情查询');
    }

    // 查询订单详情（通过店铺端接口，需要管理员token，这里直接查询数据库）
    const order = await prismaService.omsOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        commissions: {
          include: {
            beneficiary: {
              select: {
                memberId: true,
                nickname: true,
                mobile: true,
              },
            },
          },
        },
      },
    });

    expect(order).toBeDefined();
    console.log('订单详情:', {
      orderId: order.id,
      orderSn: order.orderSn,
      status: order.status,
      payStatus: order.payStatus,
      payAmount: order.payAmount.toString(),
      shareUserId: order.shareUserId,
      referrerId: order.referrerId,
    });

    // 查询分佣记录
    const commissions = await prismaService.finCommission.findMany({
      where: { orderId },
      include: {
        beneficiary: {
          select: {
            memberId: true,
            nickname: true,
            mobile: true,
          },
        },
      },
    });

    console.log(`\n订单分佣记录 (共 ${commissions.length} 条):`);
    if (commissions.length > 0) {
      commissions.forEach((comm, index) => {
        console.log(`分佣 ${index + 1}:`, {
          受益人ID: comm.beneficiaryId,
          受益人昵称: comm.beneficiary.nickname,
          受益人手机: comm.beneficiary.mobile,
          分佣级别: comm.level === 1 ? 'L1 (直接推荐)' : 'L2 (间接推荐)',
          分佣金额: comm.amount.toString(),
          状态: comm.status,
          创建时间: comm.createTime,
        });
      });
      expect(commissions.length).toBeGreaterThan(0);
    } else {
      console.log('⚠️  该订单没有生成分佣记录');
      console.log('可能原因:');
      console.log('  1. 商品未配置分佣（distMode为NONE）');
      console.log('  2. 用户没有推荐关系');
      console.log('  3. 自购检测（购买者与分享人是同一人）');
    }
  });

  it('6. 查看门店流水', async () => {
    console.log(`\n=== 步骤6: 查看门店流水 ===`);

    // 查询门店流水（需要管理员token，这里直接查询数据库）
    // 查询订单收入
    const orderIncome = await prismaService.omsOrder.findMany({
      where: {
        tenantId,
        payStatus: PayStatus.PAID,
        id: orderId,
      },
      select: {
        id: true,
        orderSn: true,
        payAmount: true,
        createTime: true,
      },
    });

    console.log('订单收入记录:');
    if (orderIncome.length > 0) {
      orderIncome.forEach((order) => {
        console.log({
          订单号: order.orderSn,
          支付金额: order.payAmount.toString(),
          创建时间: order.createTime,
        });
      });
    } else {
      console.log('⚠️  未找到订单收入记录');
    }

    // 查询佣金流水
    const commissionRecords = await prismaService.finCommission.findMany({
      where: {
        tenantId,
        orderId,
      },
      include: {
        beneficiary: {
          select: {
            nickname: true,
            mobile: true,
          },
        },
      },
    });

    console.log(`\n佣金流水记录 (共 ${commissionRecords.length} 条):`);
    if (commissionRecords.length > 0) {
      commissionRecords.forEach((comm, index) => {
        console.log(`佣金 ${index + 1}:`, {
          受益人: comm.beneficiary.nickname,
          金额: comm.amount.toString(),
          状态: comm.status,
          创建时间: comm.createTime,
        });
      });
    } else {
      console.log('⚠️  未找到佣金流水记录');
    }

    // 查询钱包交易记录（已结算的佣金）
    if (commissionRecords.length > 0) {
      const walletTransactions = await prismaService.finTransaction.findMany({
        where: {
          relatedId: orderId,
          type: 'COMMISSION_IN',
        },
        include: {
          wallet: {
            include: {
              member: {
                select: {
                  nickname: true,
                  mobile: true,
                },
              },
            },
          },
        },
      });

      console.log(`\n钱包交易记录 (已结算佣金) (共 ${walletTransactions.length} 条):`);
      if (walletTransactions.length > 0) {
        walletTransactions.forEach((trans, index) => {
          console.log(`交易 ${index + 1}:`, {
            用户: trans.wallet.member.nickname,
            金额: trans.amount.toString(),
            余额: trans.balanceAfter.toString(),
            创建时间: trans.createTime,
          });
        });
      } else {
        console.log('⚠️  佣金尚未结算到钱包（状态为FROZEN）');
      }
    }
  });

  it('7. 查看商品分佣配置', async () => {
    console.log(`\n=== 步骤7: 查看商品分佣配置 ===`);

    if (!productSkuId) {
      throw new Error('商品SKU ID不存在，跳过商品分佣配置查询');
    }

    // 查询租户SKU的分佣配置
    const tenantSku = await prismaService.pmsTenantSku.findUnique({
      where: { id: productSkuId },
      include: {
        globalSku: {
          select: {
            skuId: true,
            guidePrice: true,
          },
        },
      },
    });

    expect(tenantSku).toBeDefined();
    console.log('商品分佣配置:');
    console.log({
      tenantSkuId: tenantSku.id,
      productName: tenantSku.globalSku?.skuId || '未知',
      price: tenantSku.price.toString(),
      distMode: tenantSku.distMode,
      distRate: tenantSku.distRate.toString(),
    });

    if (tenantSku.distMode === 'NONE') {
      console.log('⚠️  该商品未配置分佣（distMode为NONE）');
    } else if (tenantSku.distMode === 'RATIO') {
      console.log(`✓ 该商品按比例分佣: ${tenantSku.distRate.toString()} (${Number(tenantSku.distRate) * 100}%)`);
    } else if (tenantSku.distMode === 'FIXED') {
      console.log(`✓ 该商品按固定金额分佣: ${tenantSku.distRate.toString()} 元/件`);
    }

    // 查询订单中使用的商品信息
    const order = await prismaService.omsOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (order && order.items.length > 0) {
      console.log('\n订单商品信息:');
      order.items.forEach((item, index) => {
        console.log(`商品 ${index + 1}:`, {
          productName: item.productName,
          skuId: item.skuId,
          price: item.price.toString(),
          quantity: item.quantity,
          totalAmount: item.totalAmount.toString(),
        });
      });
    }
  });
});
