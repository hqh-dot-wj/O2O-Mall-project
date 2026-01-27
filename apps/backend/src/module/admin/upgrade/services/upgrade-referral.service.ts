import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';

/**
 * 推荐码管理子服务 (Referral Code Sub-service)
 * 提取推荐码生成、绑定及校验逻辑
 */
@Injectable()
export class UpgradeReferralService {
    private readonly logger = new Logger(UpgradeReferralService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * 为会员生成并绑定推荐码
     * @param tx 事务客户端
     * @param memberId 会员 ID
     * @param tenantId 租户 ID
     */
    async generateAndBindCode(tx: Prisma.TransactionClient, memberId: string, tenantId: string) {
        // 自动生成规则: 租户前4位-随机4位
        const prefix = tenantId.slice(0, 4).toUpperCase();
        const randomPart = nanoid(4).toUpperCase();
        const code = `${prefix}-${randomPart}`;

        // 1. 创建推荐码记录
        await tx.umsReferralCode.create({
            data: {
                tenantId,
                memberId,
                code,
                isActive: true
            },
        });

        // 2. 更新会员主表的推荐码字段
        await tx.umsMember.update({
            where: { memberId },
            data: { referralCode: code },
        });

        this.logger.log(`为会员 ${memberId} 生成推荐码: ${code}`);
        return code;
    }
}
