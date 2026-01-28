import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/module/common/redis/redis.service';

@Injectable()
export class AttributionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 获取最终归因人 (优先级: 参数 > Redis > 绑定)
   */
  async getFinalShareUserId(memberId: string, inputShareId?: string): Promise<string | null> {
    // 0. 如果 memberId 为空，直接返回 inputShareId 或 null
    if (!memberId) return inputShareId || null;

    // 1. 优先使用本次参数
    if (inputShareId) return inputShareId;

    // 2. 其次查询 Redis (7天点击归因)
    const redisKey = `attr:member:${memberId}`;
    const cachedId = await this.redis.get(redisKey);
    if (cachedId) return cachedId;

    // 3. 最后使用永久绑定 (parentId)
    const member = await this.prisma.umsMember.findUnique({
      where: { memberId },
      select: { parentId: true },
    });
    return member?.parentId || null;
  }

  /**
   * 绑定归因关系 (点击分享链接时调用)
   */
  async bindRelation(memberId: string, shareUserId: string) {
    if (!memberId || !shareUserId || memberId === shareUserId) return;

    // 1. 存入 Redis (7天有效)
    const redisKey = `attr:member:${memberId}`;
    await this.redis.set(redisKey, shareUserId, 7 * 24 * 60 * 60);

    // 2. 尝试永久绑定 (如果尚未绑定)
    // 逻辑：如果是新用户且没有上级，则绑定
    // 这里暂时只做 Redis 记录，永久绑定通常在注册或首次下单时确认
  }
}
