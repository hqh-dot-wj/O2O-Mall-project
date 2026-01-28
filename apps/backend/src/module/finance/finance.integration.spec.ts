import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommissionService } from './commission/commission.service';
import { WalletService } from './wallet/wallet.service';
import { WithdrawalService } from './withdrawal/withdrawal.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CommissionStatus, OrderType, WithdrawalStatus } from '@prisma/client';

/**
 * Finance 模块集成测试
 * 
 * 注意: 这是集成测试示例,需要真实的数据库连接
 * 运行前请确保:
 * 1. 数据库已启动
 * 2. 测试数据已准备
 * 3. 环境变量已配置
 * 
 * 当前状态: 跳过执行,需要完整的模块配置
 */
describe.skip('Finance Module Integration Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let commissionService: CommissionService;
  let walletService: WalletService;
  let withdrawalService: WithdrawalService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      // 导入完整的 FinanceModule
      // imports: [FinanceModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    commissionService = moduleFixture.get<CommissionService>(CommissionService);
    walletService = moduleFixture.get<WalletService>(WalletService);
    withdrawalService = moduleFixture.get<WithdrawalService>(WithdrawalService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('佣金计算到提现完整流程', () => {
    let testOrderId: string;
    let testMemberId: string;
    let testTenantId: string;

    beforeEach(async () => {
      // 准备测试数据
      testTenantId = 'test-tenant-' + Date.now();
      testMemberId = 'test-member-' + Date.now();
      testOrderId = 'test-order-' + Date.now();

      // 创建测试租户
      // await prismaService.sysTenant.create({ ... });

      // 创建测试会员
      // await prismaService.umsMember.create({ ... });

      // 创建测试订单
      // await prismaService.omsOrder.create({ ... });
    });

    afterEach(async () => {
      // 清理测试数据
      // await prismaService.finCommission.deleteMany({ ... });
      // await prismaService.finWallet.deleteMany({ ... });
      // await prismaService.finWithdrawal.deleteMany({ ... });
    });

    it('完整流程: 订单支付 -> 佣金计算 -> 佣金结算 -> 提现申请 -> 审核通过', async () => {
      // 1. 触发佣金计算
      await commissionService.triggerCalculation(testOrderId, testTenantId);

      // 等待异步任务完成
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 2. 验证佣金记录已创建
      const commissions = await commissionService.getCommissionsByOrder(testOrderId);
      expect(commissions.length).toBeGreaterThan(0);
      expect(commissions[0].status).toBe(CommissionStatus.FROZEN);

      // 3. 模拟订单确认收货,更新结算时间
      await commissionService.updatePlanSettleTime(testOrderId, 'CONFIRM');

      // 4. 模拟定时任务结算佣金
      // 将 planSettleTime 设置为过去时间
      await prismaService.finCommission.updateMany({
        where: { orderId: testOrderId },
        data: { planSettleTime: new Date(Date.now() - 1000) },
      });

      // 执行结算 (实际由 SettlementScheduler 执行)
      // await settlementScheduler.settleJob();

      // 5. 验证佣金已结算到钱包
      const wallet = await walletService.getWallet(commissions[0].beneficiaryId);
      expect(wallet).toBeDefined();
      expect(wallet!.balance.toNumber()).toBeGreaterThan(0);

      // 6. 申请提现
      const withdrawalAmount = 50;
      const withdrawalResult = await withdrawalService.apply(
        commissions[0].beneficiaryId,
        testTenantId,
        withdrawalAmount,
        'WECHAT',
      );

      expect(withdrawalResult.code).toBe(200);
      const withdrawalId = withdrawalResult.data.id;

      // 7. 验证余额已冻结
      const walletAfterApply = await walletService.getWallet(commissions[0].beneficiaryId);
      expect(walletAfterApply!.frozen.toNumber()).toBe(withdrawalAmount);

      // 8. 审核通过
      const auditResult = await withdrawalService.audit(
        withdrawalId,
        'APPROVE',
        'admin-test',
      );

      expect(auditResult.code).toBe(200);

      // 9. 验证提现状态
      const withdrawal = await prismaService.finWithdrawal.findUnique({
        where: { id: withdrawalId },
      });

      expect(withdrawal!.status).toBe(WithdrawalStatus.APPROVED);
      expect(withdrawal!.paymentNo).toBeDefined();

      // 10. 验证冻结余额已扣减
      const walletFinal = await walletService.getWallet(commissions[0].beneficiaryId);
      expect(walletFinal!.frozen.toNumber()).toBe(0);
    });

    it('异常流程: 订单退款 -> 佣金取消', async () => {
      // 1. 触发佣金计算
      await commissionService.triggerCalculation(testOrderId, testTenantId);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 2. 验证佣金记录已创建
      const commissions = await commissionService.getCommissionsByOrder(testOrderId);
      expect(commissions.length).toBeGreaterThan(0);

      // 3. 模拟订单退款,取消佣金
      await commissionService.cancelCommissions(testOrderId);

      // 4. 验证佣金已取消
      const cancelledCommissions = await commissionService.getCommissionsByOrder(
        testOrderId,
      );
      cancelledCommissions.forEach((comm) => {
        expect(comm.status).toBe(CommissionStatus.CANCELLED);
      });
    });

    it('异常流程: 提现申请 -> 审核驳回', async () => {
      // 1. 先给钱包充值
      await walletService.addBalance(
        testMemberId,
        new Decimal(100),
        'test-recharge',
        '测试充值',
      );

      // 2. 申请提现
      const withdrawalResult = await withdrawalService.apply(
        testMemberId,
        testTenantId,
        50,
        'WECHAT',
      );

      const withdrawalId = withdrawalResult.data.id;

      // 3. 审核驳回
      const auditResult = await withdrawalService.audit(
        withdrawalId,
        'REJECT',
        'admin-test',
        '余额异常',
      );

      expect(auditResult.code).toBe(200);

      // 4. 验证提现状态
      const withdrawal = await prismaService.finWithdrawal.findUnique({
        where: { id: withdrawalId },
      });

      expect(withdrawal!.status).toBe(WithdrawalStatus.REJECTED);
      expect(withdrawal!.auditRemark).toBe('余额异常');

      // 5. 验证余额已退回
      const wallet = await walletService.getWallet(testMemberId);
      expect(wallet!.balance.toNumber()).toBe(100);
      expect(wallet!.frozen.toNumber()).toBe(0);
    });
  });

  describe('并发场景测试', () => {
    it('并发申请提现 - 余额不足场景', async () => {
      const testMemberId = 'test-member-concurrent-' + Date.now();
      const testTenantId = 'test-tenant-' + Date.now();

      // 给钱包充值 100 元
      await walletService.addBalance(
        testMemberId,
        new Decimal(100),
        'test-recharge',
        '测试充值',
      );

      // 并发申请 3 次提现,每次 50 元
      const promises = [
        withdrawalService.apply(testMemberId, testTenantId, 50, 'WECHAT'),
        withdrawalService.apply(testMemberId, testTenantId, 50, 'WECHAT'),
        withdrawalService.apply(testMemberId, testTenantId, 50, 'WECHAT'),
      ];

      const results = await Promise.allSettled(promises);

      // 应该只有前2次成功,第3次失败(余额不足)
      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failCount = results.filter((r) => r.status === 'rejected').length;

      expect(successCount).toBe(2);
      expect(failCount).toBe(1);
    });

    it('并发佣金计算 - 跨店限额场景', async () => {
      // 测试跨店佣金日限额的并发控制
      // 需要准备多个跨店订单并发计算佣金
      // 验证限额检查是否生效
    });
  });

  describe('性能测试', () => {
    it('批量佣金结算性能', async () => {
      // 创建 1000 条待结算佣金记录
      // 执行批量结算
      // 验证结算时间和成功率
    });

    it('钱包流水查询性能', async () => {
      // 创建 10000 条流水记录
      // 执行分页查询
      // 验证查询时间
    });
  });
});
