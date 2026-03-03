// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Status } from '@prisma/client';
import { TaskService } from './task.service';
import { createPrismaMock, PrismaMock } from 'src/test-utils/prisma-mock';
import { Result } from 'src/common/response';
import { ModuleRef } from '@nestjs/core';

describe('TaskService', () => {
  let service: TaskService;
  let prisma: PrismaMock;

  const moduleRef = {
    get: jest.fn(),
  } as unknown as ModuleRef;

  const jobLogService = {
    addJobLog: jest.fn().mockResolvedValue(Result.ok()),
  };

  const noticeService = {
    create: jest.fn(),
  };

  const versionService = {
    deletePhysicalFile: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    service = new TaskService(
      moduleRef,
      jobLogService as any,
      prisma as any,
      noticeService as any,
      versionService as any,
    );
    // 注册测试用的 mock 任务
    (service as any).taskMap.set('demoTask', jest.fn().mockResolvedValue(undefined));
    (service as any).taskMap.set('failTask', jest.fn().mockRejectedValue(new Error('任务执行出错')));
    (service as any).taskMap.set('paramTask', jest.fn().mockResolvedValue(undefined));
  });

  // ─── R-FLOW-JOB-10/11/12, R-BRANCH-JOB-09: 执行已注册任务成功 ───
  describe('executeTask - 成功路径', () => {
    it('Given 无参任务已注册, When executeTask("demoTask"), Then 返回true并记录成功日志', async () => {
      const result = await service.executeTask('demoTask', 'testJob', 'DEFAULT');

      expect(result).toBe(true);
      expect((service as any).taskMap.get('demoTask')).toHaveBeenCalled();
      expect(jobLogService.addJobLog).toHaveBeenCalledWith(
        expect.objectContaining({
          jobName: 'testJob',
          jobGroup: 'DEFAULT',
          invokeTarget: 'demoTask',
          status: Status.NORMAL,
        }),
      );
    });

    // R-FLOW-JOB-10: 解析带参数的 invokeTarget
    it('Given 有参任务, When executeTask("paramTask(1,2)"), Then 解析参数并传入', async () => {
      const result = await service.executeTask('paramTask(1,2)', 'testJob', 'DEFAULT');

      expect(result).toBe(true);
      expect((service as any).taskMap.get('paramTask')).toHaveBeenCalledWith(1, 2);
    });

    it('Given 字符串参数, When executeTask("paramTask(\'hello\')"), Then 正确解析字符串', async () => {
      const result = await service.executeTask("paramTask('hello')", 'testJob');

      expect(result).toBe(true);
      expect((service as any).taskMap.get('paramTask')).toHaveBeenCalledWith('hello');
    });
  });

  // ─── R-BRANCH-JOB-10, R-TXN-JOB-01/02: 执行失败路径 ───
  describe('executeTask - 失败路径', () => {
    // R-PRE-JOB-02: 任务方法不存在
    it('Given 任务未注册, When executeTask("missingTask"), Then 返回false并记录失败日志', async () => {
      const result = await service.executeTask('missingTask', 'testJob', 'DEFAULT');

      expect(result).toBe(false);
      expect(jobLogService.addJobLog).toHaveBeenCalledWith(
        expect.objectContaining({
          status: Status.STOP,
          invokeTarget: 'missingTask',
        }),
      );
    });

    // R-TXN-JOB-02: 任务方法抛出异常
    it('Given 任务执行抛异常, When executeTask("failTask"), Then 返回false并记录异常信息', async () => {
      const result = await service.executeTask('failTask', 'testJob', 'DEFAULT');

      expect(result).toBe(false);
      expect(jobLogService.addJobLog).toHaveBeenCalledWith(
        expect.objectContaining({
          status: Status.STOP,
          exceptionInfo: expect.stringContaining('任务执行出错'),
        }),
      );
    });

    // R-PRE-JOB-03 / R-TXN-JOB-04: invokeTarget 格式错误
    it('Given invokeTarget 格式非法, When executeTask, Then 返回false并记录失败日志', async () => {
      const result = await service.executeTask('', 'testJob');

      expect(result).toBe(false);
      expect(jobLogService.addJobLog).toHaveBeenCalledWith(
        expect.objectContaining({
          status: Status.STOP,
        }),
      );
    });
  });

  // ─── R-LOG-JOB-01/02: 日志记录 ───
  describe('executeTask - 日志记录', () => {
    // R-FLOW-JOB-13: 日志含耗时
    it('Given 任务执行完成, When executeTask, Then 日志包含耗时信息', async () => {
      await service.executeTask('demoTask', 'testJob', 'DEFAULT');

      expect(jobLogService.addJobLog).toHaveBeenCalledWith(
        expect.objectContaining({
          jobMessage: expect.stringContaining('耗时'),
          createTime: expect.any(Date),
        }),
      );
    });

    // R-LOG-JOB-02: 失败日志含 exceptionInfo
    it('Given 任务执行失败, When executeTask, Then 日志含 exceptionInfo', async () => {
      await service.executeTask('failTask', 'testJob');

      expect(jobLogService.addJobLog).toHaveBeenCalledWith(
        expect.objectContaining({
          exceptionInfo: expect.any(String),
        }),
      );
      const logArg = jobLogService.addJobLog.mock.calls[0][0];
      expect(logArg.exceptionInfo.length).toBeGreaterThan(0);
    });

    it('Given 未提供 jobName, When executeTask, Then 日志 jobName 为"未知任务"', async () => {
      await service.executeTask('demoTask');

      expect(jobLogService.addJobLog).toHaveBeenCalledWith(
        expect.objectContaining({
          jobName: '未知任务',
          jobGroup: 'DEFAULT',
        }),
      );
    });
  });

  // ─── getTasks: 获取已注册任务列表 ───
  describe('getTasks', () => {
    it('Given 有已注册任务, When getTasks, Then 返回任务名称列表', () => {
      const tasks = service.getTasks();

      expect(tasks).toContain('demoTask');
      expect(tasks).toContain('failTask');
      expect(tasks).toContain('paramTask');
    });
  });

  // ─── parseParams: 参数解析边界 ───
  describe('parseParams (private)', () => {
    it('Given 空字符串参数, When executeTask("paramTask()"), Then 不传参数', async () => {
      await service.executeTask('paramTask()', 'testJob');

      expect((service as any).taskMap.get('paramTask')).toHaveBeenCalledWith();
    });

    it('Given 布尔和数字混合参数, When executeTask, Then 正确解析类型', async () => {
      await service.executeTask('paramTask(true, 42)', 'testJob');

      expect((service as any).taskMap.get('paramTask')).toHaveBeenCalledWith(true, 42);
    });
  });
});
