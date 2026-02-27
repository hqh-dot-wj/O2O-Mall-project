import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import { WechatPayService } from '../wechat-pay.service';
import { PaymentGatewayPort } from '../ports/payment-gateway.port';
import {
  PrepayParams,
  PrepayResult,
  PaymentCallbackPayload,
  RefundParams,
  RefundResult,
} from '../interfaces/payment-gateway.types';

/**
 * 微信支付 Adapter
 *
 * 将 PaymentGatewayPort 映射到 WechatPayService (IPaymentProvider)
 *
 * @see https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/direct-jsons/jsapi-prepay.html
 * @see https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/payment-notice.html
 */
@Injectable()
export class WechatPayAdapter extends PaymentGatewayPort {
  private readonly logger = new Logger(WechatPayAdapter.name);

  constructor(
    private readonly wechatPayService: WechatPayService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async prepay(params: PrepayParams): Promise<PrepayResult> {
    const result = await this.wechatPayService.createOrder({
      orderSn: params.orderSn,
      amount: params.amount,
      description: params.description,
      openId: params.openId,
      attach: params.attach,
    });

    return result.paymentParams;
  }

  async handleCallback(headers: Record<string, string>, body: string): Promise<PaymentCallbackPayload> {
    // TODO: [第三方] 对接微信支付回调验签 | P1 | 1d | payment-service-task-list T-10
    // 对接步骤：1. 验证 Wechat-Signature 2. 解密 resource (AES-256-GCM) 3. 解析 out_trade_no、transaction_id、amount.total
    // 参考: https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/payment-notice.html
    this.logger.warn('[WechatPayAdapter] handleCallback 未对接，生产环境需实现验签');

    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    if (isProd) {
      throw new Error('生产环境支付回调验签未配置，请对接微信支付文档后实现');
    }

    // 开发环境：尝试解析 JSON body 作为 Mock
    try {
      const data = JSON.parse(body) as Record<string, unknown>;
      return {
        orderSn: (data.out_trade_no ?? data.orderSn) as string,
        transactionId: (data.transaction_id ?? data.transactionId) as string,
        payAmount: this.parseAmount(data),
      };
    } catch {
      throw new Error('支付回调验签失败');
    }
  }

  private parseAmount(data: Record<string, unknown>): number {
    if (typeof data.payAmount === 'number') return data.payAmount;
    const amt = data.amount as { total?: number } | undefined;
    if (amt?.total != null) return amt.total / 100;
    return 0;
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    const result = await this.wechatPayService.refund({
      orderSn: params.orderSn,
      refundSn: params.refundSn,
      refundAmount: params.refundAmount,
      totalAmount: params.totalAmount,
      reason: params.reason,
    });

    return {
      refundSn: result.refundSn,
      refundId: result.refundId,
      status: result.status as RefundResult['status'],
      amount: result.amount,
    };
  }

  async queryPaymentStatus(orderSn: string) {
    const result = await this.wechatPayService.queryOrder(orderSn);
    return {
      orderSn: result.orderSn,
      transactionId: result.transactionId,
      status: result.status,
      payAmount: result.amount / 100,
      payTime: result.payTime,
    };
  }
}
