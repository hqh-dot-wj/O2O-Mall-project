import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PaymentGatewayPort } from '../ports/payment-gateway.port';
import {
  PrepayParams,
  PrepayResult,
  PaymentCallbackPayload,
  RefundParams,
  RefundResult,
} from '../interfaces/payment-gateway.types';

/**
 * Mock 支付网关
 *
 * 用于测试/开发环境，不调用真实支付 API
 * - prepay: 返回模拟支付参数
 * - handleCallback: 接受任意 body（JSON），解析 orderSn/transactionId/payAmount
 * - refund: 模拟成功
 * - queryPaymentStatus: 返回 PAID
 */
@Injectable()
export class MockPaymentGatewayAdapter extends PaymentGatewayPort {
  private readonly logger = new Logger(MockPaymentGatewayAdapter.name);

  async prepay(params: PrepayParams): Promise<PrepayResult> {
    this.logger.log(`[Mock] prepay: ${params.orderSn}, 金额: ${params.amount}`);

    const nonceStr = crypto.randomBytes(16).toString('hex').slice(0, 32);
    const prepayId = `wx_mock_${Date.now()}_${nonceStr.slice(0, 8)}`;

    return {
      timeStamp: Math.floor(Date.now() / 1000).toString(),
      nonceStr,
      package: `prepay_id=${prepayId}`,
      signType: 'RSA',
      paySign: 'mock_pay_sign_' + crypto.randomBytes(8).toString('hex'),
    };
  }

  async handleCallback(headers: Record<string, string>, body: string): Promise<PaymentCallbackPayload> {
    this.logger.log(`[Mock] handleCallback received`);

    try {
      const data = JSON.parse(body) as Record<string, unknown>;
      const orderSn = (data.out_trade_no ?? data.orderSn) as string;
      const transactionId = (data.transaction_id ?? data.transactionId) as string;
      const payAmount = this.parsePayAmount(data);

      if (!orderSn || !transactionId) {
        throw new Error('Mock callback: missing orderSn or transactionId');
      }

      return { orderSn, transactionId, payAmount };
    } catch (error) {
      this.logger.error(`[Mock] handleCallback parse error: ${String(error)}`);
      throw error;
    }
  }

  private parsePayAmount(data: Record<string, unknown>): number {
    if (typeof data.payAmount === 'number') return data.payAmount;
    if (typeof data.total === 'number') return data.total / 100; // 分转元
    const amount = data.amount as { total?: number } | undefined;
    if (amount?.total != null) return amount.total / 100;
    return 0;
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    this.logger.log(`[Mock] refund: ${params.refundSn}, 金额: ${params.refundAmount}`);

    return {
      refundSn: params.refundSn,
      refundId: `mock_refund_${Date.now()}`,
      status: 'SUCCESS',
      amount: Number(params.refundAmount) * 100,
    };
  }

  async queryPaymentStatus(orderSn: string): Promise<{
    orderSn: string;
    transactionId: string;
    status: 'UNPAID' | 'PAID' | 'CLOSED' | 'REFUNDED';
    payAmount: number;
    payTime?: Date;
  }> {
    this.logger.log(`[Mock] queryPaymentStatus: ${orderSn}`);

    return {
      orderSn,
      transactionId: `mock_tx_${Date.now()}`,
      status: 'PAID',
      payAmount: 0,
      payTime: new Date(),
    };
  }
}
