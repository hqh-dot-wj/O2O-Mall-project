import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PointsAccountService } from '../account/account.service';
import { PointsGracefulDegradationService, PointsGrantFailureRecord } from './degradation.service';
import { getErrorMessage, getErrorStack } from 'src/common/utils/error';

/**
 * 积分重试队列处理器
 * 
 * @description 处理积分发放失败的重试任务
 */
@Processor('points-retry')
export class PointsRetryProcessor {
  private readonly logger = new Logger(PointsRetryProcessor.name);

  constructor(
    private readonly pointsAccountService: PointsAccountService,
    private readonly degradationService: PointsGracefulDegradationService,
  ) {}

  /**
   * 处理积分发放重试任务
   * 
   * @param job 任务
   */
  @Process('retry-points-grant')
  async handleRetry(job: Job<PointsGrantFailureRecord>) {
    const { memberId, amount, type, relatedId, remark, expireTime, retryCount } = job.data;

    this.logger.log({
      message: '开始重试积分发放',
      jobId: job.id,
      memberId,
      amount,
      type,
      retryCount: retryCount + 1,
      attemptsMade: job.attemptsMade,
    });

    try {
      // 尝试发放积分
      await this.pointsAccountService.addPoints({
        memberId,
        amount,
        type,
        relatedId,
        remark: remark || '重试发放',
        expireTime,
      });

      // 更新重试状态为成功
      await this.degradationService.updateRetryStatus(
        memberId,
        relatedId,
        retryCount + 1,
        true,
      );

      this.logger.log({
        message: '积分发放重试成功',
        jobId: job.id,
        memberId,
        amount,
      });
    } catch (error) {
      this.logger.error({
        message: '积分发放重试失败',
        jobId: job.id,
        memberId,
        amount,
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        attemptsMade: job.attemptsMade,
      });

      // 更新重试状态
      await this.degradationService.updateRetryStatus(
        memberId,
        relatedId,
        retryCount + 1,
        false,
        getErrorMessage(error),
      );

      // 如果是最后一次重试，标记为最终失败
      if (job.attemptsMade >= job.opts.attempts) {
        await this.degradationService.markAsFinalFailure(
          memberId,
          relatedId,
          `重试${job.attemptsMade}次后仍然失败: ${getErrorMessage(error)}`,
        );
      }

      // 重新抛出错误，让Bull知道任务失败
      throw error;
    }
  }
}
