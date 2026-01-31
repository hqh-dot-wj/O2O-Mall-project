# Client Order 模块文档

模型名称：Gemini 2.0 Flash、模型大小：未知、模型类型：对话模型及其修订版本：2026-05-14

### **1. 文件树与作用简述 (File Tree & Architecture)**

```text
order/
├── services/
│   ├── order-checkout.service.ts  # 核心逻辑：结算预览、库存校验、营销价计算、LBS 围栏校验
│   └── attribution.service.ts     # 归因逻辑：处理分享人绑定、7天 Redis 归因追踪
├── dto/
│   └── order.dto.ts               # 输入校验：下单、取消、列表查询 Dto
├── vo/
│   └── order.vo.ts                # 输出渲染：订单详情、结算预览 Vo
├── order.controller.ts            # 路由控制：对外提供订单全生命周期接口
├── order.module.ts                # 模块配置：关联 Bull 队列、营销、财务及风控模块
├── order.repository.ts            # 数据仓储：基于 SoftDeleteRepository 的订单持久化
├── notification.processor.ts      # 异步处理：订单通知队列处理器
├── order-delay.processor.ts       # 异步处理：超时未支付自动关闭队列处理器
└── order.service.ts               # 业务聚合：下单主流程编排、状态机控制
```

---

### **2. 数据库表与逻辑关联 (Database & Relationships)**

- **OmsOrder (订单主表)**：存储订单号、价格快照、配送信息及**分销归因 ID**（shareUserId, referrerId）。
- **OmsOrderItem (订单商品表)**：记录下单时的 SKU 规格、实时单价。
- **PmsTenantSku (租户 SKU 表)**：下单时执行 `stock` 的**行级锁定更新**。
- **UmsMember (会员表)**：获取用户的 `parentId` 进行永久分销关系绑定。

**逻辑关联**：
- `OmsOrder.memberId` ➔ `UmsMember.memberId`：维护会员与订单的从属关系。
- `OmsOrder.items` ➔ `OmsOrderItem`：1:N 详情关联。
- `Order` ➔ `Bull Queue`：通过延迟任务实现超时关闭与消息触达。

---

### **3. 核心接口与业务闭环 (API & Business Closure)**

| 接口方法 | 技术关键词 | 业务闭环作用 |
| :--- | :--- | :--- |
| `getCheckoutPreview` | `Marketing Strategy` | 结算预览。实时计算**营销活动价**，校验 LBS 配送距离及 SKU 有效性。 |
| `createOrder` | `@Transactional`, `Stock Lock` | 创建订单。执行**原子性下单**：扣减库存、清除购物车、编排异步通知及超时关闭任务。 |
| `cancelOrder` | `Stock Restoring` | 取消订单。恢复用户占用的 SKU 库存，并同步状态机。 |
| `confirmReceipt` | `Commission Settlement` | 确认收货。标记订单完成，并触发底层的**佣金结算时间计划**。 |
| `attribution` | `Redis (7D TTL)` | 归因闭环。通过 `AttributionService` 实现“参数 > 缓存 > 永久绑定”的多级归因识别。 |

---

### **4. 安全审计与逻辑严谨性 (Security & Logic Audit)**

- **超卖防护**：在 `createOrder` 内部通过 `prisma.updateMany` 附加 `stock: { gte: item.quantity }` 条件，实现无锁环境下的**乐观死磕（Atomic Update）**。
- **风控防护**：下单前调用 `RiskService` 对 IP、设备及行为频率进行检测，防止刷单。
- **越权保护**：所有查询/操作强制通过 `memberId` 过滤，并对 `status` 进行前置状态机检查。
- **异步致盲绕过**：`NotificationProcessor` 在发送消息前执行 **Double Check**，若订单已被取消（秒退），则自动拦截延迟通知。
- **逻辑严谨性分析**：
    - *风险点*：若 `notificationQueue` 挂载失败，业务不会报错，但商户端会丢失实时订单提醒。
    - *重入处理*：下单过程中清除购物车采用批量 `skuIds` 硬删除，确保购物车与订单项的强一致性。
    - *精度保护*：价格计算全程使用 `Decimal`，Vo 输出时转化为数字，避免 JavaScript 精度抖动引起的前端展示错误。
