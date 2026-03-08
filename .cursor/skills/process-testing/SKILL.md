---
name: process-testing
description: Process Spec + Rule ID testing. Use when writing backend tests for state/amount/concurrency.
---

# Process Spec 驱动测试

每个业务操作编写 Process Spec，为每条规则分配 Rule ID，每个 Rule ID 至少映射一条测试用例。

## Rule ID 命名

格式：`R-{CATEGORY}-{DOMAIN}-{SEQ}`

| 前缀     | 含义     |
| -------- | -------- |
| R-IN     | 输入校验 |
| R-PRE    | 前置条件 |
| R-FLOW   | 主干流程 |
| R-BRANCH | 分支规则 |
| R-STATE  | 状态机   |
| R-CONCUR | 并发/锁  |

## 测试映射

- 每个 Rule ID 至少 1 条测试
- 命名：Given/When/Then 格式
- 测试文件用注释标注 Rule ID

## Service 方法分解

| 前缀              | 规则类别 |
| ----------------- | -------- |
| validate\*        | 输入校验 |
| check\*           | 前置条件 |
| do\*              | 主干逻辑 |
| apply\*Rules      | 分支规则 |
| transition\*State | 状态机   |

## Process Spec 与测试位置

- Process Spec 存放：`apps/backend/docs/process-specs/` 或模块内 `docs/`
- 测试文件：与 Service 同目录 `*.spec.ts`，或 `test/` 子目录
- 涉及状态机、并发、金额、幂等的 Service 必须按本规范编写
