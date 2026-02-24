import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * 佣金基数计算服务
 * 职责：计算佣金基数（支持原价/实付/兑换商品）
 */
@Injectable()
export class BaseCalculatorService {
  private readonly logger = new Logger(BaseCalculatorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 计算佣金基数
   * 
   * @description
   * 支持三种计算策略：
   * 1. ORIGINAL_PRICE: 基于商品原价（优惠由平台承担）
   * 2. ACTUAL_PAID: 基于实付金额（优惠由推广者承担）
   * 3. ZERO: 兑换商品不分佣
   * 
   * @returns { base: 分佣基数, type: 基数类型 }
   */
  async calculateCommissionBase(
    order: {
      items: Array<{ skuId: string; totalAmount: Decimal; quantity: number }>;
      totalAmount: Decimal;
      payAmount: Decimal;
    },
    baseType: string = 'ORIGINAL_PRICE'
  ): Promise<{ base: Decimal; type: string }> {
    let totalBase = new Decimal(0);
    let hasExchangeProduct = false;
    let hasNormalProduct = false;

    // 批量查询所有 SKU，避免 N+1 查询
    const skuIds = order.items.map((item) => item.skuId);
    const tenantSkus = await this.prisma.pmsTenantSku.findMany({
      where: {
        id: { in: skuIds },
      },
      include: {
        globalSku: true,
      },
    });

    // 构建 SKU Map，O(1) 查找
    const skuMap = new Map(tenantSkus.map((sku) => [sku.id, sku]));

    for (const item of order.items) {
      // 从 Map 中获取 SKU 配置
      const tenantSku = skuMap.get(item.skuId);

      if (!tenantSku || tenantSku.distMode === 'NONE') {
        continue;
      }

      // 检查是否为兑换商品
      if (tenantSku.isExchangeProduct) {
        hasExchangeProduct = true;
        // 兑换商品不参与分佣基数计算
        continue;
      }

      hasNormalProduct = true;

      // 计算单个商品的分佣基数
      let itemBase = new Decimal(0);
      if (tenantSku.distMode === 'RATIO') {
        // 按比例
        itemBase = item.totalAmount.mul(tenantSku.distRate);
      } else if (tenantSku.distMode === 'FIXED') {
        // 固定金额
        itemBase = tenantSku.distRate.mul(item.quantity);
      }

      totalBase = totalBase.add(itemBase);
    }

    // 如果全部是兑换商品，返回0
    if (hasExchangeProduct && !hasNormalProduct) {
      return { base: new Decimal(0), type: 'ZERO' };
    }

    // 根据配置的基数类型调整
    if (baseType === 'ACTUAL_PAID' && hasNormalProduct) {
      // 基于实付金额：按比例缩减
      // 缩减比例 = 实付金额 / 商品原价
      const originalPrice = order.totalAmount;
      const actualPaid = order.payAmount;
      
      if (originalPrice.gt(0)) {
        const ratio = actualPaid.div(originalPrice);
        totalBase = totalBase.mul(ratio);
        
        this.logger.debug(
          `[CommissionBase] Adjusted by actual paid: ` +
          `original=${originalPrice.toFixed(2)}, paid=${actualPaid.toFixed(2)}, ` +
          `ratio=${ratio.toFixed(4)}`
        );
      }
      
      return { base: totalBase, type: 'ACTUAL_PAID' };
    }

    // 默认基于原价
    return { base: totalBase, type: 'ORIGINAL_PRICE' };
  }
}
