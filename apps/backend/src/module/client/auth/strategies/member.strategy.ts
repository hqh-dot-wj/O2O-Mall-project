import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { AppConfigService } from 'src/config/app-config.service';
import { UnauthorizedException, Injectable } from '@nestjs/common';
import { RedisService } from 'src/module/common/redis/redis.service';
import { CacheEnum } from 'src/common/enum/index';

import { MemberStatus } from '@prisma/client';

@Injectable()
export class MemberStrategy extends PassportStrategy(Strategy, 'member-jwt') {
    constructor(
        private readonly config: AppConfigService,
        private readonly redisService: RedisService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: config.jwt.secretkey,
        });
    }

    async validate(payload: { uuid: string; memberId: string; iat: Date }) {
        const user = await this.redisService.get(`${CacheEnum.LOGIN_TOKEN_KEY}${payload.uuid}`);
        if (!user) throw new UnauthorizedException('登录已过期，请重新登录');
        if (user.status === MemberStatus.DISABLED) {
            throw new UnauthorizedException('账号已禁用，请联系客服');
        }
        return user;
    }
}
