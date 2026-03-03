import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import iconv from 'iconv-lite';
import { RedisService } from '../redis/redis.service';
import { AppConfigService } from 'src/config/app-config.service';

/** IP 地理位置缓存键前缀 */
const IP_CACHE_PREFIX = 'ip:location:';

/** 默认配置 */
const DEFAULT_IP_CONFIG = {
  apiUrl: 'https://whois.pconline.com.cn/ipJson.jsp',
  timeout: 3000,
  cacheTtl: 3600, // 1 小时
};

@Injectable()
export class AxiosService {
  private readonly logger = new Logger(AxiosService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly redis: RedisService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * 获取 IP 地理位置配置
   */
  private getIpConfig() {
    return this.config.app.ipLocation ?? DEFAULT_IP_CONFIG;
  }

  /**
   * 获取 IP 地址的地理位置信息
   * @param ip IP 地址
   * @returns 地理位置字符串，失败返回"未知"
   * @description
   * - 优先从缓存获取，缓存 TTL 默认 1 小时
   * - 缓存未命中时调用第三方 API 查询
   * - 查询失败降级返回"未知"，不影响主流程
   */
  async getIpAddress(ip: string): Promise<string> {
    if (!ip) return '未知';

    // 尝试从缓存获取
    const cacheKey = `${IP_CACHE_PREFIX}${ip}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return cached as string;
    }

    // 缓存未命中，调用第三方 API
    const location = await this.fetchIpLocation(ip);

    // 写入缓存（包括"未知"，防止缓存穿透）
    const { cacheTtl } = this.getIpConfig();
    await this.redis.set(cacheKey, location, cacheTtl * 1000);

    return location;
  }

  /**
   * 从第三方 API 获取 IP 地理位置
   */
  private async fetchIpLocation(ip: string): Promise<string> {
    try {
      const { apiUrl, timeout } = this.getIpConfig();
      const response = await this.httpService.axiosRef(`${apiUrl}?ip=${ip}&json=true`, {
        responseType: 'arraybuffer',
        timeout,
        transformResponse: [
          function (data: Buffer) {
            const str = iconv.decode(data, 'gbk');
            return JSON.parse(str);
          },
        ],
      });
      return response.data.addr || '未知';
    } catch (error) {
      this.logger.warn(`IP 地理位置查询失败: ${ip}`);
      return '未知';
    }
  }
}
