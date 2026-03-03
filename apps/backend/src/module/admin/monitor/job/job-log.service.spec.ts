// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { JobLogService } from './job-log.service';
import { createPrismaMock, PrismaMock } from 'src/test-utils/prisma-mock';
import { ExportTable } from 'src/common/utils/export';
import { Result } from 'src/common/response';

jest.mock('src/common/utils/export', () => ({
  ExportTable: jest.fn(),
}));

describe('JobLogService', () => {
  let prisma: PrismaMock;
  let service: JobLogService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    service = new JobLogService(prisma);
  });

  // ─── R-RESP-JOB-01 (日志): 查询日志列表 ───
  describe('list', () => {
    it('Given 有日志数据, When list, Then 返回 rows+total 分页结构', async () => {
      const mockLogs = [{ jobLogId: 1, jobName: 'demo', createTime: new Date() }];
      prisma.$transaction.mockResolvedValue([mockLogs, 1]);

      const result = await service.list({ skip: 0, take: 10 } as any);

      // FormatDateFields 会将 Date 转为格式化字符串
      expect(result.data.total).toBe(1);
      expect(result.data.rows).toHaveLength(1);
      expect(result.data.rows[0].jobLogId).toBe(1);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('Given 带筛选条件, When list, Then 构建正确的 where', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.list({
        jobName: '测试',
        jobGroup: 'SYSTEM',
        status: '0',
        skip: 0,
        take: 10,
      } as any);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('Given 带日期范围, When list, Then 使用 getDateRange 构建条件', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      const mockGetDateRange = jest.fn().mockReturnValue({
        createTime: { gte: new Date('2026-01-01'), lte: new Date('2026-01-31') },
      });

      await service.list({
        skip: 0,
        take: 10,
        getDateRange: mockGetDateRange,
      } as any);

      expect(mockGetDateRange).toHaveBeenCalledWith('createTime');
    });

    it('Given 无筛选条件, When list, Then 返回空列表', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      const result = await service.list({ skip: 0, take: 10 } as any);

      expect(result.data).toEqual({ rows: [], total: 0 });
    });
  });

  // ─── R-LOG-JOB-01: 添加任务日志 ───
  describe('addJobLog', () => {
    it('Given 日志数据, When addJobLog, Then 创建日志记录', async () => {
      await service.addJobLog({
        jobName: 'demo',
        jobGroup: 'DEFAULT',
        invokeTarget: 'task.noParams',
        status: 'NORMAL' as any,
        jobMessage: '执行成功，耗时 10ms',
        createTime: new Date(),
      });

      expect(prisma.sysJobLog.create).toHaveBeenCalled();
    });
  });

  // ─── clean: 清空日志 ───
  describe('clean', () => {
    it('Given 有日志数据, When clean, Then 删除所有日志', async () => {
      const result = await service.clean();

      expect(result.code).toBe(200);
      expect(prisma.sysJobLog.deleteMany).toHaveBeenCalled();
    });
  });

  // ─── export: 导出日志 ───
  describe('export', () => {
    it('Given 日志列表, When export, Then 调用 ExportTable', async () => {
      jest.spyOn(service, 'list').mockResolvedValue(
        Result.ok({ rows: [], total: 0 }),
      );

      await service.export({} as any, { pageNum: 1, pageSize: 10 } as any);

      expect(ExportTable).toHaveBeenCalled();
    });
  });
});
