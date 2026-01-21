/**
 * 订单相关 API
 */
import { httpGet, httpPost } from '@/http/http'

/**
 * 订单商品项
 */
export interface OrderItemDto {
    skuId: string
    quantity: number
    shareUserId?: string
}

/**
 * 结算预览请求参数
 */
export interface CheckoutPreviewParams {
    tenantId: string
    items: OrderItemDto[]
}

/**
 * 结算预览响应
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

/**
 * 创建订单请求参数
 */
export interface CreateOrderDto {
    tenantId: string
    items: OrderItemDto[]
    receiverName?: string
    receiverPhone?: string
    receiverAddress?: string
    receiverLat?: number
    receiverLng?: number
    bookingTime?: string
    serviceRemark?: string
    remark?: string
}

/**
 * 创建订单响应
 */
export interface CreateOrderVo {
    orderId: string
    orderSn: string
    payAmount: number
}

/**
 * 获取结算预览
 */
export function getCheckoutPreview(params: CheckoutPreviewParams) {
    return httpPost<CheckoutPreviewVo>('/client/order/checkout/preview', params)
}

/**
 * 创建订单
 */
export function createOrder(dto: CreateOrderDto) {
    return httpPost<CreateOrderVo>('/client/order/create', dto)
}

/**
 * 获取订单列表
 */
export function getOrderList(params: { status?: string; pageNum: number; pageSize: number }) {
    return httpGet<{ rows: any[]; total: number }>('/client/order/list', params)
}

/**
 * 获取订单详情
 */
export function getOrderDetail(orderId: string) {
    return httpGet<any>(`/client/order/${orderId}`)
}

/**
 * 取消订单
 */
export function cancelOrder(orderId: string, reason?: string) {
    return httpPost('/client/order/cancel', { orderId, reason })
}
