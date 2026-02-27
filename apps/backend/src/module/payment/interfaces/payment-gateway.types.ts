import { Decimal } from '@prisma/client/runtime/library';

/**
 * 预下单参数
 */
export interface PrepayParams {
  /** 订单号 */
  orderSn: string;
  /** 订单金额（元） */
  amount: Decimal | string | number;
  /** 订单描述 */
  description: string;
  /** 用户 OpenId（微信 JSAPI 必填） */
  openId: string;
  /** 附加数据 */
  attach?: string;
}

/**
 * 预下单结果（返回给前端 5 参数）
 */
export interface PrepayResult {
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}

/**
 * 支付回调验签后的有效载荷
 */
export interface PaymentCallbackPayload {
  /** 商户订单号 */
  orderSn: string;
  /** 微信支付订单号 */
  transactionId: string;
  /** 支付金额（元） */
  payAmount: number;
}

/**
 * 退款参数
 */
export interface RefundParams {
  orderSn: string;
  refundSn: string;
  refundAmount: Decimal | string | number;
  totalAmount: Decimal | string | number;
  reason?: string;
}

/**
 * 退款结果
 */
export interface RefundResult {
  refundSn: string;
  refundId: string;
  status: 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CLOSED';
  amount: number;
}
