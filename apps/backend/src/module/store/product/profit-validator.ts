import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { DistributionMode } from '@prisma/client';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response';

/**
 * 利润风控校验器
 *
 * @description
 * 负责校验商品价格设置是否满足利润要求,防止亏损销售。
 *
 * 核心功能:
 * - 参数合法性校验(价格、费率范围)
 * - 佣金计算(支持比例、固定、无佣金三种模式)
 * - 利润校验(售价 - 成本 - 佣金 >= 0)
 * - 利润率预警(低于10%时记录日志)
 *
 * 支持的分销模式:
 * - RATIO: 按比例分佣(如 15% = 0.15)
 * - FIXED: 固定金额分佣(如 20元)
 * - NONE: 无佣金
 *
 * @example
 * const validator = new ProfitValidator();
 *
 * // RATIO 模式: 售价100, 成本60, 费率15%
 * validator.validate(100, new Decimal(60), 0.15, DistributionMode.RATIO);
 * // 利润 = 100 - 60 - 15 = 25 ✓
 *
 * // FIXED 模式: 售价100, 成本60, 固定佣金20
 * validator.validate(100, new Decimal(60), 20, DistributionMode.FIXED);
 * // 利润 = 100 - 60 - 20 = 20 ✓
 *
 * // NONE 模式: 售价100, 成本60, 无佣金
 * validator.validate(100, new Decimal(60), 0, DistributionMode.NONE);
 * // 利润 = 100 - 60 = 40 ✓
 */
@Injectable()
export class ProfitValidator {
  private readonly logger = new Logger(ProfitValidator.name);

  /**
   * 校验价格设置是否满足利润要求
   *
   * @param price - 售价(元)
   * @param costPrice - 成本价(元)
   * @param distRate - 分销费率
   *   - RATIO模式: 小数(如 0.15 表示 15%)
   *   - FIXED模式: 固定金额(如 20 表示 20元)
   *   - NONE模式: 0 或任意值(不使用)
   * @param distMode - 分销模式
   *
   * @throws BusinessException
   * - 售价必须大于0
   * - 分销费率不能为负数
   * - RATIO模式下费率不能超过100%
   * - 利润为负(亏损)
   * - 未知的分销模式
   *
   * @example
   * // 正常情况
   * validate(100, new Decimal(60), 0.15, DistributionMode.RATIO);
   *
   * // 亏损情况(抛出异常)
   * validate(100, new Decimal(90), 0.15, DistributionMode.RATIO);
   * // 抛出: "价格设置导致亏损! 售价:100, 成本:90.00, 佣金:15.00, 亏损:5.00"
   *
   * // 参数错误(抛出异常)
   * validate(-100, new Decimal(60), 0.15, DistributionMode.RATIO);
   * // 抛出: "售价必须大于0"
   */
  validate(price: number, costPrice: Decimal, distRate: number, distMode: DistributionMode): void {
    // ========== 第一阶段: 参数校验 ==========

    // 1. 售价校验
    BusinessException.throwIf(price <= 0, '售价必须大于0', ResponseCode.PARAM_INVALID);

    // 2. 费率校验
    BusinessException.throwIf(distRate < 0, '分销费率不能为负数', ResponseCode.PARAM_INVALID);

    // 3. RATIO 模式特殊校验
    if (distMode === DistributionMode.RATIO) {
      BusinessException.throwIf(distRate > 1, '分销比例不能超过100%', ResponseCode.PARAM_INVALID);
    }

    // ========== 第二阶段: 佣金计算 ==========

    let commission = new Decimal(0);

    switch (distMode) {
      case DistributionMode.RATIO:
        // 比例模式: 佣金 = 售价 × 费率
        // 例如: 100 × 0.15 = 15
        commission = new Decimal(price).mul(new Decimal(distRate));
        break;

      case DistributionMode.FIXED:
        // 固定模式: 佣金 = 固定金额
        // 例如: 20元
        commission = new Decimal(distRate);
        break;

      case DistributionMode.NONE:
        // 无佣金模式: 佣金 = 0
        commission = new Decimal(0);
        break;

      default:
        // 未知模式: 抛出异常
        throw new BusinessException(ResponseCode.PARAM_INVALID, `未知的分销模式: ${distMode}`);
    }

    // ========== 第三阶段: 利润校验 ==========

    // 利润 = 售价 - 成本 - 佣金
    const profit = new Decimal(price).sub(costPrice).sub(commission);

    // 检查是否亏损
    if (profit.lessThan(0)) {
      throw new BusinessException(
        ResponseCode.PARAM_INVALID,
        `价格设置导致亏损! 售价:${price}, 成本:${costPrice.toFixed(2)}, 佣金:${commission.toFixed(2)}, 亏损:${profit.abs().toFixed(2)}`,
      );
    }

    // ========== 第四阶段: 利润率预警 ==========

    // 计算利润率 = 利润 / 售价
    const profitRate = profit.div(new Decimal(price));

    // 利润率低于10%时记录警告日志
    if (profitRate.lessThan(0.1)) {
      this.logger.warn(
        `利润率过低: ${profitRate.mul(100).toFixed(2)}%, ` +
          `售价:${price}, 成本:${costPrice.toFixed(2)}, 佣金:${commission.toFixed(2)}, ` +
          `利润:${profit.toFixed(2)}. SKU可能缺乏竞争力`,
      );
    }
  }

  /**
   * 计算利润(不抛出异常,仅返回结果)
   *
   * @param price - 售价(元)
   * @param costPrice - 成本价(元)
   * @param distRate - 分销费率
   * @param distMode - 分销模式
   * @returns 利润信息
   *
   * @example
   * const result = calculateProfit(100, new Decimal(60), 0.15, DistributionMode.RATIO);
   * // {
   * //   profit: Decimal(25),
   * //   profitRate: Decimal(0.25),
   * //   commission: Decimal(15),
   * //   isValid: true
   * // }
   */
  calculateProfit(
    price: number,
    costPrice: Decimal,
    distRate: number,
    distMode: DistributionMode,
  ): {
    profit: Decimal;
    profitRate: Decimal;
    commission: Decimal;
    isValid: boolean;
  } {
    // 计算佣金
    let commission = new Decimal(0);
    switch (distMode) {
      case DistributionMode.RATIO:
        commission = new Decimal(price).mul(new Decimal(distRate));
        break;
      case DistributionMode.FIXED:
        commission = new Decimal(distRate);
        break;
      case DistributionMode.NONE:
        commission = new Decimal(0);
        break;
    }

    // 计算利润
    const profit = new Decimal(price).sub(costPrice).sub(commission);
    const profitRate = profit.div(new Decimal(price));

    return {
      profit,
      profitRate,
      commission,
      isValid: profit.greaterThanOrEqualTo(0),
    };
  }
}
