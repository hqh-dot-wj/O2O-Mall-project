// @ts-nocheck
 
import { CacheController } from './cache.controller';
import { CacheService } from './cache.service';
import { Result } from 'src/common/response';

describe('CacheController', () => {
  let controller: CacheController;
  let mockCacheService: Partial<CacheService>;

  beforeEach(() => {
    mockCacheService = {
      getInfo: jest.fn(),
      getNames: jest.fn(),
      getKeys: jest.fn(),
      getValue: jest.fn(),
      clearCacheName: jest.fn(),
      clearCacheKey: jest.fn(),
      clearCacheAll: jest.fn(),
    };
    // 直接实例化，绕过 NestJS DI（避免 OperlogInterceptor 依赖问题）
    controller = new CacheController(mockCacheService as CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInfo', () => {
    it('Given Redis正常, When GET /monitor/cache, Then 委托给service.getInfo', async () => {
      const expected = Result.ok({ info: {}, dbSize: 10, commandStats: [] });
      (mockCacheService.getInfo as jest.Mock).mockResolvedValue(expected);

      const result = await controller.getInfo();

      expect(result).toBe(expected);
      expect(mockCacheService.getInfo).toHaveBeenCalledTimes(1);
    });
  });

  describe('getNames', () => {
    it('Given 预定义分类, When GET /monitor/cache/getNames, Then 委托给service.getNames', async () => {
      const expected = Result.ok([{ cacheName: 'sys_config:', remark: '配置信息' }]);
      (mockCacheService.getNames as jest.Mock).mockResolvedValue(expected);

      const result = await controller.getNames();

      expect(result).toBe(expected);
      expect(mockCacheService.getNames).toHaveBeenCalledTimes(1);
    });
  });

  describe('getKeys', () => {
    it('Given 有效前缀, When GET /monitor/cache/getKeys/:id, Then 委托给service.getKeys', async () => {
      const id = 'login_tokens:';
      const expected = Result.ok(['login_tokens:abc']);
      (mockCacheService.getKeys as jest.Mock).mockResolvedValue(expected);

      const result = await controller.getKeys(id);

      expect(result).toBe(expected);
      expect(mockCacheService.getKeys).toHaveBeenCalledWith(id);
    });
  });

  describe('getValue', () => {
    it('Given 有效参数, When GET /monitor/cache/getValue/:cacheName/:cacheKey, Then 委托给service.getValue', async () => {
      const params = { cacheName: 'sys_config:', cacheKey: 'sys_config:site.name' };
      const expected = Result.ok({
        cacheName: 'sys_config:',
        cacheKey: 'sys_config:site.name',
        cacheValue: '{}',
        remark: '配置信息',
      });
      (mockCacheService.getValue as jest.Mock).mockResolvedValue(expected);

      const result = await controller.getValue(params);

      expect(result).toBe(expected);
      expect(mockCacheService.getValue).toHaveBeenCalledWith(params);
    });
  });

  describe('clearCacheName', () => {
    it('Given 有效分类名, When DELETE /monitor/cache/clearCacheName/:cacheName, Then 委托给service.clearCacheName', async () => {
      const cacheName = 'captcha_codes:';
      const expected = Result.ok(2);
      (mockCacheService.clearCacheName as jest.Mock).mockResolvedValue(expected);

      const result = await controller.clearCacheName(cacheName);

      expect(result).toBe(expected);
      expect(mockCacheService.clearCacheName).toHaveBeenCalledWith(cacheName);
    });
  });

  describe('clearCacheKey', () => {
    it('Given 有效键名, When DELETE /monitor/cache/clearCacheKey/:cacheKey, Then 委托给service.clearCacheKey', async () => {
      const cacheKey = 'login_tokens:abc123';
      const expected = Result.ok(1);
      (mockCacheService.clearCacheKey as jest.Mock).mockResolvedValue(expected);

      const result = await controller.clearCacheKey(cacheKey);

      expect(result).toBe(expected);
      expect(mockCacheService.clearCacheKey).toHaveBeenCalledWith(cacheKey);
    });
  });

  describe('clearCacheAll', () => {
    it('Given Redis有数据, When DELETE /monitor/cache/clearCacheAll, Then 委托给service.clearCacheAll', async () => {
      const expected = Result.ok(100);
      (mockCacheService.clearCacheAll as jest.Mock).mockResolvedValue(expected);

      const result = await controller.clearCacheAll();

      expect(result).toBe(expected);
      expect(mockCacheService.clearCacheAll).toHaveBeenCalledTimes(1);
    });
  });
});
