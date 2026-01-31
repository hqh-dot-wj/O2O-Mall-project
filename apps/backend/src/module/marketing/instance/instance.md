# Play Instance 营销玩法实例模块

## 📂 文件树与功能简述
```text
instance/
├── dto/
│   └── instance.dto.ts      # 数据传输对象 (创建实例、分页筛选)
├── vo/
│   └── instance.vo.ts       # 视图对象 (包含进度、状态展示模型)
├── instance.controller.ts   # 控制器 (订单/实例全生命周期流转接口)
├── instance.module.ts       # 模块配置 (管理 Wallet、Asset、Strategy 跨模块集成)
├── instance.repository.ts   # 仓储层 (状态机持久化、批量状态更新)
├── instance.service.ts      # 业务逻辑 (核心状态机、分账入账、权益发放、生命周期 Hook)
└── instance.md              # 模块文档
```
- **核心定位**：营销系统的“动态执行引擎”，记录用户参与营销活动（如发起拼团、开始砍价）的具体过程及最终结果。

## 🗄️ 数据库表与逻辑关联
- **`PlayInstance` (营销玩法实例表)**: 
    - **逻辑关联**: 
        - 核心外键关联 `storePlayConfigId`，继承玩法的业务规则与库存模式。
        - 关联 `memberId` 锁定参与主体。
        - 冗余 `templateCode` 用于快速分发至策略工厂。
        - 记录 `orderSn` 用于与订单/支付系统对账。
- **业务流转逻辑**: 
    - **支付环节**: 与 `Wallet` 系统联动。支付成功后由回调触发状态流转。
    - **完成环节**: 实例流转至 `SUCCESS` 终态时，触发**跨模块副作用**：
        1. **自动分账**：根据系统费率计算平台费，余额结算至门店钱包。
        2. **权益发放**：联动 `Asset` 模块生成用户的核销券/次卡资产。

## ⚙️ 核心接口作用
| 接口 | 技术关键词 | 业务闭环能力 |
| :--- | :--- | :--- |
| **创建实例** | `@Idempotent`, `Strategy.validateJoin` | **防重入**创建初始化实例，包含特定的业务资格（如新客、次数限制）预检。 |
| **状态流转 (Patch)** | `@Transactional`, `StateMachine` | 实现从 `PENDING_PAY` -> `PAID` -> `SUCCESS/FAILED` 的严格转换校验。 |
| **支付成功处理** | `Strategy.onPaymentSuccess` | 接收回调后分发至具体策略（如触发拼团人数+1），支持逻辑递进。 |
| **自动分账与发券** | `CrossModule`, `Decimal.mul` | 在实例成功时刻，完成**资金结算（钱包入账）**与**权益履约（资产生成）**的最终闭环。 |

---
*注：本模块是营销业务的“核心汇聚点”，向上连接 `PlayStrategy` 玩法，向下连接 `Wallet` 资金与 `Asset` 资产。*
