# Marketing Play 营销玩法策略模块

## 📂 文件树与功能简述
```text
play/
├── dto/                    # 数据传输对象 (拼团、升级等玩法的参数校验)
├── course-group-buy.service.ts # 课程拼团策略 (针对课程类商品的特化逻辑)
├── group-buy.service.ts    # 基础拼团策略 (校验、成团判定、进度管理)
├── member-upgrade.service.ts # 会员升级策略 (处理等级变更逻辑)
├── play.factory.ts         # 策略工厂 (根据 templateCode 动态分发策略实例)
├── play.module.ts          # 模块配置 (注册所有策略至 Nest 容器)
├── strategy.interface.ts   # 策略接口 (定义统一的营销逻辑标准：IMarketingStrategy)
└── play.md                 # 模块文档
```
- **核心定位**：营销系统的“大脑”，采用**策略模式 (Strategy Pattern)** 实现玩法的插件化扩展。

## 🗄️ 数据库表与逻辑关联
该模块主要驱动及处理以下数据关联（通过接口操作）：
- **`StorePlayConfig.rules` (配置规则)**: 本模块负责解析此字段中的 JSON 规则（如 `minCount`, `price`），执行玩法级的**配置校验** (`validateConfig`)。
- **`PlayInstance.instanceData` (执行存根)**: 玩法执行过程中的中间状态（如当前拼团人数 `currentCount`、团长 ID `leaderId`）存储于此，供策略逻辑动态读写。
- **逻辑关联**: 
    - 向上对接 **PlayInstanceService**: 作为其底层的逻辑执行者。
    - 向下驱动 **MarketingStockService**: 执行营销维度的库存预占与核销。

## ⚙️ 核心接口作用 (`IMarketingStrategy`)
| 接口方法 | 技术关键词 | 业务闭环能力 |
| :--- | :--- | :--- |
| **`validateJoin`** | `Qualification`, `ActiveCheck` | **准入风控**：校验用户是否有资格参团/升级（如检查拼团是否满员）。 |
| **`calculatePrice`** | `DynamicPricing`, `SKU` | **动态定价**：根据玩法规则（如拼团价、阶梯价）实时计算应付金额。 |
| **`onPaymentSuccess`** | `Callback`, `ProgressUpdate` | **异步驱动**：支付成功后更新玩法进度（如拼团人数+1、判断是否达成成团条件）。 |
| **`onStatusChange`** | `LifecycleHook`, `Finalize` | **生命周期管理**：在成团或失败时刻触发后续动作（如群发成功通知、订单批量流转）。 |
| **`getDisplayData`** | `DTOTransformation` | **展示增强**：将后台复杂的规则配置转化为前端易读的文案及进度模型。 |

---
*注：本模块通过 `PlayStrategyFactory` 实现了极强的可扩展性，新增营销玩法（如秒杀、砍价）仅需实现 `IMarketingStrategy` 并注册至工厂，无需代码侵入核心流程。*
