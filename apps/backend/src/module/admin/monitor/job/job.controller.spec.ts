// @ts-nocheck
 
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { Result } from 'src/common/response';
import { StatusEnum } from 'src/common/enum';

describe('JobController', () => {
  let controller: JobController;
  let mockJobService: Partial<JobService>;

  beforeEach(() => {
    mockJobService = {
      list: jest.fn(),
      getJob: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      changeStatus: jest.fn(),
      run: jest.fn(),
      export: jest.fn(),
    };
    // 直接实例化，绕过 NestJS DI（避免 OperlogInterceptor 依赖问题）
    controller = new JobController(mockJobService as JobService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('Given 查询参数, When GET /monitor/job/list, Then 委托给 jobService.list', async () => {
      const query = { pageNum: 1, pageSize: 10 };
      const expected = Result.ok({ rows: [], total: 0 });
      (mockJobService.list as jest.Mock).mockResolvedValue(expected);

      const result = await controller.list(query as any);

      expect(result).toBe(expected);
      expect(mockJobService.list).toHaveBeenCalledWith(query);
    });
  });

  describe('getInfo', () => {
    it('Given 有效 jobId, When GET /monitor/job/:jobId, Then 委托给 jobService.getJob', async () => {
      const expected = Result.ok({ jobId: 1, jobName: 'demo' });
      (mockJobService.getJob as jest.Mock).mockResolvedValue(expected);

      const result = await controller.getInfo(1);

      expect(result).toBe(expected);
      expect(mockJobService.getJob).toHaveBeenCalledWith(1);
    });
  });

  describe('add', () => {
    it('Given CreateJobDto, When POST /monitor/job, Then 委托给 jobService.create', async () => {
      const dto = { jobName: 'test', cronExpression: '* * * * * *' };
      const expected = Result.ok();
      (mockJobService.create as jest.Mock).mockResolvedValue(expected);

      const result = await controller.add(dto as any, 'admin');

      expect(result).toBe(expected);
      expect(mockJobService.create).toHaveBeenCalledWith(dto, 'admin');
    });
  });

  describe('changeStatus', () => {
    it('Given jobId+status, When PUT /monitor/job/changeStatus, Then 委托给 jobService.changeStatus', async () => {
      const expected = Result.ok();
      (mockJobService.changeStatus as jest.Mock).mockResolvedValue(expected);

      const result = await controller.changeStatus(1, '0', 'admin');

      expect(result).toBe(expected);
      expect(mockJobService.changeStatus).toHaveBeenCalledWith(1, StatusEnum.NORMAL, 'admin');
    });
  });

  describe('update', () => {
    it('Given jobId+updateDto, When PUT /monitor/job, Then 委托给 jobService.update', async () => {
      const updateDto = { jobId: 1, jobName: 'updated' };
      const expected = Result.ok();
      (mockJobService.update as jest.Mock).mockResolvedValue(expected);

      const result = await controller.update(1, updateDto as any, 'admin');

      expect(result).toBe(expected);
      expect(mockJobService.update).toHaveBeenCalledWith(1, updateDto, 'admin');
    });
  });

  describe('remove', () => {
    it('Given 逗号分隔的 jobIds, When DELETE /monitor/job/:jobIds, Then 解析为数组并委托', async () => {
      const expected = Result.ok();
      (mockJobService.remove as jest.Mock).mockResolvedValue(expected);

      const result = await controller.remove('1,2,3');

      expect(result).toBe(expected);
      expect(mockJobService.remove).toHaveBeenCalledWith([1, 2, 3]);
    });
  });

  describe('run', () => {
    it('Given jobId, When PUT /monitor/job/run, Then 委托给 jobService.run', async () => {
      const expected = Result.ok();
      (mockJobService.run as jest.Mock).mockResolvedValue(expected);

      const result = await controller.run(1);

      expect(result).toBe(expected);
      expect(mockJobService.run).toHaveBeenCalledWith(1);
    });
  });

  describe('export', () => {
    it('Given 查询条件, When POST /monitor/job/export, Then 委托给 jobService.export', async () => {
      const res = {} as any;
      const body = { jobName: 'test' };
      (mockJobService.export as jest.Mock).mockResolvedValue(undefined);

      await controller.export(res, body as any);

      expect(mockJobService.export).toHaveBeenCalledWith(res, body);
    });
  });
});
