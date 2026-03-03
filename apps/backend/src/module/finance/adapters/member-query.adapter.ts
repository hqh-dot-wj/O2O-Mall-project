import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  MemberQueryPort,
  MemberForCommission,
  MemberBrief,
} from '../ports/member-query.port';

/**
 * 会员查询适配器
 *
 * @description
 * 实现 MemberQueryPort，封装对 umsMember 表的访问。
 * Finance 模块通过此适配器获取会员数据，而非直接访问 Prisma。
 *
 * @architecture A-T2: Commission 消除对 umsMember 表的直接访问
 */
@Injectable()
export class MemberQueryAdapter extends MemberQueryPort {
  private readonly logger = new Logger(MemberQueryAdapter.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /**
   * 根据会员ID获取会员信息（含推荐关系）
   */
  async findMemberForCommission(memberId: string): Promise<MemberForCommission | null> {
    const member = await this.prisma.umsMember.findUnique({
      where: { memberId },
      select: {
        memberId: true,
        tenantId: true,
        parentId: true,
        indirectParentId: true,
        levelId: true,
      },
    });

    if (!member) return null;

    return {
      memberId: member.memberId,
      tenantId: member.tenantId,
      parentId: member.parentId,
      indirectParentId: member.indirectParentId,
      levelId: member.levelId ?? 0,
    };
  }

  /**
   * 获取会员简要信息（用于受益人校验）
   */
  async findMemberBrief(memberId: string): Promise<MemberBrief | null> {
    const member = await this.prisma.umsMember.findUnique({
      where: { memberId },
      select: {
        memberId: true,
        tenantId: true,
        levelId: true,
        parentId: true,
        nickname: true,
      },
    });

    if (!member) return null;

    return {
      memberId: member.memberId,
      tenantId: member.tenantId,
      levelId: member.levelId ?? 0,
      parentId: member.parentId,
      nickname: member.nickname ?? undefined,
    };
  }

  /**
   * 批量获取会员简要信息
   */
  async findMembersBrief(memberIds: string[]): Promise<Map<string, MemberBrief>> {
    if (memberIds.length === 0) return new Map();

    const members = await this.prisma.umsMember.findMany({
      where: { memberId: { in: memberIds } },
      select: {
        memberId: true,
        tenantId: true,
        levelId: true,
        parentId: true,
      },
    });

    const result = new Map<string, MemberBrief>();
    for (const member of members) {
      result.set(member.memberId, {
        memberId: member.memberId,
        tenantId: member.tenantId,
        levelId: member.levelId ?? 0,
        parentId: member.parentId,
        nickname: (member as { nickname?: string }).nickname ?? undefined,
      });
    }

    return result;
  }

  /**
   * 检查循环推荐关系
   */
  async checkCircularReferral(
    memberId: string,
    parentId: string,
    maxDepth: number = 10,
  ): Promise<boolean> {
    let current = await this.prisma.umsMember.findUnique({
      where: { memberId: parentId },
      select: { parentId: true },
    });

    let depth = 0;
    while (current?.parentId && depth < maxDepth) {
      if (current.parentId === memberId) {
        this.logger.warn(
          `[CircularReferral] Detected: member=${memberId}, parent=${parentId}, depth=${depth}`,
        );
        return true;
      }
      current = await this.prisma.umsMember.findUnique({
        where: { memberId: current.parentId },
        select: { parentId: true },
      });
      depth++;
    }

    return false;
  }
}
