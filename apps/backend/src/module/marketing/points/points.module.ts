import { Module } from '@nestjs/common';
import { PointsRuleModule } from './rule/rule.module';
import { PointsAccountModule } from './account/account.module';
import { PointsSigninModule } from './signin/signin.module';
import { PointsTaskModule } from './task/task.module';
import { PointsManagementModule } from './management/management.module';
import { PointsDegradationModule } from './degradation/degradation.module';

/**
 * 积分聚合模块
 * 
 * @description 聚合所有积分相关子模块
 */
@Module({
  imports: [
    PointsRuleModule,
    PointsAccountModule,
    PointsSigninModule,
    PointsTaskModule,
    PointsManagementModule,
    PointsDegradationModule,
  ],
  exports: [
    PointsRuleModule,
    PointsAccountModule,
    PointsSigninModule,
    PointsTaskModule,
    PointsManagementModule,
    PointsDegradationModule,
  ],
})
export class PointsModule {}
