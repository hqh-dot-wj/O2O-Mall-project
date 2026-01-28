import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/module/common/redis/redis.service';
import { CheckLoginDto, RegisterDto, BindPhoneDto } from './dto/auth.dto';
import { SocialPlatform, MemberStatus } from '@prisma/client';
import { GenerateUUID } from 'src/common/utils';
import { CacheEnum } from 'src/common/enum';
import { LOGIN_TOKEN_EXPIRESIN } from 'src/common/constant';
import { Result } from 'src/common/response';
import { WechatService } from '../common/service/wechat.service';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response/response.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly wechatService: WechatService,
  ) {}

  /**
   * 阶段二：静默登录检查
   */
  async checkLogin(dto: CheckLoginDto) {
    // 1. 换取 OpenID
    const wxRes = await this.wechatService.code2Session(dto.code);
    BusinessException.throwIf(!wxRes.success, wxRes.msg);

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
      BusinessException.throwIf(socialUser.member?.status === MemberStatus.DISABLED, '账号已禁用，请联系客服');

      const { token, expiresIn } = await this.genToken(socialUser.member);
      return Result.ok({
        isRegistered: true,
        token,
        expiresIn,
        userInfo: socialUser.member,
      });
    }

    // 4. 未注册 -> 返回 isRegistered: false
    return Result.ok({
      isRegistered: false,
    });
  }

  /**
   * 简化注册：仅需昵称头像 + referrerId（无需手机号）
   */
  async register(dto: RegisterDto) {
    // 1. 换取 OpenID
    const wxRes = await this.wechatService.code2Session(dto.loginCode);
    BusinessException.throwIf(!wxRes.success, wxRes.msg);

    const { openid, unionid, session_key } = wxRes.data;

    // 2. 检查是否已注册
    const existingSocial = await this.prisma.sysSocialUser.findFirst({
      where: { platform: SocialPlatform.MP_MALL, openid },
      include: { member: true },
    });

    if (existingSocial?.member) {
      // 已注册，检查状态后直接返回 token
      BusinessException.throwIf(existingSocial.member.status === MemberStatus.DISABLED, '账号已禁用，请联系客服');
      const { token, expiresIn } = await this.genToken(existingSocial.member);
      return Result.ok({
        token,
        expiresIn,
        userInfo: existingSocial.member,
        isNew: false,
      });
    }

    // 3. 新用户注册（无需手机号）
    const member = await this.prisma.$transaction(async (tx) => {
      // 校验租户
      let targetTenantId = '000000';
      if (dto.tenantId) {
        const t = await tx.sysTenant.findUnique({ where: { tenantId: dto.tenantId } });
        if (t) targetTenantId = dto.tenantId;
      }

      // === 跨店推荐人检测 (使用 parentId) ===
      let finalParentId: string | null = null;
      let finalIndirectParentId: string | null = null;

      if (dto.referrerId) {
        const referrer = await tx.umsMember.findUnique({
          where: { memberId: dto.referrerId },
          select: { tenantId: true, memberId: true, levelId: true, parentId: true },
        });

        if (referrer && referrer.levelId >= 1) {
          const isCrossTenant = referrer.tenantId !== targetTenantId;

          if (isCrossTenant) {
            // 跨店：检查目标门店是否开启跨店分销
            const distConfig = await tx.sysDistConfig.findUnique({
              where: { tenantId: targetTenantId },
            });

            if (distConfig?.enableCrossTenant) {
              // 允许跨店绑定
              finalParentId = dto.referrerId;
              // 如果推荐人是C1，则其上级为间接上级
              if (referrer.levelId === 1 && referrer.parentId) {
                finalIndirectParentId = referrer.parentId;
              }
            } else {
              // 不允许跨店，斩断关系，视为自然流量
              console.log(
                `Cross-tenant referrer ${dto.referrerId} rejected: tenant ${targetTenantId} disables cross-tenant`,
              );
            }
          } else {
            // 同店，正常绑定
            finalParentId = dto.referrerId;
            // 如果推荐人是C1，则其上级为间接上级
            if (referrer.levelId === 1 && referrer.parentId) {
              finalIndirectParentId = referrer.parentId;
            }
          }
        }
      }

      const newMember = await tx.umsMember.create({
        data: {
          tenantId: targetTenantId,
          mobile: null, // 手机号可为空，后续绑定
          status: MemberStatus.NORMAL,
          nickname: dto.userInfo?.nickName || `微信用户_${openid.slice(-6)}`,
          avatar: dto.userInfo?.avatarUrl || '',
          parentId: finalParentId,
          indirectParentId: finalIndirectParentId,
        },
      });

      await tx.sysSocialUser.create({
        data: {
          memberId: newMember.memberId,
          platform: SocialPlatform.MP_MALL,
          openid,
          unionid,
          sessionKey: session_key,
          nickname: dto.userInfo?.nickName,
          avatar: dto.userInfo?.avatarUrl,
        },
      });

      return newMember;
    });

    const { token, expiresIn } = await this.genToken(member);
    return Result.ok({
      token,
      expiresIn,
      userInfo: member,
      isNew: true,
    });
  }

  /**
   * 绑定手机号
   */
  async bindPhone(memberId: string, dto: BindPhoneDto) {
    // 1. 获取手机号
    const phone = await this.wechatService.getPhoneNumber(dto.phoneCode);
    BusinessException.throwIf(!phone, '获取手机号失败');

    // 2. 检查手机号是否已被其他用户绑定
    const existingMember = await this.prisma.umsMember.findUnique({
      where: { mobile: phone },
    });

    if (existingMember && existingMember.memberId !== memberId) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '该手机号已被其他账号绑定');
    }

    // 3. 更新当前用户的手机号
    const updatedMember = await this.prisma.umsMember.update({
      where: { memberId },
      data: { mobile: phone },
    });

    return Result.ok({
      userInfo: updatedMember,
      message: '手机号绑定成功',
    });
  }

  /**
   * 手机号一键登录/注册 (兼容旧前端调用)
   * 流程: 换OpenID -> 已注册直接登录 / 未注册则创建账号并绑定手机号
   */
  async registerMobile(dto: RegisterDto & { phoneCode?: string }) {
    // 1. 换取 OpenID
    const wxRes = await this.wechatService.code2Session(dto.loginCode);
    BusinessException.throwIf(!wxRes.success, wxRes.msg);

    const { openid, unionid, session_key } = wxRes.data;

    // 2. 检查是否已注册
    const existingSocial = await this.prisma.sysSocialUser.findFirst({
      where: { platform: SocialPlatform.MP_MALL, openid },
      include: { member: true },
    });

    if (existingSocial?.member) {
      // 已注册，检查状态后直接返回 token
      BusinessException.throwIf(existingSocial.member.status === MemberStatus.DISABLED, '账号已禁用，请联系客服');

      // 如果提供了 phoneCode 且用户未绑定手机号，则自动绑定
      if (dto.phoneCode && !existingSocial.member.mobile) {
        const phone = await this.wechatService.getPhoneNumber(dto.phoneCode);
        if (phone) {
          await this.prisma.umsMember.update({
            where: { memberId: existingSocial.member.memberId },
            data: { mobile: phone },
          });
        }
      }

      const { token, expiresIn } = await this.genToken(existingSocial.member);
      return Result.ok({
        token,
        expiresIn,
        userInfo: existingSocial.member,
        isNew: false,
      });
    }

    // 3. 新用户注册 + 绑定手机号
    let phone: string | null = null;
    if (dto.phoneCode) {
      phone = await this.wechatService.getPhoneNumber(dto.phoneCode);
    }

    const member = await this.prisma.$transaction(async (tx) => {
      // 校验租户
      let targetTenantId = '000000';
      if (dto.tenantId) {
        const t = await tx.sysTenant.findUnique({ where: { tenantId: dto.tenantId } });
        if (t) targetTenantId = dto.tenantId;
      }

      // 处理推荐人关系
      let finalParentId: string | null = null;
      let finalIndirectParentId: string | null = null;

      if (dto.referrerId) {
        const referrer = await tx.umsMember.findUnique({
          where: { memberId: dto.referrerId },
          select: { levelId: true, parentId: true },
        });
        if (referrer && referrer.levelId >= 1) {
          finalParentId = dto.referrerId;
          if (referrer.levelId === 1 && referrer.parentId) {
            finalIndirectParentId = referrer.parentId;
          }
        }
      }

      const newMember = await tx.umsMember.create({
        data: {
          tenantId: targetTenantId,
          mobile: phone, // 直接绑定手机号
          status: MemberStatus.NORMAL,
          nickname: dto.userInfo?.nickName || `微信用户_${openid.slice(-6)}`,
          avatar: dto.userInfo?.avatarUrl || '',
          parentId: finalParentId,
          indirectParentId: finalIndirectParentId,
        },
      });

      await tx.sysSocialUser.create({
        data: {
          memberId: newMember.memberId,
          platform: SocialPlatform.MP_MALL,
          openid,
          unionid,
          sessionKey: session_key,
          nickname: dto.userInfo?.nickName,
          avatar: dto.userInfo?.avatarUrl,
        },
      });

      return newMember;
    });

    const { token, expiresIn } = await this.genToken(member);
    return Result.ok({
      token,
      expiresIn,
      userInfo: member,
      isNew: true,
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

  private async genToken(member: any): Promise<{ token: string; expiresIn: number }> {
    const uuid = GenerateUUID();
    const payload = { uuid, memberId: member.memberId };
    const token = this.jwtService.sign(payload);
    const tokenKey = `${CacheEnum.LOGIN_TOKEN_KEY}${uuid}`;
    await this.redisService.set(tokenKey, member, LOGIN_TOKEN_EXPIRESIN);
    // 返回 token 和过期时间（秒）
    return { token, expiresIn: Math.floor(LOGIN_TOKEN_EXPIRESIN / 1000) };
  }
}
