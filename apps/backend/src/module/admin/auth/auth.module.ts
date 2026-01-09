import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SystemModule } from '../system/system.module';
import { MonitorModule } from '../monitor/monitor.module';
import { CommonModule } from '../../common/common.module';

@Module({
    imports: [
        SystemModule,
        MonitorModule,
        CommonModule,
    ],
    controllers: [AuthController],
    providers: [AuthService],
    exports: [AuthService],
})
export class AuthModule { }
