import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * 会员统计子服务 (Member Stats Sub-service)
 * 提取复杂的消费额、佣金及订单量聚合统计逻辑
 */
@Injectable()
export class MemberStatsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * 批量获取会员消费及佣金统计数据
     * @param memberIds 会员 ID 列表
     */
    async getBatchStats(memberIds: string[]) {
        if (!memberIds || memberIds.length === 0) return { consumptionMap: new Map(), commissionMap: new Map() };

        const [consumptions, commissions] = await Promise.all([
            // 聚合总累计消费额 (已支付订单)
            this.prisma.omsOrder.groupBy({
                by: ['memberId'],
                where: {
                    memberId: { in: memberIds },
                    payStatus: 'PAID',
                },
                _sum: { payAmount: true },
            }),
            // 聚合总累计佣金收益
            this.prisma.finCommission.groupBy({
                by: ['beneficiaryId'],
                where: {
                    beneficiaryId: { in: memberIds },
                },
                _sum: { amount: true },
            }),
        ]);

        const consumptionMap = new Map(
            consumptions.map((c) => [c.memberId, c._sum.payAmount || new Prisma.Decimal(0)])
        );
        const commissionMap = new Map(
            commissions.map((c) => [c.beneficiaryId, c._sum.amount || new Prisma.Decimal(0)])
        );

        return { consumptionMap, commissionMap };
    }
}
