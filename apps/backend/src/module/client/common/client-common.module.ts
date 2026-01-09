
import { Module } from '@nestjs/common';
import { WechatService } from './service/wechat.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from 'src/module/common/redis/redis.module';

@Module({
    imports: [
        HttpModule,
        ConfigModule,
        RedisModule
    ],
    providers: [WechatService],
    exports: [WechatService],
})
export class ClientCommonModule { }
