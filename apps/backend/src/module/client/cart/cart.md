# Client Cart 模块文档

模型名称：Gemini 2.0 Flash、模型大小：未知、模型类型：对话模型及其修订版本：2026-05-14

### **1. 文件树与作用简述 (File Tree & Architecture)**

```text
cart/
├── dto/
│   └── cart.dto.ts         # 输入校验：加购参数、更新数量 Dto
├── vo/
│   └── cart.vo.ts          # 输出渲染：购物车列表记录、失效列表 Vo
├── cart.controller.ts      # 路由控制：处理 C 端购物车增删改查
├── cart.module.ts          # 模块配置：Prisma、Redis 依赖注入
├── cart.repository.ts      # 数据仓储：基于 OmsCartItem 的底层持久化操作
└── cart.service.ts         # 业务逻辑：加购逻辑、分类过滤、库存校验及 Redis 同步
```

---

### **2. 数据库表与逻辑关联 (Database & Relationships)**

- **OmsCartItem (购物车项表)**：存储用户的临时加购记录，包含 SKU 快照信息（价格、规格）。
- **PmsTenantSku (租户 SKU 表)**：关联实时库存及价格，用于购物车列表的失效检查和变价提醒。
- **PmsTenantProduct (租户商品表)**：用于校验商品在特定门店的上下架状态。

**逻辑关联**：
- `OmsCartItem.skuId` ➔ `PmsTenantSku.id`：实时校验购物车内商品的有效性。
- `OmsCartItem.memberId` + `OmsCartItem.tenantId`：实现不同门店（租户）下的购物车相互隔离。

---

### **3. 核心接口与业务闭环 (API & Business Closure)**

| 接口方法 | 技术关键词 | 业务闭环作用 |
| :--- | :--- | :--- |
| `addToCart` | `Upsert`, `Redis Sync` | 将商品加入清单。若记录已存在则**数量累加**，并同步更新 Redis 以供前端快速读取。 |
| `getCartList` | `Invalid Filter`, `Price Alert` | 列表展示。核心逻辑在于**两阶段过滤**：分离有效商品与无效（已锁定/下架）商品，并标记价格变动。 |
| `updateQuantity` | `Stock Lock Check` | 修改购买量。实时校验 **Tenant-level 库存**，防止超卖。 |
| `syncCartToRedis` | `HMSET`, `7-Day TTL` | 缓存闭环。将高频访问的购物车元数据缓存至 Redis，有效期 7 天，减轻 DB 查询压力。 |

---

### **4. 安全审计与逻辑严谨性 (Security & Logic Audit)**

- **越权校验**：核心 Service 强制要求 `memberId` 匹配，并在 Repository 层通过 `memberId` 和 `tenantId` 双重锁定数据范围。
- **状态机同步**：购物车列表在每次加载时会重新关联 `PmsTenantSku` 和 `PublishStatus`，**动态判定有效性**，而非仅依赖加购时的状态。
- **库存竞态**：`updateQuantity` 在业务层进行库存水位检查；真正的强一致性库存锁定由后续的“下单 (Place Order)”流程保证。
- **逻辑缺陷分析**：
    - *风险点*：`syncCartToRedis` 采用异步/静默失败策略，若 Redis 操作失败，购物车角标可能出现短暂延迟。
    - *精度保护*：价格字段使用 `Decimal` 类型处理，避免前端 JavaScript 浮点数计算导致的金额展示误差。
    - *攻击防护*：通过 `AddCartDto` 的 `skuId` 归属校验，防止攻击者通过构造报文跨门店（跨 Tenant）随意加购商品。
