import { Module, forwardRef } from '@nestjs/common';
import { RuleValidatorService } from './rule-validator.service';
import { RuleController } from './rule.controller';
import { MarketingPlayModule } from '../play/play.module';

/**
 * 规则校验模块
 *
 * @description
 * 提供统一的营销规则校验服务，包括：
 * 1. DTO 自动校验
 * 2. 业务逻辑校验
 * 3. 表单 Schema 生成
 * 4. 批量校验
 *
 * 依赖模块：
 * - MarketingPlayModule: 获取玩法策略实例
 */
@Module({
  imports: [
    // 导入玩法模块，获取 PlayStrategyFactory
    forwardRef(() => MarketingPlayModule),
  ],
  controllers: [RuleController],
  providers: [RuleValidatorService],
  exports: [RuleValidatorService],
})
export class RuleModule {}
