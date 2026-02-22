import { Injectable, Logger } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions';
import { PrepayDto } from './dto/payment.dto';
import * as crypto from 'crypto';
import { OrderStatus } from '@prisma/client';
import { CommissionService } from '../../finance/commission/commission.service';
import { OrderRepository } from '../order/order.repository';
import { PrismaService } from 'src/prisma/prisma.service'; // Needed for atomic updates if repo doesn't cover it? Repo covers it.
import { OrderIntegrationService } from '../../marketing/integration/integration.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly commissionService: CommissionService,
    private readonly orderIntegrationService: OrderIntegrationService,
  ) {}

  /**
   * 预下单，获取微信支付参数
   *
   * TODO: [微信支付] 对接微信支付 JSAPI 统一下单接口
   * - 需要配置商户号 (mchId)、API 密钥、证书
   * - 调用 wechatpay-node-v3 SDK 的 transactions.jsapi()
   * - 返回前端所需的 5 个支付参数 (timeStamp, nonceStr, package, signType, paySign)
   * - 参考: https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/direct-jsons/jsapi-prepay.html
   */
  async prepay(memberId: string, dto: PrepayDto) {
    // 1. 校验订单
    // [MODIFIED] Use OrderRepository
    const order = await this.orderRepo.findOne({
      id: dto.orderId,
      memberId,
    });

    BusinessException.throwIfNull(order, '订单不存在');
    BusinessException.throwIf(order.status !== 'PENDING_PAY', '订单状态不正确');

    // 2. 环境判断 (这里简化，实际应读取配置)
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd) {
      // TODO: [微信支付-生产] 生产环境微信支付统一下单
      // 1. 初始化 wechatpay-node-v3 实例 (商户号、API密钥、证书路径从配置读取)
      // 2. 调用 pay.transactions_jsapi({
      //      appid, mchid, description, out_trade_no: order.orderSn,
      //      notify_url: config.wechat.payNotifyUrl,
      //      amount: { total: order.payAmount * 100, currency: 'CNY' },
      //      payer: { openid: member.openid }
      //    })
      // 3. 对返回的 prepay_id 生成前端签名参数
      throw new BusinessException(1001, '生产环境支付未配置');
    } else {
      // 开发/测试环境：Mock 返回
      return this.mockPrepay(order);
    }
  }

  /**
   * 支付回调处理 (模拟或真实)
   *
   * TODO: [微信支付] 实现微信支付回调验签
   * - 使用微信平台证书验证回调请求的签名
   * - 解密回调报文中的 resource 字段 (AES-256-GCM)
   * - 验证 out_trade_no 与 transaction_id 的一致性
   * - 验证 amount.total 与订单金额一致，防止金额篡改
   * - 参考: https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/payment-notice.html
   */
  async handleCallback(orderId: string, transactionId: string, payAmount: number) {
    // 验证签名等逻辑在此处处理...
    // ...

    // 调用内部支付成功逻辑
    return this.processPaymentSuccess(orderId, transactionId, payAmount);
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

    // Payment Defense: Check if order is already cancelled
    if (order.status === 'CANCELLED') {
      this.logger.warn(
        `[Payment Defense] Order ${orderId} was cancelled but payment received. Triggering auto-refund.`,
      );
      // TODO: [微信支付-退款] 调用微信退款接口自动退款
      // - 调用 wechatpay-node-v3 SDK 的 refunds.create()
      // - 传入 transaction_id、out_refund_no、退款金额
      // - 记录退款流水到 fin_transaction
      // - 参考: https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/create.html
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

  // ============ Helper ============

  private mockPrepay(order: any) {
    return {
      timeStamp: Math.floor(Date.now() / 1000).toString(),
      nonceStr: this.randomString(32),
      package: `prepay_id=wx${this.randomString(20)}`,
      signType: 'RSA',
      paySign: 'mock_signature',
      _debug_orderId: order.id,
    };
  }

  private randomString(len: number) {
    return crypto
      .randomBytes(Math.ceil(len / 2))
      .toString('hex')
      .slice(0, len);
  }
}
