import { Injectable } from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response/response.interface';
import { IClientAuthStrategy } from './client-auth-strategy.interface';
import { MpMallAuthStrategy } from './mp-mall-auth.strategy';
import { MpWorkAuthStrategy } from './mp-work-auth.strategy';

/**
 * 客户端认证策略工厂
 *
 * @description
 * 根据 SocialPlatform 枚举选择对应的认证策略。
 * 新增客户端只需：1) 实现 IClientAuthStrategy  2) 注入本工厂  3) 注册到 strategyMap
 */
@Injectable()
export class ClientAuthStrategyFactory {
  private readonly strategyMap: Map<SocialPlatform, IClientAuthStrategy>;

  constructor(
    private readonly mpMallStrategy: MpMallAuthStrategy,
    private readonly mpWorkStrategy: MpWorkAuthStrategy,
  ) {
    this.strategyMap = new Map<SocialPlatform, IClientAuthStrategy>([
      [SocialPlatform.MP_MALL, this.mpMallStrategy],
      [SocialPlatform.MP_WORK, this.mpWorkStrategy],
    ]);
  }

  /**
   * 获取指定平台的认证策略
   * @param platform 目标平台，默认 MP_MALL（向后兼容）
   */
  getStrategy(platform: SocialPlatform = SocialPlatform.MP_MALL): IClientAuthStrategy {
    const strategy = this.strategyMap.get(platform);
    if (!strategy) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, `不支持的登录平台: ${platform}`);
    }
    return strategy;
  }
}
