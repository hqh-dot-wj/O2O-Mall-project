import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/module/common/redis/redis.service';
import { CacheEnum } from 'src/common/enum';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class WechatService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 获取 WeChat AccessToken (带缓存)
   */
  async getAccessToken(): Promise<string | null> {
    const appId = this.configService.get('wechat.appid');
    const secret = this.configService.get('wechat.secret');
    const cacheKey = `${CacheEnum.WECHAT_ACCESS_TOKEN_KEY}${appId}`;

    // 1. 先查缓存
    const cachedToken = await this.redisService.get(cacheKey);
    if (cachedToken) return cachedToken;

    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`;
    try {
      const res = await lastValueFrom(this.httpService.get(url));
      if (res.data.access_token) {
        // 2. 存入缓存 (提前200秒过期，防止边界问题)
        await this.redisService.set(cacheKey, res.data.access_token, (res.data.expires_in || 7200) - 200);
        return res.data.access_token;
      }
      return null;
    } catch (e) {
      console.error('Failed to get WeChat AccessToken:', e);
      return null;
    }
  }

  /**
   * code 换取 session_key (jscode2session)
   */
  async code2Session(code: string) {
    const appId = this.configService.get('wechat.appid');
    const secret = this.configService.get('wechat.secret');

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
      const res = await lastValueFrom(this.httpService.get(url));
      if (res.data.errcode) {
        return { success: false, msg: res.data.errmsg };
      }
      return { success: true, data: res.data };
    } catch (error) {
      console.error('WeChat API Error Details:', error?.response?.data || error.message || error);
      return { success: false, msg: `微信API请求失败: ${error.message || 'Unknown error'}` };
    }
  }

  /**
   * 获取微信用户手机号
   */
  async getPhoneNumber(phoneCode: string): Promise<string | null> {
    const appId = this.configService.get('wechat.appid');
    const secret = this.configService.get('wechat.secret');

    if (!appId || !secret) {
      console.error('后端未配置微信AppID或Secret');
      return null;
    }

    // 显式 Mock 模式 (以 mock- 开头)
    if (phoneCode?.startsWith('mock-')) {
      return '13800138000'; // Mock Phone
    }

    // 微信新版获取手机号接口: https://api.weixin.qq.com/wxa/business/getuserphonenumber
    // 需要先获取 access_token
    const accessToken = await this.getAccessToken();
    if (!accessToken) return null;

    const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`;
    try {
      const res = await lastValueFrom(this.httpService.post(url, { code: phoneCode }));
      if (res.data.errcode === 0 && res.data.phone_info) {
        return res.data.phone_info.phoneNumber; // or purePhoneNumber
      }
      console.error('getPhoneNumber error:', res.data);
      return null;
    } catch (e) {
      console.error('Failed to get WeChat Phone Number:', e);
      return null;
    }
  }

  /**
   * 获取小程序码（无限制）
   * @param scene 场景值，最多32字符
   * @param options.page 小程序页面路径
   * @param options.width 二维码宽度 (默认430)
   * @param options.envVersion 小程序版本 (默认release)
   * @returns 小程序码图片Buffer，失败返回null
   */
  async getWxaCodeUnlimited(
    scene: string,
    options?: {
      page?: string;
      width?: number;
      envVersion?: 'develop' | 'trial' | 'release';
    },
  ): Promise<Buffer | null> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      console.error('获取 AccessToken 失败');
      return null;
    }

    const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`;
    const body = {
      scene: scene.slice(0, 32), // 场景值最多32字符
      page: options?.page,
      width: options?.width || 430,
      env_version: options?.envVersion || 'release',
      check_path: false, // 不校验页面是否存在
    };

    try {
      const res = await lastValueFrom(
        this.httpService.post(url, body, {
          responseType: 'arraybuffer', // 返回二进制数据
        }),
      );

      // 检查是否返回错误（JSON格式）
      const buffer = Buffer.from(res.data);
      const firstBytes = buffer.slice(0, 10).toString('utf8');

      if (firstBytes.includes('{')) {
        // 返回的是JSON错误信息
        const errorData = JSON.parse(buffer.toString('utf8'));
        console.error('生成小程序码失败:', errorData);
        return null;
      }

      return buffer;
    } catch (e) {
      console.error('调用 wxacode.getUnlimited 失败:', e?.message || e);
      return null;
    }
  }
}
