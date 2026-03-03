import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from 'src/config/app-config.service';
import { RedisService } from 'src/module/common/redis/redis.service';
import { CacheEnum } from 'src/common/enum';
import { GenerateUUID } from 'src/common/utils';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response';

/** Token 类型标识 */
export type TokenType = 'access' | 'refresh';

/** JWT Payload 结构 */
export interface TokenPayload {
  uuid: string;
  userId: number;
  type: TokenType;
  jti: string;
}

/** Token 对 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpireIn: number;
  refreshExpireIn: number;
}

/**
 * 令牌管理服务
 *
 * @description 封装 JWT Token 的生成、验证、刷新、撤销逻辑
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * 生成 Token 对（access_token + refresh_token）
   *
   * @param userId 用户ID
   * @param uuid 会话标识
   * @returns Token 对，包含两个 JWT 和各自的有效期（秒）
   */
  generateTokenPair(userId: number, uuid: string): TokenPair {
    const accessExpireIn = this.parseExpiresIn(this.config.jwt.expiresin);
    const refreshExpireIn = this.parseExpiresIn(this.config.jwt.refreshExpiresIn);

    const accessPayload: TokenPayload = {
      uuid,
      userId,
      type: 'access',
      jti: GenerateUUID(),
    };

    const refreshPayload: TokenPayload = {
      uuid,
      userId,
      type: 'refresh',
      jti: GenerateUUID(),
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: this.config.jwt.expiresin,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: this.config.jwt.refreshExpiresIn,
    });

    return { accessToken, refreshToken, accessExpireIn, refreshExpireIn };
  }

  /**
   * 验证并解析 access_token
   *
   * @param token JWT 字符串
   * @returns 解析后的 payload，无效时返回 null
   */
  verifyAccessToken(token: string): TokenPayload | null {
    const payload = this.verifyToken(token);
    if (!payload || payload.type !== 'access') return null;
    return payload;
  }

  /**
   * 验证并解析 refresh_token
   *
   * @param token JWT 字符串
   * @returns 解析后的 payload，无效时返回 null
   */
  verifyRefreshToken(token: string): TokenPayload | null {
    const payload = this.verifyToken(token);
    if (!payload || payload.type !== 'refresh') return null;
    return payload;
  }

  /**
   * 刷新 Token
   *
   * @description 验证 refresh_token → 检查黑名单 → 检查会话 → 生成新 Token 对 → 旧 token 加入黑名单
   * @param refreshToken 刷新令牌
   * @returns 新的 Token 对
   * @throws BusinessException 当 refresh_token 无效、已撤销或会话不存在时
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    // 1. 验证 JWT 签名和类型
    const payload = this.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new BusinessException(ResponseCode.UNAUTHORIZED, '刷新令牌无效');
    }

    // 2. 检查黑名单
    const isBlacklisted = await this.isTokenBlacklisted(payload.jti);
    if (isBlacklisted) {
      throw new BusinessException(ResponseCode.UNAUTHORIZED, '刷新令牌已失效');
    }

    // 3. 检查会话是否存在
    const session = await this.redisService.get(`${CacheEnum.LOGIN_TOKEN_KEY}${payload.uuid}`);
    if (!session) {
      throw new BusinessException(ResponseCode.UNAUTHORIZED, '会话已失效，请重新登录');
    }

    // 4. 将旧 refresh_token 加入黑名单
    await this.addToBlacklist(payload.jti, refreshToken);

    // 5. 生成新的 Token 对
    const newTokenPair = this.generateTokenPair(payload.userId, payload.uuid);

    // 6. 更新会话 TTL
    const accessTtlMs = newTokenPair.accessExpireIn * 1000;
    await this.redisService.set(
      `${CacheEnum.LOGIN_TOKEN_KEY}${payload.uuid}`,
      session,
      accessTtlMs,
    );

    this.logger.log(`Token 刷新成功: userId=${payload.userId}, uuid=${payload.uuid}`);
    return newTokenPair;
  }

  /**
   * 撤销 Token（将 refresh_token 的 jti 加入黑名单）
   *
   * @param jti JWT ID
   * @param originalToken 原始 JWT（用于计算剩余 TTL）
   */
  async revokeToken(jti: string, originalToken?: string): Promise<void> {
    if (!jti) return;
    await this.addToBlacklist(jti, originalToken);
  }

  /**
   * 检查 Token 是否在黑名单中
   *
   * @param jti JWT ID
   * @returns true 表示已被撤销
   */
  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const val = await this.redisService.get(`${CacheEnum.REFRESH_TOKEN_BLACKLIST_KEY}${jti}`);
    return val === 'revoked';
  }

  /**
   * 将 token 的 jti 加入黑名单
   */
  private async addToBlacklist(jti: string, originalToken?: string): Promise<void> {
    // 计算黑名单 TTL：使用 refresh_token 的最大有效期
    let ttlMs = this.parseExpiresIn(this.config.jwt.refreshExpiresIn) * 1000;

    // 如果有原始 token，尝试用剩余有效期作为 TTL（更精确）
    if (originalToken) {
      const decoded = this.decodeToken(originalToken);
      if (decoded?.exp) {
        const remainingMs = decoded.exp * 1000 - Date.now();
        if (remainingMs > 0) {
          ttlMs = remainingMs;
        }
      }
    }

    await this.redisService.set(
      `${CacheEnum.REFRESH_TOKEN_BLACKLIST_KEY}${jti}`,
      'revoked',
      ttlMs,
    );
  }

  /**
   * 验证 JWT 并返回 payload
   */
  private verifyToken(token: string): TokenPayload | null {
    try {
      if (!token) return null;
      const cleaned = token.replace('Bearer ', '');
      return this.jwtService.verify<TokenPayload>(cleaned);
    } catch {
      return null;
    }
  }

  /**
   * 解码 JWT payload（验证签名），用于从旧格式 token 中提取 uuid/userId
   *
   * @param token JWT 字符串
   * @returns payload 对象，无效时返回 null
   */
  decodePayload(token: string): { uuid: string; userId: number } | null {
    try {
      if (!token) return null;
      const cleaned = token.replace('Bearer ', '');
      const payload = this.jwtService.verify<{ uuid: string; userId: number }>(cleaned);
      if (!payload?.uuid || !payload?.userId) return null;
      return { uuid: payload.uuid, userId: payload.userId };
    } catch {
      return null;
    }
  }

  /**
   * 解码 JWT（不验证签名），用于读取 exp 等字段
   */
  private decodeToken(token: string): Record<string, number> | null {
    try {
      return this.jwtService.decode(token.replace('Bearer ', '')) as Record<string, number>;
    } catch {
      return null;
    }
  }

  /**
   * 解析过期时间字符串为秒数
   *
   * @param expires 如 '1h', '30m', '7d', '3600s'
   * @returns 秒数
   */
  parseExpiresIn(expires: string): number {
    const match = expires.match(/^(\d+)(h|m|s|d)?$/);
    if (!match) return 3600;

    const value = parseInt(match[1], 10);
    const unit = match[2] || 's';

    switch (unit) {
      case 'd': return value * 86400;
      case 'h': return value * 3600;
      case 'm': return value * 60;
      case 's': return value;
      default: return value;
    }
  }
}
