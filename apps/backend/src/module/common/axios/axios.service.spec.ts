// @ts-nocheck
import { AxiosService } from './axios.service';
import type { HttpService } from '@nestjs/axios';
import type { RedisService } from '../redis/redis.service';
import type { AppConfigService } from 'src/config/app-config.service';

const createMocks = () => {
  const axiosRef = jest.fn();
  const httpService = { axiosRef } as unknown as HttpService;

  const redis = {
    get: jest.fn(),
    set: jest.fn(),
  } as unknown as RedisService;

  const config = {
    app: {
      ipLocation: {
        apiUrl: 'https://test-ip-api.com/json',
        timeout: 3000,
        cacheTtl: 3600,
      },
    },
  } as unknown as AppConfigService;

  return { axiosRef, httpService, redis, config };
};

describe('AxiosService', () => {
  let service: AxiosService;
  let mocks: ReturnType<typeof createMocks>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMocks();
    service = new AxiosService(mocks.httpService, mocks.redis as any, mocks.config);
  });

  describe('getIpAddress', () => {
    // R-IN-IP-01: 空 IP 返回未知
    it('Given empty ip, When getIpAddress, Then return 未知', async () => {
      const result = await service.getIpAddress('');
      expect(result).toBe('未知');
      expect(mocks.redis.get).not.toHaveBeenCalled();
    });

    // R-FLOW-IP-01: 缓存命中直接返回
    it('Given ip in cache, When getIpAddress, Then return cached value without API call', async () => {
      (mocks.redis.get as jest.Mock).mockResolvedValue('北京市');

      const result = await service.getIpAddress('1.2.3.4');

      expect(result).toBe('北京市');
      expect(mocks.redis.get).toHaveBeenCalledWith('ip:location:1.2.3.4');
      expect(mocks.axiosRef).not.toHaveBeenCalled();
    });

    // R-FLOW-IP-02: 缓存未命中调用 API 并缓存结果
    it('Given ip not in cache, When getIpAddress, Then call API and cache result', async () => {
      (mocks.redis.get as jest.Mock).mockResolvedValue(null);
      mocks.axiosRef.mockResolvedValue({ data: { addr: '上海市' } });

      const result = await service.getIpAddress('1.2.3.4');

      expect(result).toBe('上海市');
      expect(mocks.axiosRef).toHaveBeenCalledWith(
        expect.stringContaining('1.2.3.4'),
        expect.objectContaining({ timeout: 3000 }),
      );
      expect(mocks.redis.set).toHaveBeenCalledWith('ip:location:1.2.3.4', '上海市', 3600000);
    });

    // R-BRANCH-IP-01: API 失败降级返回未知并缓存
    it('Given API failure, When getIpAddress, Then return 未知 and cache it', async () => {
      (mocks.redis.get as jest.Mock).mockResolvedValue(null);
      mocks.axiosRef.mockRejectedValue(new Error('network error'));

      const result = await service.getIpAddress('1.2.3.4');

      expect(result).toBe('未知');
      // 缓存"未知"防止缓存穿透
      expect(mocks.redis.set).toHaveBeenCalledWith('ip:location:1.2.3.4', '未知', 3600000);
    });

    // R-FLOW-IP-03: 使用配置的 API URL
    it('Given custom config, When getIpAddress, Then use configured apiUrl', async () => {
      (mocks.redis.get as jest.Mock).mockResolvedValue(null);
      mocks.axiosRef.mockResolvedValue({ data: { addr: '深圳市' } });

      await service.getIpAddress('5.6.7.8');

      expect(mocks.axiosRef).toHaveBeenCalledWith(
        'https://test-ip-api.com/json?ip=5.6.7.8&json=true',
        expect.any(Object),
      );
    });

    // R-BRANCH-IP-02: API 返回空 addr 时返回未知
    it('Given API returns empty addr, When getIpAddress, Then return 未知', async () => {
      (mocks.redis.get as jest.Mock).mockResolvedValue(null);
      mocks.axiosRef.mockResolvedValue({ data: { addr: '' } });

      const result = await service.getIpAddress('1.2.3.4');

      expect(result).toBe('未知');
    });
  });

  describe('默认配置', () => {
    // R-FLOW-IP-04: 无配置时使用默认值
    it('Given no ipLocation config, When getIpAddress, Then use default config', async () => {
      const configWithoutIp = {
        app: {},
      } as unknown as AppConfigService;
      const serviceWithDefault = new AxiosService(mocks.httpService, mocks.redis as any, configWithoutIp);

      (mocks.redis.get as jest.Mock).mockResolvedValue(null);
      mocks.axiosRef.mockResolvedValue({ data: { addr: '广州市' } });

      await serviceWithDefault.getIpAddress('1.2.3.4');

      expect(mocks.axiosRef).toHaveBeenCalledWith(
        'https://whois.pconline.com.cn/ipJson.jsp?ip=1.2.3.4&json=true',
        expect.objectContaining({ timeout: 3000 }),
      );
      // 默认 cacheTtl 是 3600 秒
      expect(mocks.redis.set).toHaveBeenCalledWith('ip:location:1.2.3.4', '广州市', 3600000);
    });
  });
});
