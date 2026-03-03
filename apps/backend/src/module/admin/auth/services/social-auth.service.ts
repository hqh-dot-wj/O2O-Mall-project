import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from 'src/config/app-config.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/module/common/redis/redis.service';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response';
import { CacheEnum } from 'src/common/enum';
import { GenerateUUID } from 'src/common/utils';
import { getErrorMessage } from 'src/common/utils/error';

/** 社交平台用户信息 */
export interface SocialUserInfo {
  openid: string;
  unionid?: string;
  nickname: string;
  avatar: string;
}

/** 社交登录策略接口 */
export interface SocialAuthStrategy {
  /** 用授权码换取用户信息 */
  getUserInfo(code: string): Promise<SocialUserInfo>;
}

/** 支持的社交平台 */
export type SocialSource = 'github';

/** 社交登录回调参数 */
export interface SocialCallbackParams {
  source: SocialSource;
  code: string;
  state?: string;
  tenantId: string;
}

/**
 * 社交登录认证服务
 *
 * @description 策略模式实现社交登录，当前支持 GitHub OAuth
 */
@Injectable()
export class SocialAuthService {
  private readonly logger = new Logger(SocialAuthService.name);
  private readonly strategies: Map<SocialSource, SocialAuthStrategy> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly config: AppConfigService,
  ) {
    this.registerStrategies();
  }

  /**
   * 生成社交登录 state 参数（防 CSRF）
   *
   * @param source 社交平台
   * @returns state 字符串
   */
  async generateState(source: SocialSource): Promise<string> {
    const state = GenerateUUID();
    const key = `${CacheEnum.CAPTCHA_CODE_KEY}social_state:${state}`;
    await this.redisService.set(key, source, 5 * 60 * 1000); // 5 分钟有效
    return state;
  }

  /**
   * 社交登录回调处理
   *
   * @description 验证 state → 获取用户信息 → 查找绑定 → 返回 userId
   * @param params 回调参数
   * @returns 已绑定的 userId，未绑定时返回 null
   * @throws BusinessException 当 state 无效或第三方 API 失败时
   */
  async handleCallback(params: SocialCallbackParams): Promise<{ userId: number | null; socialUser: SocialUserInfo }> {
    // 1. 验证 state
    await this.validateState(params.state, params.source);

    // 2. 获取策略
    const strategy = this.checkStrategyExists(params.source);

    // 3. 调用第三方 API 获取用户信息
    const socialUser = await this.doGetSocialUserInfo(strategy, params.source, params.code);

    // 4. 查找绑定关系
    const userId = await this.findBoundUserId(params.source, socialUser.openid, params.tenantId);

    return { userId, socialUser };
  }

  /**
   * 绑定社交账号到后台用户
   *
   * @param userId 后台用户 ID
   * @param source 社交平台
   * @param socialUser 社交用户信息
   * @param tenantId 租户 ID
   */
  async bindSocialUser(
    userId: number,
    source: SocialSource,
    socialUser: SocialUserInfo,
    tenantId: string,
  ): Promise<void> {
    await this.prisma.sysUserSocial.upsert({
      where: {
        source_openid_tenantId: { source, openid: socialUser.openid, tenantId },
      },
      create: {
        userId,
        tenantId,
        source,
        openid: socialUser.openid,
        unionid: socialUser.unionid,
        nickname: socialUser.nickname,
        avatar: socialUser.avatar,
      },
      update: {
        userId,
        nickname: socialUser.nickname,
        avatar: socialUser.avatar,
        unionid: socialUser.unionid,
      },
    });
  }

  /** 验证 state 参数防 CSRF */
  private async validateState(state: string | undefined, source: SocialSource): Promise<void> {
    if (!state) {
      throw new BusinessException(ResponseCode.BAD_REQUEST, '缺少 state 参数');
    }

    const key = `${CacheEnum.CAPTCHA_CODE_KEY}social_state:${state}`;
    const storedSource = await this.redisService.get(key);

    if (!storedSource || storedSource !== source) {
      throw new BusinessException(ResponseCode.BAD_REQUEST, '非法请求，state 验证失败');
    }

    // state 一次性使用
    await this.redisService.del(key);
  }

  /** 检查策略是否存在 */
  private checkStrategyExists(source: SocialSource): SocialAuthStrategy {
    const strategy = this.strategies.get(source);
    if (!strategy) {
      throw new BusinessException(ResponseCode.BAD_REQUEST, `不支持的社交平台: ${source}`);
    }
    return strategy;
  }

  /** 调用第三方 API 获取用户信息 */
  private async doGetSocialUserInfo(
    strategy: SocialAuthStrategy,
    source: SocialSource,
    code: string,
  ): Promise<SocialUserInfo> {
    try {
      return await strategy.getUserInfo(code);
    } catch (error) {
      this.logger.error(`社交登录失败 [${source}]:`, getErrorMessage(error));
      throw new BusinessException(ResponseCode.EXTERNAL_SERVICE_ERROR, '社交登录失败，请重试');
    }
  }

  /** 查找已绑定的后台用户 */
  private async findBoundUserId(
    source: string,
    openid: string,
    tenantId: string,
  ): Promise<number | null> {
    const record = await this.prisma.sysUserSocial.findUnique({
      where: {
        source_openid_tenantId: { source, openid, tenantId },
      },
      select: { userId: true },
    });
    return record?.userId ?? null;
  }

  /** 注册社交登录策略 */
  private registerStrategies(): void {
    const githubConfig = this.config.social?.github;
    if (githubConfig?.clientId) {
      this.strategies.set('github', new GitHubStrategy(githubConfig.clientId, githubConfig.clientSecret));
      this.logger.log('GitHub OAuth 策略已注册');
    }
  }
}

/**
 * GitHub OAuth 策略
 *
 * @description 使用 GitHub OAuth API 获取用户信息，无需额外依赖
 * @see https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
 */
class GitHubStrategy implements SocialAuthStrategy {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  async getUserInfo(code: string): Promise<SocialUserInfo> {
    // 1. 用 code 换取 access_token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
      }),
    });

    const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      throw new BusinessException(
        ResponseCode.EXTERNAL_SERVICE_ERROR,
        `GitHub 授权失败: ${tokenData.error || '未知错误'}`,
      );
    }

    // 2. 用 access_token 获取用户信息
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    });

    const userData = (await userResponse.json()) as {
      id?: number;
      login?: string;
      avatar_url?: string;
      name?: string;
    };

    if (!userData.id) {
      throw new BusinessException(ResponseCode.EXTERNAL_SERVICE_ERROR, 'GitHub 用户信息获取失败');
    }

    return {
      openid: String(userData.id),
      nickname: userData.name || userData.login || '',
      avatar: userData.avatar_url || '',
    };
  }
}
