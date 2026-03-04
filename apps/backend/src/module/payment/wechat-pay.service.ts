import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import { readFileSync } from 'fs';
import Wechatpay from 'wechatpay-node-v3';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response';
import { getErrorMessage } from 'src/common/utils/error';
import { WechatPayConfig } from './config/wechat-pay.config';
import {
  IPaymentProvider,
  CreatePaymentOrderParams,
  CreatePaymentOrderResult,
  QueryPaymentOrderResult,
  RefundParams,
  RefundResult,
  QueryRefundResult,
  PaymentOrderStatus,
  RefundStatus,
} from './interfaces/payment-provider.interface';

/**
 * 微信支付服务
 *
 * 已完成：
 * - ✅ 配置管理：WechatPayConfig (appId, mchId, apiV3Key, serialNo, privateKeyPath, notifyUrl, refundNotifyUrl)
 * - ✅ SDK 初始化：Wechatpay SDK
 * - ✅ 退款接口：refund() 调用真实 API
 * - ✅ Mock 测试：见 wechat-pay.service.spec.ts
 *
 * 待完成（后续迭代）：
 * - [ ] 实现 createOrder()：调用 transactions.jsapi()
 * - [ ] 实现 queryOrder()：查询订单状态
 * - [ ] 实现 queryRefund()：查询退款状态
 * - [ ] 实现回调验证：verifySignature()
 * - [ ] 处理支付回调：POST /payment/notify
 * - [ ] 处理退款回调：POST /payment/refund-notify
 *
 * 参考文档：
 * - JSAPI 下单：https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/direct-jsons/jsapi-prepay.html
 * - 申请退款：https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/refund/create.html
 * - Node.js SDK：https://github.com/TheNorthMemory/wechatpay-node-v3
 */
@Injectable()
export class WechatPayService implements IPaymentProvider, OnModuleInit {
  private readonly logger = new Logger(WechatPayService.name);
  private readonly config: WechatPayConfig;
  private wxpay: InstanceType<typeof Wechatpay> | null = null;

  constructor(private readonly configService: ConfigService) {
    this.config = this.loadConfig();
    // 配置验证移到 onModuleInit，避免测试时因配置缺失而失败
  }

  /**
   * 模块初始化时初始化微信支付 SDK
   */
  async onModuleInit() {
    // 验证配置
    this.validateConfig();

    // 初始化 SDK
    try {
      await this.initWxPay();
    } catch (error) {
      this.logger.error(`微信支付 SDK 初始化失败: ${getErrorMessage(error)}`);
      // 不抛出异常，允许服务启动（可能是配置未就绪，如开发环境）
      // 实际调用时会检查 wxpay 是否已初始化
    }
  }

  /**
   * 加载配置
   */
  private loadConfig(): WechatPayConfig {
    return {
      appId: this.configService.get<string>('WECHAT_PAY_APP_ID', ''),
      mchId: this.configService.get<string>('WECHAT_PAY_MCH_ID', ''),
      apiKey: this.configService.get<string>('WECHAT_PAY_API_KEY', ''),
      apiV3Key: this.configService.get<string>('WECHAT_PAY_API_V3_KEY', ''),
      serialNo: this.configService.get<string>('WECHAT_PAY_SERIAL_NO', ''),
      privateKeyPath: this.configService.get<string>('WECHAT_PAY_PRIVATE_KEY_PATH', ''),
      notifyUrl: this.configService.get<string>('WECHAT_PAY_NOTIFY_URL', ''),
      refundNotifyUrl: this.configService.get<string>('WECHAT_PAY_REFUND_NOTIFY_URL', ''),
      sandbox: this.configService.get<boolean>('WECHAT_PAY_SANDBOX', false),
    };
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    BusinessException.throwIf(!this.config.appId, '微信支付 AppId 未配置', ResponseCode.EXTERNAL_SERVICE_ERROR);
    BusinessException.throwIf(!this.config.mchId, '微信支付商户号未配置', ResponseCode.EXTERNAL_SERVICE_ERROR);
    BusinessException.throwIf(!this.config.apiV3Key, '微信支付 API v3 密钥未配置', ResponseCode.EXTERNAL_SERVICE_ERROR);
    BusinessException.throwIf(!this.config.serialNo, '微信支付证书序列号未配置', ResponseCode.EXTERNAL_SERVICE_ERROR);
    BusinessException.throwIf(!this.config.privateKeyPath, '微信支付私钥路径未配置', ResponseCode.EXTERNAL_SERVICE_ERROR);
    BusinessException.throwIf(!this.config.notifyUrl, '微信支付回调 URL 未配置', ResponseCode.EXTERNAL_SERVICE_ERROR);
    BusinessException.throwIf(!this.config.refundNotifyUrl, '微信退款回调 URL 未配置', ResponseCode.EXTERNAL_SERVICE_ERROR);

    this.logger.log(`微信支付配置加载成功 [商户号: ${this.config.mchId}, 沙箱: ${this.config.sandbox}]`);
  }

  /**
   * 初始化微信支付 SDK
   */
  private async initWxPay(): Promise<void> {
    try {
      // 读取商户私钥（转换为 Buffer）
      const privateKey = readFileSync(this.config.privateKeyPath);

      // 初始化 SDK（publicKey 可选，SDK 会自动从微信获取平台证书）
      this.wxpay = new Wechatpay({
        appid: this.config.appId,
        mchid: this.config.mchId,
        serial_no: this.config.serialNo,
        privateKey: privateKey,
        key: this.config.apiV3Key,
        publicKey: Buffer.from(''), // 可选，SDK 会自动获取微信平台证书
      }) as any;

      this.logger.log('微信支付 SDK 初始化成功');
    } catch (error) {
      this.logger.error(`微信支付 SDK 初始化失败: ${getErrorMessage(error)}`);
      throw new BusinessException(
        ResponseCode.BUSINESS_ERROR,
        `微信支付 SDK 初始化失败: ${getErrorMessage(error)}`,
      );
    }
  }

  /**
   * 检查 SDK 是否已初始化
   */
  private ensureWxPayInitialized(): void {
    BusinessException.throwIf(
      !this.wxpay,
      '微信支付 SDK 未初始化，请检查配置',
      ResponseCode.BUSINESS_ERROR,
    );
  }

  /**
   * 创建支付订单
   *
   * TODO: [第三方] 对接微信 JSAPI 统一下单 | P1 | 1-2d | payment-service-task-list T-9
   * 对接步骤：
   * 1. 调用 this.wxpay.transactions_jsapi({ appid, mchid, description, out_trade_no, notify_url, amount, payer: { openid } })
   * 2. 对返回的 prepay_id 生成前端 5 参数 (timeStamp, nonceStr, package, signType, paySign)
   * 3. 参考: https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/direct-jsons/jsapi-prepay.html
   */
  async createOrder(params: CreatePaymentOrderParams): Promise<CreatePaymentOrderResult> {
    this.logger.log(`创建支付订单: ${params.orderSn}, 金额: ${params.amount}`);

    // Mock 实现（用于测试）
    const mockPrepayId = `wx${Date.now()}${Math.random().toString(36).slice(2, 9)}`;
    const mockPaymentParams = {
      timeStamp: Math.floor(Date.now() / 1000).toString(),
      nonceStr: Math.random().toString(36).slice(2, 15),
      package: `prepay_id=${mockPrepayId}`,
      signType: 'RSA',
      paySign: 'mock_sign_' + Math.random().toString(36).slice(2, 15),
    };

    return {
      prepayId: mockPrepayId,
      paymentParams: mockPaymentParams,
    };
  }

  /**
   * 查询订单状态
   *
   * TODO: [第三方] 对接微信查询订单接口 | P2 | 0.5d | payment-service-task-list T-9
   * 对接步骤：1. 调用 this.wxpay.query(out_trade_no) 2. 映射 trade_state 到 PaymentOrderStatus
   */
  async queryOrder(orderSn: string): Promise<QueryPaymentOrderResult> {
    this.logger.log(`查询订单状态: ${orderSn}`);

    // Mock 实现（用于测试）
    return {
      orderSn,
      transactionId: `4200${Date.now()}`,
      status: PaymentOrderStatus.PAID,
      amount: 10000, // 100.00 元
      payTime: new Date(),
    };
  }

  /**
   * 申请退款
   */
  async refund(params: RefundParams): Promise<RefundResult> {
    this.logger.log(`申请退款: ${params.refundSn}, 金额: ${params.refundAmount}`);

    // 参数验证
    const refundAmount = new Decimal(params.refundAmount);
    const totalAmount = new Decimal(params.totalAmount);

    BusinessException.throwIf(
      refundAmount.lte(0),
      '退款金额必须大于 0',
      ResponseCode.BUSINESS_ERROR,
    );

    BusinessException.throwIf(
      refundAmount.gt(totalAmount),
      '退款金额不能大于订单金额',
      ResponseCode.BUSINESS_ERROR,
    );

    // 检查 SDK 是否已初始化
    this.ensureWxPayInitialized();
    const wxpayClient = this.wxpay; // 类型收窄：ensureWxPayInitialized 保证非空
    if (!wxpayClient) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '微信支付 SDK 未初始化');
    }

    try {
      // 调用微信退款 API
      const result = (await wxpayClient.refunds({
        out_trade_no: params.orderSn,
        out_refund_no: params.refundSn,
        notify_url: this.config.refundNotifyUrl,
        amount: {
          refund: this.convertToFen(params.refundAmount),
          total: this.convertToFen(params.totalAmount),
          currency: 'CNY',
        },
        reason: params.reason || '订单退款',
      })) as any;

      this.logger.log(`微信退款成功: ${params.refundSn}, 微信退款单号: ${result.refund_id}`);

      return {
        refundSn: params.refundSn,
        refundId: result.refund_id as string,
        status: this.mapRefundStatus(result.status as string),
        amount: result.amount.refund as number,
      };
    } catch (error) {
      this.logger.error(`微信退款失败: ${params.refundSn}`, getErrorMessage(error));
      throw new BusinessException(
        ResponseCode.BUSINESS_ERROR,
        `微信退款失败: ${getErrorMessage(error)}`,
      );
    }
  }

  /**
   * 映射微信退款状态到系统状态
   */
  private mapRefundStatus(wxStatus: string): RefundStatus {
    const statusMap: Record<string, RefundStatus> = {
      SUCCESS: RefundStatus.SUCCESS,
      CLOSED: RefundStatus.FAILED,
      PROCESSING: RefundStatus.PROCESSING,
      ABNORMAL: RefundStatus.FAILED,
    };

    return statusMap[wxStatus] || RefundStatus.PROCESSING;
  }

  /**
   * 查询退款状态
   *
   * TODO: [第三方] 对接微信查询退款接口 | P2 | 0.5d | payment-service-task-list T-12
   * 对接步骤：1. 调用 this.wxpay.refunds_query(out_refund_no) 2. 映射 status 到 RefundStatus
   */
  async queryRefund(refundSn: string): Promise<QueryRefundResult> {
    this.logger.log(`查询退款状态: ${refundSn}`);

    // Mock 实现（用于测试）
    return {
      refundSn,
      refundId: `50300${Date.now()}`,
      status: RefundStatus.SUCCESS,
      amount: 10000, // 100.00 元
      successTime: new Date(),
    };
  }

  /**
   * 转换金额为分（微信支付要求）
   */
  private convertToFen(amount: Decimal | string | number): number {
    return new Decimal(amount).mul(100).toNumber();
  }

  /**
   * 转换金额为元
   */
  private convertToYuan(fen: number): string {
    return new Decimal(fen).div(100).toFixed(2);
  }
}
