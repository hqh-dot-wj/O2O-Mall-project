---
inclusion: fileMatch
fileMatchPattern: '{apps/backend/**/*.ts,apps/backend/docs/process-specs/**/*.md}'
---

# 流程规约驱动测试

每个业务操作编写 Process Spec，为每条规则分配 Rule ID，每个 Rule ID 至少映射一条测试用例，Service 方法按规则类别分解。

## 1. 适用范围与分级

| 级别 | 适用场景                       | 要求的 Spec 章节                                   |
| ---- | ------------------------------ | -------------------------------------------------- |
| Lite | CRUD、查询、配置类             | Meta + Input + PreConditions + TestMapping（4 章） |
| Full | 状态机、并发、金额、支付、库存 | 全部 10 章                                         |

涉及状态转换、Decimal 计算、分布式锁、幂等性中任意一项即 Full。

## 2. Rule ID 命名规范

格式：`R-{CATEGORY}-{DOMAIN}-{SEQ}`

| 前缀       | 含义        | 示例                |
| ---------- | ----------- | ------------------- |
| `R-IN`     | 输入校验    | `R-IN-ORDER-01`     |
| `R-PRE`    | 前置条件    | `R-PRE-STOCK-01`    |
| `R-FLOW`   | 主干流程    | `R-FLOW-CREATE-01`  |
| `R-BRANCH` | 分支规则    | `R-BRANCH-ZERO-01`  |
| `R-STATE`  | 状态机      | `R-STATE-TRANS-01`  |
| `R-CONCUR` | 并发/锁     | `R-CONCUR-STOCK-01` |
| `R-TXN`    | 事务/回滚   | `R-TXN-ROLLBACK-01` |
| `R-RESP`   | 返回/序列化 | `R-RESP-AMOUNT-01`  |
| `R-LOG`    | 可观测性    | `R-LOG-AMOUNT-01`   |

## 3. Process Spec 位置与命名

- 目录：`apps/backend/docs/process-specs/{domain}/`
- 文件名：`{action}.process-spec.md`（kebab-case）

## 4. 测试映射规则（强制）

- 没有 Rule ID 的流程规则，视为不完整
- 每个 Rule ID 至少 1 条测试用例
- 测试文件中用注释标注对应的 Rule ID
- 禁止泛化命名，使用 Given/When/Then：

```typescript
// R-PRE-STOCK-01: 库存校验
it('Given stock=0, When createOrder, Then 409 库存不足', async () => { ... });
```

## 5. Service 方法分解约定

```typescript
async createOrder(dto: CreateOrderDto): Promise<Order> {
  this.validateCreateInput(dto);              // R-IN-*
  await this.checkCreatePreConditions(dto);   // R-PRE-*
  const order = await this.doCreateOrder(dto); // R-FLOW-*
  await this.applyPostCreateRules(order);     // R-BRANCH-*
  return order;
}
```

| 子方法前缀         | 规则类别    | 职责                     |
| ------------------ | ----------- | ------------------------ |
| `validate*`        | R-IN-\*     | 输入格式、类型、精度校验 |
| `check*`           | R-PRE-\*    | 业务前置条件             |
| `do*`              | R-FLOW-\*   | 主干逻辑                 |
| `apply*Rules`      | R-BRANCH-\* | 分支判断                 |
| `transition*State` | R-STATE-\*  | 状态机转换               |

核心原则：一个 private 方法 = 一类规则 = 可独立单测。

## 6. 完整性检查（PR 必查）

| 检查项            | 要求                                          |
| ----------------- | --------------------------------------------- |
| Process Spec 存在 | 新增/修改业务方法时，对应 Spec 已创建或更新   |
| Rule ID 已分配    | Spec 中每条规则有唯一 Rule ID                 |
| 测试覆盖          | 每个 Rule ID 在 `*.spec.ts` 中有至少 1 条测试 |
| 方法分解          | Service 方法已按 validate/check/do/apply 分解 |
| 测试命名          | 使用 Given/When/Then 格式，禁止 `should xxx`  |

## 7. Process Spec 章节速查

### Lite（4 章）

0-Meta / 2-Input / 3-PreConditions / 10-TestMapping

### Full（10 章）

0-Meta / 1-Why / 2-Input / 3-PreConditions / 4-HappyPath / 5-BranchRules / 6-StateMachine / 7-ExceptionStrategy / 8-Idempotency / 9-Observability / 10-TestMapping
