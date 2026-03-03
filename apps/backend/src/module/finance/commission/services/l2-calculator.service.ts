import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { CommissionStatus } from '@prisma/client';
import { CommissionValidatorService } from './commission-validator.service';
import { MemberForCommission, DistributionConfig, CommissionRecord } from 'src/common/types/finance.types';
import { ProductConfigService } from 'src/module/store/distribution/services/product-config.service';
import { LevelService } from 'src/module/store/distribution/services/level.service';
import { MemberQueryPort } from '../../ports/member-query.port';

/**
 * L2 佣金计算服务
 *
 * @description
 * 计算间推佣金。配置优先级：会员等级 > 商品级 > 品类级 > 租户默认
 *
 * @architecture A-T2: 通过 MemberQueryPort 获取会员数据
 */
@Injectable()
export class L2CalculatorService {
  private readonly logger = new Logger(L2CalculatorService.name);

  constructor(
    private readonly validator: CommissionValidatorService,
    private readonly levelService: LevelService,
    private readonly memberQueryPort: MemberQueryPort,
  ) {}

  /**
   * 计算 L2 佣金 (间推)
   * 规则:
   * - 若L1是C1: L2 = L1的上级 (C2)
   * - 若L1是C2且无上级: L1已全拿，L2跳过
   * - 若是临时分享: L2 = 分享人的上级
   * - 支持商品级配置（商品 > 品类 > 租户默认）
   */
  async calculateL2(
    order: {
      id: string;
      tenantId: string;
      memberId: string;
      shareUserId: string | null;
      payAmount: Decimal;
    },
    member: MemberForCommission,
    config: DistributionConfig,
    baseAmount: Decimal,
    planSettleTime: Date,
    l1BeneficiaryId?: string,
    l1BeneficiaryLevel?: number,
    noL2Available?: boolean,
    orderItems?: Array<{ skuId: string; productId: string; categoryId: string; quantity: number; price: Decimal }>,
    productConfigService?: ProductConfigService,
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
      // 临时分享场景：通过 Port 查分享人的上级（A-T2）
      const sharer = await this.memberQueryPort.findMemberBrief(l1BeneficiaryId);
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

    // 3. 通过 Port 获取受益人信息并校验身份（A-T2: 解耦对 umsMember 的直接访问）
    const beneficiary = await this.memberQueryPort.findMemberBrief(beneficiaryId);

    if (!beneficiary || beneficiary.levelId !== 2) {
      this.logger.log(`[Commission] L2 user ${beneficiaryId} is not C2, skip`);
      return null;
    }

    // 4. 跨店校验
    const isCrossTenant = beneficiary.tenantId !== order.tenantId;
    if (isCrossTenant && !config.enableCrossTenant) {
      return null;
    }

    // 5. 获取会员等级配置（优先级最高）
    const memberLevelConfig = await this.levelService.findOne(order.tenantId, beneficiary.levelId);

    // 6. 计算金额（配置优先级：会员等级 > 商品级 > 品类级 > 租户默认）
    let totalAmount = new Decimal(0);
    let weightedRate = new Decimal(0);

    // 如果有商品信息和ProductConfigService，按商品计算
    if (orderItems && productConfigService && orderItems.length > 0) {
      for (const item of orderItems) {
        const productConfig = await productConfigService.getEffectiveConfig(
          order.tenantId,
          item.productId,
          item.categoryId,
        );

        if (!productConfig) continue;

        const itemBaseAmount = baseAmount.mul(item.price.mul(item.quantity)).div(order.payAmount);
        
        // 配置优先级：会员等级 > 商品级
        let itemRate: Decimal;
        if (memberLevelConfig && memberLevelConfig.level2Rate) {
          // 使用会员等级配置的L2费率
          itemRate = new Decimal(memberLevelConfig.level2Rate);
          this.logger.debug(`[Commission] Using member level config for L2: levelId=${beneficiary.levelId}, rate=${itemRate}`);
        } else {
          // 使用商品级配置的L2费率
          itemRate = new Decimal(productConfig.level2Rate);
        }

        if (isCrossTenant && config.crossTenantRate) {
          itemRate = itemRate.mul(config.crossTenantRate);
        }

        const itemAmount = itemBaseAmount.mul(itemRate);
        totalAmount = totalAmount.add(itemAmount);
        weightedRate = weightedRate.add(itemRate.mul(item.price.mul(item.quantity)));
      }
    } else {
      // 降级：使用会员等级配置或租户默认配置
      let rate: Decimal;
      if (memberLevelConfig && memberLevelConfig.level2Rate) {
        rate = new Decimal(memberLevelConfig.level2Rate);
        this.logger.debug(`[Commission] Using member level config for L2 (fallback): levelId=${beneficiary.levelId}, rate=${rate}`);
      } else {
        rate = new Decimal(config.level2Rate);
      }
      
      if (isCrossTenant && config.crossTenantRate) {
        rate = rate.mul(config.crossTenantRate);
      }
      totalAmount = baseAmount.mul(rate);
      weightedRate = rate.mul(order.payAmount);
    }

    const avgRate = order.payAmount.gt(0) ? weightedRate.div(order.payAmount) : new Decimal(0);

    if (totalAmount.lt(0.01)) return null;

    // 7. 限额校验
    if (isCrossTenant && config.crossMaxDaily) {
      const pass = await this.validator.checkDailyLimit(order.tenantId, beneficiaryId, totalAmount, config.crossMaxDaily);
      if (!pass) return null;
    }

    return {
      orderId: order.id,
      tenantId: order.tenantId,
      beneficiaryId,
      level: 2,
      amount: totalAmount.toDecimalPlaces(2),
      rateSnapshot: avgRate.mul(100),
      status: 'FROZEN' as CommissionStatus,
      planSettleTime,
      isCrossTenant: !!isCrossTenant,
    };
  }
}
