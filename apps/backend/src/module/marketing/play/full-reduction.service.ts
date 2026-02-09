import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { IMarketingStrategy } from './strategy.interface';
import { PlayInstance, StorePlayConfig, PlayInstanceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ResponseCode } from 'src/common/response/response.interface';
import { PlayInstanceService } from '../instance/instance.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { FullReductionRulesDto, FullReductionCalculateDto } from './dto/full-reduction.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PlayStrategy } from './play-strategy.decorator';

/**
 * 满减活动玩法核心逻辑
 */
@Injectable()
@PlayStrategy('FULL_REDUCTION')
export class FullReductionService implements IMarketingStrategy {
  readonly code = 'FULL_REDUCTION';

  constructor(
    @Inject(forwardRef(() => PlayInstanceService))
    private readonly instanceService: PlayInstanceService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 1.1 配置校验
   */
  async validateConfig(dto: any): Promise<void> {
    const rules = dto.rules;
    BusinessException.throwIf(!rules, '规则配置不能为空');

    // 使用 DTO 进行严格校验
    const rulesDto = plainToInstance(FullReductionRulesDto, rules);
    const errors = await validate(rulesDto);

    if (errors.length > 0) {
      const constraints = errors[0].constraints;
      const msg = constraints ? Object.values(constraints)[0] : '规则配置校验失败';
      throw new BusinessException(ResponseCode.PARAM_INVALID, msg);
    }

    // 档位逻辑校验
    if (!rulesDto.tiers || rulesDto.tiers.length === 0) {
      throw new BusinessException(ResponseCode.PARAM_INVALID, '至少需要配置一个满减档位');
    }

    // 检查档位是否按金额递增排序
    for (let i = 1; i < rulesDto.tiers.length; i++) {
      if (rulesDto.tiers[i].threshold <= rulesDto.tiers[i - 1].threshold) {
        throw new BusinessException(ResponseCode.PARAM_INVALID, '满减档位必须按金额递增配置');
      }
    }

    // 时间逻辑校验
    const startTime = new Date(rulesDto.startTime).getTime();
    const endTime = new Date(rulesDto.endTime).getTime();

    if (endTime <= startTime) {
      throw new BusinessException(ResponseCode.PARAM_INVALID, '结束时间必须晚于开始时间');
    }

    // 适用范围校验
    if (rulesDto.applicableScope === 'CATEGORY' && (!rulesDto.categoryIds || rulesDto.categoryIds.length === 0)) {
      throw new BusinessException(ResponseCode.PARAM_INVALID, '选择分类范围时必须指定分类ID');
    }

    if (rulesDto.applicableScope === 'PRODUCT' && (!rulesDto.productIds || rulesDto.productIds.length === 0)) {
      throw new BusinessException(ResponseCode.PARAM_INVALID, '选择商品范围时必须指定商品ID');
    }
  }

  /**
   * 1. 准入校验
   */
  async validateJoin(config: StorePlayConfig, memberId: string, params: any = {}): Promise<void> {
    const rules = config.rules as any;

    // A. 时间校验
    const now = Date.now();
    const startTime = new Date(rules.startTime).getTime();
    const endTime = new Date(rules.endTime).getTime();

    if (now < startTime) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '活动尚未开始');
    }

    if (now > endTime) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '活动已结束');
    }

    // B. 适用范围校验
    const calculateDto = plainToInstance(FullReductionCalculateDto, params);
    
    if (rules.applicableScope === 'CATEGORY') {
      // 检查订单商品是否在适用分类内
      const hasApplicableProduct = calculateDto.categoryIds?.some((catId) =>
        rules.categoryIds.includes(catId),
      );
      if (!hasApplicableProduct) {
        throw new BusinessException(ResponseCode.BUSINESS_ERROR, '订单中没有符合活动条件的商品');
      }
    }

    if (rules.applicableScope === 'PRODUCT') {
      // 检查订单商品是否在适用商品列表内
      const hasApplicableProduct = calculateDto.productIds?.some((prodId) =>
        rules.productIds.includes(prodId),
      );
      if (!hasApplicableProduct) {
        throw new BusinessException(ResponseCode.BUSINESS_ERROR, '订单中没有符合活动条件的商品');
      }
    }
  }

  /**
   * 2. 计算价格（满减优惠）
   */
  async calculatePrice(config: StorePlayConfig, params: any): Promise<Decimal> {
    const rules = config.rules as any;
    const calculateDto = plainToInstance(FullReductionCalculateDto, params);
    const originalAmount = new Decimal(calculateDto.originalAmount);

    // 找到满足条件的最高档位
    const matchedTier = rules.tiers
      .filter((tier: any) => originalAmount.gte(tier.threshold))
      .sort((a: any, b: any) => b.discount - a.discount)[0];

    if (matchedTier) {
      const discountAmount = new Decimal(matchedTier.discount);
      const finalAmount = originalAmount.minus(discountAmount);
      
      // 确保最终金额不为负数
      return finalAmount.lt(0) ? new Decimal(0) : finalAmount;
    }

    // 未满足任何档位，返回原价
    return originalAmount;
  }

  /**
   * 3. 支付成功回调
   */
  async onPaymentSuccess(instance: PlayInstance): Promise<void> {
    // 满减活动通常不需要特殊的支付后处理
    // 可以在这里记录优惠使用情况用于统计分析
  }

  /**
   * 4. 状态流转钩子
   */
  async onStatusChange(instance: PlayInstance, oldStatus: string, newStatus: string): Promise<void> {
    // 满减活动的状态流转通常不需要特殊处理
  }

  /**
   * 5. 前端展示增强数据
   */
  async getDisplayData(config: StorePlayConfig): Promise<any> {
    const rules = config.rules as any;
    const now = Date.now();
    const startTime = new Date(rules.startTime).getTime();
    const endTime = new Date(rules.endTime).getTime();

    // 计算活动状态
    let status: 'NOT_STARTED' | 'IN_PROGRESS' | 'ENDED' = 'NOT_STARTED';
    if (now >= startTime && now <= endTime) {
      status = 'IN_PROGRESS';
    } else if (now > endTime) {
      status = 'ENDED';
    }

    // 生成优惠文案
    const tierTexts = rules.tiers
      .sort((a: any, b: any) => a.threshold - b.threshold)
      .map((tier: any) => `满${tier.threshold}减${tier.discount}`);

    // 适用范围文案
    let scopeText = '全场通用';
    if (rules.applicableScope === 'CATEGORY') {
      scopeText = '指定分类可用';
    } else if (rules.applicableScope === 'PRODUCT') {
      scopeText = '指定商品可用';
    }

    return {
      tiers: rules.tiers,
      tierTexts,
      scopeText,
      applicableScope: rules.applicableScope,
      stackable: rules.stackable || false,
      startTime: rules.startTime,
      endTime: rules.endTime,
      status,
    };
  }

  /**
   * 计算可获得的优惠金额（用于前端提示）
   */
  async calculateDiscount(config: StorePlayConfig, originalAmount: number): Promise<number> {
    const rules = config.rules as any;
    const amount = new Decimal(originalAmount);

    const matchedTier = rules.tiers
      .filter((tier: any) => amount.gte(tier.threshold))
      .sort((a: any, b: any) => b.discount - a.discount)[0];

    return matchedTier ? matchedTier.discount : 0;
  }

  /**
   * 获取下一档位信息（用于前端提示"再买XX元可享受更多优惠"）
   */
  async getNextTier(config: StorePlayConfig, currentAmount: number): Promise<any> {
    const rules = config.rules as any;
    const amount = new Decimal(currentAmount);

    const nextTier = rules.tiers
      .filter((tier: any) => amount.lt(tier.threshold))
      .sort((a: any, b: any) => a.threshold - b.threshold)[0];

    if (nextTier) {
      const gap = new Decimal(nextTier.threshold).minus(amount);
      return {
        threshold: nextTier.threshold,
        discount: nextTier.discount,
        gap: gap.toNumber(),
        tipText: `再买${gap.toFixed(2)}元可享受满${nextTier.threshold}减${nextTier.discount}优惠`,
      };
    }

    return null;
  }
}
