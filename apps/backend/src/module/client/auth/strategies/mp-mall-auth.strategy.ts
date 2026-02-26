import { Injectable } from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import { WechatService } from '../../common/service/wechat.service';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response/response.interface';
import { IClientAuthStrategy, WxSessionResult } from './client-auth-strategy.interface';

/**
 * 商城小程序（C端消费者）认证策略
 *
 * @description
 * 使用微信小程序 jscode2session 接口换取 openid，
 * 使用微信手机号快速验证接口获取手机号。
 */
@Injectable()
export class MpMallAuthStrategy implements IClientAuthStrategy {
  readonly platform = SocialPlatform.MP_MALL;

  constructor(private readonly wechatService: WechatService) {}

  async resolveIdentity(code: string): Promise<WxSessionResult> {
    const res = await this.wechatService.code2Session(code, this.platform);
    if (!res.success) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, res.msg || '微信登录失败');
    }
    return {
      openid: res.data.openid,
      unionid: res.data.unionid,
      session_key: res.data.session_key,
    };
  }

  async resolvePhone(phoneCode: string): Promise<string | null> {
    return this.wechatService.getPhoneNumber(phoneCode, this.platform);
  }
}
