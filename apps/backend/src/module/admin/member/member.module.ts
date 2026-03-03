import { Module } from '@nestjs/common';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { MemberRepository } from './member.repository';
import { ReferralCodeRepository } from './referral-code.repository';
import { MemberStatsService } from './services/member-stats.service';
import { MemberReferralService } from './services/member-referral.service';
import { MemberExportService } from './services/member-export.service';
import { PointsAccountModule } from 'src/module/marketing/points/account/account.module';

@Module({
  imports: [PointsAccountModule],
  controllers: [MemberController],
  providers: [MemberService, MemberRepository, ReferralCodeRepository, MemberStatsService, MemberReferralService, MemberExportService],
  exports: [MemberService, MemberRepository, ReferralCodeRepository],
})
export class MemberModule {}
