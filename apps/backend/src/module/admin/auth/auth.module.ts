import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppConfigService } from 'src/config/app-config.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TokenService } from './services/token.service';
import { AccountLockService } from './services/account-lock.service';
import { SessionService } from './services/session.service';
import { SocialAuthService } from './services/social-auth.service';
import { SystemModule } from '../system/system.module';
import { MonitorModule } from '../monitor/monitor.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async (config: AppConfigService) => ({
        secret: config.jwt.secretkey,
        signOptions: {
          expiresIn: config.jwt.expiresin,
        },
      }),
      inject: [AppConfigService],
    }),
    SystemModule,
    MonitorModule,
    CommonModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, AccountLockService, SessionService, SocialAuthService],
  exports: [AuthService, TokenService, AccountLockService, SessionService],
})
export class AuthModule {}
