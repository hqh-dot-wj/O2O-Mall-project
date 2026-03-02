import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/module/common/redis/redis.service';
import { PointsSchedulerService } from './scheduler.service';

describe('PointsSchedulerService', () => {
  let service: PointsSchedulerService;

  const mockPrisma = {
    mktPointsTransaction: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockRedisService = {
    tryLock: jest.fn(),
    unlock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsSchedulerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<PointsSchedulerService>(PointsSchedulerService);
    jest.clearAllMocks();
  });

  // R-CONCUR-POINTS-02
  it('Given 未获得分布式锁, When processExpiredPoints, Then 跳过积分过期处理', async () => {
    mockRedisService.tryLock.mockResolvedValue(false);

    await service.processExpiredPoints();

    expect(mockPrisma.mktPointsTransaction.findMany).not.toHaveBeenCalled();
    expect(mockRedisService.unlock).not.toHaveBeenCalled();
  });

  // R-FLOW-POINTS-03
  it('Given 获得分布式锁且无过期记录, When processExpiredPoints, Then 正常完成并释放锁', async () => {
    mockRedisService.tryLock.mockResolvedValue(true);
    mockPrisma.mktPointsTransaction.findMany.mockResolvedValue([]);
    mockRedisService.unlock.mockResolvedValue(1);

    await service.processExpiredPoints();

    expect(mockPrisma.mktPointsTransaction.findMany).toHaveBeenCalledTimes(1);
    expect(mockRedisService.unlock).toHaveBeenCalledTimes(1);
  });
});
