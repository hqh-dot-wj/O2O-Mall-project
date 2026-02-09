import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { PointsTransactionType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { PointsGracefulDegradationService } from './degradation.service';

describe('PointsGracefulDegradationService', () => {
  let service: PointsGracefulDegradationService;
  let prisma: PrismaService;
  let retryQueue: any;

  const mockPrisma = {
    mktPointsGrantFailure: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsGracefulDegradationService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: getQueueToken('points-retry'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<PointsGracefulDegradationService>(
      PointsGracefulDegradationService,
    );
    prisma = module.get<PrismaService>(PrismaService);
    retryQueue = module.get(getQueueToken('points-retry'));

    // 清除所有 mock
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordFailure', () => {
    it('应该记录积分发放失败并加入重试队列', async () => {
      const failureRecord = {
        memberId: 'member-123',
        amount: 100,
        type: PointsTransactionType.EARN_ORDER,
        relatedId: 'order-123',
        remark: '消费获得',
        failureReason: '数据库连接失败',
      };

      mockPrisma.mktPointsGrantFailure.create.mockResolvedValue({
        id: 'failure-123',
        ...failureRecord,
        failureTime: new Date(),
        retryCount: 0,
        status: 'PENDING',
      });

      mockQueue.add.mockResolvedValue({});

      await service.recordFailure(failureRecord);

      // 验证数据库记录创建
      expect(mockPrisma.mktPointsGrantFailure.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          memberId: failureRecord.memberId,
          amount: failureRecord.amount,
          type: failureRecord.type,
          relatedId: failureRecord.relatedId,
          remark: failureRecord.remark,
          failureReason: failureRecord.failureReason,
          retryCount: 0,
          status: 'PENDING',
        }),
      });

      // 验证加入重试队列
      expect(mockQueue.add).toHaveBeenCalledWith(
        'retry-points-grant',
        expect.objectContaining({
          memberId: failureRecord.memberId,
          amount: failureRecord.amount,
          type: failureRecord.type,
        }),
        expect.objectContaining({
          delay: 60000, // 1分钟延迟
          attempts: 3, // 最多重试3次
        }),
      );
    });

    it('当记录失败时应该记录错误日志', async () => {
      const failureRecord = {
        memberId: 'member-123',
        amount: 100,
        type: PointsTransactionType.EARN_ORDER,
        failureReason: '测试错误',
      };

      const error = new Error('数据库错误');
      mockPrisma.mktPointsGrantFailure.create.mockRejectedValue(error);

      // 不应该抛出错误
      await expect(service.recordFailure(failureRecord)).resolves.not.toThrow();
    });
  });

  describe('updateRetryStatus', () => {
    it('重试成功时应该更新状态为COMPLETED', async () => {
      const memberId = 'member-123';
      const relatedId = 'order-123';
      const retryCount = 1;

      mockPrisma.mktPointsGrantFailure.updateMany.mockResolvedValue({
        count: 1,
      });

      await service.updateRetryStatus(
        memberId,
        relatedId,
        retryCount,
        true,
      );

      expect(mockPrisma.mktPointsGrantFailure.updateMany).toHaveBeenCalledWith({
        where: {
          memberId,
          relatedId,
          status: 'PENDING',
        },
        data: expect.objectContaining({
          status: 'COMPLETED',
          retryCount,
        }),
      });
    });

    it('重试失败时应该更新重试次数和错误信息', async () => {
      const memberId = 'member-123';
      const relatedId = 'order-123';
      const retryCount = 2;
      const errorMessage = '重试失败';

      mockPrisma.mktPointsGrantFailure.updateMany.mockResolvedValue({
        count: 1,
      });

      await service.updateRetryStatus(
        memberId,
        relatedId,
        retryCount,
        false,
        errorMessage,
      );

      expect(mockPrisma.mktPointsGrantFailure.updateMany).toHaveBeenCalledWith({
        where: {
          memberId,
          relatedId,
          status: 'PENDING',
        },
        data: expect.objectContaining({
          retryCount,
          lastErrorMessage: errorMessage,
        }),
      });
    });
  });

  describe('markAsFinalFailure', () => {
    it('应该标记记录为最终失败', async () => {
      const memberId = 'member-123';
      const relatedId = 'order-123';
      const errorMessage = '重试3次后仍然失败';

      mockPrisma.mktPointsGrantFailure.updateMany.mockResolvedValue({
        count: 1,
      });

      await service.markAsFinalFailure(memberId, relatedId, errorMessage);

      expect(mockPrisma.mktPointsGrantFailure.updateMany).toHaveBeenCalledWith({
        where: {
          memberId,
          relatedId,
          status: 'PENDING',
        },
        data: expect.objectContaining({
          status: 'FAILED',
          lastErrorMessage: errorMessage,
        }),
      });
    });
  });

  describe('getFailureRecords', () => {
    it('应该查询失败记录', async () => {
      const mockRecords = [
        {
          id: 'failure-1',
          memberId: 'member-123',
          amount: 100,
          status: 'PENDING',
        },
      ];

      mockPrisma.mktPointsGrantFailure.findMany.mockResolvedValue(mockRecords);

      const result = await service.getFailureRecords('PENDING', 10);

      expect(result).toEqual(mockRecords);
      expect(mockPrisma.mktPointsGrantFailure.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        orderBy: { failureTime: 'desc' },
        take: 10,
      });
    });

    it('不指定状态时应该查询所有记录', async () => {
      mockPrisma.mktPointsGrantFailure.findMany.mockResolvedValue([]);

      await service.getFailureRecords(undefined, 100);

      expect(mockPrisma.mktPointsGrantFailure.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { failureTime: 'desc' },
        take: 100,
      });
    });
  });

  describe('manualRetry', () => {
    it('应该手动重试失败记录', async () => {
      const recordId = 'failure-123';
      const mockRecord = {
        id: recordId,
        memberId: 'member-123',
        amount: 100,
        type: PointsTransactionType.EARN_ORDER,
        relatedId: 'order-123',
        status: 'PENDING',
        retryCount: 2,
      };

      mockPrisma.mktPointsGrantFailure.findUnique.mockResolvedValue(mockRecord);
      mockQueue.add.mockResolvedValue({});

      await service.manualRetry(recordId);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'retry-points-grant',
        expect.objectContaining({
          memberId: mockRecord.memberId,
          amount: mockRecord.amount,
        }),
        expect.objectContaining({
          attempts: 1, // 手动重试只尝试1次
        }),
      );
    });

    it('记录不存在时应该抛出错误', async () => {
      mockPrisma.mktPointsGrantFailure.findUnique.mockResolvedValue(null);

      await expect(service.manualRetry('non-existent')).rejects.toThrow(
        '失败记录不存在',
      );
    });

    it('记录已完成时应该抛出错误', async () => {
      const mockRecord = {
        id: 'failure-123',
        status: 'COMPLETED',
      };

      mockPrisma.mktPointsGrantFailure.findUnique.mockResolvedValue(mockRecord);

      await expect(service.manualRetry('failure-123')).rejects.toThrow(
        '该记录已成功处理',
      );
    });
  });

  describe('cleanupCompletedRecords', () => {
    it('应该清理已完成的旧记录', async () => {
      const daysAgo = 30;
      mockPrisma.mktPointsGrantFailure.deleteMany.mockResolvedValue({
        count: 5,
      });

      const result = await service.cleanupCompletedRecords(daysAgo);

      expect(result).toBe(5);
      expect(mockPrisma.mktPointsGrantFailure.deleteMany).toHaveBeenCalledWith({
        where: {
          status: 'COMPLETED',
          lastRetryTime: {
            lt: expect.any(Date),
          },
        },
      });
    });
  });
});
