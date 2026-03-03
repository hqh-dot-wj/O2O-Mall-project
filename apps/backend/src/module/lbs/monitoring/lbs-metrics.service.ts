import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/module/common/redis/redis.service';
import type Redis from 'ioredis';

/**
 * LBS 监控指标服务
 * 提供位置服务的关键指标监控
 */
@Injectable()
export class LbsMetricsService {
  private readonly logger = new Logger(LbsMetricsService.name);
  private readonly metricsPrefix = 'lbs:metrics';
  private readonly redis: Redis;

  constructor(private readonly redisService: RedisService) {
    this.redis = this.redisService.getClient();
  }

  /**
   * 记录位置匹配请求
   * @param success 是否成功
   * @param latencyMs 延迟（毫秒）
   */
  async recordMatchRequest(success: boolean, latencyMs: number): Promise<void> {
    try {
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const hourKey = new Date().toISOString().substring(0, 13); // YYYY-MM-DDTHH

      // 记录总请求数
      await this.redis.incr(`${this.metricsPrefix}:match:total:${date}`);
      await this.redis.expire(`${this.metricsPrefix}:match:total:${date}`, 86400 * 7); // 保留7天

      // 记录成功/失败数
      const statusKey = success ? 'success' : 'failure';
      await this.redis.incr(`${this.metricsPrefix}:match:${statusKey}:${date}`);
      await this.redis.expire(`${this.metricsPrefix}:match:${statusKey}:${date}`, 86400 * 7);

      // 记录延迟（使用 sorted set 存储 P95/P99）
      await this.redis.zadd(`${this.metricsPrefix}:match:latency:${hourKey}`, latencyMs, Date.now().toString());
      await this.redis.expire(`${this.metricsPrefix}:match:latency:${hourKey}`, 86400); // 保留1天
    } catch (error) {
      this.logger.warn(`Failed to record match request metrics: ${error}`);
    }
  }

  /**
   * 记录围栏命中
   * @param stationId 站点ID
   */
  async recordFenceHit(stationId: number): Promise<void> {
    try {
      const date = new Date().toISOString().split('T')[0];
      await this.redis.incr(`${this.metricsPrefix}:fence:hit:${date}`);
      await this.redis.expire(`${this.metricsPrefix}:fence:hit:${date}`, 86400 * 7);

      // 记录站点命中次数
      await this.redis.zincrby(`${this.metricsPrefix}:station:hits:${date}`, 1, stationId.toString());
      await this.redis.expire(`${this.metricsPrefix}:station:hits:${date}`, 86400 * 7);
    } catch (error) {
      this.logger.warn(`Failed to record fence hit metrics: ${error}`);
    }
  }

  /**
   * 记录半径降级
   */
  async recordRadiusFallback(): Promise<void> {
    try {
      const date = new Date().toISOString().split('T')[0];
      await this.redis.incr(`${this.metricsPrefix}:radius:fallback:${date}`);
      await this.redis.expire(`${this.metricsPrefix}:radius:fallback:${date}`, 86400 * 7);
    } catch (error) {
      this.logger.warn(`Failed to record radius fallback metrics: ${error}`);
    }
  }

  /**
   * 获取今日匹配统计
   */
  async getTodayMatchStats(): Promise<{
    total: number;
    success: number;
    failure: number;
    successRate: number;
    fenceHits: number;
    radiusFallbacks: number;
  }> {
    const date = new Date().toISOString().split('T')[0];

    const [total, success, failure, fenceHits, radiusFallbacks] = await Promise.all([
      this.getMetricValue(`${this.metricsPrefix}:match:total:${date}`),
      this.getMetricValue(`${this.metricsPrefix}:match:success:${date}`),
      this.getMetricValue(`${this.metricsPrefix}:match:failure:${date}`),
      this.getMetricValue(`${this.metricsPrefix}:fence:hit:${date}`),
      this.getMetricValue(`${this.metricsPrefix}:radius:fallback:${date}`),
    ]);

    const successRate = total > 0 ? (success / total) * 100 : 0;

    return {
      total,
      success,
      failure,
      successRate: Math.round(successRate * 100) / 100,
      fenceHits,
      radiusFallbacks,
    };
  }

  /**
   * 获取当前小时的 P95 延迟
   */
  async getCurrentHourP95Latency(): Promise<number> {
    const hourKey = new Date().toISOString().substring(0, 13);
    const key = `${this.metricsPrefix}:match:latency:${hourKey}`;

    try {
      const count = await this.redis.zcard(key);
      if (count === 0) return 0;

      const p95Index = Math.ceil(count * 0.95) - 1;
      const values = await this.redis.zrange(key, p95Index, p95Index);

      return values && values.length > 0 ? parseFloat(values[0]) : 0;
    } catch (error) {
      this.logger.warn(`Failed to get P95 latency: ${error}`);
      return 0;
    }
  }

  /**
   * 获取热门站点（今日命中次数 Top 10）
   */
  async getTopStations(limit: number = 10): Promise<Array<{ stationId: string; hits: number }>> {
    const date = new Date().toISOString().split('T')[0];
    const key = `${this.metricsPrefix}:station:hits:${date}`;

    try {
      const results = await this.redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
      const stations: Array<{ stationId: string; hits: number }> = [];

      for (let i = 0; i < results.length; i += 2) {
        stations.push({
          stationId: results[i],
          hits: parseInt(results[i + 1], 10),
        });
      }

      return stations;
    } catch (error) {
      this.logger.warn(`Failed to get top stations: ${error}`);
      return [];
    }
  }

  private async getMetricValue(key: string): Promise<number> {
    try {
      const value = await this.redis.get(key);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      return 0;
    }
  }
}
