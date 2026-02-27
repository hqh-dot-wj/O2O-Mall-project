import {
  PrepayParams,
  PrepayResult,
  PaymentCallbackPayload,
  RefundParams,
  RefundResult,
} from '../interfaces/payment-gateway.types';

/**
 * 支付网关抽象接口（Port）
 *
 * 遵循 backend.mdc §20 Adapter/Port 模式：
 * - 业务层只依赖此 Port，不依赖具体支付实现
 * - 具体实现（微信/支付宝/Mock）通过 Adapter 注入
 *
 * @see https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/direct-jsons/jsapi-prepay.html
 * @see https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/payment-notice.html
 */
export abstract class PaymentGatewayPort {
  /**
   * 预下单，获取支付参数
   */
  abstract prepay(params: PrepayParams): Promise<PrepayResult>;

  /**
   * 支付回调验签
   * 验签通过返回解密后的载荷，失败抛出异常
   */
  abstract handleCallback(headers: Record<string, string>, body: string): Promise<PaymentCallbackPayload>;

  /**
   * 申请退款
   */
  abstract refund(params: RefundParams): Promise<RefundResult>;

  /**
   * 查询支付状态
   */
  abstract queryPaymentStatus(orderSn: string): Promise<{
    orderSn: string;
    transactionId: string;
    status: 'UNPAID' | 'PAID' | 'CLOSED' | 'REFUNDED';
    payAmount: number;
    payTime?: Date;
  }>;
}
