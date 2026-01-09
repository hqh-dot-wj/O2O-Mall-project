import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/module/common/redis/redis.service';
import { CheckLoginDto, RegisterMobileDto } from './dto/auth.dto';
import { SocialPlatform, MemberStatus } from '@prisma/client';
import { GenerateUUID } from 'src/common/utils';
import { CacheEnum } from 'src/common/enum';
import { LOGIN_TOKEN_EXPIRESIN } from 'src/common/constant';
import { Result } from 'src/common/response';
import { WechatService } from '../common/service/wechat.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly redisService: RedisService,
        private readonly wechatService: WechatService,
    ) { }

    /**
     * 阶段二：静默登录检查
     */
    async checkLogin(dto: CheckLoginDto) {
        // 1. 换取 OpenID
        const wxRes = await this.wechatService.code2Session(dto.code);
        if (!wxRes.success) {
            return Result.fail(500, wxRes.msg);
        }
        const { openid } = wxRes.data;

        // 2. 查 SysSocialUser
        const socialUser = await this.prisma.sysSocialUser.findFirst({
            where: {
                platform: SocialPlatform.MP_MALL,
                openid: openid,
            },
            include: { member: true },
        });

        // 3. 已注册 -> 发 Token
        if (socialUser) {
            const token = await this.genToken(socialUser.member);
            return Result.ok({
                isRegistered: true,
                token,
                userInfo: socialUser.member,
            });
        }

        // 4. 未注册 -> 返回 sessionKey (给前端备用，虽然新版手机号接口不太需要)
        // 注意：不要把 sessionKey 暴露给前端是最佳实践，但如果是为了兼容旧版获取手机号，可能需要。
        // 这里我们主要返回 isRegistered: false
        return Result.ok({
            isRegistered: false,
            // sessionKey: wxRes.data.session_key 
        });
    }

    /**
     * 阶段三：手机号一键注册
     */
    async registerMobile(dto: RegisterMobileDto) {
        // 1. 再次换取 OpenID (确保 Session 最新，也可以用 checkLogin 缓存的 session，这里简化为重新换取)
        const wxRes = await this.wechatService.code2Session(dto.loginCode);
        if (!wxRes.success) return Result.fail(500, wxRes.msg);
        const { openid, unionid, session_key } = wxRes.data;

        // 2. 解密/获取手机号
        const phone = await this.wechatService.getPhoneNumber(dto.phoneCode);
        if (!phone) return Result.fail(500, '获取手机号失败');

        // 3. 开启事务处理注册逻辑
        let finalMember = null;
        try {
            finalMember = await this.prisma.$transaction(async (tx) => {
                // A. 查手机号是否已存在 (Member表)
                let member = await tx.umsMember.findUnique({
                    where: { mobile: phone }
                });

                if (member) {
                    // 情况 A: 手机号已存在 (老用户) -> 仅绑定社交账号
                    // 也可以选择在这里更新租户ID，这取决于业务规则。
                    // 假设业务规则是：保留首次注册租户，或者更新为最近活跃租户?
                    // 这里暂不更新 tenantId，只做绑定
                } else {
                    // 情况 B: 纯新用户 -> 创建 Member
                    // 校验租户
                    let targetTenantId = '000000';
                    if (dto.tenantId) {
                        const t = await tx.sysTenant.findUnique({ where: { tenantId: dto.tenantId } });
                        if (t) targetTenantId = dto.tenantId;
                    }

                    member = await tx.umsMember.create({
                        data: {
                            tenantId: targetTenantId,
                            mobile: phone,
                            status: MemberStatus.NORMAL,
                            nickname: dto.userInfo?.nickName || `微信用户_${phone.slice(-4)}`,
                            avatar: dto.userInfo?.avatarUrl || '',
                            referrerId: dto.referrerId || null,
                        }
                    });
                }

                // 绑定社交账号 (如果还没有绑定该OpenID)
                // 先查一下防止重复绑定报错
                const existingSocial = await tx.sysSocialUser.findFirst({
                    where: { platform: SocialPlatform.MP_MALL, openid: openid }
                });

                if (!existingSocial) {
                    await tx.sysSocialUser.create({
                        data: {
                            memberId: member.memberId,
                            platform: SocialPlatform.MP_MALL,
                            openid: openid,
                            unionid: unionid,
                            sessionKey: session_key,
                            nickname: dto.userInfo?.nickName,
                            avatar: dto.userInfo?.avatarUrl,
                        }
                    });
                } else {
                    // 如果已存在关联，但memberId不一致(理论上不应该发生，除非脏数据)，需要处理
                    // 这里简单更新下 sessionKey
                    await tx.sysSocialUser.update({
                        where: { socialId: existingSocial.socialId },
                        data: { sessionKey: session_key }
                    });
                }

                return member;
            });
        } catch (e) {
            console.error(e);
            return Result.fail(500, '注册事务失败: ' + e.message);
        }

        // 4. 发 Token
        const token = await this.genToken(finalMember);
        return Result.ok({
            token,
            userInfo: finalMember,
        });
    }


    /**
     * 退出登录
     */
    async logout(token: string) {
        try {
            if (!token) return;
            // 去掉 Bearer 前缀
            const realToken = token.replace('Bearer ', '');
            const payload = this.jwtService.decode(realToken) as any;
            if (payload && payload.uuid) {
                const tokenKey = `${CacheEnum.LOGIN_TOKEN_KEY}${payload.uuid}`;
                await this.redisService.del(tokenKey);
            }
        } catch (error) {
            // 忽略错误
        }
    }

    // ================= 私有辅助方法 =================

    private async genToken(member: any) {
        const uuid = GenerateUUID();
        const payload = { uuid, memberId: member.memberId };
        const token = this.jwtService.sign(payload);
        const tokenKey = `${CacheEnum.LOGIN_TOKEN_KEY}${uuid}`;
        await this.redisService.set(tokenKey, member, LOGIN_TOKEN_EXPIRESIN);
        return token;
    }
}
