import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  OrderQueryPort,
  OrderForCommission,
  OrderItemForCommission,
} from '../ports/order-query.port';

/**
 * 订单查询适配器
 *
 * @description
 * 实现 OrderQueryPort，封装对 omsOrder 表的访问。
 * Finance 模块通过此适配器获取订单数据，而非直接访问 Prisma。
 *
 * @architecture A-T1: Commission 消除对 omsOrder 表的直接访问
 */
@Injectable()
export class OrderQueryAdapter extends OrderQueryPort {
  private readonly logger = new Logger(OrderQueryAdapter.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /**
   * 根据订单ID获取订单信息（含商品明细）
   */
  async findOrderForCommission(orderId: string): Promise<OrderForCommission | null> {
    const order = await this.prisma.omsOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return null;

    return this.mapToOrderForCommission(order);
  }

  /**
   * 批量获取订单信息
   */
  async findOrdersForCommission(orderIds: string[]): Promise<Map<string, OrderForCommission>> {
    if (orderIds.length === 0) return new Map();

    const orders = await this.prisma.omsOrder.findMany({
      where: { id: { in: orderIds } },
      include: { items: true },
    });

    const result = new Map<string, OrderForCommission>();
    for (const order of orders) {
      result.set(order.id, this.mapToOrderForCommission(order));
    }

    return result;
  }

  /**
   * 映射订单数据到 OrderForCommission
   */
  private mapToOrderForCommission(order: {
    id: string;
    tenantId: string;
    memberId: string;
    shareUserId: string | null;
    orderType: string;
    totalAmount: Decimal | number | string;
    payAmount: Decimal | number | string;
    couponDiscount: Decimal | number | string | null;
    pointsDiscount: Decimal | number | string | null;
    items: Array<{
      skuId: string;
      productId: string | null;
      quantity: number;
      price: Decimal | number | string;
    }>;
  }): OrderForCommission {
    return {
      id: order.id,
      tenantId: order.tenantId,
      memberId: order.memberId,
      shareUserId: order.shareUserId,
      orderType: order.orderType as OrderForCommission['orderType'],
      totalAmount: this.toDecimal(order.totalAmount),
      payAmount: this.toDecimal(order.payAmount),
      couponDiscount: this.toDecimal(order.couponDiscount ?? 0),
      pointsDiscount: this.toDecimal(order.pointsDiscount ?? 0),
      items: order.items.map((item) => this.mapToOrderItem(item)),
    };
  }

  /**
   * 映射订单项数据
   */
  private mapToOrderItem(item: {
    skuId: string;
    productId: string | null;
    quantity: number;
    price: Decimal | number | string;
  }): OrderItemForCommission {
    return {
      skuId: item.skuId,
      productId: item.productId || '',
      quantity: item.quantity,
      price: this.toDecimal(item.price),
    };
  }

  /**
   * 安全转换为 Decimal
   */
  private toDecimal(value: Decimal | number | string): Decimal {
    if (value instanceof Decimal) return value;
    return new Decimal(String(value));
  }
}
