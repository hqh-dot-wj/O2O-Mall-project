// @ts-nocheck
 
import { JobLogController } from './job-log.controller';
import { JobLogService } from './job-log.service';
import { Result } from 'src/common/response';

describe('JobLogController', () => {
  let controller: JobLogController;
  let mockJobLogService: Partial<JobLogService>;

  beforeEach(() => {
    mockJobLogService = {
      list: jest.fn(),
      clean: jest.fn(),
      export: jest.fn(),
    };
    // 直接实例化，绕过 NestJS DI（避免 OperlogInterceptor 依赖问题）
    controller = new JobLogController(mockJobLogService as JobLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('Given 查询参数, When GET /monitor/jobLog/list, Then 委托给 jobLogService.list', async () => {
      const query = { pageNum: 1, pageSize: 10 };
      const expected = Result.ok({ rows: [], total: 0 });
      (mockJobLogService.list as jest.Mock).mockResolvedValue(expected);

      const result = await controller.list(query as any);

      expect(result).toBe(expected);
      expect(mockJobLogService.list).toHaveBeenCalledWith(query);
    });
  });

  describe('clean', () => {
    it('Given 有日志数据, When DELETE /monitor/jobLog/clean, Then 委托给 jobLogService.clean', async () => {
      const expected = Result.ok();
      (mockJobLogService.clean as jest.Mock).mockResolvedValue(expected);

      const result = await controller.clean();

      expect(result).toBe(expected);
      expect(mockJobLogService.clean).toHaveBeenCalledTimes(1);
    });
  });

  describe('export', () => {
    it('Given 查询条件, When POST /monitor/jobLog/export, Then 委托给 jobLogService.export', async () => {
      const res = {} as any;
      const body = { jobName: 'test' };
      (mockJobLogService.export as jest.Mock).mockResolvedValue(undefined);

      await controller.export(res, body as any);

      expect(mockJobLogService.export).toHaveBeenCalledWith(res, body);
    });
  });
});
