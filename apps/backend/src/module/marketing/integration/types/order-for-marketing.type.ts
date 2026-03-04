import { Decimal } from '@prisma/client/runtime/library';

/**
 * 订单项信息（营销集成所需）
 */
export interface OrderItemForMarketing {
  skuId: string;
  productId?: string;
  productName?: string;
  quantity: number;
  price: Decimal;
  totalAmount: Decimal;
  /** 积分比例 0-100，calculateOrderPointsByItems 需要 */
  pointsRatio?: number;
}

/**
 * 订单信息（营销集成所需）
 * 
 * @description 用于优惠券、积分等营销功能与订单的集成
 */
export interface OrderForMarketing {
  id: string;
  tenantId: string;
  memberId: string;
  orderSn?: string;
  totalAmount: Decimal;
  payAmount?: Decimal;
  couponDiscount: Decimal;
  pointsDiscount?: Decimal;
  userCouponId?: string | null;
  pointsUsed?: number;
  items: OrderItemForMarketing[];
}
