import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/module/common/redis/redis.service';
import { CheckLoginDto, RegisterDto, BindPhoneDto } from './dto/auth.dto';
import { SocialPlatform, MemberStatus } from '@prisma/client';
import { GenerateUUID } from 'src/common/utils';
import { CacheEnum } from 'src/common/enum';
import { LOGIN_TOKEN_EXPIRESIN } from 'src/common/constant';
import { Result } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response/response.interface';
import { ClientAuthStrategyFactory } from './strategies';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly strategyFactory: ClientAuthStrategyFactory,
  ) {}

  /**
   * 阶段二：静默登录检查
   * @param dto 登录检查参数
   * @param platform 客户端平台，默认 MP_MALL（向后兼容）
   */
  async checkLogin(dto: CheckLoginDto, platform: SocialPlatform = SocialPlatform.MP_MALL) {
    const strategy = this.strategyFactory.getStrategy(platform);

    // 1. 换取 OpenID
    const { openid } = await strategy.resolveIdentity(dto.code);

    // 2. 查 SysSocialUser
    const socialUser = await this.prisma.sysSocialUser.findFirst({
      where: { platform, openid },
      include: { member: true },
    });

    // 3. 已注册 -> 发 Token
    if (socialUser) {
      BusinessException.throwIf(socialUser.member?.status === MemberStatus.DISABLED, '账号已禁用，请联系客服');

      const { token, expiresIn } = await this.genToken(socialUser.member, platform);
      return Result.ok({
        isRegistered: true,
        token,
        expiresIn,
        userInfo: socialUser.member,
      });
    }

    // 4. 未注册 -> 返回 isRegistered: false
    return Result.ok({ isRegistered: false });
  }

  /**
   * 简化注册：仅需昵称头像 + referrerId（无需手机号）
   * @param dto 注册参数
   * @param platform 客户端平台，默认 MP_MALL（向后兼容）
   */
  async register(dto: RegisterDto, platform: SocialPlatform = SocialPlatform.MP_MALL) {
    const strategy = this.strategyFactory.getStrategy(platform);

    // 1. 换取 OpenID
    const { openid, unionid, session_key } = await strategy.resolveIdentity(dto.loginCode);

    // 2. 检查是否已注册
    const existingSocial = await this.prisma.sysSocialUser.findFirst({
      where: { platform, openid },
      include: { member: true },
    });

    if (existingSocial?.member) {
      BusinessException.throwIf(existingSocial.member.status === MemberStatus.DISABLED, '账号已禁用，请联系客服');
      const { token, expiresIn } = await this.genToken(existingSocial.member, platform);
      return Result.ok({ token, expiresIn, userInfo: existingSocial.member, isNew: false });
    }

    // 3. 新用户注册（无需手机号）
    const member = await this.prisma.$transaction(async (tx) => {
      const targetTenantId = await this.resolveTenantId(tx, dto.tenantId);
      const { finalParentId, finalIndirectParentId } = await this.resolveReferrer(
        tx,
        dto.referrerId,
        targetTenantId,
      );

      const newMember = await tx.umsMember.create({
        data: {
          tenantId: targetTenantId,
          mobile: null,
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
          platform,
          openid,
          unionid,
          sessionKey: session_key,
          nickname: dto.userInfo?.nickName,
          avatar: dto.userInfo?.avatarUrl,
        },
      });

      return newMember;
    });

    const { token, expiresIn } = await this.genToken(member, platform);
    return Result.ok({ token, expiresIn, userInfo: member, isNew: true });
  }

  /**
   * 绑定手机号
   */
  async bindPhone(memberId: string, dto: BindPhoneDto, platform: SocialPlatform = SocialPlatform.MP_MALL) {
    const strategy = this.strategyFactory.getStrategy(platform);

    // 1. 获取手机号
    const phone = strategy.resolvePhone ? await strategy.resolvePhone(dto.phoneCode) : null;
    BusinessException.throwIf(!phone, '获取手机号失败');

    // 2. 检查手机号是否已被其他用户绑定
    const existingMember = await this.prisma.umsMember.findUnique({
      where: { mobile: phone! },
    });

    if (existingMember && existingMember.memberId !== memberId) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '该手机号已被其他账号绑定');
    }

    // 3. 更新当前用户的手机号
    const updatedMember = await this.prisma.umsMember.update({
      where: { memberId },
      data: { mobile: phone },
    });

    return Result.ok({ userInfo: updatedMember, message: '手机号绑定成功' });
  }

  /**
   * 手机号一键登录/注册 (兼容旧前端调用)
   * @param dto 注册参数
   * @param platform 客户端平台，默认 MP_MALL（向后兼容）
   */
  async registerMobile(dto: RegisterDto & { phoneCode?: string }, platform: SocialPlatform = SocialPlatform.MP_MALL) {
    const strategy = this.strategyFactory.getStrategy(platform);

    // 1. 换取 OpenID
    const { openid, unionid, session_key } = await strategy.resolveIdentity(dto.loginCode);

    // 2. 检查是否已注册
    const existingSocial = await this.prisma.sysSocialUser.findFirst({
      where: { platform, openid },
      include: { member: true },
    });

    if (existingSocial?.member) {
      BusinessException.throwIf(existingSocial.member.status === MemberStatus.DISABLED, '账号已禁用，请联系客服');

      // 如果提供了 phoneCode 且用户未绑定手机号，则自动绑定
      if (dto.phoneCode && !existingSocial.member.mobile && strategy.resolvePhone) {
        const phone = await strategy.resolvePhone(dto.phoneCode);
        if (phone) {
          await this.prisma.umsMember.update({
            where: { memberId: existingSocial.member.memberId },
            data: { mobile: phone },
          });
        }
      }

      const { token, expiresIn } = await this.genToken(existingSocial.member, platform);
      return Result.ok({ token, expiresIn, userInfo: existingSocial.member, isNew: false });
    }

    // 3. 新用户注册 + 绑定手机号
    let phone: string | null = null;
    if (dto.phoneCode && strategy.resolvePhone) {
      phone = await strategy.resolvePhone(dto.phoneCode);
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const targetTenantId = await this.resolveTenantId(tx, dto.tenantId);
      const { finalParentId, finalIndirectParentId } = await this.resolveReferrer(
        tx,
        dto.referrerId,
        targetTenantId,
      );

      const newMember = await tx.umsMember.create({
        data: {
          tenantId: targetTenantId,
          mobile: phone,
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
          platform,
          openid,
          unionid,
          sessionKey: session_key,
          nickname: dto.userInfo?.nickName,
          avatar: dto.userInfo?.avatarUrl,
        },
      });

      return newMember;
    });

    const { token, expiresIn } = await this.genToken(member, platform);
    return Result.ok({ token, expiresIn, userInfo: member, isNew: true });
  }

  /**
   * 退出登录
   */
  async logout(token: string) {
    try {
      if (!token) return;
      const realToken = token.replace('Bearer ', '');
      const payload = this.jwtService.decode(realToken) as any;
      if (payload?.uuid) {
        const tokenKey = `${CacheEnum.LOGIN_TOKEN_KEY}${payload.uuid}`;
        await this.redisService.del(tokenKey);
      }
    } catch {
      // 忽略错误
    }
  }

  // ================= 私有辅助方法 =================

  /**
   * 生成 JWT Token 并缓存用户信息
   * JWT payload 包含 platform 字段，便于后续 Guard 识别来源
   */
  private async genToken(
    member: any,
    platform: SocialPlatform = SocialPlatform.MP_MALL,
  ): Promise<{ token: string; expiresIn: number }> {
    const uuid = GenerateUUID();
    const payload = { uuid, memberId: member.memberId, platform };
    const token = this.jwtService.sign(payload);
    const tokenKey = `${CacheEnum.LOGIN_TOKEN_KEY}${uuid}`;
    await this.redisService.set(tokenKey, member, LOGIN_TOKEN_EXPIRESIN);
    return { token, expiresIn: Math.floor(LOGIN_TOKEN_EXPIRESIN / 1000) };
  }

  /**
   * 解析目标租户ID
   */
  private async resolveTenantId(tx: any, tenantId?: string): Promise<string> {
    const defaultTenantId = '000000';
    if (!tenantId) return defaultTenantId;
    const tenant = await tx.sysTenant.findUnique({ where: { tenantId } });
    return tenant ? tenantId : defaultTenantId;
  }

  /**
   * 解析推荐人关系（含跨店检测）
   */
  private async resolveReferrer(
    tx: any,
    referrerId: string | undefined,
    targetTenantId: string,
  ): Promise<{ finalParentId: string | null; finalIndirectParentId: string | null }> {
    let finalParentId: string | null = null;
    let finalIndirectParentId: string | null = null;

    if (!referrerId) return { finalParentId, finalIndirectParentId };

    const referrer = await tx.umsMember.findUnique({
      where: { memberId: referrerId },
      select: { tenantId: true, memberId: true, levelId: true, parentId: true },
    });

    if (!referrer || referrer.levelId < 1) return { finalParentId, finalIndirectParentId };

    const isCrossTenant = referrer.tenantId !== targetTenantId;

    if (isCrossTenant) {
      const distConfig = await tx.sysDistConfig.findUnique({
        where: { tenantId: targetTenantId },
      });

      if (distConfig?.enableCrossTenant) {
        finalParentId = referrerId;
        if (referrer.levelId === 1 && referrer.parentId) {
          finalIndirectParentId = referrer.parentId;
        }
      } else {
        this.logger.log(
          `Cross-tenant referrer ${referrerId} rejected: tenant ${targetTenantId} disables cross-tenant`,
        );
      }
    } else {
      finalParentId = referrerId;
      if (referrer.levelId === 1 && referrer.parentId) {
        finalIndirectParentId = referrer.parentId;
      }
    }

    return { finalParentId, finalIndirectParentId };
  }
}
