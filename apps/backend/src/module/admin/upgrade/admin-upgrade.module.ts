import { Module } from '@nestjs/common';
import { AdminUpgradeController } from './admin-upgrade.controller';
import { AdminUpgradeService } from './admin-upgrade.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminUpgradeController],
  providers: [AdminUpgradeService],
  exports: [AdminUpgradeService],
})
export class AdminUpgradeModule {}
