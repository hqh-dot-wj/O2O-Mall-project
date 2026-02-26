import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/module/common/redis/redis.service';
import { CacheEnum } from 'src/common/enum';
import { lastValueFrom } from 'rxjs';
import { getErrorMessage } from 'src/common/utils/error';
import { SocialPlatform } from '@prisma/client';

/** 微信 API 调用超时时间（ms），§11.5 外部依赖必须设超时 */
const WX_API_TIMEOUT = 5000;

/**
 * 平台 → 配置路径映射
 * SocialPlatform 枚举值对应 config/index.ts 中 wechat 下的嵌套 key
 */
const PLATFORM_CONFIG_MAP: Record<string, { appidPath: string; secretPath: string }> = {
  [SocialPlatform.MP_MALL]: { appidPath: 'wechat.mpMall.appid', secretPath: 'wechat.mpMall.secret' },
  [SocialPlatform.MP_WORK]: { appidPath: 'wechat.mpWork.appid', secretPath: 'wechat.mpWork.secret' },
  // APP_MAIN 暂时复用 H5 配置，后续可独立
  [SocialPlatform.APP_MAIN]: { appidPath: 'wechat.h5.appid', secretPath: 'wechat.h5.secret' },
};

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 根据平台获取 appid / secret
   * 未配置的平台 fallback 到顶层 wechat.appid / wechat.secret
   */
  private getCredentials(platform: SocialPlatform): { appId: string; secret: string } {
    const paths = PLATFORM_CONFIG_MAP[platform];
    let appId = '';
    let secret = '';

    if (paths) {
      appId = this.configService.get(paths.appidPath) || '';
      secret = this.configService.get(paths.secretPath) || '';
    }

    // fallback 到顶层配置（向后兼容）
    if (!appId) appId = this.configService.get('wechat.appid') || '';
    if (!secret) secret = this.configService.get('wechat.secret') || '';

    return { appId, secret };
  }

  /**
   * 获取 WeChat AccessToken (带缓存)
   * @param platform 目标平台，默认 MP_MALL（向后兼容）
   */
  async getAccessToken(platform: SocialPlatform = SocialPlatform.MP_MALL): Promise<string | null> {
    const { appId, secret } = this.getCredentials(platform);
    const cacheKey = `${CacheEnum.WECHAT_ACCESS_TOKEN_KEY}${appId}`;

    // 1. 先查缓存
    const cachedToken = await this.redisService.get(cacheKey);
    if (cachedToken) return cachedToken;

    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`;
    try {
      const res = await lastValueFrom(this.httpService.get(url, { timeout: WX_API_TIMEOUT }));
      if (res.data.access_token) {
        // 2. 存入缓存 (提前200秒过期，防止边界问题)
        await this.redisService.set(cacheKey, res.data.access_token, (res.data.expires_in || 7200) - 200);
        return res.data.access_token;
      }
      return null;
    } catch (error) {
      this.logger.error('Failed to get WeChat AccessToken:', getErrorMessage(error));
      return null;
    }
  }

  /**
   * code 换取 session_key (jscode2session)
   * @param code 微信登录 code
   * @param platform 目标平台，默认 MP_MALL（向后兼容）
   */
  async code2Session(code: string, platform: SocialPlatform = SocialPlatform.MP_MALL) {
    const { appId, secret } = this.getCredentials(platform);

    if (!appId || !secret) {
      return { success: false, msg: '后端未配置微信AppID或Secret' };
    }

    // 显式 Mock 模式 (以 mock- 开头)
    if (code?.startsWith('mock-')) {
      return {
        success: true,
        data: {
          openid: 'mock-openid-' + code,
          session_key: 'mock-session',
          unionid: 'mock-unionid-' + code,
        },
      };
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
    try {
      const res = await lastValueFrom(this.httpService.get(url, { timeout: WX_API_TIMEOUT }));
      if (res.data.errcode) {
        return { success: false, msg: res.data.errmsg };
      }
      return { success: true, data: res.data };
    } catch (error) {
      const err = error as { response?: { data?: unknown }; message?: string };
      this.logger.error('WeChat API Error Details:', err?.response?.data || getErrorMessage(error));
      return { success: false, msg: `微信API请求失败: ${getErrorMessage(error)}` };
    }
  }

  /**
   * 获取微信用户手机号
   * @param phoneCode 手机号授权 code
   * @param platform 目标平台，默认 MP_MALL（向后兼容）
   */
  async getPhoneNumber(phoneCode: string, platform: SocialPlatform = SocialPlatform.MP_MALL): Promise<string | null> {
    const { appId, secret } = this.getCredentials(platform);

    if (!appId || !secret) {
      this.logger.error('后端未配置微信AppID或Secret');
      return null;
    }

    // 显式 Mock 模式 (以 mock- 开头)
    if (phoneCode?.startsWith('mock-')) {
      return '13800138000'; // Mock Phone
    }

    // 微信新版获取手机号接口
    // 需要先获取 access_token
    const accessToken = await this.getAccessToken(platform);
    if (!accessToken) return null;

    const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`;
    try {
      const res = await lastValueFrom(this.httpService.post(url, { code: phoneCode }, { timeout: WX_API_TIMEOUT }));
      if (res.data.errcode === 0 && res.data.phone_info) {
        return res.data.phone_info.phoneNumber;
      }
      this.logger.error('getPhoneNumber error:', res.data);
      return null;
    } catch (error) {
      this.logger.error('Failed to get WeChat Phone Number:', getErrorMessage(error));
      return null;
    }
  }

  /**
   * 获取小程序码（无限制）
   * @param scene 场景值，最多32字符
   * @param options.page 小程序页面路径
   * @param options.width 二维码宽度 (默认430)
   * @param options.envVersion 小程序版本 (默认release)
   * @param platform 目标平台，默认 MP_MALL（向后兼容）
   * @returns 小程序码图片Buffer，失败返回null
   */
  async getWxaCodeUnlimited(
    scene: string,
    options?: {
      page?: string;
      width?: number;
      envVersion?: 'develop' | 'trial' | 'release';
    },
    platform: SocialPlatform = SocialPlatform.MP_MALL,
  ): Promise<Buffer | null> {
    const accessToken = await this.getAccessToken(platform);
    if (!accessToken) {
      this.logger.error('获取 AccessToken 失败');
      return null;
    }

    const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`;
    const body = {
      scene: scene.slice(0, 32),
      page: options?.page,
      width: options?.width || 430,
      env_version: options?.envVersion || 'release',
      check_path: false,
    };

    try {
      const res = await lastValueFrom(
        this.httpService.post(url, body, {
          responseType: 'arraybuffer',
          timeout: WX_API_TIMEOUT,
        }),
      );

      // 检查是否返回错误（JSON格式）
      const buffer = Buffer.from(res.data);
      const firstBytes = buffer.slice(0, 10).toString('utf8');

      if (firstBytes.includes('{')) {
        const errorData = JSON.parse(buffer.toString('utf8'));
        this.logger.error('生成小程序码失败:', errorData);
        return null;
      }

      return buffer;
    } catch (error) {
      this.logger.error('调用 wxacode.getUnlimited 失败:', getErrorMessage(error));
      return null;
    }
  }
}
