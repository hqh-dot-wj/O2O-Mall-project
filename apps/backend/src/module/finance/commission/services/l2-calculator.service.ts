import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CommissionStatus } from '@prisma/client';
import { CommissionValidatorService } from './commission-validator.service';
import { MemberForCommission, DistributionConfig, CommissionRecord } from 'src/common/types/finance.types';

/**
 * L2 佣金计算服务
 * 职责：计算间推佣金
 */
@Injectable()
export class L2CalculatorService {
  private readonly logger = new Logger(L2CalculatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: CommissionValidatorService,
  ) {}

  /**
   * 计算 L2 佣金 (间推)
   * 规则:
   * - 若L1是C1: L2 = L1的上级 (C2)
   * - 若L1是C2且无上级: L1已全拿，L2跳过
   * - 若是临时分享: L2 = 分享人的上级
   */
  async calculateL2(
    order: {
      id: string;
      tenantId: string;
      memberId: string;
      shareUserId: string | null;
    },
    member: MemberForCommission,
    config: DistributionConfig,
    baseWait: Decimal,
    planSettleTime: Date,
    l1BeneficiaryId?: string,
    l1BeneficiaryLevel?: number,
    noL2Available?: boolean,
  ): Promise<CommissionRecord | null> {
    // C2全拿场景，L2跳过
    if (noL2Available) {
      this.logger.log(`[Commission] L2 skipped: C2 full take scenario`);
      return null;
    }

    // 确定 L2 受益人
    // 1. 若有临时分享，查分享人的上级
    // 2. 否则查绑定的 indirectParentId
    let beneficiaryId: string | null = null;

    if (order.shareUserId && l1BeneficiaryId) {
      // 临时分享场景：查分享人的上级
      const sharer = await this.prisma.umsMember.findUnique({
        where: { memberId: l1BeneficiaryId },
        select: { parentId: true },
      });
      beneficiaryId = sharer?.parentId || null;
    } else {
      // 绑定关系场景：使用 indirectParentId
      beneficiaryId = member.indirectParentId;
    }

    // 1. 基础校验
    if (
      !beneficiaryId ||
      beneficiaryId === order.memberId ||
      beneficiaryId === l1BeneficiaryId || // 避免与L1重复
      beneficiaryId === order.shareUserId // 避免分享人下级获利
    )
      return null;

    // 2. 黑名单校验
    if (await this.validator.isUserBlacklisted(order.tenantId, beneficiaryId)) {
      this.logger.log(`[Commission] L2 user ${beneficiaryId} is blacklisted`);
      return null;
    }

    // 3. 获取受益人信息并校验身份 (必须是C2)
    const beneficiary = await this.prisma.umsMember.findUnique({
      where: { memberId: beneficiaryId },
      select: { tenantId: true, levelId: true },
    });

    if (!beneficiary || beneficiary.levelId !== 2) {
      this.logger.log(`[Commission] L2 user ${beneficiaryId} is not C2, skip`);
      return null;
    }

    // 4. 跨店校验
    const isCrossTenant = beneficiary.tenantId !== order.tenantId;
    if (isCrossTenant && !config.enableCrossTenant) {
      return null;
    }

    // 5. 计算金额
    let rate = new Decimal(config.level2Rate);
    if (isCrossTenant && config.crossTenantRate) {
      rate = rate.mul(config.crossTenantRate);
    }

    const amount = baseWait.mul(rate);
    if (amount.lt(0.01)) return null;

    // 6. 限额校验
    if (isCrossTenant && config.crossMaxDaily) {
      const pass = await this.validator.checkDailyLimit(order.tenantId, beneficiaryId, amount, config.crossMaxDaily);
      if (!pass) return null;
    }

    return {
      orderId: order.id,
      tenantId: order.tenantId,
      beneficiaryId,
      level: 2,
      amount: amount.toDecimalPlaces(2),
      rateSnapshot: rate.mul(100),
      status: 'FROZEN' as CommissionStatus,
      planSettleTime,
      isCrossTenant: !!isCrossTenant,
    };
  }
}
