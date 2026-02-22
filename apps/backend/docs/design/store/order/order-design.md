# 门店订单管理模块 — 设计文档

> 版本：1.0
> 日期：2026-02-22
> 模块路径：`src/module/store/order`
> 需求文档：[order-requirements.md](../../../requirements/store/order/order-requirements.md)
> 状态：现状架构分析 + 改进方案设计

---

## 1. 概述

### 1.1 设计目标

1. 完整描述门店订单模块的当前技术架构、数据流、跨模块协作
2. 针对需求文档中识别的 9 个代码缺陷（D-1 ~ D-9）和 7 个架构不足（A-1 ~ A-7），给出具体改进方案
3. 为中长期演进（微信退款、订单超时、部分退款、售后）提供技术设计

### 1.2 约束

| 约束     | 说明                                                                  |
| -------- | --------------------------------------------------------------------- |
| 框架     | NestJS + Prisma ORM + MySQL                                           |
| 多租户   | 超管可跨租户查看，普通租户通过 `TenantContext` 严格隔离               |
| 事务     | `@Transactional()` 装饰器保证状态更新与佣金操作的原子性               |
| 外部依赖 | `CommissionService`（佣金）、`OrderIntegrationService`（优惠券/积分） |
| 支付     | ⚠️ 微信支付退款 API 未对接，退款仅更新状态                            |

---

## 2. 架构与模块（组件图）

> 图 1：门店订单模块组件图

```mermaid
graph TB
    subgraph AdminWeb["Admin Web (前端)"]
        AW_List[订单列表页面]
        AW_Detail[订单详情页面]
        AW_Dispatch[派单管理页面]
    end

    subgraph StoreOrder["store/order 模块"]
        Ctrl[StoreOrderController]
        Svc[StoreOrderService]
        Repo[StoreOrderRepository<br/>extends BaseRepository]
    end

    subgraph FinanceModule["finance 模块"]
        CommSvc[CommissionService]
        CommRepo[CommissionRepository]
        WalletSvc[WalletService]
    end

    subgraph MarketingModule["marketing 模块"]
        IntSvc[OrderIntegrationService]
    end

    subgraph DataLayer["数据层"]
        DB_Order[(oms_order)]
        DB_Item[(oms_order_item)]
        DB_Commission[(fin_commission)]
        DB_Member[(ums_member)]
        DB_Worker[(srv_worker)]
        DB_Tenant[(sys_tenant)]
    end

    AW_List -->|GET /order/list| Ctrl
    AW_Detail -->|GET /order/detail/:id| Ctrl
    AW_Dispatch -->|GET /order/dispatch/list<br/>POST /order/reassign<br/>POST /order/verify| Ctrl

    Ctrl --> Svc
    Svc --> Repo
    Svc -->|佣金查询/取消/结算时间| CommSvc
    Svc -->|退款时优惠券/积分退还| IntSvc

    Repo --> DB_Order
    Svc -->|$queryRaw 佣金汇总| DB_Commission
    Svc -->|include| DB_Item
    Svc -->|Promise.all 并行| DB_Member
    Svc -->|Promise.all 并行| DB_Worker
    Svc -->|Promise.all 并行| DB_Tenant

    CommSvc --> CommRepo
    CommSvc --> WalletSvc
    CommRepo --> DB_Commission
```

**组件说明**：

| 组件                      | 职责                                                               |
| ------------------------- | ------------------------------------------------------------------ |
| `StoreOrderController`    | HTTP 接口层，权限校验（`@RequirePermission`）                      |
| `StoreOrderService`       | 核心业务：列表查询（含佣金汇总）、详情画像、派单/改派、核销、退款  |
| `StoreOrderRepository`    | 继承 `BaseRepository`，封装 `omsOrder` CRUD + `aggregate` 聚合方法 |
| `CommissionService`       | 佣金查询、取消/回滚、结算时间更新（外部模块）                      |
| `OrderIntegrationService` | 退款时触发优惠券退还和积分退还（外部模块）                         |

**依赖方向**：`StoreOrder` → `Finance`（佣金）、`StoreOrder` → `Marketing`（积分/优惠券）。

---

## 3. 领域/数据模型（类图）

> 图 2：门店订单模块涉及的数据模型类图

```mermaid
classDiagram
    class OmsOrder {
        +String id PK
        +String orderSn UK
        +String memberId FK
        +String tenantId FK
        +OrderType orderType
        +Decimal totalAmount
        +Decimal payAmount
        +Decimal couponDiscount
        +Decimal pointsDiscount
        +String? receiverName
        +String? receiverPhone
        +DateTime? bookingTime
        +Int? workerId FK
        +String? shareUserId FK
        +String? referrerId FK
        +OrderStatus status
        +PayStatus payStatus
        +DateTime createTime
    }

    class OmsOrderItem {
        +Int id PK
        +String orderId FK
        +String productImg
        +String productName
        +Decimal price
        +Int quantity
        +Decimal totalAmount
    }

    class FinCommission {
        +BigInt id PK
        +String orderId FK
        +String beneficiaryId FK
        +Int level
        +Decimal amount
        +CommissionStatus status
    }

    class UmsMember {
        +String memberId PK
        +String tenantId
        +String nickname
        +String mobile
        +String? parentId FK
        +String? indirectParentId FK
    }

    class SrvWorker {
        +Int workerId PK
        +String tenantId
        +String name
        +String phone
    }

    class SysTenant {
        +String tenantId PK
        +String companyName
    }

    class OrderStatus {
        <<enumeration>>
        PENDING_PAY
        PAID
        SHIPPED
        COMPLETED
        CANCELLED
        REFUNDED
    }

    class OrderType {
        <<enumeration>>
        PRODUCT
        SERVICE
        MIXED
    }

    OmsOrder "1" --> "*" OmsOrderItem : items
    OmsOrder "1" --> "*" FinCommission : commissions
    OmsOrder --> UmsMember : memberId
    OmsOrder --> SysTenant : tenantId
    OmsOrder --> SrvWorker : workerId
    OmsOrder --> UmsMember : shareUserId
    UmsMember --> UmsMember : parentId
```

---

## 4. 核心流程时序（时序图）

### 4.1 订单列表查询（含佣金汇总）

> 图 3：订单列表查询时序图

```mermaid
sequenceDiagram
    actor Admin as 门店管理员
    participant Ctrl as StoreOrderController
    participant Svc as StoreOrderService
    participant Repo as StoreOrderRepository
    participant Prisma as PrismaService
    participant DB as MySQL

    Admin->>Ctrl: GET /order/list?status=PAID&pageNum=1
    Ctrl->>Svc: findAll(query)

    Svc->>Svc: TenantContext 获取租户<br/>构建 where 条件

    Svc->>Repo: findPage({where, include: {items, tenant}})
    Repo->>DB: SELECT + COUNT
    DB-->>Repo: rows[], total

    alt 列表非空
        Svc->>Svc: 收集 orderIds[]
        Note over Svc: ⚠️ 此处有约30行调试日志<br/>针对特定订单号（缺陷 D-4）
        Svc->>Prisma: $queryRaw SUM(amount) GROUP BY order_id<br/>WHERE order_id IN (...) AND status != CANCELLED
        Prisma->>DB: 聚合查询
        DB-->>Prisma: [{orderId, total}]
        Svc->>Svc: 构建 commissionMap
    end

    Svc->>Svc: 组装: productImg, commissionAmount,<br/>remainingAmount, tenantName
    Svc-->>Ctrl: Result.page(list, total)
    Ctrl-->>Admin: 200 订单列表
```

### 4.2 退款流程（跨模块）

> 图 4：订单退款时序图

```mermaid
sequenceDiagram
    actor Admin as 门店管理员
    participant Svc as StoreOrderService
    participant Repo as StoreOrderRepository
    participant CommSvc as CommissionService
    participant CommRepo as CommissionRepository
    participant WalletSvc as WalletService
    participant IntSvc as OrderIntegrationService

    Note over Svc: @Transactional()

    Admin->>Svc: refundOrder(orderId, remark, operatorId)
    Svc->>Repo: findOne({id, tenantId})
    Repo-->>Svc: order

    Svc->>Svc: 校验状态可退款

    Svc->>Repo: update(orderId, {status: REFUNDED})

    Note over Svc: ⚠️ TODO: 此处应调用微信退款 API

    Svc->>CommSvc: cancelCommissions(orderId)

    loop 每条佣金记录
        alt status === FROZEN
            CommSvc->>CommRepo: update(id, {status: CANCELLED})
        else status === SETTLED
            CommSvc->>WalletSvc: deductBalance(beneficiaryId, amount)
            Note over WalletSvc: 扣减钱包余额（可能变负）
            CommSvc->>CommRepo: update(id, {status: CANCELLED})
        end
    end

    Svc->>IntSvc: handleOrderRefunded(orderId, memberId)
    Note over IntSvc: 退还优惠券 + 退还积分

    Svc-->>Admin: Result.ok('退款处理成功')
```

### 4.3 强制核销流程

> 图 5：强制核销时序图

```mermaid
sequenceDiagram
    actor Admin as 门店管理员
    participant Ctrl as StoreOrderController
    participant Svc as StoreOrderService
    participant Repo as StoreOrderRepository
    participant CommSvc as CommissionService

    Admin->>Ctrl: POST /order/verify {orderId, remark}
    Ctrl->>Svc: verifyService(dto, userId)

    Note over Svc: ⚠️ 双重 @Transactional()（缺陷 D-1）

    Svc->>Repo: findOne({id, tenantId, orderType: SERVICE})
    Repo-->>Svc: order

    Svc->>Svc: 校验 status === SHIPPED

    Svc->>Repo: update(orderId, {status: COMPLETED, remark})

    Svc->>CommSvc: updatePlanSettleTime(orderId, 'VERIFY')
    Note over CommSvc: 服务核销: planSettleTime = T+1

    alt updatePlanSettleTime 失败
        Note over Svc: ⚠️ 异常被 catch 吞掉（缺陷 D-6）<br/>核销成功但佣金结算时间未更新
    end

    Svc-->>Ctrl: Result.ok('核销成功')
    Ctrl-->>Admin: 200
```

---

## 5. 状态与流程

### 5.1 订单完整状态机

> 图 6：订单状态图（含门店端操作触发点）

```mermaid
stateDiagram-v2
    [*] --> PENDING_PAY: C端创建订单

    PENDING_PAY --> PAID: 支付回调
    PENDING_PAY --> CANCELLED: 超时/用户取消

    state PAID {
        [*] --> 待派单: orderType=SERVICE 且 workerId=null
        待派单 --> 已派单: 管理员派单
        [*] --> 待发货: orderType=PRODUCT
    }

    PAID --> SHIPPED: 发货/开始服务
    PAID --> REFUNDED: 管理员退款

    SHIPPED --> COMPLETED: 确认收货/管理员核销
    SHIPPED --> REFUNDED: 管理员退款

    COMPLETED --> REFUNDED: 管理员退款<br/>（已结算佣金需回滚）

    CANCELLED --> [*]
    REFUNDED --> [*]
    COMPLETED --> [*]

    note right of PAID
        门店操作：
        - 查看待派单列表
        - 改派技师
    end note

    note right of SHIPPED
        门店操作：
        - 强制核销（仅服务订单）
        触发：佣金 planSettleTime 更新
    end note

    note right of REFUNDED
        触发链：
        1. 订单状态 → REFUNDED
        2. 佣金 → CANCELLED（FROZEN直接取消/SETTLED扣减钱包）
        3. 优惠券 → 退还
        4. 积分 → 退还
        ⚠️ 微信退款 API 未对接
    end note
```

---

## 6. 部署架构（部署图）

> 图 7：门店订单模块部署架构图

```mermaid
graph TB
    subgraph Client["客户端"]
        AdminWeb[Admin Web<br/>Vue3 + Vite]
    end

    subgraph AppServer["应用服务器"]
        NestJS[NestJS Application]
        BullWorker[Bull Worker<br/>CALC_COMMISSION]
    end

    subgraph External["外部服务"]
        WxPay[微信支付 API<br/>⚠️ 退款未对接]
    end

    subgraph DataStore["数据存储"]
        MySQL[(MySQL<br/>oms_order<br/>oms_order_item<br/>fin_commission)]
        Redis[(Redis<br/>Bull 队列)]
    end

    AdminWeb -->|HTTPS| NestJS
    NestJS -->|Prisma| MySQL
    NestJS -->|$queryRaw| MySQL
    NestJS -.->|TODO| WxPay
    NestJS -->|ioredis| Redis
    BullWorker -->|消费| Redis
    BullWorker -->|Prisma| MySQL

    style WxPay stroke-dasharray: 5 5
```

---

## 7. 缺陷改进方案

### 7.1 D-1：移除重复 `@Transactional()`

**现状**：`verifyService` 方法上有两个 `@Transactional()` 装饰器。

**改进**：删除重复的装饰器，保留一个。

```typescript
@Transactional()
async verifyService(dto: VerifyServiceDto, operatorId: string) {
  // ...
}
```

**工时**：0.1h

### 7.2 D-2 + A-7：暴露退款 HTTP 接口

**现状**：`refundOrder` 仅为内部方法。

**改进**：在 Controller 中增加路由。

```typescript
@Post('refund')
@Api({ summary: '订单退款' })
@RequirePermission('store:order:refund')
@Operlog({ businessType: BusinessType.UPDATE })
async refundOrder(
  @Body() dto: RefundOrderDto,
  @User('userId') userId: string,
) {
  return this.storeOrderService.refundOrder(dto.orderId, dto.remark, userId);
}
```

新增 DTO：

```typescript
export class RefundOrderDto {
  @ApiProperty({ description: '订单ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: '退款原因', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}
```

**工时**：1h

### 7.3 D-4：清理调试日志

**现状**：`findAll` 中约 30 行针对订单号 `202602031020VJSIA849` 的调试代码。

**改进**：删除所有 `debugOrder` 相关代码块和额外的 `$queryRaw` 调试查询。保留必要的业务日志。

**工时**：0.5h

### 7.4 D-6 + D-7：关键副作用失败处理

**现状**：核销后佣金结算时间更新、退款后佣金取消和积分退还失败被静默吞掉。

**改进方案**：

方案 A（推荐）：关键操作失败时抛出异常，让事务回滚。

```typescript
// verifyService 中
await this.commissionService.updatePlanSettleTime(dto.orderId, 'VERIFY');
// 移除 try-catch，让异常传播

// refundOrder 中 - 佣金取消是关键操作，必须成功
await this.commissionService.cancelCommissions(orderId);
// 移除 try-catch

// 积分/优惠券退还可以容忍失败（非资金操作），保留 try-catch 但增加重试
try {
  await this.orderIntegrationService.handleOrderRefunded(orderId, order!.memberId);
} catch (error) {
  this.logger.error(`Handle order refunded failed, will retry`, getErrorMessage(error));
  // 加入重试队列
  await this.retryQueue.add('ORDER_REFUND_SIDE_EFFECTS', { orderId, memberId: order!.memberId });
}
```

方案 B：所有副作用通过事件驱动异步执行，保证最终一致性。

**工时**：2h

### 7.5 D-9：改派技师增加操作日志

**改进**：

```typescript
@Post('reassign')
@Api({ summary: '改派技师' })
@RequirePermission('store:order:dispatch')
@Operlog({ businessType: BusinessType.UPDATE })  // 新增
async reassignWorker(@Body() dto: ReassignWorkerDto, @User('userId') userId: string) {
  return this.storeOrderService.reassignWorker(dto, userId);
}
```

**工时**：0.5h

---

## 8. 架构改进方案

### 8.1 A-4：订单超时自动处理

**方案**：使用 Bull 延迟任务。

```mermaid
sequenceDiagram
    participant Client as C端下单
    participant OrderSvc as OrderService
    participant Queue as Bull Queue<br/>ORDER_TIMEOUT
    participant Processor as TimeoutProcessor

    Client->>OrderSvc: 创建订单
    OrderSvc->>Queue: add({orderId}, {delay: 30min})

    Note over Queue: 30分钟后触发

    Queue->>Processor: process(job)
    Processor->>OrderSvc: 查询订单状态
    alt status === PENDING_PAY
        Processor->>OrderSvc: 关闭订单<br/>status → CANCELLED
        Processor->>OrderSvc: 释放库存
    else 已支付
        Processor->>Processor: 忽略
    end
```

**配置**：

- 未支付订单：30 分钟自动关闭
- 待核销服务订单：超过预约时间 24 小时提醒管理员

### 8.2 A-3：部分退款

**数据模型扩展**：

```mermaid
classDiagram
    class OmsRefund {
        <<proposed>>
        +String id PK
        +String orderId FK
        +String tenantId
        +RefundType type [FULL, PARTIAL]
        +Decimal refundAmount
        +String reason
        +RefundStatus status
        +String? wxRefundNo
        +String operatorId
        +DateTime createTime
    }

    class OmsRefundItem {
        <<proposed>>
        +Int id PK
        +String refundId FK
        +Int orderItemId FK
        +Int quantity
        +Decimal refundAmount
    }

    OmsRefund "1" --> "*" OmsRefundItem : items
    OmsRefund --> OmsOrder : orderId
```

**流程**：

1. 管理员选择退款商品和数量
2. 系统计算退款金额（含优惠分摊）
3. 调用微信部分退款 API
4. 按比例回滚对应佣金
5. 按比例退还积分（优惠券不退还，因为部分退款后订单仍有效）

---

## 9. 接口/数据约定

### 9.1 现有接口约定

| 接口       | 方法 | 路径                   | 租户类型     | QPS 档位 | 大表                                  |
| ---------- | ---- | ---------------------- | ------------ | -------- | ------------------------------------- |
| 订单列表   | GET  | `/order/list`          | TenantScoped | 中       | 是（oms_order + fin_commission 聚合） |
| 订单详情   | GET  | `/order/detail/:id`    | TenantScoped | 中       | 否（单条查询）                        |
| 待派单列表 | GET  | `/order/dispatch/list` | TenantScoped | 低       | 否                                    |
| 改派技师   | POST | `/order/reassign`      | TenantScoped | 低       | 否                                    |
| 强制核销   | POST | `/order/verify`        | TenantScoped | 低       | 否                                    |

### 9.2 提议新增接口

| 接口     | 方法 | 路径                    | 说明               | 优先级 |
| -------- | ---- | ----------------------- | ------------------ | ------ |
| 订单退款 | POST | `/order/refund`         | 暴露退款 HTTP 入口 | P0     |
| 订单导出 | POST | `/order/export`         | Excel 导出         | P1     |
| 批量核销 | POST | `/order/verify/batch`   | 批量强制核销       | P2     |
| 批量发货 | POST | `/order/ship/batch`     | 批量发货           | P2     |
| 部分退款 | POST | `/order/refund/partial` | 按商品维度部分退款 | P1     |

---

## 10. 改进优先级总览

| 优先级 | 编号 | 改进项                      | 工时 | 对应缺陷/不足 |
| ------ | ---- | --------------------------- | ---- | ------------- |
| P0     | I-1  | 移除重复 `@Transactional()` | 0.1h | D-1           |
| P0     | I-2  | 清理硬编码调试日志          | 0.5h | D-4           |
| P0     | I-3  | 暴露退款 HTTP 接口          | 1h   | D-2, A-7      |
| P0     | I-4  | 对接微信退款 API            | 3-5d | D-3           |
| P1     | I-5  | 关键副作用失败处理策略      | 2h   | D-6, D-7      |
| P1     | I-6  | 改派技师增加操作日志        | 0.5h | D-9           |
| P1     | I-7  | 详情佣金排除 CANCELLED      | 0.5h | D-8           |
| P1     | I-8  | 订单超时自动关闭            | 2-3d | A-4           |
| P1     | I-9  | 部分退款                    | 3-5d | A-3           |
| P2     | I-10 | 订单导出                    | 1-2d | A-2           |
| P2     | I-11 | 批量操作                    | 2-3d | A-1           |
| P3     | I-12 | 售后工单系统                | 5-7d | A-3           |
| P3     | I-13 | 物流跟踪集成                | 3-5d | A-5           |
