# 积分事件驱动 Process Spec

## 0-Meta

- 操作集合: `addPoints` / `deductPoints` / `processExpiredPoints`
- 级别: **Lite**
- 领域: `points`
- 调用方: `account` / `scheduler`
- 租户类型: `TenantScoped`

## 2-Input

- 获取事件输入: `memberId`、`amount`、`type`、`relatedId`
- 使用事件输入: `memberId`、`amount`、`type`、`relatedId`
- 过期事件输入: 过期原交易记录（`transactionId`、`memberId`、`amount`）

## 3-PreConditions

| 条件                                     | 不满足时                 | Rule ID              |
| ---------------------------------------- | ------------------------ | -------------------- |
| 增加积分成功后发送 `points.earned` 事件  | 仅记录日志，不影响主流程 | R-FLOW-POINTS-EVT-01 |
| 扣减积分成功后发送 `points.used` 事件    | 仅记录日志，不影响主流程 | R-FLOW-POINTS-EVT-02 |
| 过期扣减成功后发送 `points.expired` 事件 | 仅记录日志，不影响主流程 | R-FLOW-POINTS-EVT-03 |

## 10-TestMapping

| Rule ID              | 测试文件                                                          | 用例                                  |
| -------------------- | ----------------------------------------------------------------- | ------------------------------------- |
| R-FLOW-POINTS-EVT-01 | `src/module/marketing/points/account/account.service.spec.ts`     | addPoints 成功后发送 `POINTS_EARNED`  |
| R-FLOW-POINTS-EVT-02 | `src/module/marketing/points/account/account.service.spec.ts`     | deductPoints 成功后发送 `POINTS_USED` |
| R-FLOW-POINTS-EVT-03 | `src/module/marketing/points/scheduler/scheduler.service.spec.ts` | 过期处理成功后发送 `POINTS_EXPIRED`   |
