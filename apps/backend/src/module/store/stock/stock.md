# 库存管理模块 (Stock Module)

本模块专注负责门店 SKU 的库存水位管理，提供基于数据库原子操作的高并发库存变更方案，确保库存扣减的准确性与安全性。

## 📂 文件树

```text
stock/
├── dto/                       # 数据传输对象 (分页搜索、库存更新)
├── vo/                        # 视图对象 (库存详情展示)
├── stock.controller.ts        # 接口层：定义库存列表与更新路由
├── stock.module.ts            # 模块层：组件注册
├── stock.service.ts           # 业务层：原子库存变更逻辑实现
└── stock.service.spec.ts      # 测试层：并发库存操作单元测试
```

## 📝 文件说明

- **stock.service.ts**: 核心功能实现。采用数据库层面的 `increment` 和 `decrement` 原子指令处理库存变化，有效防止了并发请求下的“超卖”或“竞态”问题。
- **stock.controller.ts**: 提供供门店后台使用的库存监控与手动维护接口。

## 🗄️ 数据库与关联

### 使用的表
1. **`pmsTenantSku`**: 核心表，存储门店 SKU 的实时库存 (`stock`) 及其版本号。
2. **`pmsTenantProduct`**: 关联表，用于按商品标题筛选库存。
3. **`pmsProduct`**: 关联表，获取商品的全局基础信息用于展示。

### 关联关系
- **原子性保障**: 在执行扣减操作时，通过 `where` 条件附带 `stock: { gte: Math.abs(change) }` 检查，由数据库底层确保库存不会变为负数。
- **关联路径**: `pmsTenantSku` $\to$ `pmsTenantProduct` $\to$ `pmsProduct`。

## 🚀 接口作用

| 接口路径 | 方法 | 作用 | 技术核心 |
| :--- | :--- | :--- | :--- |
| `/store/stock/list` | POST | 监控门店所有 SKU 的库存状态 | 多表 Join 聚合查询 |
| `/store/stock/update` | POST | 增加或减少特定 SKU 的库存 | 原子变更指令 (`increment`/`decrement`) |

---
*注：本模块侧重于“手动维护”，交易流程中的自动库存扣减通常集成在订单执行生命周期中。*
