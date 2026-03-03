// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { RedisService } from 'src/module/common/redis/redis.service';
import { ResponseCode } from 'src/common/response';

describe('CacheService', () => {
  let service: CacheService;

  const mockRedisService = {
    getInfo: jest.fn(),
    getDbSize: jest.fn(),
    commandStats: jest.fn(),
    keys: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    reset: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // R-FLOW-CACHE-01: 获取缓存监控信息
  describe('getInfo', () => {
    it('Given Redis正常, When getInfo, Then 返回info+dbSize+commandStats', async () => {
      // Arrange
      const mockInfo = { redis_version: '7.0.0', used_memory: '1024' };
      const mockDbSize = 42;
      const mockCommandStats = [
        { name: 'get', value: 100 },
        { name: 'set', value: 50 },
      ];
      mockRedisService.getInfo.mockResolvedValue(mockInfo);
      mockRedisService.getDbSize.mockResolvedValue(mockDbSize);
      mockRedisService.commandStats.mockResolvedValue(mockCommandStats);

      // Act
      const result = await service.getInfo();

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toEqual({
        dbSize: mockDbSize,
        info: mockInfo,
        commandStats: mockCommandStats,
      });
      expect(mockRedisService.getInfo).toHaveBeenCalledTimes(1);
      expect(mockRedisService.getDbSize).toHaveBeenCalledTimes(1);
      expect(mockRedisService.commandStats).toHaveBeenCalledTimes(1);
    });

    // R-RESP-CACHE-01: info 为 Record<string, string>
    it('Given Redis返回INFO数据, When getInfo, Then info为键值对对象', async () => {
      // Arrange
      const mockInfo = {
        redis_version: '7.0.0',
        redis_mode: 'standalone',
        connected_clients: '5',
      };
      mockRedisService.getInfo.mockResolvedValue(mockInfo);
      mockRedisService.getDbSize.mockResolvedValue(0);
      mockRedisService.commandStats.mockResolvedValue([]);

      // Act
      const result = await service.getInfo();

      // Assert
      expect(result.data.info).toEqual(mockInfo);
      expect(typeof result.data.info).toBe('object');
    });

    // R-RESP-CACHE-02: commandStats 为 {name, value}[] 数组
    it('Given Redis有命令统计, When getInfo, Then commandStats为name/value数组', async () => {
      // Arrange
      const mockCommandStats = [
        { name: 'get', value: 200 },
        { name: 'set', value: 100 },
        { name: 'del', value: 10 },
      ];
      mockRedisService.getInfo.mockResolvedValue({});
      mockRedisService.getDbSize.mockResolvedValue(0);
      mockRedisService.commandStats.mockResolvedValue(mockCommandStats);

      // Act
      const result = await service.getInfo();

      // Assert
      expect(Array.isArray(result.data.commandStats)).toBe(true);
      result.data.commandStats.forEach((stat) => {
        expect(stat).toHaveProperty('name');
        expect(stat).toHaveProperty('value');
        expect(typeof stat.name).toBe('string');
        expect(typeof stat.value).toBe('number');
      });
    });
  });

  // R-FLOW-CACHE-02: 获取缓存名称列表
  describe('getNames', () => {
    it('Given 预定义分类, When getNames, Then 返回7个缓存分类', async () => {
      // Act
      const result = await service.getNames();

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toHaveLength(7);
    });

    // R-RESP-CACHE-03: 每项含 cacheName + remark
    it('Given 预定义分类, When getNames, Then 每项含cacheName和remark', async () => {
      // Act
      const result = await service.getNames();

      // Assert
      result.data.forEach((item) => {
        expect(item).toHaveProperty('cacheName');
        expect(item).toHaveProperty('remark');
        expect(typeof item.cacheName).toBe('string');
        expect(typeof item.remark).toBe('string');
        expect(item.cacheName.length).toBeGreaterThan(0);
        expect(item.remark.length).toBeGreaterThan(0);
      });
    });

    it('Given 预定义分类, When getNames, Then 包含所有预期的缓存前缀', async () => {
      // Act
      const result = await service.getNames();

      // Assert
      const cacheNames = result.data.map((item) => item.cacheName);
      expect(cacheNames).toContain('login_tokens:');
      expect(cacheNames).toContain('sys_config:');
      expect(cacheNames).toContain('sys_dict:');
      expect(cacheNames).toContain('captcha_codes:');
      expect(cacheNames).toContain('repeat_submit:');
      expect(cacheNames).toContain('rate_limit:');
      expect(cacheNames).toContain('pwd_err_cnt:');
    });
  });

  // R-FLOW-CACHE-03 / R-FLOW-CACHE-04: 获取缓存键名列表
  describe('getKeys', () => {
    it('Given 前缀下有缓存键, When getKeys, Then 返回匹配的键名列表', async () => {
      // Arrange
      const prefix = 'login_tokens:';
      const mockKeys = ['login_tokens:abc123', 'login_tokens:def456'];
      mockRedisService.keys.mockResolvedValue(mockKeys);

      // Act
      const result = await service.getKeys(prefix);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toEqual(mockKeys);
      expect(mockRedisService.keys).toHaveBeenCalledWith('login_tokens:*');
    });

    it('Given 前缀下无缓存键, When getKeys, Then 返回空数组', async () => {
      // Arrange
      mockRedisService.keys.mockResolvedValue([]);

      // Act
      const result = await service.getKeys('rate_limit:');

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toEqual([]);
    });
  });

  // R-FLOW-CACHE-05 / R-FLOW-CACHE-06: 获取缓存内容
  describe('getValue', () => {
    it('Given cacheName和cacheKey有效, When getValue, Then 返回缓存详情', async () => {
      // Arrange
      const params = {
        cacheName: 'sys_config:',
        cacheKey: 'sys_config:site.name',
      };
      const mockValue = { siteName: '测试站点' };
      mockRedisService.get.mockResolvedValue(mockValue);

      // Act
      const result = await service.getValue(params);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.cacheName).toBe('sys_config:');
      expect(result.data.cacheKey).toBe('sys_config:site.name');
      expect(result.data.cacheValue).toBe(JSON.stringify(mockValue));
      expect(result.data.remark).toBe('配置信息');
    });

    it('Given cacheKey对应值为null, When getValue, Then cacheValue为"null"', async () => {
      // Arrange
      const params = {
        cacheName: 'sys_config:',
        cacheKey: 'sys_config:nonexistent',
      };
      mockRedisService.get.mockResolvedValue(null);

      // Act
      const result = await service.getValue(params);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.cacheValue).toBe('null');
    });
  });

  // R-FLOW-CACHE-07 / R-FLOW-CACHE-08: 清理缓存分类
  describe('clearCacheName', () => {
    it('Given 分类下有缓存键, When clearCacheName, Then 删除所有匹配键', async () => {
      // Arrange
      const cacheName = 'captcha_codes:';
      const mockKeys = ['captcha_codes:uuid1', 'captcha_codes:uuid2'];
      mockRedisService.keys.mockResolvedValue(mockKeys);
      mockRedisService.del.mockResolvedValue(2);

      // Act
      const result = await service.clearCacheName(cacheName);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(mockRedisService.keys).toHaveBeenCalledWith('captcha_codes:*');
      expect(mockRedisService.del).toHaveBeenCalledWith(mockKeys);
    });

    it('Given 分类下无缓存键, When clearCacheName, Then 返回成功', async () => {
      // Arrange
      mockRedisService.keys.mockResolvedValue([]);
      mockRedisService.del.mockResolvedValue(0);

      // Act
      const result = await service.clearCacheName('rate_limit:');

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
    });
  });

  // R-FLOW-CACHE-09: 清理缓存键名
  describe('clearCacheKey', () => {
    it('Given 键存在, When clearCacheKey, Then 删除成功', async () => {
      // Arrange
      const cacheKey = 'login_tokens:abc123';
      mockRedisService.del.mockResolvedValue(1);

      // Act
      const result = await service.clearCacheKey(cacheKey);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(mockRedisService.del).toHaveBeenCalledWith(cacheKey);
    });
  });

  // R-FLOW-CACHE-10: 清空全部缓存
  describe('clearCacheAll', () => {
    it('Given Redis有数据, When clearCacheAll, Then 清空所有键', async () => {
      // Arrange
      mockRedisService.reset.mockResolvedValue(100);

      // Act
      const result = await service.clearCacheAll();

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(mockRedisService.reset).toHaveBeenCalledTimes(1);
    });
  });
});
