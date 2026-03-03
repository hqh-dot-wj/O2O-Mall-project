# Finance 模块 Process Spec 索引

> 创建日期：2026-03-03
> 模块路径：`src/module/finance/`

## 概述

Finance 模块包含四个子模块，按依赖关系排序：

```
Wallet（基础层）
   ↓
Commission（依赖 Wallet）
   ↓
Settlement（依赖 Commission + Wallet）
   ↓
Withdrawal（依赖 Wallet）
```

## Process Spec 清单

| 文件                                                                             | 流程         | 级别 | 状态      |
| -------------------------------------------------------------------------------- | ------------ | ---- | --------- |
| [wallet-balance-change.process-spec.md](./wallet-balance-change.process-spec.md) | 钱包余额变动 | Full | ✅ 已创建 |
| [commission-calculate.process-spec.md](./commission-calculate.process-spec.md)   | 佣金计算     | Full | ✅ 已创建 |
| [settlement-settle.process-spec.md](./settlement-settle.process-spec.md)         | 佣金结算     | Full | ✅ 已创建 |
| [withdrawal-apply.process-spec.md](./withdrawal-apply.process-spec.md)           | 提现申请     | Full | ✅ 已创建 |

## Rule ID 汇总

### Wallet 模块

| 前缀            | 数量 | 说明      |
| --------------- | ---- | --------- |
| R-IN-WALLET     | 4    | 输入校验  |
| R-PRE-WALLET    | 6    | 前置条件  |
| R-FLOW-WALLET   | 17   | 主干流程  |
| R-BRANCH-WALLET | 3    | 分支规则  |
| R-CONCUR-WALLET | 2    | 并发控制  |
| R-TXN-WALLET    | 5    | 事务/回滚 |
| R-LOG-WALLET    | 4    | 可观测性  |

### Commission 模块

| 前缀                | 数量 | 说明      |
| ------------------- | ---- | --------- |
| R-IN-COMMISSION     | 2    | 输入校验  |
| R-PRE-COMMISSION    | 8    | 前置条件  |
| R-FLOW-COMMISSION   | 16   | 主干流程  |
| R-BRANCH-COMMISSION | 10   | 分支规则  |
| R-STATE-COMMISSION  | 4    | 状态机    |
| R-CONCUR-COMMISSION | 4    | 并发控制  |
| R-TXN-COMMISSION    | 5    | 事务/回滚 |
| R-LOG-COMMISSION    | 4    | 可观测性  |

### Settlement 模块

| 前缀                | 数量 | 说明      |
| ------------------- | ---- | --------- |
| R-IN-SETTLEMENT     | 3    | 输入校验  |
| R-PRE-SETTLEMENT    | 4    | 前置条件  |
| R-FLOW-SETTLEMENT   | 12   | 主干流程  |
| R-BRANCH-SETTLEMENT | 6    | 分支规则  |
| R-STATE-SETTLEMENT  | 1    | 状态机    |
| R-CONCUR-SETTLEMENT | 4    | 并发控制  |
| R-TXN-SETTLEMENT    | 5    | 事务/回滚 |
| R-LOG-SETTLEMENT    | 4    | 可观测性  |

### Withdrawal 模块

| 前缀                | 数量 | 说明      |
| ------------------- | ---- | --------- |
| R-IN-WITHDRAWAL     | 6    | 输入校验  |
| R-PRE-WITHDRAWAL    | 6    | 前置条件  |
| R-FLOW-WITHDRAWAL   | 22   | 主干流程  |
| R-BRANCH-WITHDRAWAL | 6    | 分支规则  |
| R-STATE-WITHDRAWAL  | 7    | 状态机    |
| R-CONCUR-WITHDRAWAL | 4    | 并发控制  |
| R-TXN-WITHDRAWAL    | 5    | 事务/回滚 |
| R-LOG-WITHDRAWAL    | 5    | 可观测性  |

## 关联文档

- 需求文档：`apps/backend/docs/requirements/finance/`
- 任务清单：`apps/backend/docs/tasks/finance-task-list.md`
- 整体分析：`apps/backend/docs/requirements/finance/finance-overall-analysis.md`

## 测试覆盖要求

每个 Rule ID 至少对应 1 条测试用例，测试文件命名：

- `wallet.service.spec.ts`
- `commission.service.spec.ts`
- `settlement.scheduler.spec.ts`
- `withdrawal.service.spec.ts`

测试命名格式：`Given {前置条件}, When {操作}, Then {预期结果}`
