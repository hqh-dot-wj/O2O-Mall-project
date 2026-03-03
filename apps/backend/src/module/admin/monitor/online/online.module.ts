import { Module } from '@nestjs/common';
import { OnlineService } from './online.service';
import { OnlineController } from './online.controller';
import { SessionService } from 'src/module/admin/auth/services/session.service';

@Module({
  controllers: [OnlineController],
  providers: [OnlineService, SessionService],
})
export class OnlineModule {}
