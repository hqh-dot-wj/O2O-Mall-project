// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { LbsMetricsService } from './lbs-metrics.service';
import { RedisService } from 'src/module/common/redis/redis.service';

describe('LbsMetricsService', () => {
  let service: LbsMetricsService;
  let mockRedisClient: any;

  beforeEach(async () => {
    // Mock ioredis client
    mockRedisClient = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      zadd: jest.fn().mockResolvedValue(1),
      zincrby: jest.fn().mockResolvedValue(1),
      get: jest.fn().mockResolvedValue(null),
      zcard: jest.fn().mockResolvedValue(0),
      zrange: jest.fn().mockResolvedValue([]),
      zrevrange: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LbsMetricsService,
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockRedisClient),
          },
        },
      ],
    }).compile();

    service = module.get<LbsMetricsService>(LbsMetricsService);
  });

  // R-FLOW-METRICS-01: 记录匹配请求
  it('Given success match, When recordMatchRequest, Then increment success counter', async () => {
    await service.recordMatchRequest(true, 100);

    expect(mockRedisClient.incr).toHaveBeenCalledWith(expect.stringContaining('match:total'));
    expect(mockRedisClient.incr).toHaveBeenCalledWith(expect.stringContaining('match:success'));
  });

  // R-FLOW-METRICS-02: 记录失败请求
  it('Given failed match, When recordMatchRequest, Then increment failure counter', async () => {
    await service.recordMatchRequest(false, 200);

    expect(mockRedisClient.incr).toHaveBeenCalledWith(expect.stringContaining('match:total'));
    expect(mockRedisClient.incr).toHaveBeenCalledWith(expect.stringContaining('match:failure'));
  });

  // R-FLOW-METRICS-03: 记录围栏命中
  it('Given fence hit, When recordFenceHit, Then increment fence counter', async () => {
    await service.recordFenceHit(123);

    expect(mockRedisClient.incr).toHaveBeenCalledWith(expect.stringContaining('fence:hit'));
    expect(mockRedisClient.zincrby).toHaveBeenCalledWith(expect.stringContaining('station:hits'), 1, '123');
  });

  // R-FLOW-METRICS-04: 记录半径降级
  it('Given radius fallback, When recordRadiusFallback, Then increment fallback counter', async () => {
    await service.recordRadiusFallback();

    expect(mockRedisClient.incr).toHaveBeenCalledWith(expect.stringContaining('radius:fallback'));
  });

  // R-FLOW-METRICS-05: 获取今日统计
  it('Given metrics exist, When getTodayMatchStats, Then return stats', async () => {
    mockRedisClient.get.mockImplementation((key: string) => {
      if (key.includes('total')) return Promise.resolve('100');
      if (key.includes('success')) return Promise.resolve('80');
      if (key.includes('failure')) return Promise.resolve('20');
      if (key.includes('fence:hit')) return Promise.resolve('60');
      if (key.includes('fallback')) return Promise.resolve('20');
      return Promise.resolve('0');
    });

    const stats = await service.getTodayMatchStats();

    expect(stats.total).toBe(100);
    expect(stats.success).toBe(80);
    expect(stats.failure).toBe(20);
    expect(stats.successRate).toBe(80);
    expect(stats.fenceHits).toBe(60);
    expect(stats.radiusFallbacks).toBe(20);
  });

  // R-BRANCH-NODATA-01: 无数据时返回零值
  it('Given no metrics, When getTodayMatchStats, Then return zero stats', async () => {
    mockRedisClient.get.mockResolvedValue(null);

    const stats = await service.getTodayMatchStats();

    expect(stats.total).toBe(0);
    expect(stats.success).toBe(0);
    expect(stats.successRate).toBe(0);
  });

  // R-FLOW-METRICS-06: 获取热门站点
  it('Given station hits, When getTopStations, Then return sorted list', async () => {
    mockRedisClient.zrevrange.mockResolvedValue(['123', '50', '456', '30', '789', '20']);

    const stations = await service.getTopStations(3);

    expect(stations).toHaveLength(3);
    expect(stations[0]).toEqual({ stationId: '123', hits: 50 });
    expect(stations[1]).toEqual({ stationId: '456', hits: 30 });
    expect(stations[2]).toEqual({ stationId: '789', hits: 20 });
  });
});
