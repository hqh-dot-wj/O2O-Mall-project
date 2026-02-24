/**
 * 订单相关 API
 * 类型来自 @libs/common-types（由 backend openApi.json 生成）
 */
import type {
  CreateOrderParams,
  OrderDetail,
  OrderListItem,
  OrderItemInput,
} from '@libs/common-types'
import type { OrderStatusEnum } from '@libs/common-types/enum'
import { httpGet, httpPost } from '@/http/http'

/** 向后兼容别名：旧代码中使用的 OrderItemDto */
export type OrderItemDto = OrderItemInput

/**
 * 结算预览请求参数（backend 暂未在 openApi 中定义独立 schema，保留本地类型）
 */
export interface CheckoutPreviewParams {
  tenantId: string
  items: OrderItemInput[]
  marketingConfigId?: string
  playInstanceId?: string
}

/**
 * 结算预览响应（backend 暂未在 openApi 中定义独立 schema，保留本地类型）
 */
export interface CheckoutPreviewVo {
  items: {
    productId: string
    productName: string
    productImg: string
    skuId: string
    specData: Record<string, string> | null
    price: number
    quantity: number
    totalAmount: number
  }[]
  totalAmount: number
  freightAmount: number
  discountAmount: number
  payAmount: number
  defaultAddress?: {
    name: string
    phone: string
    address: string
    lat?: number
    lng?: number
  }
  hasService: boolean
}

/** 获取结算预览 */
export function getCheckoutPreview(params: CheckoutPreviewParams) {
  return httpPost<CheckoutPreviewVo>('/client/order/checkout/preview', params)
}

/** 创建订单 */
export function createOrder(dto: CreateOrderParams) {
  return httpPost<{ orderId: string, orderSn: string, payAmount: number }>('/client/order/create', dto)
}

/** 获取订单列表 */
export function getOrderList(params: { status?: OrderStatusEnum, pageNum: number, pageSize: number }) {
  return httpGet<{ rows: OrderListItem[], total: number }>('/client/order/list', params)
}

/** 获取订单详情 */
export function getOrderDetail(orderId: string) {
  return httpGet<OrderDetail>(`/client/order/${orderId}`)
}

/** 取消订单 */
export function cancelOrder(orderId: string, reason?: string) {
  return httpPost('/client/order/cancel', { orderId, reason })
}
