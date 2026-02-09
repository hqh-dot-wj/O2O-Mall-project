import { Module } from '@nestjs/common';
import { PointsAccountModule } from '../account/account.module';
import { PointsRuleModule } from '../rule/rule.module';
import { PointsSigninController } from './signin.controller';
import { PointsSigninService } from './signin.service';

/**
 * 积分签到模块
 * 
 * @description 提供用户签到功能
 */
@Module({
  imports: [PointsAccountModule, PointsRuleModule],
  controllers: [PointsSigninController],
  providers: [PointsSigninService],
  exports: [PointsSigninService],
})
export class PointsSigninModule {}
