import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { ClsService } from 'nestjs-cls';
import { Result } from 'src/common/response/result';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { FormatDateFields } from 'src/common/utils';
import { TenantContext } from 'src/common/tenant';
import { PointsRuleRepository } from './rule.repository';
import { UpdatePointsRuleDto } from './dto/update-points-rule.dto';

/**
 * 积分规则服务
 *
 * @description 提供积分规则的配置管理、积分计算、验证等功能
 */
@Injectable()
export class PointsRuleService {
  private readonly logger = new Logger(PointsRuleService.name);

  constructor(
    private readonly repo: PointsRuleRepository,
    private readonly cls: ClsService,
  ) {}

  /**
   * 获取租户积分规则配置
   *
   * @returns 积分规则
   */
  async getRules() {
    // 租户ID 由 TenantMiddleware 从 header 'tenant-id' 提取，未提供时使用 SUPER_TENANT_ID
    const tenantId = TenantContext.getTenantId() ?? TenantContext.SUPER_TENANT_ID;
    let rules = await this.repo.findByTenantId(tenantId);

    // 如果不存在，创建默认规则
    if (!rules) {
      const userId = this.cls.get('user')?.userId ?? this.cls.get('userId') ?? 'system';
      rules = await this.repo.create({
        tenantId,
        orderPointsEnabled: true,
        orderPointsRatio: new Decimal(1),
        orderPointsBase: new Decimal(1),
        signinPointsEnabled: true,
        signinPointsAmount: 10,
        pointsValidityEnabled: false,
        pointsValidityDays: null,
        pointsRedemptionEnabled: true,
        pointsRedemptionRatio: new Decimal(100),
        pointsRedemptionBase: new Decimal(1),
        maxPointsPerOrder: null,
        maxDiscountPercentOrder: 50,
        systemEnabled: true,
        createBy: userId,
      } as any);
    }

    return Result.ok(FormatDateFields(rules));
  }

  /**
   * 更新积分规则配置
   *
   * @param dto 更新数据
   * @returns 更新后的规则
   */
  async updateRules(dto: UpdatePointsRuleDto) {
    const tenantId = TenantContext.getTenantId() ?? TenantContext.SUPER_TENANT_ID;
    const userId = this.cls.get('user')?.userId ?? this.cls.get('userId') ?? 'system';

    // 验证配置
    this.validateRuleConfig(dto);

    const rules = await this.repo.upsert(tenantId, dto as any, userId);

    this.logger.log(`积分规则已更新: tenantId=${tenantId}`);

    return Result.ok(FormatDateFields(rules));
  }

  /**
   * 计算消费积分
   *
   * @param orderAmount 订单金额
   * @returns 应获得的积分数
   */
  async calculateOrderPoints(orderAmount: Decimal): Promise<number> {
    const tenantId = TenantContext.getTenantId();
    const rules = await this.repo.findByTenantId(tenantId);

    if (!rules || !rules.orderPointsEnabled || !rules.systemEnabled) {
      return 0;
    }

    // 计算公式: floor(orderAmount / orderPointsBase) * orderPointsRatio
    const points = Math.floor(Number(orderAmount) / Number(rules.orderPointsBase)) * Number(rules.orderPointsRatio);

    return Math.max(0, points);
  }

  /**
   * 按商品明细计算消费积分（新方法，防止积分套利）
   *
   * @param items 订单商品明细
   * @param baseAmount 积分计算基数（原价 - 优惠券抵扣，不包括积分抵扣）
   * @param totalAmount 订单原价
   * @returns 每个商品的积分明细
   */
  async calculateOrderPointsByItems(
    items: Array<{
      skuId: string;
      price: Decimal;
      quantity: number;
      pointsRatio: number;
    }>,
    baseAmount: Decimal,
    totalAmount: Decimal,
  ): Promise<Array<{ skuId: string; earnedPoints: number }>> {
    const tenantId = TenantContext.getTenantId();
    const rules = await this.repo.findByTenantId(tenantId);

    if (!rules || !rules.orderPointsEnabled || !rules.systemEnabled) {
      return items.map((item) => ({ skuId: item.skuId, earnedPoints: 0 }));
    }

    // 如果基数金额为0或负数，不产生积分
    if (Number(baseAmount) <= 0) {
      return items.map((item) => ({ skuId: item.skuId, earnedPoints: 0 }));
    }

    const result: Array<{ skuId: string; earnedPoints: number }> = [];

    for (const item of items) {
      // 计算该商品在订单中的金额占比
      const itemTotalAmount = Number(item.price) * item.quantity;
      const itemRatio = itemTotalAmount / Number(totalAmount);

      // 该商品应分摊的积分计算基数
      const itemBaseAmount = Number(baseAmount) * itemRatio;

      // 计算该商品的基础积分
      const basePoints = Math.floor(itemBaseAmount / Number(rules.orderPointsBase)) * Number(rules.orderPointsRatio);

      // 应用商品的积分比例（0-100）
      const earnedPoints = Math.floor(basePoints * (item.pointsRatio / 100));

      result.push({
        skuId: item.skuId,
        earnedPoints: Math.max(0, earnedPoints),
      });
    }

    return result;
  }

  /**
   * 计算积分抵扣金额
   *
   * @param points 使用的积分数
   * @returns 抵扣金额
   */
  async calculatePointsDiscount(points: number): Promise<Decimal> {
    const tenantId = TenantContext.getTenantId();
    const rules = await this.repo.findByTenantId(tenantId);

    if (!rules || !rules.pointsRedemptionEnabled || !rules.systemEnabled) {
      return new Decimal(0);
    }

    // 计算公式: floor(points / pointsRedemptionRatio) * pointsRedemptionBase
    const discount = Math.floor(points / Number(rules.pointsRedemptionRatio)) * Number(rules.pointsRedemptionBase);

    return new Decimal(Math.max(0, discount));
  }

  /**
   * 验证积分使用是否合法
   *
   * @param points 使用的积分数
   * @param orderAmount 订单金额
   * @throws BusinessException 如果验证失败
   */
  async validatePointsUsage(points: number, orderAmount: Decimal) {
    const tenantId = TenantContext.getTenantId();
    const rules = await this.repo.findByTenantId(tenantId);

    if (!rules || !rules.pointsRedemptionEnabled || !rules.systemEnabled) {
      BusinessException.throw(400, '积分抵扣功能未启用');
    }

    // 验证单笔订单最多可使用积分数量
    if (rules.maxPointsPerOrder && points > rules.maxPointsPerOrder) {
      BusinessException.throw(400, `单笔订单最多使用 ${rules.maxPointsPerOrder} 积分`);
    }

    // 验证最大抵扣比例
    if (rules.maxDiscountPercentOrder) {
      const discount = await this.calculatePointsDiscount(points);
      const maxDiscount = Number(orderAmount) * (rules.maxDiscountPercentOrder / 100);

      if (Number(discount) > maxDiscount) {
        BusinessException.throw(400, `积分抵扣金额不能超过订单金额的 ${rules.maxDiscountPercentOrder}%`);
      }
    }
  }

  /**
   * 验证规则配置的合法性
   *
   * @param dto 规则配置
   * @throws BusinessException 如果配置不合法
   */
  private validateRuleConfig(dto: UpdatePointsRuleDto) {
    // 验证消费积分配置
    if (dto.orderPointsEnabled) {
      if (dto.orderPointsBase !== undefined && dto.orderPointsBase <= 0) {
        BusinessException.throw(400, '消费积分基数必须大于0');
      }
      if (dto.orderPointsRatio !== undefined && dto.orderPointsRatio < 0) {
        BusinessException.throw(400, '消费积分比例不能为负数');
      }
    }

    // 验证签到积分配置
    if (dto.signinPointsEnabled) {
      if (dto.signinPointsAmount !== undefined && dto.signinPointsAmount <= 0) {
        BusinessException.throw(400, '签到积分数量必须大于0');
      }
    }

    // 验证积分有效期配置
    if (dto.pointsValidityEnabled) {
      if (dto.pointsValidityDays !== undefined && dto.pointsValidityDays <= 0) {
        BusinessException.throw(400, '积分有效天数必须大于0');
      }
    }

    // 验证积分抵扣配置
    if (dto.pointsRedemptionEnabled) {
      if (dto.pointsRedemptionBase !== undefined && dto.pointsRedemptionBase <= 0) {
        BusinessException.throw(400, '积分抵扣基数必须大于0');
      }
      if (dto.pointsRedemptionRatio !== undefined && dto.pointsRedemptionRatio < 0) {
        BusinessException.throw(400, '积分抵扣比例不能为负数');
      }
      if (dto.maxPointsPerOrder !== undefined && dto.maxPointsPerOrder < 0) {
        BusinessException.throw(400, '单笔订单最多可使用积分数量不能为负数');
      }
      if (
        dto.maxDiscountPercentOrder !== undefined &&
        (dto.maxDiscountPercentOrder < 1 || dto.maxDiscountPercentOrder > 100)
      ) {
        BusinessException.throw(400, '单笔订单最多可抵扣百分比必须在1-100之间');
      }
    }
  }
}
