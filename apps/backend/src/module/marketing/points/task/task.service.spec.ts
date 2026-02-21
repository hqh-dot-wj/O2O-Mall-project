import { Test, TestingModule } from '@nestjs/testing';
import { PointsTransactionType } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { PrismaService } from 'src/prisma/prisma.service';
import { PointsAccountService } from '../account/account.service';
import { PointsTaskRepository } from './task.repository';
import { UserTaskCompletionRepository } from './completion.repository';
import { PointsTaskService } from './task.service';

describe('PointsTaskService', () => {
  let service: PointsTaskService;

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

  const mockAccountService = {
    addPoints: jest.fn(),
  };

  const mockPrisma = {};
  const mockCls = { get: jest.fn().mockReturnValue('user1') };

  beforeEach(async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('00000');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsTaskService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ClsService, useValue: mockCls },
        { provide: PointsTaskRepository, useValue: mockTaskRepo },
        { provide: UserTaskCompletionRepository, useValue: mockCompletionRepo },
        { provide: PointsAccountService, useValue: mockAccountService },
      ],
    }).compile();

    service = module.get<PointsTaskService>(PointsTaskService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTask', () => {
    it('taskKey 已存在应抛异常', async () => {
      mockTaskRepo.findByTaskKey.mockResolvedValue({ id: 't1' });

      await expect(
        service.createTask({
          taskKey: 'SIGNIN',
          taskName: '签到',
          pointsReward: 10,
        } as any),
      ).rejects.toThrow(BusinessException);
    });

    it('应成功创建任务', async () => {
      mockTaskRepo.findByTaskKey.mockResolvedValue(null);
      const created = {
        id: 't1',
        taskKey: 'SIGNIN',
        taskName: '签到',
        pointsReward: 10,
      };
      mockTaskRepo.create.mockResolvedValue(created);

      const result = await service.createTask({
        taskKey: 'SIGNIN',
        taskName: '签到',
        pointsReward: 10,
      } as any);

      expect(mockTaskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taskKey: 'SIGNIN',
          taskName: '签到',
          pointsReward: 10,
        }),
      );
      expect(result.data).toBeDefined();
    });
  });

  describe('updateTask', () => {
    it('任务不存在应抛异常', async () => {
      mockTaskRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateTask('t1', { taskName: '新名称' } as any),
      ).rejects.toThrow(BusinessException);
    });

    it('应成功更新任务', async () => {
      mockTaskRepo.findById.mockResolvedValue({ id: 't1' });
      mockTaskRepo.update.mockResolvedValue({ id: 't1', taskName: '新名称' });

      const result = await service.updateTask('t1', { taskName: '新名称' } as any);

      expect(mockTaskRepo.update).toHaveBeenCalled();
      expect(result.data).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('应返回分页任务列表', async () => {
      mockTaskRepo.findPage.mockResolvedValue({
        rows: [{ id: 't1', taskKey: 'SIGNIN' }],
        total: 1,
      });

      const result = await service.findAll({ pageNum: 1, pageSize: 10 } as any);

      expect(result.data).toBeDefined();
      expect(result.data?.total).toBe(1);
    });
  });

  describe('deleteTask', () => {
    it('任务不存在应抛异常', async () => {
      mockTaskRepo.findById.mockResolvedValue(null);

      await expect(service.deleteTask('t1')).rejects.toThrow(BusinessException);
    });

    it('应成功删除任务', async () => {
      mockTaskRepo.findById.mockResolvedValue({ id: 't1' });
      mockTaskRepo.delete.mockResolvedValue(undefined);

      const result = await service.deleteTask('t1');

      expect(mockTaskRepo.delete).toHaveBeenCalledWith('t1');
      expect(result.data).toBeNull();
    });
  });

  describe('checkTaskEligibility', () => {
    it('任务不存在应返回不合格', async () => {
      mockTaskRepo.findById.mockResolvedValue(null);

      const result = await service.checkTaskEligibility('m1', 't1');

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('不存在');
    });

    it('任务已停用应返回不合格', async () => {
      mockTaskRepo.findById.mockResolvedValue({ id: 't1', isEnabled: false });

      const result = await service.checkTaskEligibility('m1', 't1');

      expect(result.eligible).toBe(false);
    });

    it('不可重复任务且已完成应返回不合格', async () => {
      mockTaskRepo.findById.mockResolvedValue({
        id: 't1',
        isEnabled: true,
        isRepeatable: false,
        maxCompletions: null,
      });
      mockCompletionRepo.countUserCompletions.mockResolvedValue(1);

      const result = await service.checkTaskEligibility('m1', 't1');

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('不可重复');
    });

    it('达到最大完成次数应返回不合格', async () => {
      mockTaskRepo.findById.mockResolvedValue({
        id: 't1',
        isEnabled: true,
        isRepeatable: true,
        maxCompletions: 2,
      });
      mockCompletionRepo.countUserCompletions.mockResolvedValue(2);

      const result = await service.checkTaskEligibility('m1', 't1');

      expect(result.eligible).toBe(false);
    });

    it('符合条件应返回合格', async () => {
      mockTaskRepo.findById.mockResolvedValue({
        id: 't1',
        isEnabled: true,
        isRepeatable: true,
        maxCompletions: 10,
      });
      mockCompletionRepo.countUserCompletions.mockResolvedValue(0);

      const result = await service.checkTaskEligibility('m1', 't1');

      expect(result.eligible).toBe(true);
    });
  });

  describe('completeTask', () => {
    it('任务不存在应抛异常', async () => {
      mockTaskRepo.findByTaskKey.mockResolvedValue(null);

      await expect(
        service.completeTask('m1', 'SIGNIN'),
      ).rejects.toThrow(BusinessException);
    });

    it('任务已停用应抛异常', async () => {
      mockTaskRepo.findByTaskKey.mockResolvedValue({
        id: 't1',
        taskKey: 'SIGNIN',
        taskName: '签到',
        pointsReward: 10,
        isEnabled: false,
      });

      await expect(
        service.completeTask('m1', 'SIGNIN'),
      ).rejects.toThrow(BusinessException);
    });

    it('应完成任务并发放积分', async () => {
      const task = {
        id: 't1',
        taskKey: 'SIGNIN',
        taskName: '签到',
        pointsReward: 10,
        isEnabled: true,
      };
      mockTaskRepo.findByTaskKey.mockResolvedValue(task);
      mockCompletionRepo.countUserCompletions.mockResolvedValue(0);
      mockAccountService.addPoints.mockResolvedValue({
        data: { id: 'tx1' },
      });
      mockCompletionRepo.create.mockResolvedValue({
        id: 'c1',
        completionTime: new Date(),
        pointsAwarded: 10,
      });

      const result = await service.completeTask('m1', 'SIGNIN');

      expect(mockAccountService.addPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: 'm1',
          amount: 10,
          type: PointsTransactionType.EARN_TASK,
        }),
      );
      expect(mockCompletionRepo.create).toHaveBeenCalled();
      expect(result.data.pointsAwarded).toBe(10);
    });
  });

  describe('getUserCompletions', () => {
    it('应返回用户完成记录并关联任务名', async () => {
      mockCompletionRepo.findUserCompletions.mockResolvedValue({
        rows: [
          { id: 'c1', taskId: 't1', completionTime: new Date(), pointsAwarded: 10 },
        ],
        total: 1,
      });
      mockTaskRepo.findById.mockResolvedValue({ taskName: '签到' });

      const result = await service.getUserCompletions('m1', 1, 10);

      expect(result.data?.rows).toHaveLength(1);
      expect(result.data?.rows[0].taskName).toBe('签到');
    });
  });
});
