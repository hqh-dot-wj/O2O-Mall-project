import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/module/common/redis/redis.service';
import { PlayInstanceService } from '../instance/instance.service';
import { ActivityLifecycleScheduler } from './lifecycle.scheduler';

describe('ActivityLifecycleScheduler', () => {
  let scheduler: ActivityLifecycleScheduler;

  const mockPrisma = {
    playInstance: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      findFirst: jest.fn(),
    },
    storePlayConfig: {
      updateMany: jest.fn(),
    },
  };

  const mockInstanceService = {
    transitStatus: jest.fn(),
  };

  const mockRedisService = {
    tryLock: jest.fn(),
    unlock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLifecycleScheduler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PlayInstanceService, useValue: mockInstanceService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    scheduler = module.get<ActivityLifecycleScheduler>(ActivityLifecycleScheduler);
    jest.clearAllMocks();
  });

  // R-CONCUR-MAAS-01
  it('Given 未获得分布式锁, When handleTimeoutInstances, Then 跳过超时处理', async () => {
    mockRedisService.tryLock.mockResolvedValue(false);

    await scheduler.handleTimeoutInstances();

    expect(mockPrisma.playInstance.findMany).not.toHaveBeenCalled();
    expect(mockRedisService.unlock).not.toHaveBeenCalled();
  });

  // R-FLOW-MAAS-01
  it('Given 获得分布式锁且无待处理实例, When handleTimeoutInstances, Then 正常完成并释放锁', async () => {
    mockRedisService.tryLock.mockResolvedValue(true);
    mockPrisma.playInstance.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockRedisService.unlock.mockResolvedValue(1);

    await scheduler.handleTimeoutInstances();

    expect(mockPrisma.playInstance.findMany).toHaveBeenCalledTimes(2);
    expect(mockRedisService.unlock).toHaveBeenCalledTimes(1);
  });

  // R-FLOW-MAAS-03
  it('Given 获得分布式锁, When cleanupExpiredData, Then 统计待归档数量并释放锁', async () => {
    mockRedisService.tryLock.mockResolvedValue(true);
    mockPrisma.playInstance.count.mockResolvedValue(3);
    mockRedisService.unlock.mockResolvedValue(1);

    await scheduler.cleanupExpiredData();

    expect(mockPrisma.playInstance.count).toHaveBeenCalledTimes(1);
    expect(mockPrisma.playInstance.updateMany).not.toHaveBeenCalled();
    expect(mockRedisService.unlock).toHaveBeenCalledTimes(1);
  });
});
