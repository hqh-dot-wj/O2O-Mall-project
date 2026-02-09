import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bull';
import { PointsTransactionType } from '@prisma/client';
import { PointsAccountService } from '../account/account.service';
import { PointsGracefulDegradationService, PointsGrantFailureRecord } from './degradation.service';
import { PointsRetryProcessor } from './degradation.processor';

describe('PointsRetryProcessor', () => {
  let processor: PointsRetryProcessor;
  let pointsAccountService: PointsAccountService;
  let degradationService: PointsGracefulDegradationService;

  const mockPointsAccountService = {
    addPoints: jest.fn(),
  };

  const mockDegradationService = {
    updateRetryStatus: jest.fn(),
    markAsFinalFailure: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsRetryProcessor,
        {
          provide: PointsAccountService,
          useValue: mockPointsAccountService,
        },
        {
          provide: PointsGracefulDegradationService,
          useValue: mockDegradationService,
        },
      ],
    }).compile();

    processor = module.get<PointsRetryProcessor>(PointsRetryProcessor);
    pointsAccountService = module.get<PointsAccountService>(PointsAccountService);
    degradationService = module.get<PointsGracefulDegradationService>(
      PointsGracefulDegradationService,
    );

    // 清除所有 mock
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleRetry', () => {
    it('重试成功时应该发放积分并更新状态', async () => {
      const jobData: PointsGrantFailureRecord = {
        memberId: 'member-123',
        amount: 100,
        type: PointsTransactionType.EARN_ORDER,
        relatedId: 'order-123',
        remark: '消费获得',
        failureReason: '数据库连接失败',
        failureTime: new Date(),
        retryCount: 0,
      };

      const mockJob = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 1,
        opts: { attempts: 3 },
      } as Job<PointsGrantFailureRecord>;

      mockPointsAccountService.addPoints.mockResolvedValue({});
      mockDegradationService.updateRetryStatus.mockResolvedValue(undefined);

      await processor.handleRetry(mockJob);

      // 验证积分发放
      expect(mockPointsAccountService.addPoints).toHaveBeenCalledWith({
        memberId: jobData.memberId,
        amount: jobData.amount,
        type: jobData.type,
        relatedId: jobData.relatedId,
        remark: jobData.remark, // 使用原始备注
        expireTime: undefined,
      });

      // 验证状态更新为成功
      expect(mockDegradationService.updateRetryStatus).toHaveBeenCalledWith(
        jobData.memberId,
        jobData.relatedId,
        1, // retryCount + 1
        true, // success
      );

      // 不应该标记为最终失败
      expect(mockDegradationService.markAsFinalFailure).not.toHaveBeenCalled();
    });

    it('重试失败但未达到最大次数时应该更新状态但不标记最终失败', async () => {
      const jobData: PointsGrantFailureRecord = {
        memberId: 'member-123',
        amount: 100,
        type: PointsTransactionType.EARN_ORDER,
        relatedId: 'order-123',
        failureReason: '数据库连接失败',
        failureTime: new Date(),
        retryCount: 1,
      };

      const mockJob = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 2,
        opts: { attempts: 3 },
      } as Job<PointsGrantFailureRecord>;

      const error = new Error('积分账户不存在');
      mockPointsAccountService.addPoints.mockRejectedValue(error);
      mockDegradationService.updateRetryStatus.mockResolvedValue(undefined);

      await expect(processor.handleRetry(mockJob)).rejects.toThrow(error);

      // 验证状态更新为失败
      expect(mockDegradationService.updateRetryStatus).toHaveBeenCalledWith(
        jobData.memberId,
        jobData.relatedId,
        2, // retryCount + 1
        false, // success
        error.message,
      );

      // 未达到最大次数，不应该标记为最终失败
      expect(mockDegradationService.markAsFinalFailure).not.toHaveBeenCalled();
    });

    it('重试失败且达到最大次数时应该标记为最终失败', async () => {
      const jobData: PointsGrantFailureRecord = {
        memberId: 'member-123',
        amount: 100,
        type: PointsTransactionType.EARN_ORDER,
        relatedId: 'order-123',
        failureReason: '数据库连接失败',
        failureTime: new Date(),
        retryCount: 2,
      };

      const mockJob = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 3,
        opts: { attempts: 3 },
      } as Job<PointsGrantFailureRecord>;

      const error = new Error('积分账户不存在');
      mockPointsAccountService.addPoints.mockRejectedValue(error);
      mockDegradationService.updateRetryStatus.mockResolvedValue(undefined);
      mockDegradationService.markAsFinalFailure.mockResolvedValue(undefined);

      await expect(processor.handleRetry(mockJob)).rejects.toThrow(error);

      // 验证状态更新为失败
      expect(mockDegradationService.updateRetryStatus).toHaveBeenCalledWith(
        jobData.memberId,
        jobData.relatedId,
        3, // retryCount + 1
        false, // success
        error.message,
      );

      // 达到最大次数，应该标记为最终失败
      expect(mockDegradationService.markAsFinalFailure).toHaveBeenCalledWith(
        jobData.memberId,
        jobData.relatedId,
        expect.stringContaining('重试3次后仍然失败'),
      );
    });

    it('应该正确处理带有过期时间的积分', async () => {
      const expireTime = new Date('2025-12-31');
      const jobData: PointsGrantFailureRecord = {
        memberId: 'member-123',
        amount: 100,
        type: PointsTransactionType.EARN_ORDER,
        relatedId: 'order-123',
        remark: '消费获得',
        expireTime,
        failureReason: '数据库连接失败',
        failureTime: new Date(),
        retryCount: 0,
      };

      const mockJob = {
        id: 'job-123',
        data: jobData,
        attemptsMade: 1,
        opts: { attempts: 3 },
      } as Job<PointsGrantFailureRecord>;

      mockPointsAccountService.addPoints.mockResolvedValue({});
      mockDegradationService.updateRetryStatus.mockResolvedValue(undefined);

      await processor.handleRetry(mockJob);

      // 验证积分发放包含过期时间
      expect(mockPointsAccountService.addPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          expireTime,
        }),
      );
    });
  });
});
