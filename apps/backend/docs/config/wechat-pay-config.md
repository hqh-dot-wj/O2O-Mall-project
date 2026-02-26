# 微信支付配置指南

> 用于对接微信支付 JSAPI 下单和退款功能

## 1. 获取配置

### 1.1 登录微信商户平台

访问 [微信商户平台](https://pay.weixin.qq.com/)，使用商户账号登录。

### 1.2 获取各项配置

| 配置项          | 获取路径                                         | 说明                               |
| --------------- | ------------------------------------------------ | ---------------------------------- |
| **AppId**       | 微信公众平台 → 开发 → 开发设置 → 开发者ID        | 小程序 AppId                       |
| **商户号**      | 商户平台 → 账户中心 → 商户信息                   | 商户号（mchid）                    |
| **API 密钥**    | 商户平台 → 账户中心 → API 安全 → 设置密钥        | API v2 密钥，32位字符串            |
| **API v3 密钥** | 商户平台 → 账户中心 → API 安全 → 设置 APIv3 密钥 | API v3 密钥，32位字符串            |
| **证书序列号**  | 商户平台 → 账户中心 → API 安全 → 查看证书        | 商户证书序列号                     |
| **商户私钥**    | 商户平台 → 账户中心 → API 安全 → 下载证书        | 下载后解压得到 `apiclient_key.pem` |

### 1.3 配置回调 URL

在商户平台配置支付和退款回调 URL：

- 商户平台 → 产品中心 → 开发配置 → 支付配置
- 支付回调 URL：`https://your-domain.com/api/payment/notify`
- 退款回调 URL：`https://your-domain.com/api/payment/refund-notify`

**注意**：回调 URL 必须是公网可访问的 HTTPS 地址。

## 2. 配置环境变量

### 2.1 复制配置文件

```bash
cp .env.example .env
```

### 2.2 填写微信支付配置

编辑 `.env` 文件，填写以下配置：

```bash
# 小程序 AppId
WECHAT_PAY_APP_ID=wx1234567890abcdef

# 商户号
WECHAT_PAY_MCH_ID=1234567890

# API 密钥（API v2）
WECHAT_PAY_API_KEY=your_32_character_api_key_here

# API v3 密钥
WECHAT_PAY_API_V3_KEY=your_32_character_api_v3_key_here

# 商户证书序列号
WECHAT_PAY_SERIAL_NO=your_certificate_serial_number

# 商户私钥路径
WECHAT_PAY_PRIVATE_KEY_PATH=./certs/apiclient_key.pem

# 支付回调通知 URL
WECHAT_PAY_NOTIFY_URL=https://your-domain.com/api/payment/notify

# 退款回调通知 URL
WECHAT_PAY_REFUND_NOTIFY_URL=https://your-domain.com/api/payment/refund-notify

# 是否启用沙箱环境
WECHAT_PAY_SANDBOX=false
```

### 2.3 放置证书文件

将下载的 `apiclient_key.pem` 文件放到项目根目录的 `certs/` 目录下：

```bash
mkdir -p certs
cp /path/to/apiclient_key.pem certs/
```

**安全提示**：

- 证书文件不要提交到 Git 仓库
- `.gitignore` 已包含 `certs/` 目录
- 生产环境建议使用密钥管理服务（如 AWS Secrets Manager）

## 3. 测试环境配置

### 3.1 使用微信支付沙箱

微信支付提供沙箱环境用于测试，无需真实支付。

**沙箱文档**：https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=23_1

**沙箱配置**：

```bash
# 启用沙箱环境
WECHAT_PAY_SANDBOX=true

# 沙箱商户号（示例）
WECHAT_PAY_MCH_ID=1234567890

# 沙箱 API 密钥（需要在沙箱环境获取）
WECHAT_PAY_API_KEY=sandbox_api_key_here
```

### 3.2 获取沙箱密钥

1. 访问沙箱环境：https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=23_1
2. 使用商户号获取沙箱密钥
3. 配置到 `.env` 文件

### 3.3 本地测试回调

本地开发时，回调 URL 无法直接访问。可以使用以下方式：

**方式 1：使用 ngrok 内网穿透**

```bash
# 安装 ngrok
npm install -g ngrok

# 启动内网穿透
ngrok http 8080

# 将生成的 HTTPS 地址配置到 .env
WECHAT_PAY_NOTIFY_URL=https://xxx.ngrok.io/api/payment/notify
WECHAT_PAY_REFUND_NOTIFY_URL=https://xxx.ngrok.io/api/payment/refund-notify
```

**方式 2：使用测试工具模拟回调**

使用 Postman 或 curl 模拟微信支付回调：

```bash
curl -X POST https://localhost:8080/api/payment/notify \
  -H "Content-Type: application/json" \
  -d '{
    "id": "mock_event_id",
    "create_time": "2024-01-01T12:00:00+08:00",
    "resource_type": "encrypt-resource",
    "event_type": "TRANSACTION.SUCCESS",
    "resource": {
      "ciphertext": "mock_ciphertext",
      "nonce": "mock_nonce",
      "associated_data": "mock_associated_data"
    }
  }'
```

## 4. 验证配置

### 4.1 启动服务

```bash
pnpm --filter backend dev
```

### 4.2 检查日志

服务启动时会验证配置并输出日志：

```
[WechatPayService] 微信支付配置加载成功 [商户号: 1234567890, 沙箱: false]
```

如果配置有误，会抛出异常：

```
[BusinessException] 微信支付 AppId 未配置
```

### 4.3 测试接口

使用 Mock 模式测试退款接口：

```bash
curl -X POST http://localhost:8080/api/order/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token" \
  -d '{
    "orderId": "order123",
    "remark": "测试退款"
  }'
```

## 5. 对接真实 API

### 5.1 安装依赖

```bash
pnpm add wechatpay-node-v3
```

### 5.2 实现 SDK 初始化

在 `WechatPayService` 中初始化 SDK：

```typescript
import WxPay from 'wechatpay-node-v3';
import fs from 'fs';

private wxpay: WxPay;

constructor(private readonly configService: ConfigService) {
  this.config = this.loadConfig();
  this.validateConfig();
  this.initWxPay();
}

private initWxPay(): void {
  const privateKey = fs.readFileSync(this.config.privateKeyPath, 'utf-8');

  this.wxpay = new WxPay({
    appid: this.config.appId,
    mchid: this.config.mchId,
    serial_no: this.config.serialNo,
    privateKey: privateKey,
    key: this.config.apiV3Key,
  });

  this.logger.log('微信支付 SDK 初始化成功');
}
```

### 5.3 实现退款接口

```typescript
async refund(params: RefundParams): Promise<RefundResult> {
  const result = await this.wxpay.refunds_create({
    out_trade_no: params.orderSn,
    out_refund_no: params.refundSn,
    notify_url: this.config.refundNotifyUrl,
    amount: {
      refund: this.convertToFen(params.refundAmount),
      total: this.convertToFen(params.totalAmount),
      currency: 'CNY',
    },
    reason: params.reason || '订单退款',
  });

  return {
    refundSn: params.refundSn,
    refundId: result.refund_id,
    status: this.mapRefundStatus(result.status),
    amount: result.amount.refund,
  };
}
```

### 5.4 处理回调通知

实现回调接口验证签名和处理通知：

```typescript
async handleRefundNotify(body: string, signature: string): Promise<void> {
  // 验证签名
  const isValid = this.wxpay.verifySignature(body, signature);
  BusinessException.throwIf(!isValid, '签名验证失败');

  // 解密数据
  const data = this.wxpay.decipher(body);

  // 处理退款通知
  await this.processRefundNotify(data);
}
```

## 6. 常见问题

### 6.1 证书序列号在哪里查看？

登录商户平台 → 账户中心 → API 安全 → 查看证书，可以看到证书序列号。

### 6.2 回调 URL 必须是 HTTPS 吗？

是的，微信支付要求回调 URL 必须是 HTTPS。本地开发可以使用 ngrok 等工具。

### 6.3 如何测试退款功能？

1. 使用沙箱环境测试
2. 或者在生产环境发起小额退款测试（如 0.01 元）

### 6.4 退款多久到账？

- 零钱支付：实时到账
- 银行卡支付：1-3 个工作日

### 6.5 如何查看退款状态？

调用 `queryRefund()` 方法查询退款状态，或者等待退款回调通知。

## 7. 参考文档

- [微信支付官方文档](https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml)
- [JSAPI 下单](https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/direct-jsons/jsapi-prepay.html)
- [申请退款](https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/refund/create.html)
- [Node.js SDK](https://github.com/TheNorthMemory/wechatpay-axios-plugin)
- [沙箱环境](https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=23_1)

---

**文档版本**: 1.0  
**最后更新**: 2026-02-26  
**维护人**: Backend Team
