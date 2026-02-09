import { Module } from '@nestjs/common';
import { PointsRuleController } from './rule.controller';
import { PointsRuleService } from './rule.service';
import { PointsRuleRepository } from './rule.repository';

/**
 * 积分规则模块
 * 
 * @description 提供积分规则的配置管理功能
 */
@Module({
  controllers: [PointsRuleController],
  providers: [PointsRuleService, PointsRuleRepository],
  exports: [PointsRuleService, PointsRuleRepository],
})
export class PointsRuleModule {}
