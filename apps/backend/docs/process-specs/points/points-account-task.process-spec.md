# 积分冻结解冻与任务发放 Process Spec

## 0-Meta

- 操作集合: `freezePoints` / `unfreezePoints` / `completeTask`
- 级别: **Full**
- 领域: `points`
- 调用方: `integration` / `client/marketing/points`
- 租户类型: `TenantScoped`

## 1-Why

- 并发冻结/解冻会直接影响可用余额，必须用乐观锁兜底。
- 任务完成与积分发放必须原子，防止“发放成功但记录失败”导致重复领奖。

## 2-Input

- `freezePoints(memberId, amount, relatedId)`
- `unfreezePoints(memberId, amount, relatedId)`
- `completeTask(memberId, taskKey)`

## 3-PreConditions

| 条件                 | 不满足时   | Rule ID         |
| -------------------- | ---------- | --------------- |
| 积分账户存在         | 抛业务异常 | R-PRE-POINTS-01 |
| 可用积分充足（冻结） | 抛业务异常 | R-PRE-POINTS-02 |
| 冻结积分充足（解冻） | 抛业务异常 | R-PRE-POINTS-03 |
| 任务存在且启用       | 抛业务异常 | R-PRE-TASK-01   |

## 4-HappyPath

| 步骤                          | 说明                        | Rule ID          |
| ----------------------------- | --------------------------- | ---------------- |
| freezePoints 乐观锁更新账户   | 可用减/冻结增 + 交易记录    | R-FLOW-POINTS-01 |
| unfreezePoints 乐观锁更新账户 | 可用增/冻结减 + 交易记录    | R-FLOW-POINTS-02 |
| completeTask 事务发放         | 发放积分 + 完成记录原子写入 | R-FLOW-TASK-01   |

## 5-BranchRules

| 分支       | 行为                   | Rule ID            |
| ---------- | ---------------------- | ------------------ |
| 乐观锁冲突 | 重试最多 3 次          | R-BRANCH-POINTS-01 |
| 重试耗尽   | 抛业务异常“请稍后重试” | R-BRANCH-POINTS-02 |

## 6-StateMachine

- 任务完成资格状态:
  - 可完成 -> 发放并记录
  - 不可完成 -> 拒绝并返回原因
- Rule ID: `R-STATE-TASK-01`

## 7-ExceptionStrategy

- 账户/余额/冻结不足直接失败。
- completeTask 任一步失败整体回滚（事务）。

## 8-Idempotency

- completeTask 依赖资格检查 + 事务保证业务幂等语义。
- 并发安全依赖乐观锁重试。
- Rule ID: `R-CONCUR-POINTS-01`

## 9-Observability

- 乐观锁冲突重试需记录 warning 日志。
- Rule ID: `R-LOG-POINTS-01`

## 10-TestMapping

| Rule ID          | 测试文件                                                      | 用例                        |
| ---------------- | ------------------------------------------------------------- | --------------------------- |
| R-FLOW-POINTS-01 | `src/module/marketing/points/account/account.service.spec.ts` | 冻结积分成功                |
| R-FLOW-POINTS-02 | `src/module/marketing/points/account/account.service.spec.ts` | 解冻积分成功                |
| R-PRE-POINTS-02  | `src/module/marketing/points/account/account.service.spec.ts` | 冻结时余额不足              |
| R-PRE-POINTS-03  | `src/module/marketing/points/account/account.service.spec.ts` | 解冻时冻结余额不足          |
| R-FLOW-TASK-01   | `src/module/marketing/points/task/task.service.spec.ts`       | completeTask 成功发放并记录 |
