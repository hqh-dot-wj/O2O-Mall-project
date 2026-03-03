import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/module/common/redis/redis.service';
import { CacheEnum } from 'src/common/enum';
import { LOGIN_TOKEN_EXPIRESIN } from 'src/common/constant';
import { FormatDateFields } from 'src/common/utils';

/** 在线用户信息（从 Redis 会话中提取） */
export interface OnlineUserInfo {
  tokenId: string;
  userName: string;
  deptName: string;
  ipaddr: string;
  loginLocation: string;
  browser: string;
  os: string;
  loginTime: Date;
  deviceType: string;
}

/** 会话查询条件 */
export interface SessionQuery {
  userName?: string;
  ipaddr?: string;
  pageNum?: number;
  pageSize?: number;
}

/**
 * 会话管理服务
 *
 * @description 封装 Redis 会话的存储、查询、删除逻辑，供 AuthController 和 OnlineController 使用
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * 保存会话到 Redis
   *
   * @param uuid 会话标识
   * @param sessionData 会话数据（用户信息、权限等）
   * @param ttlMs 过期时间（毫秒），默认使用全局配置
   */
  async saveSession(uuid: string, sessionData: Record<string, unknown>, ttlMs?: number): Promise<void> {
    const key = this.buildSessionKey(uuid);
    const ttl = ttlMs ?? LOGIN_TOKEN_EXPIRESIN;
    await this.redisService.set(key, sessionData, ttl);
  }

  /**
   * 获取会话数据
   *
   * @param uuid 会话标识
   * @returns 会话数据，不存在时返回 null
   */
  async getSession(uuid: string): Promise<Record<string, unknown> | null> {
    return this.redisService.get(this.buildSessionKey(uuid));
  }

  /**
   * 删除会话（强制下线）
   *
   * @param uuid 会话标识
   */
  async deleteSession(uuid: string): Promise<void> {
    await this.redisService.del(this.buildSessionKey(uuid));
    this.logger.log(`会话已删除: uuid=${uuid}`);
  }

  /**
   * 延长会话有效期
   *
   * @param uuid 会话标识
   * @param ttlMs 新的过期时间（毫秒）
   */
  async refreshSessionTtl(uuid: string, ttlMs: number): Promise<void> {
    const session = await this.getSession(uuid);
    if (!session) return;
    await this.redisService.set(this.buildSessionKey(uuid), session, ttlMs);
  }

  /**
   * 查询在线用户列表
   *
   * @param query 查询条件（支持按用户名、IP 过滤）
   * @returns 在线用户列表和总数
   */
  async getOnlineUsers(query: SessionQuery): Promise<{ list: OnlineUserInfo[]; total: number }> {
    const keys = await this.redisService.keys(`${CacheEnum.LOGIN_TOKEN_KEY}*`);

    if (!keys || keys.length === 0) {
      return { list: [], total: 0 };
    }

    const data = await this.redisService.mget(keys);

    const allUsers = this.parseOnlineUsers(data);
    const filtered = this.filterOnlineUsers(allUsers, query);
    const paged = this.paginateUsers(filtered, query);

    return { list: FormatDateFields(paged, ['loginTime']), total: filtered.length };
  }

  /**
   * 检查会话是否存在
   *
   * @param uuid 会话标识
   * @returns true 表示会话有效
   */
  async isSessionActive(uuid: string): Promise<boolean> {
    const session = await this.getSession(uuid);
    return session !== null;
  }

  /** 从 Redis 数据中提取在线用户信息 */
  private parseOnlineUsers(data: Record<string, unknown>[]): OnlineUserInfo[] {
    return data
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && 'token' in item)
      .map((item) => ({
        tokenId: item.token as string,
        userName: item.userName as string,
        deptName: ((item.user as Record<string, unknown>)?.deptName as string) || '',
        ipaddr: item.ipaddr as string,
        loginLocation: (item.loginLocation as string) || '',
        browser: (item.browser as string) || '',
        os: (item.os as string) || '',
        loginTime: item.loginTime as Date,
        deviceType: (item.deviceType as string) || '',
      }));
  }

  /** 按用户名和 IP 过滤 */
  private filterOnlineUsers(users: OnlineUserInfo[], query: SessionQuery): OnlineUserInfo[] {
    return users.filter((user) => {
      if (query.userName && !user.userName?.includes(query.userName)) return false;
      if (query.ipaddr && !user.ipaddr?.includes(query.ipaddr)) return false;
      return true;
    });
  }

  /** 分页截取 */
  private paginateUsers(users: OnlineUserInfo[], query: SessionQuery): OnlineUserInfo[] {
    const pageNum = Number(query.pageNum) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const start = (pageNum - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }

  private buildSessionKey(uuid: string): string {
    return `${CacheEnum.LOGIN_TOKEN_KEY}${uuid}`;
  }
}
