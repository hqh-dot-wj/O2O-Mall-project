// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { SettlementLogService } from './settlement-log.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { TenantContext } from 'src/common/tenant/tenant.context';

describe('SettlementLogService', () => {
  let service: SettlementLogService;

  const mockPrismaService = {
    finSettlementLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant1');
    jest.spyOn(TenantContext, 'isSuperTenant').mockReturnValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementLogService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SettlementLogService>(SettlementLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // ========== S-T8: 结算日志创建 ==========
  describe('createLog - S-T8', () => {
    it('Given 结算完成数据, When createLog, Then 创建日志并返回batchId', async () => {
      // R-FLOW-SETTLEMENT-LOG-01
      const startTime = new Date('2026-03-03T10:00:00Z');
      const endTime = new Date('2026-03-03T10:05:00Z');

      mockPrismaService.finSettlementLog.create.mockResolvedValue({
        id: BigInt(1),
        batchId: 'test-batch-id',
      });

      const result = await service.createLog({
        settledCount: 10,
        failedCount: 2,
        totalAmount: new Decimal(1000),
        startTime,
        endTime,
        triggerType: 'SCHEDULED',
        errorDetails: JSON.stringify([{ id: '1', error: 'test' }]),
      });

      expect(result).toBeDefined();
      expect(mockPrismaService.finSettlementLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant1',
          settledCount: 10,
          failedCount: 2,
          totalAmount: new Decimal(1000),
          triggerType: 'SCHEDULED',
          durationMs: 300000,
        }),
      });
    });

    it('Given 手动触发结算, When createLog, Then triggerType为MANUAL', async () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 1000);

      mockPrismaService.finSettlementLog.create.mockResolvedValue({
        id: BigInt(1),
        batchId: 'manual-batch-id',
      });

      await service.createLog({
        settledCount: 5,
        failedCount: 0,
        totalAmount: new Decimal(500),
        startTime,
        endTime,
        triggerType: 'MANUAL',
      });

      expect(mockPrismaService.finSettlementLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          triggerType: 'MANUAL',
        }),
      });
    });
  });

  // ========== S-T8: 结算日志查询 ==========
  describe('getLogList - S-T8', () => {
    it('Given 有日志数据, When getLogList, Then 返回分页列表', async () => {
      // R-FLOW-SETTLEMENT-LOG-02
      const mockLogs = [
        {
          id: BigInt(1),
          batchId: 'batch-1',
          settledCount: 10,
          failedCount: 0,
          totalAmount: new Decimal(1000),
          startTime: new Date(),
          endTime: new Date(),
          durationMs: 5000,
          triggerType: 'SCHEDULED',
          errorDetails: null,
          createTime: new Date(),
        },
      ];

      mockPrismaService.finSettlementLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.finSettlementLog.count.mockResolvedValue(1);

      const result = await service.getLogList({ pageNum: 1, pageSize: 20 });

      expect(result.data.rows.length).toBe(1);
      expect(result.data.total).toBe(1);
      expect(result.data.rows[0].triggerTypeName).toBe('定时任务');
      expect(result.data.rows[0].hasError).toBe(false);
    });

    it('Given 按triggerType筛选, When getLogList, Then 只返回匹配记录', async () => {
      mockPrismaService.finSettlementLog.findMany.mockResolvedValue([]);
      mockPrismaService.finSettlementLog.count.mockResolvedValue(0);

      await service.getLogList({ triggerType: 'MANUAL' });

      expect(mockPrismaService.finSettlementLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            triggerType: 'MANUAL',
          }),
        }),
      );
    });

    it('Given hasError=true, When getLogList, Then 只返回有失败的记录', async () => {
      mockPrismaService.finSettlementLog.findMany.mockResolvedValue([]);
      mockPrismaService.finSettlementLog.count.mockResolvedValue(0);

      await service.getLogList({ hasError: true });

      expect(mockPrismaService.finSettlementLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            failedCount: { gt: 0 },
          }),
        }),
      );
    });

    it('Given 有错误详情, When getLogList, Then 解析errorDetails', async () => {
      const errorDetails = JSON.stringify([{ commissionId: '1', error: '余额不足' }]);
      const mockLogs = [
        {
          id: BigInt(1),
          batchId: 'batch-error',
          settledCount: 8,
          failedCount: 2,
          totalAmount: new Decimal(800),
          startTime: new Date(),
          endTime: new Date(),
          durationMs: 3000,
          triggerType: 'SCHEDULED',
          errorDetails,
          createTime: new Date(),
        },
      ];

      mockPrismaService.finSettlementLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.finSettlementLog.count.mockResolvedValue(1);

      const result = await service.getLogList({});

      expect(result.data.rows[0].hasError).toBe(true);
      expect(result.data.rows[0].errorDetails).toEqual([{ commissionId: '1', error: '余额不足' }]);
    });
  });

  // ========== S-T8: 结算日志详情 ==========
  describe('getLogDetail - S-T8', () => {
    it('Given 日志存在, When getLogDetail, Then 返回详情', async () => {
      const mockLog = {
        id: BigInt(1),
        batchId: 'batch-detail',
        settledCount: 10,
        failedCount: 1,
        totalAmount: new Decimal(900),
        startTime: new Date(),
        endTime: new Date(),
        durationMs: 2000,
        triggerType: 'MANUAL',
        errorDetails: null,
        createTime: new Date(),
      };

      mockPrismaService.finSettlementLog.findUnique.mockResolvedValue(mockLog);

      const result = await service.getLogDetail('1');

      expect(result.code).toBe(200);
      expect(result.data.batchId).toBe('batch-detail');
      expect(result.data.triggerTypeName).toBe('手动触发');
    });

    it('Given 日志不存在, When getLogDetail, Then 返回404', async () => {
      mockPrismaService.finSettlementLog.findUnique.mockResolvedValue(null);

      const result = await service.getLogDetail('999');

      expect(result.code).toBe(404);
      expect(result.msg).toBe('结算日志不存在');
    });
  });

  // ========== S-T8: 结算统计概览 ==========
  describe('getSettlementOverview - S-T8', () => {
    it('Given 有结算数据, When getSettlementOverview, Then 返回统计概览', async () => {
      mockPrismaService.finSettlementLog.aggregate
        .mockResolvedValueOnce({
          _count: 100,
          _sum: {
            settledCount: 1000,
            failedCount: 50,
            totalAmount: new Decimal(100000),
          },
          _avg: { durationMs: 3000 },
        })
        .mockResolvedValueOnce({
          _count: 5,
          _sum: {
            settledCount: 50,
            failedCount: 2,
            totalAmount: new Decimal(5000),
          },
        })
        .mockResolvedValueOnce({
          _count: 30,
          _sum: {
            settledCount: 300,
            failedCount: 10,
            totalAmount: new Decimal(30000),
          },
        });

      mockPrismaService.finSettlementLog.count.mockResolvedValue(10);

      const result = await service.getSettlementOverview();

      expect(result.data.totalBatches).toBe(100);
      expect(result.data.totalSettled).toBe(1000);
      expect(result.data.totalFailed).toBe(50);
      expect(result.data.totalAmount).toBe(100000);
      expect(result.data.avgDurationMs).toBe(3000);
      expect(result.data.successRate).toBe(95.24);
      expect(result.data.errorBatches).toBe(10);
      expect(result.data.todayBatches).toBe(5);
      expect(result.data.weekBatches).toBe(30);
    });

    it('Given 无结算数据, When getSettlementOverview, Then 返回零值', async () => {
      mockPrismaService.finSettlementLog.aggregate.mockResolvedValue({
        _count: 0,
        _sum: {
          settledCount: null,
          failedCount: null,
          totalAmount: null,
        },
        _avg: { durationMs: null },
      });

      mockPrismaService.finSettlementLog.count.mockResolvedValue(0);

      const result = await service.getSettlementOverview();

      expect(result.data.totalBatches).toBe(0);
      expect(result.data.totalSettled).toBe(0);
      expect(result.data.successRate).toBe(100);
    });
  });
});
