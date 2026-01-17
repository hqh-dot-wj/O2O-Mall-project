import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MemberVo } from './vo/member.vo';
import { Result } from 'src/common/response';
import { PageQueryDto } from 'src/common/dto/base.dto';
import { TenantContext } from 'src/common/tenant/tenant.context';

@Injectable()
export class MemberService {
    constructor(private readonly prisma: PrismaService) { }

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

        // Collect TenantIDs and ReferrerIDs
        const tenantIds = [...new Set(list.map((item) => item.tenantId).filter((id) => id !== '000000'))];
        const referrerIds = [...new Set(list.map((item) => item.referrerId).filter(Boolean))];

        // Bulk fetch Tenants
        const tenants = await this.prisma.sysTenant.findMany({
            where: { tenantId: { in: tenantIds } },
            select: { tenantId: true, companyName: true },
        });
        const tenantMap = new Map(tenants.map((t) => [t.tenantId, t.companyName]));

        // Bulk fetch Referrers
        const referrers = await this.prisma.umsMember.findMany({
            where: { memberId: { in: referrerIds } },
            select: { memberId: true, nickname: true, mobile: true },
        });
        const referrerMap = new Map(referrers.map((r) => [r.memberId, r]));

        // Map to VO
        const rows: MemberVo[] = list.map((item) => {
            const ref = item.referrerId ? referrerMap.get(item.referrerId) : null;
            return {
                memberId: item.memberId,
                nickname: item.nickname,
                avatar: item.avatar,
                mobile: item.mobile,
                status: item.status === 'NORMAL' ? '1' : '2', // Map Enum: NORMAL->1, DISABLED->2
                createTime: item.createTime,
                tenantId: item.tenantId,
                tenantName: tenantMap.get(item.tenantId) || 'Platform',
                referrerId: item.referrerId,
                referrerName: ref?.nickname,
                referrerMobile: ref?.mobile,
                balance: 0,
                commission: 0,
                orderCount: 0
            };
        });

        return Result.ok({
            rows,
            total
        });
    }

    /**
     * Update Member Referrer
     */
    async updateReferrer(memberId: string, referrerId: string) {
        if (memberId === referrerId) {
            return Result.fail(500, 'Cannot refer self');
        }
        // Check if referrer exists
        if (referrerId) {
            const parent = await this.prisma.umsMember.findUnique({ where: { memberId: referrerId } });
            if (!parent) return Result.fail(500, 'Referrer not found');
        }

        await this.prisma.umsMember.update({
            where: { memberId },
            data: { referrerId: referrerId || null },
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
            data: { status: status === '1' ? 'NORMAL' : 'DISABLED' },
        });
        return Result.ok();
    }
}
