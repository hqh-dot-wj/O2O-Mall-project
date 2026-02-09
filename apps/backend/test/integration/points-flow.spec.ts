import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PointsRuleService } from '../../src/module/marketing/points/rule/rule.service';
import { PointsAccountService } from '../../src/module/marketing/points/account/account.service';
import { PointsSigninService } from '../../src/module/marketing/points/signin/signin.service';
import { PointsTaskService } from '../../src/module/marketing/points/task/task.service';
import { PointsTransactionType } from '@prisma/client';

/**
 * 积分完整流程集成测试
 * 
 * @description 测试积分从获取到使用的完整流程
 */
describe('积分完整流程集成测试', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ruleService: PointsRuleService;
  let accountService: PointsAccountService;
  let signinService: PointsSigninService;
  let taskService: PointsTaskService;

  const testTenantId = 'test-tenant-001';
  const testMemberId = 'test-member-001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      // 导入必要的模块
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    ruleService = moduleFixture.get<PointsRuleService>(PointsRuleService);
    accountService = moduleFixture.get<PointsAccountService>(PointsAccountService);
    signinService = moduleFixture.get<PointsSigninService>(PointsSigninService);
    taskService = moduleFixture.get<PointsTaskService>(PointsTaskService);
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.mktPointsTransaction.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.mktPointsAccount.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.mktPointsTask.deleteMany({ where: { tenantId: testTenantId } });
    await app.close();
  });

  describe('场景1: 积分获取和使用流程', () => {
    it('步骤1: 创建积分账户', async () => {
      const result = await accountService.getOrCreateAccount(testMemberId);

      expect(result.code).toBe(200);
      expect(result.data.availablePoints).toBe(0);
    });

    it('步骤2: 用户签到获得积分', async () => {
      const result = await signinService.signin(testMemberId);

      expect(result.code).toBe(200);
      expect(result.data.points).toBeGreaterThan(0);
    });

    it('步骤3: 查询积分余额', async () => {
      const result = await accountService.getBalance(testMemberId);

      expect(result.code).toBe(200);
      expect(result.data.availablePoints).toBeGreaterThan(0);
    });

    it('步骤4: 消费获得积分', async () => {
      const result = await accountService.addPoints({
        memberId: testMemberId,
        amount: 100,
        type: PointsTransactionType.EARN_ORDER,
        relatedId: 'order-001',
        remark: '消费获得积分',
      });

      expect(result.code).toBe(200);
      expect(result.data.amount).toBe(100);
    });

    it('步骤5: 使用积分抵扣', async () => {
      const result = await accountService.deductPoints({
        memberId: testMemberId,
        amount: 50,
        type: PointsTransactionType.USE_ORDER,
        relatedId: 'order-002',
        remark: '积分抵扣',
      });

      expect(result.code).toBe(200);
      expect(result.data.amount).toBe(-50);
    });

    it('步骤6: 验证积分明细', async () => {
      const result = await accountService.getTransactions(testMemberId, {
        pageNum: 1,
        pageSize: 10,
      });

      expect(result.code).toBe(200);
      expect(result.data.rows.length).toBeGreaterThan(0);
    });
  });

  describe('场景2: 积分任务流程', () => {
    let taskId: string;

    it('步骤1: 创建积分任务', async () => {
      const result = await taskService.createTask({
        taskKey: 'test-task-001',
        taskName: '测试任务',
        taskDescription: '完成测试任务获得积分',
        pointsReward: 50,
        isRepeatable: false,
        isEnabled: true,
      });

      expect(result.code).toBe(200);
      taskId = result.data.id;
    });

    it('步骤2: 完成任务获得积分', async () => {
      const result = await taskService.completeTask(testMemberId, 'test-task-001');

      expect(result.code).toBe(200);
      expect(result.data.pointsAwarded).toBe(50);
    });

    it('步骤3: 验证不可重复完成', async () => {
      await expect(
        taskService.completeTask(testMemberId, 'test-task-001')
      ).rejects.toThrow('任务已完成，不可重复');
    });

    it('步骤4: 查询完成记录', async () => {
      const result = await taskService.getUserCompletions(testMemberId, 1, 10);

      expect(result.code).toBe(200);
      expect(result.data.rows.length).toBeGreaterThan(0);
    });
  });

  describe('场景3: 积分并发扣减测试', () => {
    const concurrentMemberId = 'concurrent-member-001';

    it('步骤1: 创建账户并充值1000积分', async () => {
      await accountService.getOrCreateAccount(concurrentMemberId);
      await accountService.addPoints({
        memberId: concurrentMemberId,
        amount: 1000,
        type: PointsTransactionType.EARN_ADMIN,
        remark: '测试充值',
      });
    });

    it('步骤2: 100个并发扣减请求', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          accountService.deductPoints({
            memberId: concurrentMemberId,
            amount: 10,
            type: PointsTransactionType.USE_ORDER,
            relatedId: `order-${i}`,
            remark: `并发扣减-${i}`,
          }).catch(err => ({ error: err.message }))
        );
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.code === 200).length;

      // 应该正好100次成功（1000积分 / 10积分 = 100次）
      expect(successCount).toBe(100);
    });

    it('步骤3: 验证余额正确', async () => {
      const result = await accountService.getBalance(concurrentMemberId);

      expect(result.data.availablePoints).toBe(0);
    });

    it('步骤4: 验证交易记录数量', async () => {
      const transactions = await prisma.mktPointsTransaction.findMany({
        where: {
          memberId: concurrentMemberId,
          type: PointsTransactionType.USE_ORDER,
        },
      });

      expect(transactions.length).toBe(100);
    });
  });

  describe('场景4: 积分冻结和解冻', () => {
    const freezeMemberId = 'freeze-member-001';

    it('步骤1: 创建账户并充值', async () => {
      await accountService.getOrCreateAccount(freezeMemberId);
      await accountService.addPoints({
        memberId: freezeMemberId,
        amount: 500,
        type: PointsTransactionType.EARN_ADMIN,
        remark: '测试充值',
      });
    });

    it('步骤2: 冻结200积分', async () => {
      const result = await accountService.freezePoints(
        freezeMemberId,
        200,
        'order-freeze-001'
      );

      expect(result.code).toBe(200);
    });

    it('步骤3: 验证余额变化', async () => {
      const result = await accountService.getBalance(freezeMemberId);

      expect(result.data.availablePoints).toBe(300);
      expect(result.data.frozenPoints).toBe(200);
    });

    it('步骤4: 解冻积分', async () => {
      const result = await accountService.unfreezePoints(
        freezeMemberId,
        200,
        'order-freeze-001'
      );

      expect(result.code).toBe(200);
    });

    it('步骤5: 验证余额恢复', async () => {
      const result = await accountService.getBalance(freezeMemberId);

      expect(result.data.availablePoints).toBe(500);
      expect(result.data.frozenPoints).toBe(0);
    });
  });
});
