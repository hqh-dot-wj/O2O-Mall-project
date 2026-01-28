/**
 * 订单与交易枚举
 * 对应 Prisma 中带有 @map("x") 的交易流程状态
 */

/** 订单状态 (1: 待支付, 2: 已支付待服务, 3: 服务中, 4: 已完成, 5: 已取消, 6: 已退款) */
export enum OrderStatusEnum {
  PENDING_PAY = '1',
  PAID = '2',
  SHIPPED = '3',
  COMPLETED = '4',
  CANCELLED = '5',
  REFUNDED = '6',
}

/** 订单类型 (1: 实物订单, 2: 服务订单, 3: 混合订单) */
export enum OrderTypeEnum {
  PRODUCT = '1',
  SERVICE = '2',
  MIXED = '3',
}

/** 支付状态 (0: 未支付, 1: 已支付, 2: 已退款) */
export enum PayStatusEnum {
  UNPAID = '0',
  PAID = '1',
  REFUNDED = '2',
}
