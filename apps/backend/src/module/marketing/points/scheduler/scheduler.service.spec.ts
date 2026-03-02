import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/module/common/redis/redis.service';
import { MarketingEventEmitter } from '../../events/marketing-event.emitter';
import { MarketingEventType } from '../../events/marketing-event.types';
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

  const mockEventEmitter = {
    emitAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsSchedulerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedisService },
        { provide: MarketingEventEmitter, useValue: mockEventEmitter },
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

  it('处理过期积分成功后应发送过期事件', async () => {
    mockRedisService.tryLock.mockResolvedValue(true);
    mockPrisma.mktPointsTransaction.findMany
      .mockResolvedValueOnce([
        {
          id: 'tx-source-1',
          tenantId: 't1',
          accountId: 'acc1',
          memberId: 'm1',
          amount: 10,
          remark: '签到奖励',
          account: {
            availablePoints: 20,
          },
        },
      ])
      .mockResolvedValueOnce([]);
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        mktPointsAccount: {
          update: jest.fn(),
        },
        mktPointsTransaction: {
          create: jest.fn().mockResolvedValue({ id: 'tx-expired-1' }),
          update: jest.fn(),
        },
      }),
    );
    mockRedisService.unlock.mockResolvedValue(1);

    await service.processExpiredPoints();

    expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MarketingEventType.POINTS_EXPIRED,
        tenantId: 't1',
        memberId: 'm1',
        instanceId: 'tx-expired-1',
        configId: 'acc1',
      }),
    );
    expect(mockRedisService.unlock).toHaveBeenCalled();
  });
});
