import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, firstValueFrom } from 'rxjs';
import { TenantContext } from 'src/common/tenant';
import { RedisService } from 'src/module/common/redis/redis.service';
import { CACHE_EVICT_METADATA, CACHE_KEY_METADATA, CACHE_TTL_METADATA } from './cache.decorator';
import { MarketingCacheInterceptor } from './cache.interceptor';

describe('MarketingCacheInterceptor', () => {
  let interceptor: MarketingCacheInterceptor;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    keys: jest.fn(),
    del: jest.fn(),
  } as unknown as RedisService;

  const createExecutionContext = (args: unknown[] = []): ExecutionContext => {
    class TestClass {
      testHandler(_id: string) {}
    }

    const handler = TestClass.prototype.testHandler;

    return {
      getHandler: () => handler,
      getClass: () => TestClass,
      getArgs: () => args,
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    interceptor = new MarketingCacheInterceptor(mockReflector, mockRedisService);
    jest.clearAllMocks();
  });

  // R-FLOW-CACHE-01
  it('Given 方法未配置缓存元数据, When intercept, Then 直接执行原逻辑', async () => {
    mockReflector.getAllAndOverride = jest.fn().mockReturnValue(undefined);
    const next: CallHandler = {
      handle: jest.fn().mockReturnValue(of({ ok: true })),
    };

    const observable = await interceptor.intercept(createExecutionContext(['1']), next);
    const result = await firstValueFrom(observable);

    expect(result).toEqual({ ok: true });
    expect(next.handle).toHaveBeenCalledTimes(1);
    expect((mockRedisService.get as jest.Mock)).not.toHaveBeenCalled();
  });

  // R-FLOW-CACHE-02
  it('Given 已命中缓存, When intercept, Then 直接返回缓存结果', async () => {
    mockReflector.getAllAndOverride = jest.fn((key: string) => {
      if (key === CACHE_KEY_METADATA) return 'marketing:test:';
      if (key === CACHE_TTL_METADATA) return 300;
      if (key === CACHE_EVICT_METADATA) return undefined;
      return undefined;
    });
    (mockRedisService.get as jest.Mock).mockResolvedValue({ from: 'cache' });
    const next: CallHandler = {
      handle: jest.fn().mockReturnValue(of({ from: 'db' })),
    };

    const result = await TenantContext.run({ tenantId: 't-1' }, async () => {
      const observable = await interceptor.intercept(createExecutionContext(['1']), next);
      return await firstValueFrom(observable);
    });

    expect(result).toEqual({ from: 'cache' });
    expect(next.handle).not.toHaveBeenCalled();
    expect((mockRedisService.get as jest.Mock).mock.calls[0][0]).toContain('marketing:test:t-1:');
  });

  // R-FLOW-CACHE-03
  it('Given 缓存未命中, When intercept, Then 执行业务并写入缓存', async () => {
    mockReflector.getAllAndOverride = jest.fn((key: string) => {
      if (key === CACHE_KEY_METADATA) return 'marketing:test:';
      if (key === CACHE_TTL_METADATA) return 300;
      if (key === CACHE_EVICT_METADATA) return undefined;
      return undefined;
    });
    (mockRedisService.get as jest.Mock).mockResolvedValue(null);
    (mockRedisService.set as jest.Mock).mockResolvedValue('OK');
    const next: CallHandler = {
      handle: jest.fn().mockReturnValue(of({ from: 'db' })),
    };

    const observable = await interceptor.intercept(createExecutionContext(['1']), next);
    const result = await firstValueFrom(observable);

    expect(result).toEqual({ from: 'db' });
    expect(next.handle).toHaveBeenCalledTimes(1);
    expect(mockRedisService.set).toHaveBeenCalledTimes(1);
  });

  // R-FLOW-CACHE-04
  it('Given 方法配置缓存清理元数据, When intercept, Then 成功后删除匹配缓存', async () => {
    mockReflector.getAllAndOverride = jest.fn((key: string) => {
      if (key === CACHE_KEY_METADATA) return undefined;
      if (key === CACHE_TTL_METADATA) return undefined;
      if (key === CACHE_EVICT_METADATA) return ['marketing:test:'];
      return undefined;
    });
    (mockRedisService.keys as jest.Mock).mockResolvedValue(['marketing:test:t-1:a', 'marketing:test:t-1:b']);
    (mockRedisService.del as jest.Mock).mockResolvedValue(2);
    const next: CallHandler = {
      handle: jest.fn().mockReturnValue(of({ ok: true })),
    };

    await TenantContext.run({ tenantId: 't-1' }, async () => {
      const observable = await interceptor.intercept(createExecutionContext(['1']), next);
      await firstValueFrom(observable);
      await Promise.resolve();
    });

    expect(mockRedisService.keys).toHaveBeenCalledWith('marketing:test:t-1:*');
    expect(mockRedisService.del).toHaveBeenCalledWith(['marketing:test:t-1:a', 'marketing:test:t-1:b']);
  });
});
