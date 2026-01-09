import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MemberStrategy } from './strategies/member.strategy';
import { RedisModule } from 'src/module/common/redis/redis.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { ClientCommonModule } from 'src/module/client/common/client-common.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'member-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secretkey'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresin'),
        },
      }),
      inject: [ConfigService],
    }),
    ClientCommonModule,
    RedisModule,
    PrismaModule,
    HttpModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, MemberStrategy],
  exports: [AuthService],
})
export class ClientAuthModule { }
