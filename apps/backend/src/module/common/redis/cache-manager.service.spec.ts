// @ts-nocheck
import { CacheManagerService } from './cache-manager.service';
import type { RedisService } from './redis.service';
import type { PrismaService } from 'src/prisma/prisma.service';

const NULL_PLACEHOLDER = '__NULL__';

const createMocks = () => {
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn().mockResolvedValue([]),
    tryLock: jest.fn(),
    unlock: jest.fn(),
  } as unknown as RedisService;

  const prisma = {
    sysDictType: { findMany: jest.fn().mockResolvedValue([]) },
    sysDictData: { findMany: jest.fn().mockResolvedValue([]) },
    sysConfig: { findMany: jest.fn().mockResolvedValue([]) },
  } as unknown as PrismaService;

  return { redis, prisma };
};

describe('CacheManagerService', () => {
  let service: CacheManagerService;
  let mocks: ReturnType<typeof createMocks>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMocks();
    service = new CacheManagerService(mocks.redis as any, mocks.prisma as any);
  });

  describe('getOrSet - 缓存穿透保护', () => {
    // R-FLOW-CACHE-01: 缓存命中直接返回
    it('Given data in cache, When getOrSet, Then return cached value without calling fetcher', async () => {
      (mocks.redis.get as jest.Mock).mockResolvedValue({ id: 1, name: 'test' });
      const fetcher = jest.fn();

      const result = await service.getOrSet('user:1', {
        fetcher,
        ttl: 3600,
      });

      expect(result).toEqual({ id: 1, name: 'test' });
      expect(fetcher).not.toHaveBeenCalled();
    });

    // R-FLOW-CACHE-02: 缓存未命中调用 fetcher 并缓存
    it('Given cache miss, When getOrSet, Then call fetcher and cache result', async () => {
      (mocks.redis.get as jest.Mock).mockResolvedValue(null);
      const fetcher = jest.fn().mockResolvedValue({ id: 1, name: 'test' });

      const result = await service.getOrSet('user:1', {
        fetcher,
        ttl: 3600,
      });

      expect(result).toEqual({ id: 1, name: 'test' });
      expect(fetcher).toHaveBeenCalled();
      expect(mocks.redis.set).toHaveBeenCalledWith(
        'user:1',
        { id: 1, name: 'test' },
        expect.any(Number),
      );
    });

    // R-BRANCH-CACHE-01: fetcher 返回 null 时缓存空值占位符
    it('Given fetcher returns null, When getOrSet with cacheNull=true, Then cache NULL_PLACEHOLDER', async () => {
      (mocks.redis.get as jest.Mock).mockResolvedValue(null);
      const fetcher = jest.fn().mockResolvedValue(null);

      const result = await service.getOrSet('user:999', {
        fetcher,
        ttl: 3600,
        cacheNull: true,
      });

      expect(result).toBeNull();
      expect(mocks.redis.set).toHaveBeenCalledWith('user:999', NULL_PLACEHOLDER, 60000);
    });

    // R-BRANCH-CACHE-02: 命中空值占位符返回 null
    it('Given NULL_PLACEHOLDER in cache, When getOrSet, Then return null without calling fetcher', async () => {
      (mocks.redis.get as jest.Mock).mockResolvedValue(NULL_PLACEHOLDER);
      const fetcher = jest.fn();

      const result = await service.getOrSet('user:999', {
        fetcher,
        ttl: 3600,
      });

      expect(result).toBeNull();
      expect(fetcher).not.toHaveBeenCalled();
    });

    // R-BRANCH-CACHE-03: cacheNull=false 时不缓存空值
    it('Given fetcher returns null, When getOrSet with cacheNull=false, Then do not cache', async () => {
      (mocks.redis.get as jest.Mock).mockResolvedValue(null);
      const fetcher = jest.fn().mockResolvedValue(null);

      const result = await service.getOrSet('user:999', {
        fetcher,
        ttl: 3600,
        cacheNull: false,
      });

      expect(result).toBeNull();
      expect(mocks.redis.set).not.toHaveBeenCalled();
    });
  });

  describe('getOrSetWithLock - 缓存击穿保护', () => {
    // R-CONCUR-CACHE-01: 获取锁成功后查询并缓存
    it('Given cache miss and lock acquired, When getOrSetWithLock, Then fetch and cache', async () => {
      (mocks.redis.get as jest.Mock).mockResolvedValue(null);
      (mocks.redis.tryLock as jest.Mock).mockResolvedValue('lock-token');
      const fetcher = jest.fn().mockResolvedValue({ id: 1 });

      const result = await service.getOrSetWithLock('hot:key', {
        fetcher,
        ttl: 3600,
      });

      expect(result).toEqual({ id: 1 });
      expect(mocks.redis.tryLock).toHaveBeenCalledWith('lock:cache:hot:key', 10000);
      expect(mocks.redis.unlock).toHaveBeenCalledWith('lock:cache:hot:key', 'lock-token');
    });

    // R-CONCUR-CACHE-02: 未获取锁时等待后重试
    it('Given lock not acquired, When getOrSetWithLock, Then wait and retry from cache', async () => {
      (mocks.redis.get as jest.Mock)
        .mockResolvedValueOnce(null) // 第一次检查
        .mockResolvedValueOnce({ id: 1 }); // 重试时命中
      (mocks.redis.tryLock as jest.Mock).mockResolvedValue(null);

      const fetcher = jest.fn();

      const result = await service.getOrSetWithLock('hot:key', {
        fetcher,
        ttl: 3600,
      });

      expect(result).toEqual({ id: 1 });
      expect(fetcher).not.toHaveBeenCalled();
    });

    // R-CONCUR-CACHE-03: 双重检查防止重复查询
    it('Given lock acquired but cache filled by another process, When getOrSetWithLock, Then return cached value', async () => {
      (mocks.redis.get as jest.Mock)
        .mockResolvedValueOnce(null) // 第一次检查
        .mockResolvedValueOnce({ id: 1 }); // 双重检查时命中
      (mocks.redis.tryLock as jest.Mock).mockResolvedValue('lock-token');

      const fetcher = jest.fn();

      const result = await service.getOrSetWithLock('hot:key', {
        fetcher,
        ttl: 3600,
      });

      expect(result).toEqual({ id: 1 });
      expect(fetcher).not.toHaveBeenCalled();
      expect(mocks.redis.unlock).toHaveBeenCalled();
    });

    // R-CONCUR-CACHE-04: 异常时释放锁
    it('Given fetcher throws error, When getOrSetWithLock, Then release lock', async () => {
      (mocks.redis.get as jest.Mock).mockResolvedValue(null);
      (mocks.redis.tryLock as jest.Mock).mockResolvedValue('lock-token');
      const fetcher = jest.fn().mockRejectedValue(new Error('DB error'));

      await expect(
        service.getOrSetWithLock('hot:key', { fetcher, ttl: 3600 }),
      ).rejects.toThrow('DB error');

      expect(mocks.redis.unlock).toHaveBeenCalledWith('lock:cache:hot:key', 'lock-token');
    });
  });

  describe('基础方法', () => {
    // R-FLOW-CACHE-03: set 方法添加 Jitter
    it('Given ttl, When set, Then add jitter to prevent thundering herd', async () => {
      await service.set('key', 'value', 3600000);

      expect(mocks.redis.set).toHaveBeenCalledWith(
        'key',
        'value',
        expect.any(Number),
      );
      // TTL 应该在 3600000 到 3600000 + 300000 之间
      const actualTtl = (mocks.redis.set as jest.Mock).mock.calls[0][2];
      expect(actualTtl).toBeGreaterThanOrEqual(3600000);
      expect(actualTtl).toBeLessThanOrEqual(3900000);
    });
  });
});
