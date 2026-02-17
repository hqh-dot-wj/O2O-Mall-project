import { Module } from '@nestjs/common';
import { PointsAccountModule } from '../account/account.module';
import { PointsRuleModule } from '../rule/rule.module';
import { PointsSigninService } from './signin.service';

/**
 * 积分签到模块
 * C 端签到 Controller 已迁移至 module/client/marketing/points
 */
@Module({
  imports: [PointsAccountModule, PointsRuleModule],
  controllers: [],
  providers: [PointsSigninService],
  exports: [PointsSigninService],
})
export class PointsSigninModule {}
