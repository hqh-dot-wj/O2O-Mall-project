# 财务管理模块 (Finance Module)

本模块负责店铺端的财务管理，涵盖资金看板、佣金明细、提现管理以及全量财务流水查询。采用了 **Facade (外观) 模式**，通过统一的入口协调多个专项子服务。

## 📂 文件树

```text
finance/
├── dto/
│   └── store-finance.dto.ts        # 财务相关 DTO (佣金、提现、流水查询)
├── commission-query.service.ts     # 专项：佣金明细查询服务
├── dashboard.service.ts            # 专项：财务看板统计服务
├── ledger.service.ts               # 专项：财务流水(合并账单)服务
├── store-finance.controller.ts     # 接口层：定义财务路由与权限
├── store-finance.module.ts         # 模块层：依赖注入与组件注册
├── store-finance.service.ts        # 外观层：财务服务统一入口 (Facade)
└── dashboard.service.spec.ts       # 测试层：统计逻辑单元测试
```

## 📝 文件说明

- **store-finance.controller.ts**: 提供看板查询、佣金列表、提现审核及流水查询的 HTTP 接口。
- **store-finance.service.ts**: 核心外观类，不对外直接实现复杂业务，而是分发请求至 `Dashboard`、`Commission`、`Ledger` 及全局 `Withdrawal` 服务。
- **ledger.service.ts**: 核心业务之一，通过原生 SQL 的 `UNION ALL` 跨表对齐（订单收入、钱包交易、提现支出、佣金入账），提供统一的分页账单流水。
- **dashboard.service.ts**: 聚合订单与财务数据，为门店提供 GMV、待结算佣金、待审核提现等实时指标。

## 🗄️ 数据库与关联

### 使用的表
1. **`oms_order`**: 查询订单收入。
2. **`fin_transaction`**: 查询钱包账户的基础流水。
3. **`fin_withdrawal`**: 查询与审核会员/分销商的提现记录。
4. **`fin_commission`**: 查询佣金的产生及结算记录。
5. **`fin_wallet`**: 记录其余额支撑。
6. **`ums_member`**: 关联显示流水的用户信息（昵称、手机号）。

### 关联关系
- **多表聚合 (Union)**: `ledger.service.ts` 通过逻辑映射将异构的订单表、提现表、佣金表映射为统一的流水视图。
- **租户隔离**: 严格遵循 `tenantId` 过滤，确保各店只能查看自身的财务往来。
- **权限集成**: 接口受 `store:finance` 系列权限点保护。

## 🚀 接口作用

| 接口路径 | 方法 | 作用 | 关键子服务 |
| :--- | :--- | :--- | :--- |
| `/finance/dashboard` | GET | 获取当日/当月 GMV 及统计指标 | `DashboardService` |
| `/finance/commission/list` | GET | 分页查询佣金明细 | `CommissionQueryService` |
| `/finance/withdrawal/list` | GET | 查询门店下分销商的提现申请 | `WithdrawalService` |
| `/finance/withdrawal/audit` | POST | 提现审核 (通过/驳回) | `WithdrawalService` |
| `/finance/ledger` | GET | 获取包含订单、提现、佣金的全量流水 | `LedgerService` |

---
*注：本模块作为“门店端”财务入口，涉及支付与退款的底层操作通常由全局 `finance` 模块或支付模块支撑。*
