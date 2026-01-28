import { Decimal } from '@prisma/client/runtime/library';
import { CommissionStatus, OrderType, WithdrawalStatus, TransType } from '@prisma/client';

/**
 * 测试数据工厂
 * 用于生成各种测试场景的 Mock 数据
 */
export class TestDataFactory {
  /**
   * 生成测试订单
   */
  static createOrder(overrides?: Partial<any>) {
    return {
      id: 'order-' + Date.now(),
      tenantId: 'tenant1',
      memberId: 'member1',
      shareUserId: null as string | null,
      orderType: OrderType.PRODUCT,
      totalAmount: new Decimal(100),
      payAmount: new Decimal(100),
      status: 'PAID',
      items: [
        {
          skuId: 'sku1',
          totalAmount: new Decimal(100),
          quantity: 1,
          price: new Decimal(100),
        },
      ],
      createTime: new Date(),
      updateTime: new Date(),
      ...overrides,
    };
  }

  /**
   * 生成测试会员
   */
  static createMember(overrides?: Partial<any>) {
    return {
      memberId: 'member-' + Date.now(),
      tenantId: 'tenant1',
      nickname: '测试用户',
      avatar: 'https://example.com/avatar.jpg',
      mobile: '13800138000',
      parentId: null as string | null,
      indirectParentId: null as string | null,
      levelId: 0,
      createTime: new Date(),
      updateTime: new Date(),
      ...overrides,
    };
  }

  /**
   * 生成 C1 会员 (一级分销商)
   */
  static createC1Member(overrides?: Partial<any>) {
    return this.createMember({
      levelId: 1,
      parentId: 'member-c2',
      ...overrides,
    });
  }

  /**
   * 生成 C2 会员 (二级分销商)
   */
  static createC2Member(overrides?: Partial<any>) {
    return this.createMember({
      levelId: 2,
      parentId: null as string | null,
      ...overrides,
    });
  }

  /**
   * 生成分销配置
   */
  static createDistConfig(overrides?: Partial<any>) {
    return {
      tenantId: 'tenant1',
      level1Rate: new Decimal(0.1), // 10%
      level2Rate: new Decimal(0.05), // 5%
      enableLV0: true,
      enableCrossTenant: false,
      crossTenantRate: new Decimal(0.5), // 50%
      crossMaxDaily: new Decimal(1000), // 1000元
      ...overrides,
    };
  }

  /**
   * 生成跨店分销配置
   */
  static createCrossTenantDistConfig(overrides?: Partial<any>) {
    return this.createDistConfig({
      enableCrossTenant: true,
      crossTenantRate: new Decimal(0.5),
      crossMaxDaily: new Decimal(1000),
      ...overrides,
    });
  }

  /**
   * 生成 SKU 配置
   */
  static createTenantSku(overrides?: Partial<any>) {
    return {
      id: 'sku-' + Date.now(),
      tenantId: 'tenant1',
      globalSkuId: 'global-sku1',
      price: new Decimal(100),
      costPrice: new Decimal(50),
      distMode: 'RATIO',
      distRate: new Decimal(1), // 100%
      globalSku: {
        id: 'global-sku1',
        name: '测试商品',
      },
      ...overrides,
    };
  }

  /**
   * 生成佣金记录
   */
  static createCommission(overrides?: Partial<any>) {
    return {
      id: BigInt(Date.now()),
      orderId: 'order1',
      tenantId: 'tenant1',
      beneficiaryId: 'member1',
      level: 1,
      amount: new Decimal(10),
      rateSnapshot: new Decimal(10),
      status: CommissionStatus.FROZEN,
      planSettleTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      settleTime: null as Date | null,
      isCrossTenant: false,
      createTime: new Date(),
      updateTime: new Date(),
      ...overrides,
    };
  }

  /**
   * 生成 L1 佣金记录
   */
  static createL1Commission(overrides?: Partial<any>) {
    return this.createCommission({
      level: 1,
      amount: new Decimal(10),
      ...overrides,
    });
  }

  /**
   * 生成 L2 佣金记录
   */
  static createL2Commission(overrides?: Partial<any>) {
    return this.createCommission({
      level: 2,
      amount: new Decimal(5),
      ...overrides,
    });
  }

  /**
   * 生成已结算佣金记录
   */
  static createSettledCommission(overrides?: Partial<any>) {
    return this.createCommission({
      status: CommissionStatus.SETTLED,
      settleTime: new Date(),
      ...overrides,
    });
  }

  /**
   * 生成钱包
   */
  static createWallet(overrides?: Partial<any>) {
    return {
      id: 'wallet-' + Date.now(),
      memberId: 'member1',
      tenantId: 'tenant1',
      balance: new Decimal(100),
      frozen: new Decimal(0),
      totalIncome: new Decimal(100),
      version: 1,
      createTime: new Date(),
      updateTime: new Date(),
      ...overrides,
    };
  }

  /**
   * 生成空钱包
   */
  static createEmptyWallet(overrides?: Partial<any>) {
    return this.createWallet({
      balance: new Decimal(0),
      frozen: new Decimal(0),
      totalIncome: new Decimal(0),
      ...overrides,
    });
  }

  /**
   * 生成流水记录
   */
  static createTransaction(overrides?: Partial<any>) {
    return {
      id: BigInt(Date.now()),
      walletId: 'wallet1',
      tenantId: 'tenant1',
      type: TransType.COMMISSION_IN,
      amount: new Decimal(10),
      balanceAfter: new Decimal(110),
      relatedId: 'order1',
      remark: '佣金结算',
      createTime: new Date(),
      ...overrides,
    };
  }

  /**
   * 生成提现记录
   */
  static createWithdrawal(overrides?: Partial<any>) {
    return {
      id: 'withdrawal-' + Date.now(),
      tenantId: 'tenant1',
      memberId: 'member1',
      amount: new Decimal(50),
      method: 'WECHAT',
      realName: '测试用户',
      status: WithdrawalStatus.PENDING,
      auditTime: null as Date | null,
      auditBy: null as string | null,
      auditRemark: null as string | null,
      paymentNo: null as string | null,
      failReason: null as string | null,
      createTime: new Date(),
      updateTime: new Date(),
      ...overrides,
    };
  }

  /**
   * 生成待审核提现记录
   */
  static createPendingWithdrawal(overrides?: Partial<any>) {
    return this.createWithdrawal({
      status: WithdrawalStatus.PENDING,
      ...overrides,
    });
  }

  /**
   * 生成已通过提现记录
   */
  static createApprovedWithdrawal(overrides?: Partial<any>) {
    return this.createWithdrawal({
      status: WithdrawalStatus.APPROVED,
      auditTime: new Date(),
      auditBy: 'admin1',
      paymentNo: 'PAY' + Date.now(),
      ...overrides,
    });
  }

  /**
   * 生成已驳回提现记录
   */
  static createRejectedWithdrawal(overrides?: Partial<any>) {
    return this.createWithdrawal({
      status: WithdrawalStatus.REJECTED,
      auditTime: new Date(),
      auditBy: 'admin1',
      auditRemark: '余额异常',
      ...overrides,
    });
  }

  /**
   * 生成黑名单记录
   */
  static createBlacklist(overrides?: Partial<any>) {
    return {
      tenantId: 'tenant1',
      userId: 'member1',
      reason: '违规操作',
      createTime: new Date(),
      ...overrides,
    };
  }

  /**
   * 生成推荐关系链
   * 返回: [C0, C1, C2] 三级会员
   */
  static createReferralChain() {
    const c2 = this.createC2Member({
      memberId: 'member-c2',
      nickname: 'C2用户',
      parentId: null,
    });

    const c1 = this.createC1Member({
      memberId: 'member-c1',
      nickname: 'C1用户',
      parentId: 'member-c2',
      indirectParentId: null,
    });

    const c0 = this.createMember({
      memberId: 'member-c0',
      nickname: 'C0用户',
      parentId: 'member-c1',
      indirectParentId: 'member-c2',
      levelId: 0,
    });

    return { c0, c1, c2 };
  }

  /**
   * 生成跨店订单场景
   */
  static createCrossTenantScenario() {
    const order = this.createOrder({
      tenantId: 'tenant1',
      memberId: 'member1',
    });

    const beneficiary = this.createC1Member({
      memberId: 'member2',
      tenantId: 'tenant2', // 不同租户
    });

    const config = this.createCrossTenantDistConfig({
      tenantId: 'tenant1',
    });

    return { order, beneficiary, config };
  }

  /**
   * 生成自购场景
   */
  static createSelfPurchaseScenario() {
    const member = this.createC1Member({
      memberId: 'member1',
    });

    const order = this.createOrder({
      memberId: 'member1',
      shareUserId: 'member1', // 自己分享自己购买
    });

    return { member, order };
  }

  /**
   * 生成 C2 全拿场景
   */
  static createC2FullTakeScenario() {
    const c2 = this.createC2Member({
      memberId: 'member-c2',
      parentId: null, // C2 无上级
    });

    const c0 = this.createMember({
      memberId: 'member-c0',
      parentId: 'member-c2',
    });

    const order = this.createOrder({
      memberId: 'member-c0',
      shareUserId: null,
    });

    return { c2, c0, order };
  }

  /**
   * 生成批量佣金记录
   */
  static createBatchCommissions(count: number) {
    return Array.from({ length: count }, (_, i) => {
      return this.createCommission({
        id: BigInt(i + 1),
        orderId: `order-${i + 1}`,
        beneficiaryId: `member-${i + 1}`,
      });
    });
  }

  /**
   * 生成批量流水记录
   */
  static createBatchTransactions(count: number) {
    return Array.from({ length: count }, (_, i) => {
      return this.createTransaction({
        id: BigInt(i + 1),
        amount: new Decimal(Math.random() * 100),
      });
    });
  }
}
