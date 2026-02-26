import { SocialPlatform } from '@prisma/client';

/**
 * 微信 code2Session 返回的核心数据
 */
export interface WxSessionResult {
  openid: string;
  unionid?: string;
  session_key?: string;
}

/**
 * 客户端认证策略接口
 *
 * @description
 * 不同客户端（商城小程序、师傅小程序、H5、App）实现此接口，
 * 提供各自的「code 换取用户标识」能力。
 * AuthService 通过 ClientAuthStrategyFactory 选择策略，
 * 业务逻辑（注册、绑定推荐人等）保留在 AuthService 中。
 */
export interface IClientAuthStrategy {
  /** 该策略对应的平台 */
  readonly platform: SocialPlatform;

  /**
   * 用客户端传来的 code 换取用户唯一标识（openid / unionid）
   * @param code 客户端登录凭证
   * @returns 成功返回 WxSessionResult，失败抛 BusinessException
   */
  resolveIdentity(code: string): Promise<WxSessionResult>;

  /**
   * 用授权 code 获取用户手机号（可选，部分平台不支持）
   * @param phoneCode 手机号授权凭证
   * @returns 手机号字符串，不支持或失败返回 null
   */
  resolvePhone?(phoneCode: string): Promise<string | null>;
}
