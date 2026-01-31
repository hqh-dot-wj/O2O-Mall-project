# Client Payment 模块文档

模型名称：Gemini 2.0 Flash、模型大小：未知、模型类型：对话模型及其修订版本：2026-05-14

### **1. 文件树与作用简述 (File Tree & Architecture)**

```text
payment/
├── dto/
│   └── payment.dto.ts      # 输入校验：预支付请求及模拟支付 Dto
├── payment.controller.ts   # 路由控制：处理 prepay 请求及开发环境 Mock 接口
├── payment.module.ts       # 模块配置：集成 Order 与 Commission 依赖
└── payment.service.ts      # 业务逻辑：核心支付流程控制、状态机转换、分销触发
```

---

### **2. 数据库表与逻辑关联 (Database & Relationships)**

- **OmsOrder (订单表)**：支付的核心载体。通过修改 `status` (PAID) 和 `payStatus` (PAID) 同步支付结果。
- **FinCommission (佣金表 - 逻辑触发)**：支付成功后，通过关联的 `orderId` 触发分销佣金的计算逻辑。

**逻辑关联**：
- `OmsOrder` ➔ `CommissionService` ：支付成功是分销结算的**法定触发点**。
- `OmsOrder.memberId` ➔ `UmsMember` ：校验订单归属权，防止恶意支付。

---

### **3. 核心接口与业务闭环 (API & Business Closure)**

| 接口方法 | 技术关键词 | 业务闭环作用 |
| :--- | :--- | :--- |
| `prepay` | `Wechat JSAPI`, `RSA Sign` | 预下单。获取微信支付 5 参数，开启前端支付控件。支持 **Dev/Prod 环境全自动切换**。 |
| `processPaymentSuccess` | `Idempotency`, `State Machine` | 核心回调处理。实现支付幂等性校验，完成**订单转正、时间戳更新、分销触发**。 |
| `mockSuccess` | `Crypto`, `Testing` | 测试辅助。在测试环境下快速模拟支付成功全路经，加速业务联调。 |

---

### **4. 安全审计与逻辑严谨性 (Security & Logic Audit)**

- **支付防御机制 (Payment Defense)**：即使微信回调延迟，若订单在支付前已通过其他途径取消，系统会记录警告并**预留自动退款触发点 (TODO)**，防止产生数据坏账。
- **幂等性校验**：在 `processPaymentSuccess` 顶部强制检查 `status !== 'PENDING_PAY'`，确保多次回调或手动触发不会导致重复发放佣金或订单状态异常跳变。
- **环境隔离安全**：在 `prepay` 中通过 `NODE_ENV` 强制隔离 Mock 逻辑，确保生产环境无法通过非法手段绕过真实支付。
- **关系健壮性分析**：
    - *风险点*：目前支付成功与佣金计算采用同步串行逻辑，若 `CommissionService` 异常可能影响支付回调的响应速度。
    - *建议*：后续可引入消息队列 (BullMQ) 将“支付成功”后的业务后续动作异步化。
    - *越权封堵*：在 `prepay` 和 `mockSuccess` 阶段严格校验 `memberId` 匹配，防止攻击者支付他人订单。
