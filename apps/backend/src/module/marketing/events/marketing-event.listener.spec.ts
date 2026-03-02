import { Test, TestingModule } from '@nestjs/testing';
import { MarketingEventListener } from './marketing-event.listener';
import { MarketingEvent, MarketingEventType } from './marketing-event.types';
import { RedisService } from 'src/module/common/redis/redis.service';

describe('MarketingEventListener', () => {
  let listener: MarketingEventListener;
  const mockRedisPipeline = {
    incr: jest.fn().mockReturnThis(),
    lpush: jest.fn().mockReturnThis(),
    ltrim: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  };
  const mockRedisClient = {
    multi: jest.fn().mockReturnValue(mockRedisPipeline),
  };
  const mockRedisService = {
    getClient: jest.fn().mockReturnValue(mockRedisClient),
  };

  const buildEvent = (type: MarketingEventType, tenantId?: string): MarketingEvent => ({
    type,
    tenantId,
    instanceId: 'instance-1',
    configId: 'config-1',
    memberId: 'member-1',
    payload: {
      reason: 'test-reason',
      timeoutType: 'PAYMENT_TIMEOUT',
    },
    timestamp: new Date('2026-03-02T08:00:00.000Z'),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingEventListener,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    listener = module.get<MarketingEventListener>(MarketingEventListener);
    jest.clearAllMocks();
  });

  // R-FLOW-EVENT-01
  it('Given 监听器已注入依赖, When 创建实例, Then 监听器可用', () => {
    expect(listener).toBeDefined();
  });

  // R-FLOW-EVENT-02
  it('Given SUCCESS 事件, When handleInstanceSuccess, Then 写入事件统计缓存', async () => {
    await listener.handleInstanceSuccess(buildEvent(MarketingEventType.INSTANCE_SUCCESS, 't-1'));

    expect(mockRedisClient.multi).toHaveBeenCalledTimes(1);
    expect(mockRedisPipeline.incr).toHaveBeenCalledWith('mkt:event:stats:t-1:20260302:total');
    expect(mockRedisPipeline.incr).toHaveBeenCalledWith(
      'mkt:event:stats:t-1:20260302:instance.success',
    );
    expect(mockRedisPipeline.exec).toHaveBeenCalledTimes(1);
  });

  // R-FLOW-EVENT-03
  it('Given FAILED 事件, When handleInstanceFailed, Then 写入失败事件统计缓存', async () => {
    await listener.handleInstanceFailed(buildEvent(MarketingEventType.INSTANCE_FAILED, 't-1'));

    expect(mockRedisPipeline.incr).toHaveBeenCalledWith(
      'mkt:event:stats:t-1:20260302:instance.failed',
    );
    expect(mockRedisPipeline.exec).toHaveBeenCalledTimes(1);
  });

  // R-FLOW-EVENT-04
  it('Given TIMEOUT 事件, When handleInstanceTimeout, Then 写入超时事件统计缓存', async () => {
    await listener.handleInstanceTimeout(buildEvent(MarketingEventType.INSTANCE_TIMEOUT, 't-1'));

    expect(mockRedisPipeline.incr).toHaveBeenCalledWith(
      'mkt:event:stats:t-1:20260302:instance.timeout',
    );
    expect(mockRedisPipeline.exec).toHaveBeenCalledTimes(1);
  });

  // R-BRANCH-EVENT-01
  it('Given 事件未携带 tenantId, When handleInstanceSuccess, Then 使用默认租户写入缓存', async () => {
    await listener.handleInstanceSuccess(buildEvent(MarketingEventType.INSTANCE_SUCCESS));

    expect(mockRedisPipeline.incr).toHaveBeenCalledWith('mkt:event:stats:000000:20260302:total');
  });

  // R-BRANCH-EVENT-02
  it('Given Redis 写入异常, When handleInstanceSuccess, Then 吞异常并记录错误日志', async () => {
    const loggerErrorSpy = jest.spyOn(listener['logger'], 'error');
    mockRedisPipeline.exec.mockRejectedValueOnce(new Error('redis failed'));

    await expect(
      listener.handleInstanceSuccess(buildEvent(MarketingEventType.INSTANCE_SUCCESS, 't-1')),
    ).resolves.not.toThrow();

    expect(loggerErrorSpy).toHaveBeenCalled();
  });
});
