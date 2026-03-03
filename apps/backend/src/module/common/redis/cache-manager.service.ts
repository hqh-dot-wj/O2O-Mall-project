import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from 'src/module/common/redis/redis.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CacheEnum, DelFlagEnum, StatusEnum } from 'src/common/enum/index';

/** 空值占位符，用于缓存穿透保护 */
const NULL_PLACEHOLDER = '__NULL__';

/** 空值缓存 TTL（秒），较短以便快速恢复 */
const NULL_CACHE_TTL = 60;

/**
 * 缓存预热配置
 */
interface CacheWarmupConfig {
  /** 缓存键前缀 */
  keyPrefix: string;
  /** 过期时间（秒） */
  ttl: number;
  /** 是否在启动时预热 */
  warmOnStart?: boolean;
  /** 预热数据获取函数 */
  fetcher: () => Promise<Map<string, unknown>>;
}

/**
 * 缓存获取选项
 */
interface CacheGetOptions<T> {
  /** 缓存未命中时的数据获取函数 */
  fetcher: () => Promise<T | null>;
  /** 缓存 TTL（秒） */
  ttl: number;
  /** 是否启用空值缓存（防穿透），默认 true */
  cacheNull?: boolean;
}

/**
 * 缓存管理服务
 *
 * @description 统一管理缓存策略，包括：
 * - 缓存预热
 * - 缓存失效
 * - 防雪崩（随机过期偏移）
 * - 防穿透（空值缓存）
 * - 防击穿（互斥锁）
 * - 批量操作
 */
@Injectable()
export class CacheManagerService implements OnModuleInit {
  private readonly logger = new Logger(CacheManagerService.name);

  /** 随机过期时间偏移范围（秒） */
  private readonly JITTER_RANGE = 300; // 5分钟

  /** 缓存预热配置 */
  private warmupConfigs: Map<string, CacheWarmupConfig> = new Map();

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {
    this.registerWarmupConfigs();
  }

  /**
   * 模块初始化时执行缓存预热
   */
  async onModuleInit() {
    this.logger.log('Starting cache warmup...');
    await this.warmupAll();
    this.logger.log('Cache warmup completed');
  }

  /**
   * 注册缓存预热配置
   */
  private registerWarmupConfigs() {
    // 字典缓存预热
    this.warmupConfigs.set('dict', {
      keyPrefix: CacheEnum.SYS_DICT_KEY,
      ttl: 86400, // 24小时
      warmOnStart: true,
      fetcher: async () => {
        const dictTypes = await this.prisma.sysDictType.findMany({
          where: { status: StatusEnum.NORMAL, delFlag: DelFlagEnum.NORMAL },
          select: { dictType: true },
        });

        const result = new Map<string, any>();
        for (const type of dictTypes) {
          const data = await this.prisma.sysDictData.findMany({
            where: {
              dictType: type.dictType,
              status: StatusEnum.NORMAL,
            },
            orderBy: { dictSort: 'asc' },
          });
          result.set(type.dictType, data);
        }
        return result;
      },
    });

    // 系统配置缓存预热
    this.warmupConfigs.set('config', {
      keyPrefix: CacheEnum.SYS_CONFIG_KEY,
      ttl: 3600, // 1小时
      warmOnStart: true,
      fetcher: async () => {
        const configs = await this.prisma.sysConfig.findMany({
          where: { status: StatusEnum.NORMAL, delFlag: DelFlagEnum.NORMAL },
        });

        const result = new Map<string, any>();
        for (const config of configs) {
          result.set(config.configKey, config.configValue);
        }
        return result;
      },
    });
  }

  /**
   * 预热所有配置的缓存
   */
  async warmupAll() {
    for (const [name, config] of this.warmupConfigs) {
      if (config.warmOnStart) {
        try {
          await this.warmup(name);
        } catch (error) {
          this.logger.error(`Failed to warmup cache: ${name}`, error);
        }
      }
    }
  }

  /**
   * 预热指定缓存
   */
  async warmup(name: string) {
    const config = this.warmupConfigs.get(name);
    if (!config) {
      this.logger.warn(`Cache config not found: ${name}`);
      return;
    }

    this.logger.log(`Warming up cache: ${name}`);
    const data = await config.fetcher();

    for (const [key, value] of data) {
      const ttl = this.addJitter(config.ttl);
      await this.redis.set(`${config.keyPrefix}${key}`, value, ttl);
    }

    this.logger.log(`Warmed up ${data.size} entries for: ${name}`);
  }

  /**
   * 添加随机过期偏移（防雪崩）
   */
  private addJitter(baseTtl: number): number {
    const jitter = Math.floor(Math.random() * this.JITTER_RANGE);
    return baseTtl + jitter;
  }

  /**
   * 设置缓存（带随机偏移）
   */
  async set(key: string, value: any, ttl: number) {
    const finalTtl = this.addJitter(ttl);
    await this.redis.set(key, value, finalTtl);
  }

  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    return this.redis.get(key);
  }

  /**
   * 删除缓存
   */
  async del(key: string) {
    await this.redis.del(key);
  }

  /**
   * 批量删除缓存（按前缀）
   */
  async delByPrefix(prefix: string) {
    const keys = await this.redis.keys(`${prefix}*`);
    if (keys.length > 0) {
      await this.redis.del(keys);
      this.logger.log(`Deleted ${keys.length} cache entries with prefix: ${prefix}`);
    }
  }

  /**
   * 刷新指定缓存分类
   */
  async refresh(name: string) {
    const config = this.warmupConfigs.get(name);
    if (!config) {
      this.logger.warn(`Cache config not found: ${name}`);
      return;
    }

    // 先删除旧缓存
    await this.delByPrefix(config.keyPrefix);
    // 重新预热
    await this.warmup(name);
  }

  /**
   * 获取缓存统计信息
   */
  async getStats() {
    const stats: Record<string, { count: number }> = {};

    for (const [name, config] of this.warmupConfigs) {
      const keys = await this.redis.keys(`${config.keyPrefix}*`);
      stats[name] = { count: keys.length };
    }

    return stats;
  }

  /**
   * 带穿透保护的缓存获取（推荐使用）
   * @param key 缓存键
   * @param options 缓存选项
   * @returns 缓存值或 null
   * @description
   * - 缓存命中：直接返回
   * - 缓存未命中：调用 fetcher 获取数据
   * - fetcher 返回 null：缓存空值占位符，防止穿透
   * - 空值占位符 TTL 较短（60秒），便于数据恢复后快速生效
   */
  async getOrSet<T>(key: string, options: CacheGetOptions<T>): Promise<T | null> {
    const { fetcher, ttl, cacheNull = true } = options;

    // 尝试从缓存获取
    const cached = await this.redis.get(key);

    // 命中空值占位符，返回 null（防穿透）
    if (cached === NULL_PLACEHOLDER) {
      return null;
    }

    // 命中有效缓存
    if (cached !== null) {
      return cached as T;
    }

    // 缓存未命中，调用 fetcher
    const data = await fetcher();

    if (data !== null) {
      // 有数据，缓存并返回
      await this.set(key, data, ttl * 1000);
      return data;
    }

    // 数据为空，缓存空值占位符（防穿透）
    if (cacheNull) {
      await this.redis.set(key, NULL_PLACEHOLDER, NULL_CACHE_TTL * 1000);
    }

    return null;
  }

  /**
   * 带击穿保护的缓存获取（热点数据推荐）
   * @param key 缓存键
   * @param options 缓存选项
   * @returns 缓存值或 null
   * @description
   * - 使用互斥锁防止缓存击穿
   * - 热点 Key 过期时，只有一个请求去查询数据库
   * - 其他请求等待或返回旧数据
   */
  async getOrSetWithLock<T>(key: string, options: CacheGetOptions<T>): Promise<T | null> {
    const { fetcher, ttl, cacheNull = true } = options;

    // 尝试从缓存获取
    const cached = await this.redis.get(key);

    if (cached === NULL_PLACEHOLDER) {
      return null;
    }

    if (cached !== null) {
      return cached as T;
    }

    // 缓存未命中，尝试获取互斥锁
    const lockKey = `lock:cache:${key}`;
    const token = await this.redis.tryLock(lockKey, 10000); // 10秒锁超时

    if (!token) {
      // 未获取到锁，等待后重试一次
      await this.sleep(100);
      const retryCache = await this.redis.get(key);
      if (retryCache !== null && retryCache !== NULL_PLACEHOLDER) {
        return retryCache as T;
      }
      return null; // 仍未命中，返回 null
    }

    try {
      // 双重检查：获取锁后再次检查缓存
      const doubleCheck = await this.redis.get(key);
      if (doubleCheck !== null && doubleCheck !== NULL_PLACEHOLDER) {
        return doubleCheck as T;
      }

      // 查询数据
      const data = await fetcher();

      if (data !== null) {
        await this.set(key, data, ttl * 1000);
        return data;
      }

      if (cacheNull) {
        await this.redis.set(key, NULL_PLACEHOLDER, NULL_CACHE_TTL * 1000);
      }

      return null;
    } finally {
      await this.redis.unlock(lockKey, token);
    }
  }

  /**
   * 休眠指定毫秒
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
