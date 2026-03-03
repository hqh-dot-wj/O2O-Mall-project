// @ts-nocheck
import { AccountLockService } from './account-lock.service';
import { BusinessException } from 'src/common/exceptions';
import { CacheEnum } from 'src/common/enum';

const createRedisServiceMock = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
});

describe('AccountLockService', () => {
  let service: AccountLockService;
  let redisService: ReturnType<typeof createRedisServiceMock>;

  const tenantId = 'tenant-001';
  const username = 'testuser';

  beforeEach(() => {
    jest.clearAllMocks();
    redisService = createRedisServiceMock();
    service = new AccountLockService(redisService);
  });

  describe('checkAccountLocked', () => {
    // R-PRE-LOCK-01: 未锁定时不抛异常
    it('Given no lock key, When checkAccountLocked, Then no exception', async () => {
      redisService.get.mockResolvedValue(null);
      await expect(service.checkAccountLocked(tenantId, username)).resolves.toBeUndefined();
      expect(redisService.get).toHaveBeenCalledWith(
        `${CacheEnum.ACCOUNT_LOCK_KEY}${tenantId}:${username}`,
      );
    });

    // R-PRE-LOCK-02: 已锁定时抛出异常
    it('Given lock key exists, When checkAccountLocked, Then throw BUSINESS_ERROR', async () => {
      redisService.get.mockResolvedValue('locked');
      await expect(service.checkAccountLocked(tenantId, username)).rejects.toThrow(BusinessException);

      try {
        await service.checkAccountLocked(tenantId, username);
      } catch (e) {
        const response = e.getResponse();
        expect(response.msg).toContain('账号已被锁定');
      }
    });
  });

  describe('recordLoginFail', () => {
    const failKey = `${CacheEnum.LOGIN_FAIL_KEY}${tenantId}:${username}`;

    // R-FLOW-LOCK-01: 首次失败，incr=1 并设置过期时间
    it('Given first fail, When recordLoginFail, Then incr=1 and set expire', async () => {
      redisService.incr.mockResolvedValue(1);

      const remaining = await service.recordLoginFail(tenantId, username);

      expect(redisService.incr).toHaveBeenCalledWith(failKey);
      expect(redisService.expire).toHaveBeenCalledWith(failKey, 30 * 60 * 1000);
      expect(remaining).toBe(4); // 5 - 1 = 4
    });

    // R-FLOW-LOCK-02: 第 4 次失败，remaining=1
    it('Given 4th fail, When recordLoginFail, Then remaining=1', async () => {
      redisService.incr.mockResolvedValue(4);

      const remaining = await service.recordLoginFail(tenantId, username);

      expect(remaining).toBe(1);
      // 非首次失败，不重新设置 expire
      expect(redisService.expire).not.toHaveBeenCalled();
    });

    // R-FLOW-LOCK-03: 第 5 次失败，锁定账号
    it('Given 5th fail, When recordLoginFail, Then lock account and return 0', async () => {
      redisService.incr.mockResolvedValue(5);

      const remaining = await service.recordLoginFail(tenantId, username);

      expect(remaining).toBe(0);
      // 验证锁定 key 被设置
      expect(redisService.set).toHaveBeenCalledWith(
        `${CacheEnum.ACCOUNT_LOCK_KEY}${tenantId}:${username}`,
        'locked',
        30 * 60 * 1000,
      );
      // 验证失败计数被清除
      expect(redisService.del).toHaveBeenCalledWith(failKey);
    });

    // R-FLOW-LOCK-05: 超过阈值也触发锁定
    it('Given 6th fail (already over threshold), When recordLoginFail, Then still lock', async () => {
      redisService.incr.mockResolvedValue(6);

      const remaining = await service.recordLoginFail(tenantId, username);

      expect(remaining).toBe(0);
      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringContaining(CacheEnum.ACCOUNT_LOCK_KEY),
        'locked',
        expect.any(Number),
      );
    });
  });

  describe('clearFailCount', () => {
    // R-FLOW-LOCK-04: 登录成功清除失败计数
    it('Given login success, When clearFailCount, Then del fail key', async () => {
      await service.clearFailCount(tenantId, username);

      expect(redisService.del).toHaveBeenCalledWith(
        `${CacheEnum.LOGIN_FAIL_KEY}${tenantId}:${username}`,
      );
    });
  });
});
