# Client Product 模块文档

模型名称：Gemini 2.0 Flash、模型大小：未知、模型类型：对话模型及其修订版本：2026-05-14

### **1. 文件树与作用简述 (File Tree & Architecture)**

```text
product/
├── dto/
│   └── product.dto.ts         # 输入校验：商品列表筛选、分页参数等 Dto
├── vo/
│   └── product.vo.ts          # 输出渲染：商品列表项、详情（含多层级 SKU）Vo
├── product.controller.ts      # 路由控制：对外提供商品列表、详情及分类树接口
├── product.module.ts          # 模块配置：关联 Redis、营销策略工厂及租户系统
├── product.repository.ts      # 数据仓储：处理跨表（总部商品 + 门店映射）的复杂聚合查询
└── product.service.ts         # 业务逻辑：核心计价引擎、缓存编排、营销活动聚合
```

---

### **2. 数据库表与逻辑关联 (Database & Relationships)**

- **PmsProduct (总部标准库)**：存储商品的物理属性（详情 HTML、主图、商品类型）。
- **PmsCategory (分类表)**：递归结构的商品分类，支撑 C 端分类导航。
- **PmsTenantProduct (租户商品映射表)**：门店级别的“上架”控制，支持自定义标题及推荐状态。
- **PmsTenantSku (租户 SKU 价格/库存表)**：存储各区域门店的**差异化定价**及实时库存。
- **StorePlayConfig (营销配置)**：控制商品参与的促销活动（秒杀、拼团等）。

**逻辑关联**：
- `PmsProduct` ➔ `PmsTenantProduct`：1:N 关系，实现“一份标准库，万店差异化”。
- `PmsTenantProduct` ➔ `PmsTenantSku`：1:N 关系，每个门店可对标准 SKU 进行独立定价。

---

### **3. 核心接口与业务闭环 (API & Business Closure)**

| 接口方法 | 技术关键词 | 业务闭环作用 |
| :--- | :--- | :--- |
| `findAll` | `TenantContext`, `Redis Cache` | 列表展示。基于**租户上下文**动态过滤门店商品，内置 5 分钟 MD5 指纹缓存以应对高并发。 |
| `findOne` | `Marketing Aggregation` | 详情闭环。聚合**实时库存、门店差价、营销规则（SECKILL/GROUP_BUY）**，并开启 10 分钟详情缓存。 |
| `findCategoryTree` | `Recursive Build` | 导航构建。将扁平化的分类表转化为 C 端嵌套树形结构。 |
| `findTenantProducts` | `Composite Query` | 数据路由。在超级租户（选品中心）与普通门店之间切换查询路径。 |

---

### **4. 安全审计与逻辑严谨性 (Security & Logic Audit)**

- **多层状态穿透逻辑**：商品展示不仅校验 `PmsProduct` 的发布状态，还会同时穿透校验 `PmsTenantProduct` 的门店状态及 `PmsTenantSku` 的启用状态，确保**非法状态不可见**。
- **分级计价安全**：详情接口优先读取 `PmsTenantSku` 覆盖价，若缺失则降级至总部 `guidePrice`，确保在门店配置缺失时业务不中断。
- **缓存一致性与击穿**：
    - 使用 `@Cacheable` 装饰器简化详情缓存，对 ID 位进行哈希定位。
    - 列表页手动处理 Redis 缓存，结合 `crypto.MD5` 生成全参数指纹，避免不同筛选条件下产生缓存碰撞。
- **安全性分析**：
    - *越权保护*：虽然商品是公共数据，但租户隔离逻辑确保了 A 门店用户无法看到 B 门店独有的非公开/测试商品。
    - *风险点*：目前列表缓存（5分钟）是非主动失效模式，后台下架商品在最极端情况下可能有 300 秒的显示延迟。
    - *性能保护*：对分类递归（`getAllCategoryIds`）执行前置检索，避免在查询中使用低效的模糊匹配，改为高效的 `IN` 索引查询。
