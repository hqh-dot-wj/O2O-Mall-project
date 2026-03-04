/**
 * Store 订单 API 类型
 * 请求参数来自 OpenAPI operations，响应类型与后端 VO 对齐
 */
import type { operations } from './api';

/** 订单列表搜索参数 - 来自 StoreOrderController_findAll */
export type StoreOrderSearchParams =
  NonNullable<operations['StoreOrderController_findAll']['parameters']['query']>;

/** 订单列表项 - 后端 StoreOrderListItemVo（待 generate-types 更新后切到 schema） */
export interface StoreOrderListItemVo {
  id: string;
  orderSn: string;
  orderType: string;
  status: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  totalAmount: number;
  freightAmount: number;
  discountAmount: number;
  payAmount: number;
  createTime: string;
  productImg: string;
  commissionAmount: number;
  remainingAmount: number;
  tenantName: string;
}

/** 订单商品项 */
export interface StoreOrderItemVo {
  id: string | number;
  productId: string;
  productName: string;
  productImg: string;
  skuId: string;
  specData: Record<string, string>;
  price: number;
  quantity: number;
  totalAmount: number;
}

/** 订单详情返回 */
export interface StoreOrderDetailVo {
  order: StoreOrderListItemVo & { items: StoreOrderItemVo[]; remark?: string; bookingTime?: string };
  customer?: { id: string; nickname: string; mobile: string; avatar?: string };
  worker?: { id: number; name: string; phone: string; avatar?: string; rating?: number };
  attribution?: { shareUser?: { id: string; nickname: string }; referrer?: { id: string; nickname: string } };
  commissions?: Array<{
    id: string;
    beneficiaryId: string;
    beneficiary?: { nickname: string; avatar?: string };
    level: 1 | 2;
    amount: number;
    rateSnapshot: number;
    status: string;
    planSettleTime: string;
  }>;
  business?: { tenantId?: string; companyName?: string; remainingAmount?: string; totalCommissionAmount?: string };
}
