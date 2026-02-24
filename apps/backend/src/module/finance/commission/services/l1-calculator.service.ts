import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CommissionStatus } from '@prisma/client';
import { CommissionValidatorService } from './commission-validator.service';
import { MemberForCommission, DistributionConfig, CommissionRecord } from 'src/common/types/finance.types';

/**
 * L1 佣金计算服务
 * 职责：计算直推佣金
 */
@Injectable()
export class L1CalculatorService {
  private readonly logger = new Logger(L1CalculatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: CommissionValidatorService,
  ) {}

  /**
   * 计算 L1 佣金 (直推)
   * 规则:
   * - 优先: order.shareUserId (临时分享)
   * - 其次: member.parentId (绑定关系)
   * - 受益人必须 levelId >= 1 (C1/C2)
   *
   * @returns { record, beneficiaryId, beneficiaryLevel, noL2Available }
   */
  async calculateL1(
    order: {
      id: string;
      tenantId: string;
      memberId: string;
      shareUserId: string | null;
      payAmount: Decimal;
    },
    member: MemberForCommission,
    config: DistributionConfig,
    baseWait: Decimal,
    planSettleTime: Date,
  ): Promise<{ record: CommissionRecord; beneficiaryId: string; beneficiaryLevel: number; noL2Available: boolean } | null> {
    // 优先归属分享人，其次绑定的上级
    const beneficiaryId = order.shareUserId || member.parentId;

    // 1. 基础校验：无受益人或受益人为下单人本人
    if (!beneficiaryId || beneficiaryId === order.memberId) return null;

    // 2. 黑名单校验
    if (await this.validator.isUserBlacklisted(order.tenantId, beneficiaryId)) {
      this.logger.log(`[Commission] L1 user ${beneficiaryId} is blacklisted`);
      return null;
    }

    // 3. 获取受益人信息 (需要 levelId 和 parentId)
    const beneficiary = await this.prisma.umsMember.findUnique({
      where: { memberId: beneficiaryId },
      select: { tenantId: true, levelId: true, parentId: true },
    });

    // 4. 身份校验：只有 C1(levelId=1) 或 C2(levelId=2) 才能获得分佣
    if (!beneficiary || beneficiary.levelId < 1) {
      this.logger.log(`[Commission] L1 user ${beneficiaryId} is not C1/C2, skip`);
      return null;
    }

    // 5. 跨店校验
    const isCrossTenant = beneficiary.tenantId !== order.tenantId;
    if (isCrossTenant && !config.enableCrossTenant) {
      this.logger.log(`[Commission] Cross-tenant disabled, skip L1 for ${beneficiaryId}`);
      return null;
    }

    // 6. 判断是否有 L2 受益人 (C2全拿场景)
    //    - 如果L1是C2且无上级 → L2没人拿 → L1全拿
    //    - 如果L1是C1且有上级C2 → L2给C2
    const hasL2 = beneficiary.parentId != null;
    const isC2 = beneficiary.levelId === 2;
    const noL2Available = isC2 && !hasL2; // C2直推场景，L2无人

    // 7. 计算金额与费率
    let rate = new Decimal(config.level1Rate);
    if (isCrossTenant && config.crossTenantRate) {
      rate = rate.mul(config.crossTenantRate);
    }

    // C2全拿场景: L1金额 = L1 + L2
    let amount = baseWait.mul(rate);
    if (noL2Available) {
      const l2Rate = new Decimal(config.level2Rate);
      const l2Amount = baseWait.mul(l2Rate);
      amount = amount.add(l2Amount);
      this.logger.log(`[Commission] C2 ${beneficiaryId} full take: L1+L2`);
    }

    if (amount.lt(0.01)) return null;

    // 8. 跨店限额校验
    if (isCrossTenant && config.crossMaxDaily) {
      const pass = await this.validator.checkDailyLimit(order.tenantId, beneficiaryId, amount, config.crossMaxDaily);
      if (!pass) {
        this.logger.log(`[Commission] Daily limit exceeded for L1 ${beneficiaryId}`);
        return null;
      }
    }

    const record = {
      orderId: order.id,
      tenantId: order.tenantId,
      beneficiaryId,
      level: 1,
      amount: amount.toDecimalPlaces(2),
      rateSnapshot: rate.mul(100),
      status: 'FROZEN' as CommissionStatus,
      planSettleTime,
      isCrossTenant: !!isCrossTenant,
    };

    return {
      record,
      beneficiaryId,
      beneficiaryLevel: beneficiary.levelId,
      noL2Available,
    };
  }
}
