/**
 * 订单查询端口
 *
 * @description
 * Finance 模块通过此端口获取订单数据，解耦对 OMS 模块的直接依赖。
 * 遵循依赖倒置原则：Finance 定义接口，Store 模块提供实现。
 *
 * @architecture A-T1: Commission 消除对 omsOrder 表的直接访问
 */

import { Decimal } from '@prisma/client/runtime/library';
import { OrderType } from '@prisma/client';

/**
 * 订单项信息（佣金计算所需）
 */
export interface OrderItemForCommission {
  skuId: string;
  productId: string;
  quantity: number;
  price: Decimal;
  /** 商品小计金额，baseCalculator 需要此字段 */
  totalAmount: Decimal;
}

/**
 * 订单信息（佣金计算所需）
 */
export interface OrderForCommission {
  id: string;
  tenantId: string;
  memberId: string;
  shareUserId: string | null;
  orderType: OrderType;
  totalAmount: Decimal;
  payAmount: Decimal;
  couponDiscount: Decimal;
  pointsDiscount: Decimal;
  items: OrderItemForCommission[];
}

/**
 * 订单查询端口接口
 */
export abstract class OrderQueryPort {
  /**
   * 根据订单ID获取订单信息（含商品明细）
   *
   * @param orderId - 订单ID
   * @returns 订单信息，不存在返回 null
   */
  abstract findOrderForCommission(orderId: string): Promise<OrderForCommission | null>;

  /**
   * 批量获取订单信息
   *
   * @param orderIds - 订单ID列表
   * @returns 订单信息Map
   */
  abstract findOrdersForCommission(orderIds: string[]): Promise<Map<string, OrderForCommission>>;
}
