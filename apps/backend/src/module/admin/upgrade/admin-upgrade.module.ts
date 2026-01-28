import { Module } from '@nestjs/common';
import { AdminUpgradeController } from './admin-upgrade.controller';
import { AdminUpgradeService } from './admin-upgrade.service';
import { UpgradeApplyRepository } from './upgrade-apply.repository';
import { UpgradeReferralService } from './services/upgrade-referral.service';

@Module({
  controllers: [AdminUpgradeController],
  providers: [AdminUpgradeService, UpgradeApplyRepository, UpgradeReferralService],
  exports: [AdminUpgradeService, UpgradeApplyRepository],
})
export class AdminUpgradeModule {}
