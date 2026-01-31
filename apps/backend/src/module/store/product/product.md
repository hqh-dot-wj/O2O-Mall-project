# 商品管理模块 (Product Module)

本模块负责门店端商品生命周期的精细化管理，包含从全局商品库引入选品、价格与库存调整、利润风控校验，以及系统间的自动状态同步。

## 📂 文件树

```text
product/
├── dto/                       # 数据传输对象 (导入、列表查询、价格更新)
├── vo/                        # 视图对象 (选品中心展示、店铺商品展示)
├── product-sync.queue.ts      # 异步任务：处理全局商品下架后的门店状态同步
├── product.controller.ts      # 接口层：选品中心、店铺列表、基础/价格更新接口
├── product.module.ts          # 模块层：组件注册与 Bull 队列配置
├── product.service.ts         # 业务层：商品导入、多 SKU 处理、导入校验
├── profit-validator.ts        # 规则引擎：利润风控校验器 (防止亏本销售)
├── tenant-product.repository.ts # 持久层：扩展租户商品关联查询
└── tenant-sku.repository.ts   # 持久层：扩展租户 SKU 关联查询与乐观锁
```

## 📝 文件说明

- **product.service.ts**: 核心逻辑实现，包含“选品中心”的全局搜索、商品“导入（Upsert）”流程，以及带事务的 SKU 创建。
- **profit-validator.ts**: 关键的业务规则类。在导入商品或修改价格时，自动计算：`售价 - 成本价 - 分销佣金`。若结果小于零（亏损），则强制阻断操作；若利润率低于 10%，则记录预警日志。
- **product-sync.queue.ts**: 使用 Bull 队列处理异构同步逻辑。当全局商品下架时，异步触发所有相关门店商品的自动下架，保持状态一致性。
- **tenant-product.repository.ts**: 封装了复杂的 `include` 关联，用于展示商品的全局信息、分类、品牌及 SKU 动态。

## 🗄️ 数据库与关联

### 使用的表
1. **`pmsProduct` & `pmsSku`**: 全局商品库，作为所有门店商品的“母版”。
2. **`pmsTenantProduct`**: 门店引入的商品映像，存储自定义标题、状态及服务半径。
3. **`pmsTenantSku`**: 门店引入的 SKU 映像，存储门店售价、库存及分销配置。
4. **`sysTenant`**: 用于多租户隔离与 HQ（总部）视角的数据聚合。

### 关联关系
- **映像关系**: 门店商品通过 `productId` 关联全局商品。门店 SKU 通过 `globalSkuId` 关联全局 SKU。
- **风控关联**: 校验逻辑依赖于 `pmsSku` 中的 `costPrice`（成本）与 `pmsTenantSku` 中的 `price`（售价）和 `distRate`（分润比）。
- **同步链路**: 全局商品状态变更 $\xrightarrow{Queue}$ 门店商品状态变更。

## 🚀 接口作用

| 接口路径 | 方法 | 作用 | 技术看点 |
| :--- | :--- | :--- | :--- |
| `/store/market/list` | POST | 选品中心全局搜索 | 动态标记“是否已引入”状态 |
| `/store/product/import` | POST | 导入商品至当前门店 | 基于 `upsert` 的并发安全导入 |
| `/store/product/list` | POST | 门店已引入商品管理 | 支持 HQ 视角跨店查询 |
| `/store/product/update-price` | POST | 修改售价/库存/分销比 | 集成 `ProfitValidator` 利润风控 |
| `/store/product/update-base` | POST | 修改标题/状态/半径 | 支持个性化服务范围覆盖 |

---
*注：本模块是 O2O 业务的核心，确保了总部供应链与门店终端销售的数据联动与价格红线管控。*
