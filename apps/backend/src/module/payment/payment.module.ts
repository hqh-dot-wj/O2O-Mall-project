import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentGatewayPort } from './ports/payment-gateway.port';
import { MockPaymentGatewayAdapter } from './adapters/mock-payment-gateway.adapter';
import { WechatPayAdapter } from './adapters/wechat-pay.adapter';
import { WechatPayService } from './wechat-pay.service';

const isProd = process.env.NODE_ENV === 'production';

/**
 * 支付模块
 *
 * 遵循 backend.mdc §20 Adapter/Port 模式：
 * - 业务层注入 PaymentGatewayPort，不依赖具体实现
 * - 测试/开发环境：MockPaymentGatewayAdapter（不加载 WechatPayService，避免配置校验失败）
 * - 生产环境：WechatPayAdapter（需配置微信支付）
 */
@Module({
  imports: [ConfigModule],
  providers: [
    ...(isProd ? [WechatPayService, WechatPayAdapter] : [MockPaymentGatewayAdapter]),
    {
      provide: PaymentGatewayPort,
      useClass: isProd ? WechatPayAdapter : MockPaymentGatewayAdapter,
    },
  ],
  exports: [PaymentGatewayPort],
})
export class PaymentModule {}
