import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { CommissionStatus } from '@prisma/client';
import { CommissionValidatorService } from './commission-validator.service';
import { MemberForCommission, DistributionConfig, CommissionRecord } from 'src/common/types/finance.types';
import { ProductConfigService } from 'src/module/store/distribution/services/product-config.service';
import { LevelService } from 'src/module/store/distribution/services/level.service';
import { MemberQueryPort } from '../../ports/member-query.port';

/**
 * L1 佣金计算服务
 *
 * @description
 * 计算直推佣金。配置优先级：会员等级 > 商品级 > 品类级 > 租户默认
 *
 * @architecture A-T2: 通过 MemberQueryPort 获取会员数据
 */
@Injectable()
export class L1CalculatorService {
  private readonly logger = new Logger(L1CalculatorService.name);

  constructor(
    private readonly validator: CommissionValidatorService,
    private readonly levelService: LevelService,
    private readonly memberQueryPort: MemberQueryPort,
  ) {}

  /**
   * 计算 L1 佣金 (直推)
   * 规则:
   * - 优先: order.shareUserId (临时分享)
   * - 其次: member.parentId (绑定关系)
   * - 受益人必须 levelId >= 1 (C1/C2)
   * - 支持商品级配置（商品 > 品类 > 租户默认）
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
    baseAmount: Decimal,
    planSettleTime: Date,
    orderItems: Array<{ skuId: string; productId: string; categoryId: string; quantity: number; price: Decimal }>,
    productConfigService: ProductConfigService,
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

    // 3. 通过 Port 获取受益人信息（A-T2: 解耦对 umsMember 的直接访问）
    const beneficiary = await this.memberQueryPort.findMemberBrief(beneficiaryId);

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

    // 7. 获取会员等级配置（优先级最高）
    const memberLevelConfig = await this.levelService.findOne(order.tenantId, beneficiary.levelId);

    // 8. 按商品计算佣金（配置优先级：会员等级 > 商品级 > 品类级 > 租户默认）
    let totalAmount = new Decimal(0);
    let weightedRate = new Decimal(0); // 加权平均费率用于快照

    for (const item of orderItems) {
      // 获取该商品的有效配置（商品 > 品类 > 租户默认）
      const productConfig = await productConfigService.getEffectiveConfig(
        order.tenantId,
        item.productId,
        item.categoryId,
      );

      if (!productConfig) continue;

      // 计算该商品的佣金基数（按比例分配）
      const itemBaseAmount = baseAmount.mul(item.price.mul(item.quantity)).div(order.payAmount);

      // 配置优先级：会员等级 > 商品级
      let itemRate: Decimal;
      if (memberLevelConfig && memberLevelConfig.level1Rate) {
        // 使用会员等级配置的L1费率
        itemRate = new Decimal(memberLevelConfig.level1Rate);
        this.logger.debug(`[Commission] Using member level config for L1: levelId=${beneficiary.levelId}, rate=${itemRate}`);
      } else {
        // 使用商品级配置的L1费率
        itemRate = new Decimal(productConfig.level1Rate);
      }

      // 跨店折扣
      if (isCrossTenant && config.crossTenantRate) {
        itemRate = itemRate.mul(config.crossTenantRate);
      }

      // C2全拿场景: L1金额 = L1 + L2
      let itemAmount = itemBaseAmount.mul(itemRate);
      if (noL2Available) {
        let l2Rate: Decimal;
        if (memberLevelConfig && memberLevelConfig.level2Rate) {
          l2Rate = new Decimal(memberLevelConfig.level2Rate);
        } else {
          l2Rate = new Decimal(productConfig.level2Rate);
        }
        const l2Amount = itemBaseAmount.mul(l2Rate);
        itemAmount = itemAmount.add(l2Amount);
      }

      totalAmount = totalAmount.add(itemAmount);
      weightedRate = weightedRate.add(itemRate.mul(item.price.mul(item.quantity)));
    }

    // 计算加权平均费率
    const avgRate = order.payAmount.gt(0) ? weightedRate.div(order.payAmount) : new Decimal(0);

    if (noL2Available) {
      this.logger.log(`[Commission] C2 ${beneficiaryId} full take: L1+L2`);
    }

    if (totalAmount.lt(0.01)) return null;

    // 8. 跨店限额校验
    if (isCrossTenant && config.crossMaxDaily) {
      const pass = await this.validator.checkDailyLimit(order.tenantId, beneficiaryId, totalAmount, config.crossMaxDaily);
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
      amount: totalAmount.toDecimalPlaces(2),
      rateSnapshot: avgRate.mul(100),
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
