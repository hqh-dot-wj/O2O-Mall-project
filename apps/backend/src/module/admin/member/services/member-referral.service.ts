import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MemberRepository } from '../member.repository';
import { BusinessException } from 'src/common/exceptions';

/**
 * 会员推荐关系子服务 (Member Referral Sub-service)
 * 处理 C1/C2 分销层级的推荐人查找、更新及跨店校验
 */
@Injectable()
export class MemberReferralService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly memberRepo: MemberRepository,
    ) { }

    /**
     * 批量获取会员的推荐人信息 (含 C1 直接推荐和 C2 间接推荐)
     * @param list 会员记录列表
     */
    async getBatchReferralInfo(list: any[]) {
        const parentIds = [...new Set(list.map((item) => item.parentId).filter(Boolean))] as string[];

        // 1. 批量查询直接上级 (C1/C2)
        const parents = await this.prisma.umsMember.findMany({
            where: { memberId: { in: parentIds } },
            select: { memberId: true, nickname: true, mobile: true, parentId: true },
        });
        const parentMap = new Map(parents.map((r) => [r.memberId, r]));

        // 2. 批量查询间接上级 (通常是 C2 股东)
        const indirectParentIds = [...new Set(parents.map((item) => item.parentId).filter(Boolean))] as string[];
        const indirectParents = await this.prisma.umsMember.findMany({
            where: { memberId: { in: indirectParentIds } },
            select: { memberId: true, nickname: true, mobile: true },
        });
        const indirectParentMap = new Map(indirectParents.map((r) => [r.memberId, r]));

        return { parentMap, indirectParentMap };
    }

    /**
     * 校验并获取新推荐人的间接推荐关系
     * @param memberId 会员 ID
     * @param parentId 新上级 ID
     */
    async validateAndGetIndirectParent(memberId: string, parentId: string) {
        if (memberId === parentId) {
            BusinessException.throwIf(true, '不可将自己设为推荐人');
        }

        let indirectParentId: string | null = null;

        if (parentId) {
            const parent = await this.memberRepo.findById(parentId);
            BusinessException.throwIfNull(parent, '推荐人不存在');
            BusinessException.throwIf(parent!.levelId < 1, '推荐人必须是 C1团长 或 C2股东');

            // 如果推荐人是 C1 (团长)，则间接推荐人为该团长的上级 (通常是 C2)
            if (parent!.levelId === 1) {
                indirectParentId = parent!.parentId;
            }
            // 如果推荐人已经是 C2 (股东)，则没有间接推荐人
        }

        return indirectParentId;
    }
}
