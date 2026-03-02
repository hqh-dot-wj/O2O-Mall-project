import { Injectable, Logger, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'crypto';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TenantContext } from 'src/common/tenant';
import { getErrorMessage } from 'src/common/utils/error';
import { RedisService } from 'src/module/common/redis/redis.service';
import { CACHE_EVICT_METADATA, CACHE_KEY_METADATA, CACHE_TTL_METADATA } from './cache.decorator';

@Injectable()
export class MarketingCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MarketingCacheInterceptor.name);
  private readonly defaultTtlSeconds = 300;
  private readonly jitterRangeSeconds = 30;

  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const cacheKeyPrefix = this.reflector.getAllAndOverride<string>(CACHE_KEY_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);
    const cacheTtlSeconds =
      this.reflector.getAllAndOverride<number>(CACHE_TTL_METADATA, [
        context.getHandler(),
        context.getClass(),
      ]) ?? this.defaultTtlSeconds;
    const evictKeyPrefixes =
      this.reflector.getAllAndOverride<string[]>(CACHE_EVICT_METADATA, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (!cacheKeyPrefix && evictKeyPrefixes.length === 0) {
      return next.handle();
    }

    if (cacheKeyPrefix) {
      return await this.handleCacheable(context, next, cacheKeyPrefix, cacheTtlSeconds);
    }

    return next.handle().pipe(
      tap({
        next: () => {
          void this.evictByPrefixes(evictKeyPrefixes);
        },
      }),
    );
  }

  private async handleCacheable(
    context: ExecutionContext,
    next: CallHandler,
    cacheKeyPrefix: string,
    cacheTtlSeconds: number,
  ): Promise<Observable<unknown>> {
    const cacheKey = this.buildCacheKey(context, cacheKeyPrefix);

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached !== null && cached !== undefined) {
        return of(cached);
      }
    } catch (error) {
      this.logger.warn(`读取缓存失败，继续执行原逻辑: ${getErrorMessage(error)}`);
    }

    return next.handle().pipe(
      tap({
        next: (result) => {
          if (result === undefined) {
            return;
          }

          const ttlMs = this.toTtlMs(cacheTtlSeconds);
          void this.redis.set(cacheKey, result, ttlMs).catch((error) => {
            this.logger.warn(`写入缓存失败，忽略缓存异常: ${getErrorMessage(error)}`);
          });
        },
      }),
    );
  }

  private async evictByPrefixes(prefixes: string[]): Promise<void> {
    if (prefixes.length === 0) {
      return;
    }

    for (const prefix of prefixes) {
      const scopedPrefix = this.addTenantPrefix(prefix);
      const pattern = scopedPrefix.includes('*') ? scopedPrefix : `${scopedPrefix}*`;

      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
      } catch (error) {
        this.logger.warn(`清理缓存失败，pattern=${pattern}: ${getErrorMessage(error)}`);
      }
    }
  }

  private buildCacheKey(context: ExecutionContext, cacheKeyPrefix: string): string {
    const className = context.getClass().name;
    const handlerName = context.getHandler().name;
    const argsDigest = this.hashArgs(context.getArgs());
    const scopedPrefix = this.addTenantPrefix(cacheKeyPrefix);
    return `${scopedPrefix}${className}:${handlerName}:${argsDigest}`;
  }

  private addTenantPrefix(prefix: string): string {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) {
      return prefix;
    }
    return `${prefix}${tenantId}:`;
  }

  private hashArgs(args: unknown[]): string {
    const seen = new WeakSet<object>();
    const raw = JSON.stringify(args, (_key, value) => {
      if (typeof value === 'function') {
        return `[Function:${value.name || 'anonymous'}]`;
      }
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    });
    return createHash('sha1').update(raw ?? '[]').digest('hex');
  }

  private toTtlMs(ttlSeconds: number): number {
    const jitter = Math.floor(Math.random() * this.jitterRangeSeconds);
    return (ttlSeconds + jitter) * 1000;
  }
}
