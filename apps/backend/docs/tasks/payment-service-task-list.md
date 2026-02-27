# 支付服务模块化抽离任务清单

> 来源：`apps/backend/docs/requirements/payment-service-requirements.md`
> 创建时间：2026-02-27
> 状态：草案（微信支付生产对接待文档就绪）

---

## 短期任务（1-2 周）— 服务抽离与接口定义

### 支付网关服务

- [x] T-1: 创建 `PaymentGatewayService` 抽象接口与 Mock 实现 (2-3d) ✅ 2026-02-27
  - 定义 `PaymentGatewayPort`（prepay、handleCallback、refund、queryPaymentStatus）
  - 测试/开发环境：MockPaymentGatewayAdapter；生产环境：WechatPayAdapter
  - 遵循 backend.mdc §20 Adapter/Port 模式
- [x] T-2: 将 `client/payment/payment.service.ts` 重构为调用 PaymentGatewayService (1-2d) ✅ 2026-02-27
  - 保留业务校验逻辑，支付能力委托给 PaymentGatewayPort
  - 非法签名由 Gateway.handleCallback 抛异常，不更新订单（AC-2）
  - 已取消订单收到回调时记录 REFUND_PENDING + WARN 日志（AC-5）
- [x] T-3: 完善所有支付相关 TODO 注释，包含明确对接步骤 (0.5h) ✅ 2026-02-27
  - 已按 backend.mdc §20.7 格式：`TODO: [第三方] 描述 | 优先级 | 工时 | Issue`
- [x] T-4: 支付回调幂等 + 重复回调不产生重复佣金（AC-3、AC-4）(1d) ✅ 2026-02-27
  - 佣金通过 BullMQ 队列异步触发（3 秒内消费）
  - processPaymentSuccess 内 idempotency：order.status !== PENDING_PAY 时直接返回，不触发佣金

### 通知服务

- [x] T-5: 创建 `NotificationService` 抽象接口与实现 (2-3d) ✅ 2026-02-27
  - 支持 IN_APP、SMS、WECHAT_TEMPLATE、APP_PUSH 四种渠道（AC-8）
  - SMS 未配置时记录 Stub 日志，不抛异常（AC-9）
  - 推入 BullMQ NOTIFICATION 队列，失败重试最多 3 次、间隔指数递增（AC-10）
- [x] T-6: 将 `MessageService` 中 Stub 逻辑迁移至 NotificationService (1d) ✅ 2026-02-27
  - 订单通知、库存预警均通过 NotificationService.send 发送
- [x] T-7: 通知记录表 + 按租户分页查询接口（AC-11）(1d) ✅ 2026-02-27
  - sys_notification_log 表，GET admin/notification/list 按租户分页

### 退款流程

- [x] T-8: 退款流程标准化，统一通过 PaymentGateway.refund (1-2d) ✅ 2026-02-27
  - StoreOrderService、PaymentService 均注入 PaymentGatewayPort
  - 已取消订单收到支付回调时尝试自动退款，失败则标记 REFUND_PENDING（AC-6）

---

## 中期任务（待微信支付文档对接后）— 生产环境对接

- [ ] T-9: JSAPI 统一下单（`payment.service.ts` → `prepay()`）
- [ ] T-10: 支付回调验签（`payment.service.ts` → `handleCallback()`）
- [ ] T-11: 自动退款（已取消订单收到支付回调时的防御性退款）
- [ ] T-12: 主动退款对接微信 API（`store-order.service.ts` → `refundOrder()`）
- [ ] T-13: 新增退款回调接口 `refund-callback.controller.ts`

---

## 非功能验收

| 维度   | 要求                                             | 对应任务   |
| ------ | ------------------------------------------------ | ---------- |
| 性能   | 支付回调处理 P95 ≤ 500ms（不含微信 API 调用）    | T-2、T-4   |
| 可用性 | 通知服务降级：SMS 失败不影响支付主流程           | T-5、T-6   |
| 安全   | 支付回调验签；退款接口鉴权（门店管理员+权限点）  | T-2、T-8   |
| 幂等   | 支付回调、退款回调必须幂等                       | T-4、T-13  |
| 可观测 | 支付/退款/通知操作记录完整日志，包含 traceId     | 贯穿各任务 |
| 扩展性 | 支付渠道通过策略模式注入，新增渠道不修改核心逻辑 | T-1        |
