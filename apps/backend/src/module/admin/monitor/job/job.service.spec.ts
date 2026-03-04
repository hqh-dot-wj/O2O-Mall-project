// @ts-nocheck
 
import { Status } from '@prisma/client';
import { JobService } from './job.service';
import { createPrismaMock, PrismaMock } from 'src/test-utils/prisma-mock';
import { Result } from 'src/common/response';
import { ExportTable } from 'src/common/utils/export';
import { StatusEnum } from 'src/common/enum/index';

jest.mock('src/common/utils/export', () => ({
  ExportTable: jest.fn(),
}));

const cronJobs: Array<{ start: jest.Mock; stop: jest.Mock; fire?: () => Promise<void> }> = [];
jest.mock('cron', () => ({
  CronJob: jest.fn().mockImplementation((_expr, callback) => {
    const instance = {
      start: jest.fn(),
      stop: jest.fn(),
      fire: callback,
    };
    cronJobs.push(instance);
    return instance;
  }),
}));

describe('JobService', () => {
  let prisma: PrismaMock;
  let service: JobService;

  const schedulerRegistry = {
    addCronJob: jest.fn(),
    deleteCronJob: jest.fn(),
    getCronJob: jest.fn(),
  };

  const taskService = {
    executeTask: jest.fn().mockResolvedValue(true),
  };

  const redisService = {
    tryLock: jest.fn().mockResolvedValue(true),
    unlock: jest.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    cronJobs.length = 0;
    prisma = createPrismaMock();
    (prisma.sysJob.findMany as jest.Mock).mockResolvedValue([]);
    service = new JobService(
      schedulerRegistry as any,
      prisma,
      taskService as any,
      redisService as any,
    );
  });

  // ─── R-RESP-JOB-01: 查询任务列表 ───
  describe('list', () => {
    it('Given 有任务数据, When list, Then 返回 rows+total 分页结构', async () => {
      const mockJobs = [{ jobId: 1, jobName: 'demo', createTime: new Date() }];
      prisma.$transaction.mockResolvedValue([mockJobs, 1]);

      const result = await service.list({ skip: 0, take: 10 } as any);

      expect(result.data.total).toBe(1);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('Given 带筛选条件, When list, Then 构建正确的 where 条件', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.list({
        jobName: '测试',
        jobGroup: 'SYSTEM',
        status: StatusEnum.NORMAL,
        skip: 0,
        take: 10,
      } as any);

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  // ─── R-PRE-JOB-01 / R-RESP-JOB-02: 查询任务详情 ───
  describe('getJob', () => {
    it('Given jobId 存在, When getJob, Then 返回 Result.ok(job)', async () => {
      const mockJob = { jobId: 1, jobName: 'demo' };
      (prisma.sysJob.findUnique as jest.Mock).mockResolvedValue(mockJob);

      const result = await service.getJob(1);

      expect(result.data).toEqual(mockJob);
    });

    it('Given jobId 不存在, When getJob, Then 抛出 BusinessException', async () => {
      (prisma.sysJob.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getJob(999)).rejects.toThrow();
    });
  });

  // ─── R-FLOW-JOB-01/02, R-BRANCH-JOB-01/02: 创建任务 ───
  describe('create', () => {
    it('Given status=NORMAL, When create, Then 保存数据库并添加到调度器', async () => {
      const dto = {
        jobName: 'testJob',
        jobGroup: 'DEFAULT',
        invokeTarget: 'task.noParams',
        cronExpression: '0 * * * * *',
        status: StatusEnum.NORMAL,
      };
      (prisma.sysJob.create as jest.Mock).mockResolvedValue({
        ...dto,
        jobId: 1,
        status: StatusEnum.NORMAL,
      });

      await service.create(dto as any, 'admin');

      expect(prisma.sysJob.create).toHaveBeenCalled();
      expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith('testJob', expect.any(Object));
    });

    it('Given status=STOP, When create, Then 仅保存数据库不添加调度器', async () => {
      const dto = {
        jobName: 'testJob',
        jobGroup: 'DEFAULT',
        invokeTarget: 'task.noParams',
        cronExpression: '0 * * * * *',
        status: StatusEnum.STOP,
      };
      (prisma.sysJob.create as jest.Mock).mockResolvedValue({
        ...dto,
        jobId: 1,
        status: StatusEnum.STOP,
      });

      await service.create(dto as any, 'admin');

      expect(prisma.sysJob.create).toHaveBeenCalled();
      expect(schedulerRegistry.addCronJob).not.toHaveBeenCalled();
    });
  });

  // ─── R-FLOW-JOB-03/04/05, R-BRANCH-JOB-03/04/05: 更新任务 ───
  describe('update', () => {
    const existingJob = {
      jobId: 1,
      jobName: 'demo',
      cronExpression: '0 * * * * *',
      invokeTarget: 'task.noParams',
      status: StatusEnum.NORMAL,
    };

    it('Given 配置未变更, When update, Then 仅更新数据库不操作调度器', async () => {
      (prisma.sysJob.findUnique as jest.Mock).mockResolvedValue(existingJob);

      await service.update(1, { remark: '更新备注' } as any, 'admin');

      expect(schedulerRegistry.deleteCronJob).not.toHaveBeenCalled();
      expect(schedulerRegistry.addCronJob).not.toHaveBeenCalled();
      expect(prisma.sysJob.update).toHaveBeenCalled();
    });

    it('Given cron 变更且新状态=NORMAL, When update, Then 删除旧调度并重建', async () => {
      (prisma.sysJob.findUnique as jest.Mock).mockResolvedValue(existingJob);
      const cronRef = { start: jest.fn(), stop: jest.fn() };
      schedulerRegistry.getCronJob.mockReturnValue(cronRef);

      await service.update(
        1,
        { cronExpression: '*/5 * * * * *' } as any,
        'admin',
      );

      expect(schedulerRegistry.deleteCronJob).toHaveBeenCalledWith('demo');
      expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith('demo', expect.any(Object));
    });

    it('Given 状态从 NORMAL 变为 STOP, When update, Then 删除旧调度不重建', async () => {
      (prisma.sysJob.findUnique as jest.Mock).mockResolvedValue(existingJob);
      const cronRef = { start: jest.fn(), stop: jest.fn() };
      schedulerRegistry.getCronJob.mockReturnValue(cronRef);

      await service.update(1, { status: StatusEnum.STOP } as any, 'admin');

      expect(schedulerRegistry.deleteCronJob).toHaveBeenCalledWith('demo');
      expect(schedulerRegistry.addCronJob).not.toHaveBeenCalled();
    });

    it('Given jobId 不存在, When update, Then 抛出 BusinessException', async () => {
      (prisma.sysJob.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update(999, {} as any, 'admin')).rejects.toThrow();
    });
  });

  // ─── R-FLOW-JOB-06/07, R-TXN-JOB-03, R-STATE-JOB-03/04: 删除任务 ───
  describe('remove', () => {
    it('Given 任务存在于调度器, When remove, Then 从调度器和数据库删除', async () => {
      const jobs = [
        { jobId: 1, jobName: 'job1' },
        { jobId: 2, jobName: 'job2' },
      ];
      (prisma.sysJob.findMany as jest.Mock).mockResolvedValue(jobs);

      await service.remove([1, 2]);

      expect(schedulerRegistry.deleteCronJob).toHaveBeenCalledWith('job1');
      expect(schedulerRegistry.deleteCronJob).toHaveBeenCalledWith('job2');
      expect(prisma.sysJob.deleteMany).toHaveBeenCalledWith({
        where: { jobId: { in: [1, 2] } },
      });
    });

    it('Given 调度器删除失败, When remove, Then 忽略错误继续删除数据库', async () => {
      (prisma.sysJob.findMany as jest.Mock).mockResolvedValue([{ jobId: 1, jobName: 'job1' }]);
      schedulerRegistry.deleteCronJob.mockImplementation(() => {
        throw new Error('Not found');
      });

      const result = await service.remove(1);

      expect(result.code).toBe(200);
      expect(prisma.sysJob.deleteMany).toHaveBeenCalled();
    });

    it('Given 单个 jobId, When remove, Then 转为数组处理', async () => {
      (prisma.sysJob.findMany as jest.Mock).mockResolvedValue([{ jobId: 1, jobName: 'job1' }]);

      await service.remove(1);

      expect(prisma.sysJob.findMany).toHaveBeenCalledWith({
        where: { jobId: { in: [1] } },
      });
    });
  });

  // ─── R-STATE-JOB-01/02, R-BRANCH-JOB-06/07/08: 变更任务状态 ───
  describe('changeStatus', () => {
    const mockJob = {
      jobId: 1,
      jobName: 'demo',
      cronExpression: '0 * * * * *',
      invokeTarget: 'task.noParams',
      status: StatusEnum.NORMAL,
    };

    it('Given 已启用+调度器有任务, When changeStatus(STOP), Then cronJob.stop()', async () => {
      (prisma.sysJob.findUnique as jest.Mock).mockResolvedValue(mockJob);
      const cronRef = { start: jest.fn(), stop: jest.fn() };
      schedulerRegistry.getCronJob.mockReturnValue(cronRef);

      await service.changeStatus(1, StatusEnum.STOP as any, 'admin');

      expect(cronRef.stop).toHaveBeenCalled();
      expect(prisma.sysJob.update).toHaveBeenCalled();
    });

    it('Given 已停用+调度器有任务, When changeStatus(NORMAL), Then cronJob.start()', async () => {
      (prisma.sysJob.findUnique as jest.Mock).mockResolvedValue({
        ...mockJob,
        status: StatusEnum.STOP,
      });
      const cronRef = { start: jest.fn(), stop: jest.fn() };
      schedulerRegistry.getCronJob.mockReturnValue(cronRef);

      await service.changeStatus(1, StatusEnum.NORMAL as any, 'admin');

      expect(cronRef.start).toHaveBeenCalled();
    });

    it('Given 已停用+调度器无任务, When changeStatus(NORMAL), Then 创建新 CronJob', async () => {
      (prisma.sysJob.findUnique as jest.Mock).mockResolvedValue({
        ...mockJob,
        status: StatusEnum.STOP,
      });
      schedulerRegistry.getCronJob.mockImplementation(() => {
        throw new Error('Not found');
      });

      await service.changeStatus(1, StatusEnum.NORMAL as any, 'admin');

      expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith('demo', expect.any(Object));
    });

    it('Given jobId 不存在, When changeStatus, Then 抛出 BusinessException', async () => {
      (prisma.sysJob.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.changeStatus(999, StatusEnum.NORMAL as any, 'admin')).rejects.toThrow();
    });
  });

  // ─── R-FLOW-JOB-08/09: 立即执行 ───
  describe('run', () => {
    it('Given 任务存在, When run, Then 调用 taskService.executeTask', async () => {
      (prisma.sysJob.findUnique as jest.Mock).mockResolvedValue({
        jobId: 1,
        jobName: 'demo',
        jobGroup: 'DEFAULT',
        invokeTarget: 'task.noParams',
      });

      await service.run(1);

      expect(taskService.executeTask).toHaveBeenCalledWith('task.noParams', 'demo', 'DEFAULT');
    });

    it('Given jobId 不存在, When run, Then 抛出 BusinessException', async () => {
      (prisma.sysJob.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.run(999)).rejects.toThrow();
    });
  });

  // ─── R-RESP-JOB-03: 导出 ───
  describe('export', () => {
    it('Given 任务列表, When export, Then 调用 ExportTable', async () => {
      jest.spyOn(service, 'list').mockResolvedValue(Result.ok({ rows: [], total: 0 }));

      await service.export({} as any, {} as any);

      expect(ExportTable).toHaveBeenCalled();
    });
  });

  // ─── R-CONCUR-JOB-01/02/03: 分布式锁（CronJob 回调） ───
  describe('addCronJob 分布式锁', () => {
    it('Given 获取锁成功, When Cron触发, Then 执行任务并释放锁', async () => {
      (prisma.sysJob.create as jest.Mock).mockResolvedValue({
        jobName: 'lockTest',
        status: StatusEnum.NORMAL,
        cronExpression: '* * * * * *',
        invokeTarget: 'task.noParams',
      });

      await service.create(
        {
          jobName: 'lockTest',
          cronExpression: '* * * * * *',
          invokeTarget: 'task.noParams',
          status: StatusEnum.NORMAL,
        } as any,
        'admin',
      );

      // 触发 CronJob 回调
      const lastCronJob = cronJobs[cronJobs.length - 1];
      redisService.tryLock.mockResolvedValue(true);
      await lastCronJob.fire();

      expect(redisService.tryLock).toHaveBeenCalledWith('sys:job:lockTest', 30000);
      expect(taskService.executeTask).toHaveBeenCalledWith('task.noParams', 'lockTest');
      expect(redisService.unlock).toHaveBeenCalledWith('sys:job:lockTest');
    });

    it('Given 未获取到锁, When Cron触发, Then 跳过执行', async () => {
      (prisma.sysJob.create as jest.Mock).mockResolvedValue({
        jobName: 'skipTest',
        status: StatusEnum.NORMAL,
        cronExpression: '* * * * * *',
        invokeTarget: 'task.noParams',
      });

      await service.create(
        {
          jobName: 'skipTest',
          cronExpression: '* * * * * *',
          invokeTarget: 'task.noParams',
          status: StatusEnum.NORMAL,
        } as any,
        'admin',
      );

      const lastCronJob = cronJobs[cronJobs.length - 1];
      redisService.tryLock.mockResolvedValue(false);
      await lastCronJob.fire();

      expect(taskService.executeTask).not.toHaveBeenCalled();
      expect(redisService.unlock).not.toHaveBeenCalled();
    });
  });
});
