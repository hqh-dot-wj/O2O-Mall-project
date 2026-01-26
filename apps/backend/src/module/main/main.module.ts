import { Module } from '@nestjs/common';
import { MainService } from './main.service';
import { MainController } from './main.controller';
import { AuthModule } from '../admin/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MainController],
  providers: [MainService],
  exports: [MainService],
})
export class MainModule {}
