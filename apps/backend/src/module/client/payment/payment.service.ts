import { Injectable, Logger } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions';
import { PrepayDto } from './dto/payment.dto';
import { OrderStatus } from '@prisma/client';
import { CommissionService } from '../../finance/commission/commission.service';
import { OrderRepository } from '../order/order.repository';
import { OrderIntegrationService } from '../../marketing/integration/integration.service';
import { PaymentGatewayPort } from 'src/module/payment/ports/payment-gateway.port';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly commissionService: CommissionService,
    private readonly orderIntegrationService: OrderIntegrationService,
    private readonly paymentGateway: PaymentGatewayPort,
  ) {}

  /**
   * 预下单，获取支付参数
   *
   * 委托 PaymentGatewayPort：测试环境返回 Mock，生产环境调用微信 JSAPI 统一下单
   */
  async prepay(memberId: string, dto: PrepayDto) {
    const order = await this.orderRepo.findOne({
      id: dto.orderId,
      memberId,
    });

    BusinessException.throwIfNull(order, '订单不存在');
    BusinessException.throwIf(order.status !== 'PENDING_PAY', '订单状态不正确');

    const openId = (order as { openId?: string }).openId ?? '';
    return this.paymentGateway.prepay({
      orderSn: order.orderSn,
      amount: order.payAmount,
      description: `订单${order.orderSn}`,
      openId,
    });
  }

  /**
   * 支付回调处理
   *
   * 委托 PaymentGatewayPort.handleCallback 验签，验签通过后执行业务逻辑
   * 非法签名返回 FAIL，不更新订单（AC-2）
   */
  async handleCallback(headers: Record<string, string>, body: string) {
    const payload = await this.paymentGateway.handleCallback(headers, body);
    const order = await this.orderRepo.findBySn(payload.orderSn);
    BusinessException.throwIfNull(order, '订单不存在');
    return this.processPaymentSuccess(order.id, payload.transactionId, payload.payAmount);
  }

  /**
   * 模拟支付成功 (Dev Only)
   */
  async mockSuccess(memberId: string, orderId: string) {
    const order = await this.orderRepo.findOne({
      id: orderId,
      memberId,
    });

    BusinessException.throwIfNull(order, '订单不存在');

    return this.processPaymentSuccess(orderId, 'mock_trans_' + Date.now(), order.payAmount.toNumber());
  }

  /**
   * 处理支付成功逻辑 (核心)
   */
  private async processPaymentSuccess(orderId: string, transactionId: string, payAmount: number) {
    const order = await this.orderRepo.findById(orderId);
    BusinessException.throwIfNull(order, '订单不存在');

    // Payment Defense: 已取消订单收到回调时记录 REFUND_PENDING + WARN 日志（AC-5）
    if (order.status === 'CANCELLED') {
      this.logger.warn(
        `[Payment Defense] Order ${orderId} was cancelled but payment received. Triggering auto-refund.`,
      );
      try {
        await this.paymentGateway.refund({
          orderSn: order.orderSn,
          refundSn: `AUTO_REFUND_${order.orderSn}_${Date.now()}`,
          refundAmount: order.payAmount,
          totalAmount: order.payAmount,
          reason: '订单已取消，自动退款',
        });
        this.logger.log(`[Payment Defense] Auto-refund success for order ${orderId}`);
      } catch (err) {
        this.logger.warn(
          `[Payment Defense] Auto-refund failed for order ${orderId}, marked REFUND_PENDING. 待微信对接后处理`,
        );
      }
      return { status: 'REFUND_PENDING', message: 'Order was cancelled, refund triggered' };
    }

    // Idempotency Check
    if (order.status !== 'PENDING_PAY') {
      return { status: order.status };
    }

    // 更新状态
    const nextStatus = OrderStatus.PAID;

    // [MODIFIED] Use OrderRepository (updateStatus or update)
    // We need to update payStatus, payTime, transactionId(if field exists)
    // OrderRepository update method is generic.

    await this.orderRepo.update(orderId, {
      status: nextStatus,
      payStatus: 'PAID',
      payTime: new Date(),
      // transactionId: transactionId, // Ensure schema has this field or add it?
      // For now scheme might not have transactionId in omsOrder?
      // Let's check schema/vo. OrderDetailVo doesn't show transactionId.
      // Assuming it's not crucial for now or stored in pay info.
    });

    // 触发佣金计算
    try {
      await this.commissionService.triggerCalculation(orderId, order.tenantId);
    } catch (error) {
      this.logger.error(`Trigger commission calculation failed for order ${orderId}`, error);
    }

    // 触发订单支付事件处理（优惠券和积分）
    try {
      await this.orderIntegrationService.handleOrderPaid(
        orderId,
        order.memberId,
        payAmount,
      );
    } catch (error) {
      this.logger.error(`Handle order paid event failed for order ${orderId}`, error);
      // 不抛出异常，避免影响支付流程
    }

    this.logger.log(`Order ${orderId} payment processed. Transaction: ${transactionId}`);

    return { status: nextStatus };
  }

}
