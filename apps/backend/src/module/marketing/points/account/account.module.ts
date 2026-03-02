import { Module } from '@nestjs/common';
import { PointsRuleModule } from '../rule/rule.module';
import { PointsAccountAdminController } from './account.controller';
import { PointsAccountService } from './account.service';
import { PointsAccountRepository } from './account.repository';
import { PointsTransactionRepository } from './transaction.repository';
import { MemberRepository } from 'src/module/admin/member/member.repository';
import { MarketingEventsModule } from '../../events/events.module';

/**
 * 积分账户模块
 * 
 * @description 提供积分账户的管理、积分增减、查询等功能
 */
@Module({
  imports: [PointsRuleModule, MarketingEventsModule],
  controllers: [PointsAccountAdminController],
  providers: [
    PointsAccountService,
    PointsAccountRepository,
    PointsTransactionRepository,
    MemberRepository,
  ],
  exports: [PointsAccountService, PointsAccountRepository, PointsTransactionRepository],
})
export class PointsAccountModule {}
