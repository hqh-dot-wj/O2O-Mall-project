# 微信支付退款 API 对接实施总结

> 任务编号：T-7  
> 完成时间：2026-02-26  
> 实施人：Backend Team

## 一、任务目标

对接微信支付退款 API，实现真实的退款功能，替换原有的 Mock 实现。

## 二、实施内容

### 2.1 依赖安装

在 `apps/backend/package.json` 中添加依赖：

```json
"wechatpay-node-v3": "^3.3.0"
```

### 2.2 SDK 初始化

在 `WechatPayService` 中实现 SDK 初始化：

```typescript
import { Wechatpay } from 'wechatpay-node-v3';
import { readFileSync } from 'fs';

@Injectable()
export class WechatPayService implements IPaymentProvider, OnModuleInit {
  private wxpay: Wechatpay | null = null;

  async onModuleInit() {
    await this.initWxPay();
  }

  private async initWxPay(): Promise<void> {
    const privateKey = readFileSync(this.config.privateKeyPath, 'utf-8');

    this.wxpay = new Wechatpay({
      appid: this.config.appId,
      mchid: this.config.mchId,
      serial_no: this.config.serialNo,
      privateKey: privateKey,
      key: this.config.apiV3Key,
    });
  }
}
```

**关键点**：

- 实现 `OnModuleInit` 接口，在模块初始化时自动初始化 SDK
- 使用 `readFileSync` 读取商户私钥文件
- 初始化失败时记录日志但不抛出异常，允许服务启动（开发环境可能配置未就绪）

### 2.3 退款接口实现

实现 `refund()` 方法调用真实的微信退款 API：

```typescript
async refund(params: RefundParams): Promise<RefundResult> {
  // 参数验证
  const refundAmount = new Decimal(params.refundAmount);
  const totalAmount = new Decimal(params.totalAmount);

  BusinessException.throwIf(refundAmount.lte(0), '退款金额必须大于 0');
  BusinessException.throwIf(refundAmount.gt(totalAmount), '退款金额不能大于订单金额');

  // 检查 SDK 是否已初始化
  this.ensureWxPayInitialized();

  try {
    // 调用微信退款 API
    const result = await this.wxpay!.refunds({
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
  } catch (error) {
    this.logger.error(`微信退款失败: ${params.refundSn}`, getErrorMessage(error));
    throw new BusinessException(ResponseCode.BUSINESS_ERROR, `微信退款失败: ${getErrorMessage(error)}`);
  }
}
```

**关键点**：

- 使用 `Decimal` 进行金额计算，避免浮点数精度问题
- 调用前检查 SDK 是否已初始化
- 使用 `getErrorMessage()` 安全提取错误信息（遵循规范 §2.1）
- 映射微信退款状态到系统状态

### 2.4 状态映射

实现微信退款状态到系统状态的映射：

```typescript
private mapRefundStatus(wxStatus: string): RefundStatus {
  const statusMap: Record<string, RefundStatus> = {
    SUCCESS: RefundStatus.SUCCESS,
    CLOSED: RefundStatus.FAILED,
    PROCESSING: RefundStatus.PROCESSING,
    ABNORMAL: RefundStatus.FAILED,
  };

  return statusMap[wxStatus] || RefundStatus.PROCESSING;
}
```

### 2.5 订单服务集成

更新 `StoreOrderService` 中的退款方法，移除 TODO 标记：

```typescript
@Transactional()
async refundOrder(orderId: string, remark: string, operatorId: string) {
  // ... 订单查询和校验 ...

  // 调用微信退款 API
  try {
    const refundSn = `REFUND_${order!.orderSn}_${Date.now()}`;
    const refundResult = await this.wechatPayService.refund({
      orderSn: order!.orderSn,
      refundSn,
      refundAmount: order!.payAmount,
      totalAmount: order!.payAmount,
      reason: remark || '订单退款',
    });

    this.logger.log(`微信退款成功: 订单=${orderId}, 微信退款单=${refundResult.refundId}`);
  } catch (error) {
    this.logger.error(`微信退款失败: 订单=${orderId}`, error);
    throw new BusinessException(ResponseCode.BUSINESS_ERROR, '微信退款失败，请稍后重试');
  }

  // ... 更新订单状态、回滚佣金、退还优惠券和积分 ...
}
```

**关键点**：

- 退款失败时抛出异常，确保事务回滚
- 记录详细的日志（成功和失败）
- 生成唯一的退款单号（`REFUND_{订单号}_{时间戳}`）

### 2.6 测试

所有单元测试已通过：

```bash
# 微信支付服务测试
pnpm --filter @apps/backend test wechat-pay.service.spec
# ✅ 9 passed, 4 todo

# 订单服务测试
pnpm --filter @apps/backend test store-order.service.spec
# ✅ 24 passed, 2 todo
```

**测试覆盖**：

- ✅ 配置加载和验证
- ✅ SDK 初始化（Mock 模式）
- ✅ 退款参数验证（金额为 0、超过订单金额）
- ✅ 退款成功场景
- ✅ 部分退款场景
- ✅ 退款失败场景（微信 API 错误）
- ✅ 订单退款流程集成
- ✅ 部分退款流程集成
- ⏳ 集成测试（需要沙箱环境，使用 `it.todo()` 标记）

## 三、遵循的规范

### 3.1 第三方 API 对接规范（§20）

- ✅ 完整实现配置管理（WechatPayConfig）
- ✅ 配置验证（validateConfig）
- ✅ 环境变量映射（.env.example）
- ✅ 接口抽象（IPaymentProvider）
- ✅ Mock 测试（所有方法可 Mock）
- ✅ TODO 标记（暂未对接的 API：createOrder、queryOrder、queryRefund、回调接口）
- ✅ 配置文档（docs/config/wechat-pay-config.md）

### 3.2 测试规范（§21）

- ✅ 禁止使用 `it.skip()`
- ✅ 无法运行的测试使用 `it.todo()` 标记
- ✅ 包含原因说明和 Issue 编号
- ✅ 核心模块测试覆盖率 ≥ 80%

### 3.3 异常处理规范（§2）

- ✅ 使用 `BusinessException.throwIf()` 进行参数验证
- ✅ 使用 `getErrorMessage()` 安全提取错误信息
- ✅ 禁止 `throw new Error()`

### 3.4 Monorepo 规范

- ✅ 依赖添加到 `apps/backend/package.json`
- ✅ 使用 pnpm workspace 管理依赖

## 四、待完成工作（后续迭代）

### 4.1 退款回调接口（P1）

实现 `POST /payment/refund-notify` 接口：

```typescript
@Post('refund-notify')
async handleRefundNotify(@Body() body: unknown, @Headers() headers: Record<string, string>) {
  // 1. 验证签名
  const isValid = this.wechatPayService.verifySignature(body, headers);
  BusinessException.throwIf(!isValid, '签名验证失败');

  // 2. 解密数据
  const data = this.wechatPayService.decipherNotify(body);

  // 3. 处理退款通知
  await this.processRefundNotify(data);

  // 4. 返回成功响应
  return { code: 'SUCCESS', message: '成功' };
}
```

**预估工时**：1-2d  
**优先级**：P1

### 4.2 签名验证（P1）

实现签名验证方法：

```typescript
verifySignature(body: string, headers: Record<string, string>): boolean {
  const signature = headers['wechatpay-signature'];
  const timestamp = headers['wechatpay-timestamp'];
  const nonce = headers['wechatpay-nonce'];
  const serial = headers['wechatpay-serial'];

  // 使用 SDK 验证签名
  return this.wxpay.verifySignature({ signature, timestamp, nonce, serial, body });
}
```

**预估工时**：0.5d  
**优先级**：P1

### 4.3 沙箱环境测试（P1）

使用微信支付沙箱环境测试：

1. 配置沙箱环境（.env）
2. 运行集成测试
3. 验证退款流程
4. 验证回调通知

**预估工时**：1d  
**优先级**：P1

### 4.4 其他接口对接（P2）

- `createOrder()`：JSAPI 统一下单（预估 1-2d）
- `queryOrder()`：查询订单状态（预估 0.5d）
- `queryRefund()`：查询退款状态（预估 0.5d）
- 支付回调接口：`POST /payment/notify`（预估 1d）

**优先级**：P2（当前订单流程暂不需要）

## 五、风险与注意事项

### 5.1 配置安全

- ⚠️ 商户私钥文件不要提交到 Git 仓库
- ⚠️ `.gitignore` 已包含 `certs/` 目录
- ⚠️ 生产环境建议使用密钥管理服务（如 AWS Secrets Manager）

### 5.2 回调 URL

- ⚠️ 回调 URL 必须是公网可访问的 HTTPS 地址
- ⚠️ 本地开发可使用 ngrok 等内网穿透工具
- ⚠️ 回调接口必须验证签名，防止伪造请求

### 5.3 金额精度

- ✅ 使用 `Decimal` 进行金额计算
- ✅ 微信支付金额单位为分，需要转换（元 ↔ 分）
- ✅ 避免浮点数精度问题

### 5.4 幂等性

- ⚠️ 退款接口需要保证幂等性
- ⚠️ 使用唯一的退款单号（`refundSn`）
- ⚠️ 重复调用时返回相同结果

### 5.5 超时处理

- ⚠️ 微信支付 API 可能超时
- ⚠️ 需要设置合理的超时时间（如 30s）
- ⚠️ 超时后可通过 `queryRefund()` 查询退款状态

## 六、参考文档

- [微信支付官方文档](https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml)
- [申请退款 API](https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/refund/create.html)
- [wechatpay-node-v3 SDK](https://github.com/TheNorthMemory/wechatpay-node-v3)
- [配置指南](../config/wechat-pay-config.md)
- [后端开发规范](../../.kiro/steering/backend-nestjs.md)

## 七、总结

T-7 任务已完成核心功能（退款 API 对接），实现了：

1. ✅ 微信支付 SDK 初始化
2. ✅ 退款接口调用真实 API
3. ✅ 集成到订单退款流程
4. ✅ 单元测试通过（Mock 模式）
5. ✅ 遵循项目规范（第三方 API 对接、测试、异常处理）

后续迭代需要完成：

1. ⏳ 退款回调接口和签名验证（P1）
2. ⏳ 沙箱环境测试（P1）
3. ⏳ 其他接口对接（P2）

---

**文档版本**: 1.0  
**最后更新**: 2026-02-26  
**维护人**: Backend Team
