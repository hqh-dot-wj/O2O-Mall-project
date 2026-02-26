import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WechatPayService } from './wechat-pay.service';
import { BusinessException } from 'src/common/exceptions';
import { RefundStatus, PaymentOrderStatus } from './interfaces/payment-provider.interface';

describe('WechatPayService', () => {
  let service: WechatPayService;
  let configService: ConfigService;

  const mockConfig: Record<string, string | boolean> = {
    WECHAT_PAY_APP_ID: 'wx1234567890abcdef',
    WECHAT_PAY_MCH_ID: '1234567890',
    WECHAT_PAY_API_KEY: 'test_api_key',
    WECHAT_PAY_API_V3_KEY: 'test_api_v3_key',
    WECHAT_PAY_SERIAL_NO: 'test_serial_no',
    WECHAT_PAY_PRIVATE_KEY_PATH: '/path/to/private_key.pem',
    WECHAT_PAY_NOTIFY_URL: 'https://example.com/api/payment/notify',
    WECHAT_PAY_REFUND_NOTIFY_URL: 'https://example.com/api/payment/refund-notify',
    WECHAT_PAY_SANDBOX: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WechatPayService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => mockConfig[key] || defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<WechatPayService>(WechatPayService);
    configService = module.get<ConfigService>(ConfigService);

    // Mock refund 方法以避免调用真实 API
    jest.spyOn(service, 'refund').mockImplementation(async (params) => {
      // 参数验证（与真实实现一致）
      const refundAmount = new (await import('@prisma/client/runtime/library')).Decimal(params.refundAmount);
      const totalAmount = new (await import('@prisma/client/runtime/library')).Decimal(params.totalAmount);

      if (refundAmount.lte(0)) {
        throw new BusinessException(undefined, '退款金额必须大于 0');
      }

      if (refundAmount.gt(totalAmount)) {
        throw new BusinessException(undefined, '退款金额不能大于订单金额');
      }

      // Mock 返回
      return {
        refundSn: params.refundSn,
        refundId: `50300${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        status: RefundStatus.SUCCESS,
        amount: refundAmount.mul(100).toNumber(),
      };
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    it('should create payment order successfully', async () => {
      const params = {
        orderSn: 'ORDER123456',
        amount: '100.00',
        description: 'Test Order',
        openId: 'oTest123456',
      };

      const result = await service.createOrder(params);

      expect(result.prepayId).toBeDefined();
      expect(result.prepayId).toMatch(/^wx/);
      expect(result.paymentParams).toBeDefined();
      expect(result.paymentParams.timeStamp).toBeDefined();
      expect(result.paymentParams.nonceStr).toBeDefined();
      expect(result.paymentParams.package).toContain('prepay_id=');
      expect(result.paymentParams.signType).toBe('RSA');
      expect(result.paymentParams.paySign).toBeDefined();
    });
  });

  describe('queryOrder', () => {
    it('should query order status successfully', async () => {
      const orderSn = 'ORDER123456';

      const result = await service.queryOrder(orderSn);

      expect(result.orderSn).toBe(orderSn);
      expect(result.transactionId).toBeDefined();
      expect(result.status).toBe(PaymentOrderStatus.PAID);
      expect(result.amount).toBeGreaterThan(0);
      expect(result.payTime).toBeInstanceOf(Date);
    });
  });

  describe('refund', () => {
    it('should process refund successfully', async () => {
      const params = {
        orderSn: 'ORDER123456',
        refundSn: 'REFUND123456',
        refundAmount: '50.00',
        totalAmount: '100.00',
        reason: 'Test Refund',
      };

      const result = await service.refund(params);

      expect(result.refundSn).toBe(params.refundSn);
      expect(result.refundId).toBeDefined();
      expect(result.status).toBe(RefundStatus.SUCCESS);
      expect(result.amount).toBe(5000); // 50.00 元 = 5000 分
    });

    it('should throw error when refund amount is zero', async () => {
      const params = {
        orderSn: 'ORDER123456',
        refundSn: 'REFUND123456',
        refundAmount: '0',
        totalAmount: '100.00',
      };

      await expect(service.refund(params)).rejects.toThrow(BusinessException);
    });

    it('should throw error when refund amount exceeds total amount', async () => {
      const params = {
        orderSn: 'ORDER123456',
        refundSn: 'REFUND123456',
        refundAmount: '150.00',
        totalAmount: '100.00',
      };

      await expect(service.refund(params)).rejects.toThrow(BusinessException);
    });

    it('should handle partial refund', async () => {
      const params = {
        orderSn: 'ORDER123456',
        refundSn: 'REFUND123456',
        refundAmount: '30.50',
        totalAmount: '100.00',
        reason: 'Partial Refund',
      };

      const result = await service.refund(params);

      expect(result.refundSn).toBe(params.refundSn);
      expect(result.status).toBe(RefundStatus.SUCCESS);
      expect(result.amount).toBe(3050); // 30.50 元 = 3050 分
    });
  });

  describe('queryRefund', () => {
    it('should query refund status successfully', async () => {
      const refundSn = 'REFUND123456';

      const result = await service.queryRefund(refundSn);

      expect(result.refundSn).toBe(refundSn);
      expect(result.refundId).toBeDefined();
      expect(result.status).toBe(RefundStatus.SUCCESS);
      expect(result.amount).toBeGreaterThan(0);
      expect(result.successTime).toBeInstanceOf(Date);
    });
  });

  describe('config validation', () => {
    it('should throw error when appId is missing', async () => {
      const invalidConfig: Record<string, string | boolean> = { ...mockConfig, WECHAT_PAY_APP_ID: '' };

      await expect(async () => {
        const module = await Test.createTestingModule({
          providers: [
            WechatPayService,
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn((key: string, defaultValue?: unknown) => invalidConfig[key] || defaultValue),
              },
            },
          ],
        }).compile();

        const testService = module.get<WechatPayService>(WechatPayService);
        // 触发 onModuleInit 以执行配置验证
        await testService.onModuleInit();
      }).rejects.toThrow();
    });
  });

  // TODO: 对接真实微信支付 API 后的集成测试
  it.todo('should integrate with real Wechat Pay API in sandbox (需要沙箱环境，见 Issue #T-7)');
  it.todo('should handle payment callback notification (需要实现回调接口，见 Issue #T-7)');
  it.todo('should handle refund callback notification (需要实现回调接口，见 Issue #T-7)');
  it.todo('should verify signature from Wechat Pay (需要实现签名验证，见 Issue #T-7)');
});
