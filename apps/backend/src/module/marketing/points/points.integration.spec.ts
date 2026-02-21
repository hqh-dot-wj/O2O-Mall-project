import { Test, TestingModule } from '@nestjs/testing';
import { PointsTransactionType } from '@prisma/client';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { PrismaService } from 'src/prisma/prisma.service';
import { PointsAccountService } from './account/account.service';
import { PointsAccountRepository } from './account/account.repository';
import { PointsTransactionRepository } from './account/transaction.repository';
import { PointsRuleService } from './rule/rule.service';
import { PointsRuleRepository } from './rule/rule.repository';
import { PointsTaskService } from './task/task.service';
import { PointsTaskRepository } from './task/task.repository';
import { UserTaskCompletionRepository } from './task/completion.repository';
import { ClsService } from 'nestjs-cls';

/**
 * 积分模块集成测试
 * 验证：账户服务 + 规则服务 + 任务服务 协作流程（使用 Mock 仓储）
 */
describe('Points Module Integration', () => {
  let accountService: PointsAccountService;
  let ruleService: PointsRuleService;
  let taskService: PointsTaskService;

  const tenantId = '00000';
  const memberId = 'member-int-001';

  const mockAccountRepo = {
    findByMemberId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateWithOptimisticLock: jest.fn(),
    findPage: jest.fn(),
  };

  const mockTransactionRepo = {
    create: jest.fn(),
    findUserTransactions: jest.fn(),
    getExpiringPoints: jest.fn(),
    findTransactionsAdmin: jest.fn(),
  };

  const mockRuleRepo = {
    findByTenantId: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  };

  const mockTaskRepo = {
    findByTaskKey: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findPage: jest.fn(),
  };

  const mockCompletionRepo = {
    create: jest.fn(),
    countUserCompletions: jest.fn(),
    findUserCompletions: jest.fn(),
  };

  const mockPrisma = { umsMember: { findMany: jest.fn().mockResolvedValue([]) } };
  const mockCls = { get: jest.fn().mockReturnValue('system') };

  beforeEach(async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue(tenantId);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsAccountService,
        PointsRuleService,
        PointsTaskService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ClsService, useValue: mockCls },
        { provide: PointsAccountRepository, useValue: mockAccountRepo },
        { provide: PointsTransactionRepository, useValue: mockTransactionRepo },
        { provide: PointsRuleRepository, useValue: mockRuleRepo },
        { provide: PointsTaskRepository, useValue: mockTaskRepo },
        { provide: UserTaskCompletionRepository, useValue: mockCompletionRepo },
      ],
    }).compile();

    accountService = module.get<PointsAccountService>(PointsAccountService);
    ruleService = module.get<PointsRuleService>(PointsRuleService);
    taskService = module.get<PointsTaskService>(PointsTaskService);

    jest.clearAllMocks();
    mockTransactionRepo.getExpiringPoints.mockResolvedValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(accountService).toBeDefined();
    expect(ruleService).toBeDefined();
    expect(taskService).toBeDefined();
  });

  it('流程：创建账户 -> 增加积分 -> 查询余额', async () => {
    mockAccountRepo.findByMemberId.mockResolvedValue(null);
    const newAccount = {
      id: 'acc1',
      memberId,
      availablePoints: 0,
      totalPoints: 0,
      version: 0,
    };
    mockAccountRepo.create.mockResolvedValue(newAccount);

    const createResult = await accountService.getOrCreateAccount(memberId);
    expect(createResult.data).toBeDefined();

    const account = { ...newAccount, availablePoints: 0 };
    mockAccountRepo.findByMemberId.mockResolvedValue(account);
    mockAccountRepo.update.mockResolvedValue(undefined);
    mockTransactionRepo.create.mockResolvedValue({
      id: 'tx1',
      amount: 100,
      balanceAfter: 100,
    });

    const addResult = await accountService.addPoints({
      memberId,
      amount: 100,
      type: PointsTransactionType.EARN_ADMIN,
      remark: '测试发放',
    });
    expect(addResult.data).toBeDefined();

    mockAccountRepo.findByMemberId.mockResolvedValue({
      ...account,
      availablePoints: 100,
      frozenPoints: 0,
    });
    const balanceResult = await accountService.getBalance(memberId);
    expect(balanceResult.data.availablePoints).toBe(100);
  });

  it('流程：规则计算消费积分 -> 规则计算抵扣金额', async () => {
    const { Decimal } = await import('@prisma/client/runtime/library');
    mockRuleRepo.findByTenantId.mockResolvedValue({
      orderPointsEnabled: true,
      systemEnabled: true,
      orderPointsBase: new Decimal(10),
      orderPointsRatio: new Decimal(1),
      pointsRedemptionEnabled: true,
      pointsRedemptionRatio: new Decimal(100),
      pointsRedemptionBase: new Decimal(1),
    });

    const orderPoints = await ruleService.calculateOrderPoints(new Decimal(99));
    expect(orderPoints).toBe(9);

    const discount = await ruleService.calculatePointsDiscount(200);
    expect(Number(discount)).toBe(2);
  });

  it('流程：创建任务 -> 完成任务并发放积分', async () => {
    mockTaskRepo.findByTaskKey
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'task1',
        taskKey: 'DAILY_SIGNIN',
        taskName: '每日签到',
        pointsReward: 5,
        isEnabled: true,
      });
    mockTaskRepo.create.mockResolvedValue({
      id: 'task1',
      taskKey: 'DAILY_SIGNIN',
      taskName: '每日签到',
      pointsReward: 5,
    });

    const createTaskResult = await taskService.createTask({
      taskKey: 'DAILY_SIGNIN',
      taskName: '每日签到',
      pointsReward: 5,
    } as any);
    expect(createTaskResult.data).toBeDefined();

    mockCompletionRepo.countUserCompletions.mockResolvedValue(0);
    mockTaskRepo.findById.mockResolvedValue({
      id: 'task1',
      taskKey: 'DAILY_SIGNIN',
      taskName: '每日签到',
      pointsReward: 5,
      isEnabled: true,
      isRepeatable: true,
      maxCompletions: 10,
    });
    mockAccountRepo.findByMemberId.mockResolvedValue({
      id: 'acc1',
      memberId,
      availablePoints: 0,
      version: 0,
    });
    const accountServiceAddPoints = jest.spyOn(accountService, 'addPoints').mockResolvedValue({
      code: 200,
      data: { id: 'tx1' },
      message: 'ok',
    } as any);
    mockCompletionRepo.create.mockResolvedValue({
      id: 'c1',
      completionTime: new Date(),
      pointsAwarded: 5,
    });

    const completeResult = await taskService.completeTask(memberId, 'DAILY_SIGNIN');
    expect(completeResult.data.pointsAwarded).toBe(5);
    expect(accountServiceAddPoints).toHaveBeenCalledWith(
      expect.objectContaining({ memberId, amount: 5, type: PointsTransactionType.EARN_TASK }),
    );
  });
});
