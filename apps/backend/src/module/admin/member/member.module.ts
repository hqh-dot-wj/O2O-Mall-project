import { Module } from '@nestjs/common';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { MemberRepository } from './member.repository';
import { ReferralCodeRepository } from './referral-code.repository';
import { MemberStatsService } from './services/member-stats.service';
import { MemberReferralService } from './services/member-referral.service';

@Module({
  controllers: [MemberController],
  providers: [
    MemberService,
    MemberRepository,
    ReferralCodeRepository,
    MemberStatsService,
    MemberReferralService,
  ],
  exports: [MemberService, MemberRepository, ReferralCodeRepository],
})
export class MemberModule { }
