# Bull 异步队列基础设施模块 (Bull Queue Infrastructure)

该模块基于 `BullMQ` 和 `Redis` 构建，负责全系统的异步任务调度与分发，是处理高并发请求、耗时任务（如佣金计算、延迟任务）的核心基础设施。

### 1. 文件树与作用简述 (File Tree & Architecture)

```text
c:\VueProject\Nest-Admin-Soybean\apps\backend\src\module\common\bull\
├── bull.module.ts              # 核心配置模块：定义 Redis 连接、重试策略、任务清理机制
├── guards/
│   └── queue-access.guard.ts   # 安全守卫：控制队列监控面板的访问与管理权限 (Rbac)
└── index.ts                    # 统一导出入口
```

- **BullConfigModule**: 统一配置全系统的队列行为，包括全局 `keyPrefix` (防止 Redis 污染) 和 `defaultJobOptions`（重试 3 次，指数退避）。
- **QueueAccessGuard**: 确保只有具备 `monitor:queue:view/manage` 权限的用户才能查看或干预任务流。

---

### 2. 数据库表与逻辑关联 (Database & Relationships)

该模块主要与 **Redis (内存数据库)** 交互，并通过逻辑 ID 与物理数据库表建立关联：

- **Redis Keyspace**:
  - `bull:*:jobs`: 存储任务的具体 Payload（如 `orderId`）。
  - `bull:*:waiting/active/failed`: 维护任务的状态机。
- **逻辑关联对象**:
  - **Orders (订单)**: 关联 `orderId`，用于处理延迟自动关闭、佣金触发异步计算。
  - **Finance (财务)**: 关联 `billId`，驱动后台结算流水生成。
  - **Assets (资源)**: 关联文件路径，驱动图片缩略图异步生成。

---

### 3. 核心接口与业务闭环 (API & Business Closure)

虽然配置在 `common` 模块，但其驱动了多个核心业务闭环：

| 核心组件 | 技术关键词 | 业务闭环作用 |
| :--- | :--- | :--- |
| `BullConfigModule` | `BullMQ`, `Exponential Backoff` | **任务可靠性保障**: 为耗时业务（如财务计算）提供自动重试机制，防止单点故障引发逻辑中断。 |
| `CommissionProcessor` | `@Processor`, `@Process` | **分润闭环**: 订单支付 ➔ 触发 `CALC_COMMISSION` 任务 ➔ 异步分润入账，提升下单响应速度。 |
| `OrderDelayProcessor` | `Delayed Jobs` | **超时闭环**: 下单 ➔ 注入延迟任务 ➔ 15分钟未支付 ➔ 自动回滚库存并关闭订单。 |
| `QueueAccessGuard` | `PermissionGuard` | **管治闭环**: 提供对异步任务的可视化监控与人工干预（重试/删除）的安全校验。 |

---

### 4. 安全审计与逻辑严谨性 (Security & Logic Audit)

- **并发与幂等性**:
  - **重试风险**: 系统配置了 `attempts: 3`。若 `calculateCommission` 等业务逻辑不具备幂等性，重试可能导致同一笔订单出现多次入账（坏账风险）。
  - **逻辑建议**: Processor 在执行前必须检查业务表状态（如：分润是否已存在）。
- **资源隔离**:
  - **前缀隔离**: 通过 `keyPrefix` 区分业务 Key，防止多种环境（Dev/Test/Prod）共享同一 Redis 时产生消息污染。
- **任务堆积保护**:
  - **清理机制**: 配置了 `removeOnComplete: 100`，防止已完成任务在 Redis 中无限堆积导致 OOM（内存溢出）。
- **监控安全**:
  - **越权访问**: `QueueAccessGuard` 严控了 `POST/DELETE` 等写操作，防止恶意清空任务队列。
