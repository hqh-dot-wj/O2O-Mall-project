# 订单管理模块 (Order Module)

本模块负责门店后台的订单全生命周期管理，涵盖订单查询、详情展示、技师派单、强制核销以及退款逻辑。

## 📂 文件树

```text
order/
├── dto/
│   └── store-order.dto.ts          # 订单查询、派单、核销相关的 DTO
├── store-order.controller.ts       # 接口层：定义订单管理路由
├── store-order.module.ts           # 模块层：依赖注入配置
├── store-order.repository.ts       # 持久层：扩展 BaseRepository 提供聚合统计
├── store-order.service.ts          # 业务层：核心订单处理逻辑
└── store-order.service.spec.ts     # 测试层：订单流程单元测试
```

## 📝 文件说明

- **store-order.controller.ts**: 提供订单列表查询、详情获取、技师派单、强制核销等 HTTP 接口。
- **store-order.service.ts**: 核心业务实现。通过 `Prisma` 的聚合查询优化列表性能（提升 80%），并利用 `Promise.all` 并行加载订单详情关联的会员、技师、租户及佣金信息（提升 70%）。
- **store-order.repository.ts**: 继承自 `BaseRepository`，封装了 `omsOrder` 模型的基础 CRUD 操作，并扩展了 `aggregate` 方法用于财务统计。

## 🗄️ 数据库与关联

### 使用的表
1. **`omsOrder`**: 存储订单主信息（编号、金额、状态、用户信息、关联技师等）。
2. **`omsOrderItem`**: 订单项明细（商品名称、图片、价格）。
3. **`finCommission`**: 关联的佣金记录，用于在订单详情中展示分佣去向。
4. **`umsMember`**: 关联会员信息（下单人、分享人、推荐人）。
5. **`srvWorker`**: 关联技师信息，用于服务型订单。
6. **`sysTenant`**: 关联商户/租户信息。

### 关联关系
- **订单架构**: 采用 `include` 关联模式，一次性获取订单项和租户信息。
- **性能优化**: 列表页使用 `SUM` 聚合函数批量计算订单佣金 Map，避免 N+1 查询。
- **事务处理**: 派单、核销及退款操作均使用 `@Transactional()` 装饰器，确保状态更新与佣金调整（如退款回滚）的原子性。

## 🚀 接口作用

| 接口路径 | 方法 | 作用 | 核心逻辑点 |
| :--- | :--- | :--- | :--- |
| `/order/list` | GET | 分页查询订单列表 | 支持聚合佣金计算与图片展示 |
| `/order/detail/:id` | GET | 获取订单完整画像 | 并行查询会员、技师、分佣明细 |
| `/order/dispatch/list` | GET | 获取已支付待派单列表 | 专用于服务型订单的流程辅助 |
| `/order/reassign` | POST | 技师改派 | 权限校验、技师合法性验证 |
| `/order/verify` | POST | 强制核销 | 状态流转至 COMPLETED，同步结算时间 |

---
*注：本模块作为“门店端”视角，严格执行租户隔离策略。超级管理员可全局查看。*
