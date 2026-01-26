import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MemberVo } from './vo/member.vo';
import { Result } from 'src/common/response';
import { PageQueryDto } from 'src/common/dto/base.dto';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { Prisma } from '@prisma/client';

@Injectable()
export class MemberService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List members with pagination and search
   */
  async list(page: PageQueryDto, query?: { nickname?: string; mobile?: string }) {
    const where: any = {};

    // Tenant Filter
    const tenantId = TenantContext.getTenantId();
    if (tenantId && tenantId !== TenantContext.SUPER_TENANT_ID) {
      where.tenantId = tenantId;
    }

    if (query?.nickname) {
      where.nickname = { contains: query.nickname };
    }
    if (query?.mobile) {
      where.mobile = { contains: query.mobile };
    }

    const [total, list] = await Promise.all([
      this.prisma.umsMember.count({ where }),
      this.prisma.umsMember.findMany({
        where,
        skip: (page.pageNum - 1) * page.pageSize,
        take: page.pageSize,
        orderBy: { createTime: 'desc' },
        include: {
          // Join Referral (Member)
          // Self-relation in Prisma can be tricky, assuming 'referrer' relation doesn't exist in schema yet or named differently?
          // Checking schema: referrerId String?, but NO relation defined to UmsMember in schema provided earlier!
          // We must fetch manually or rely on raw query if performance needed, but for now loop fetch or limited include if relation exists.
          // Wait, schema said: referrerId String? @map("referrer_id") // 谁推荐我进来的
          // But NO @relation field back to UmsMember.
          // We will have to manual fetch referrers.
        },
      }),
    ]);

    // Collect TenantIDs and ParentIDs (C1/C2)
    const tenantIds = [...new Set(list.map((item) => item.tenantId).filter((id) => id !== '000000'))];
    const parentIds = [...new Set(list.map((item) => item.parentId).filter(Boolean))] as string[];

    // Bulk fetch Tenants
    const tenants = await this.prisma.sysTenant.findMany({
      where: { tenantId: { in: tenantIds } },
      select: { tenantId: true, companyName: true },
    });
    const tenantMap = new Map(tenants.map((t) => [t.tenantId, t.companyName]));

    // Bulk fetch Parents (C1/C2)
    const parents = await this.prisma.umsMember.findMany({
      where: { memberId: { in: parentIds } },
      select: { memberId: true, nickname: true, mobile: true, parentId: true },
    });
    const parentMap = new Map(parents.map((r) => [r.memberId, r]));

    // Collect Indirect ParentIDs (C2)
    const indirectParentIds = [...new Set(parents.map((item) => item.parentId).filter(Boolean))] as string[];

    // Bulk fetch Indirect Parents
    const indirectParents = await this.prisma.umsMember.findMany({
      where: { memberId: { in: indirectParentIds } },
      select: { memberId: true, nickname: true, mobile: true },
    });
    const indirectParentMap = new Map(indirectParents.map((r) => [r.memberId, r]));

    // Collect MemberIDs for stats
    const memberIds = list.map((m) => m.memberId);

    // Bulk fetch stats (Consumption & Commission)
    const [consumptions, commissions] = await Promise.all([
      // Total Paid Orders Amount
      this.prisma.omsOrder.groupBy({
        by: ['memberId'],
        where: {
          memberId: { in: memberIds },
          payStatus: 'PAID',
        },
        _sum: { payAmount: true },
      }),
      // Total Commission Amount
      this.prisma.finCommission.groupBy({
        by: ['beneficiaryId'],
        where: {
          beneficiaryId: { in: memberIds },
          // status: 'SETTLED' // Should we include FROZEN? Usually total earnings include everything. Let's include everything for now.
        },
        _sum: { amount: true },
      }),
    ]);

    const consumptionMap = new Map(consumptions.map((c) => [c.memberId, c._sum.payAmount || new Prisma.Decimal(0)]));
    const commissionMap = new Map(commissions.map((c) => [c.beneficiaryId, c._sum.amount || new Prisma.Decimal(0)]));

    // Map to VO
    const rows: MemberVo[] = list.map((item) => {
      const parent = item.parentId ? parentMap.get(item.parentId) : null;
      const indirectParentId = item.indirectParentId || parent?.parentId;
      const indirectParent = indirectParentId ? indirectParentMap.get(indirectParentId) : null;

      return {
        memberId: item.memberId,
        nickname: item.nickname,
        avatar: item.avatar,
        mobile: item.mobile,
        status: item.status === 'NORMAL' ? '0' : '1', // Map Enum: NORMAL->0 (enabled), DISABLED->1 (disabled)
        createTime: item.createTime,
        tenantId: item.tenantId,
        tenantName: tenantMap.get(item.tenantId) || 'Platform',
        referrerId: item.parentId || undefined,
        referrerName: parent?.nickname,
        referrerMobile: parent?.mobile,
        indirectReferrerId: indirectParentId || undefined,
        indirectReferrerName: indirectParent?.nickname,
        indirectReferrerMobile: indirectParent?.mobile,
        balance: Number(item.balance),
        commission: Number(commissionMap.get(item.memberId) || 0),
        totalConsumption: Number(consumptionMap.get(item.memberId) || 0),
        orderCount: 0, // We can also aggregate count if needed, but consumption is more important
      };
    });

    return Result.ok({
      rows,
      total,
    });
  }

  /**
   * Update Member Parent (C1/C2)
   */
  async updateParent(memberId: string, parentId: string) {
    if (memberId === parentId) {
      return Result.fail(500, 'Cannot refer self');
    }
    // Check if parent exists and is C1/C2
    if (parentId) {
      const parent = await this.prisma.umsMember.findUnique({ where: { memberId: parentId } });
      if (!parent) return Result.fail(500, 'Parent not found');
      if (parent.levelId < 1) return Result.fail(500, 'Parent must be C1 or C2');
    }

    await this.prisma.umsMember.update({
      where: { memberId },
      data: { parentId: parentId || null },
    });
    return Result.ok();
  }

  /**
   * Update Member Tenant
   */
  async updateTenant(memberId: string, tenantId: string) {
    // Check tenant existence
    const tenant = await this.prisma.sysTenant.findUnique({ where: { tenantId } });
    if (!tenant) return Result.fail(500, 'Tenant not found');

    await this.prisma.umsMember.update({
      where: { memberId },
      data: { tenantId },
    });
    return Result.ok();
  }

  /**
   * Update Member Status
   */
  async updateStatus(memberId: string, status: string) {
    await this.prisma.umsMember.update({
      where: { memberId },
      data: { status: status === '0' ? 'NORMAL' : 'DISABLED' },
    });
    return Result.ok();
  }
}
