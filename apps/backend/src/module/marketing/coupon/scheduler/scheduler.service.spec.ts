import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from 'src/module/common/redis/redis.service';
import { MarketingEventEmitter } from '../../events/marketing-event.emitter';
import { MarketingEventType } from '../../events/marketing-event.types';
import { UserCouponRepository } from '../distribution/user-coupon.repository';
import { CouponSchedulerService } from './scheduler.service';

describe('CouponSchedulerService', () => {
  let service: CouponSchedulerService;

  const mockUserCouponRepo = {
    findExpiredCouponIds: jest.fn(),
    markCouponsExpiredByIds: jest.fn(),
    findExpiredCouponsByIds: jest.fn(),
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
        CouponSchedulerService,
        { provide: UserCouponRepository, useValue: mockUserCouponRepo },
        { provide: RedisService, useValue: mockRedisService },
        { provide: MarketingEventEmitter, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<CouponSchedulerService>(CouponSchedulerService);
    jest.clearAllMocks();
  });

  // R-CONCUR-COUPON-01
  it('Given 未获得分布式锁, When cleanExpiredCoupons, Then 跳过执行仓储清理', async () => {
    mockRedisService.tryLock.mockResolvedValue(false);

    await service.cleanExpiredCoupons();

    expect(mockUserCouponRepo.findExpiredCouponIds).not.toHaveBeenCalled();
    expect(mockUserCouponRepo.markCouponsExpiredByIds).not.toHaveBeenCalled();
    expect(mockRedisService.unlock).not.toHaveBeenCalled();
  });

  // R-FLOW-COUPON-01
  it('Given 获得分布式锁, When cleanExpiredCoupons, Then 执行清理并释放锁', async () => {
    mockRedisService.tryLock.mockResolvedValue(true);
    mockUserCouponRepo.findExpiredCouponIds
      .mockResolvedValueOnce(['c1', 'c2', 'c3'])
      .mockResolvedValueOnce([]);
    mockUserCouponRepo.markCouponsExpiredByIds.mockResolvedValue(3);
    mockUserCouponRepo.findExpiredCouponsByIds.mockResolvedValue([
      { id: 'c1', tenantId: 't1', memberId: 'm1', templateId: 'tpl1', endTime: new Date() },
      { id: 'c2', tenantId: 't1', memberId: 'm2', templateId: 'tpl1', endTime: new Date() },
      { id: 'c3', tenantId: 't1', memberId: 'm3', templateId: 'tpl2', endTime: new Date() },
    ]);
    mockRedisService.unlock.mockResolvedValue(1);

    await service.cleanExpiredCoupons();

    expect(mockUserCouponRepo.findExpiredCouponIds).toHaveBeenCalledTimes(1);
    expect(mockUserCouponRepo.markCouponsExpiredByIds).toHaveBeenCalledWith(['c1', 'c2', 'c3']);
    expect(mockUserCouponRepo.findExpiredCouponsByIds).toHaveBeenCalledWith(['c1', 'c2', 'c3']);
    expect(mockEventEmitter.emitAsync).toHaveBeenCalledTimes(3);
    expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MarketingEventType.COUPON_EXPIRED,
        tenantId: 't1',
      }),
    );
    expect(mockRedisService.unlock).toHaveBeenCalledTimes(1);
  });
});
