import { httpPost } from '@/http/http'

export interface PrepayParams {
    timeStamp: string
    nonceStr: string
    package: string
    signType: 'RSA' | 'MD5'
    paySign: string
}

export interface MockSuccessResult {
    status: string
}

/**
 * 预下单，获取支付参数
 */
export function prepay(orderId: string, paymentMethod = 'WECHAT') {
    return httpPost<PrepayParams>('/client/payment/prepay', { orderId, paymentMethod })
}

/**
 * 模拟支付成功 (测试用)
 */
export function mockPaySuccess(orderId: string) {
    return httpPost<MockSuccessResult>('/client/payment/mock-success', { orderId })
}
