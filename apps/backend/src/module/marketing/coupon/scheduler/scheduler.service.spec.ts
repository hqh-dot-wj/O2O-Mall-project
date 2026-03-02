import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from 'src/module/common/redis/redis.service';
import { UserCouponRepository } from '../distribution/user-coupon.repository';
import { CouponSchedulerService } from './scheduler.service';

describe('CouponSchedulerService', () => {
  let service: CouponSchedulerService;

  const mockUserCouponRepo = {
    expireCoupons: jest.fn(),
  };

  const mockRedisService = {
    tryLock: jest.fn(),
    unlock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponSchedulerService,
        { provide: UserCouponRepository, useValue: mockUserCouponRepo },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<CouponSchedulerService>(CouponSchedulerService);
    jest.clearAllMocks();
  });

  // R-CONCUR-COUPON-01
  it('Given 未获得分布式锁, When cleanExpiredCoupons, Then 跳过执行仓储清理', async () => {
    mockRedisService.tryLock.mockResolvedValue(false);

    await service.cleanExpiredCoupons();

    expect(mockUserCouponRepo.expireCoupons).not.toHaveBeenCalled();
    expect(mockRedisService.unlock).not.toHaveBeenCalled();
  });

  // R-FLOW-COUPON-01
  it('Given 获得分布式锁, When cleanExpiredCoupons, Then 执行清理并释放锁', async () => {
    mockRedisService.tryLock.mockResolvedValue(true);
    mockUserCouponRepo.expireCoupons.mockResolvedValue(5);
    mockRedisService.unlock.mockResolvedValue(1);

    await service.cleanExpiredCoupons();

    expect(mockUserCouponRepo.expireCoupons).toHaveBeenCalledTimes(1);
    expect(mockRedisService.unlock).toHaveBeenCalledTimes(1);
  });
});
