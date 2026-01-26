import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IMarketingStrategy } from './strategy.interface';
import { GroupBuyService } from './group-buy.service';
import { CourseGroupBuyService } from './course-group-buy.service';
import { MemberUpgradeService } from './member-upgrade.service';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ResponseCode } from 'src/common/response/response.interface';

@Injectable()
export class PlayStrategyFactory implements OnModuleInit {
  private strategies = new Map<string, IMarketingStrategy>();

  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleInit() {
    // 在模块初始化时注册所有策略
    // 注意：这里需要手动注册所有已实现的策略服务
    // 也可以通过装饰器自动扫描，但手动注册更显式且易于调试
    this.register(GroupBuyService);
    this.register(CourseGroupBuyService);
    this.register(MemberUpgradeService);
  }

  private register(strategyClass: any) {
    const instance = this.moduleRef.get(strategyClass, { strict: false });
    if (instance && instance.code) {
      this.strategies.set(instance.code, instance);
    }
  }

  /**
   * 获取策略实例
   */
  getStrategy(code: string): IMarketingStrategy {
    const strategy = this.strategies.get(code);
    if (!strategy) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, `未找到玩法策略: ${code}`);
    }
    return strategy;
  }
}
