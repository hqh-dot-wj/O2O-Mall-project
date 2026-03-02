# 积分连续签到天数计算 Process Spec

## 0-Meta

- 操作: `PointsSigninService.checkSigninStatus -> calculateContinuousDays`
- 级别: **Lite**
- 领域: `points`
- 调用方: `client/marketing/points`
- 租户类型: `TenantScoped`

## 2-Input

- 输入: `memberId`
- 输出:
  - `hasSignedToday`
  - `continuousDays`
  - `monthSignins`
  - `lastSigninTime`

## 3-PreConditions

| 条件                                | 不满足时             | Rule ID         |
| ----------------------------------- | -------------------- | --------------- |
| 签到状态查询需基于签到交易类型      | 只统计 `EARN_SIGNIN` | R-PRE-SIGNIN-01 |
| 连续天数计算必须单次查询 + 内存计算 | 禁止逐日循环查询     | R-PRE-SIGNIN-02 |

## 10-TestMapping

| Rule ID          | 测试文件                                                    | 用例                                |
| ---------------- | ----------------------------------------------------------- | ----------------------------------- |
| R-PRE-SIGNIN-01  | `src/module/marketing/points/signin/signin.service.spec.ts` | 签到功能未启用时抛业务异常          |
| R-FLOW-SIGNIN-01 | `src/module/marketing/points/signin/signin.service.spec.ts` | 签到成功并发放积分                  |
| R-FLOW-SIGNIN-02 | `src/module/marketing/points/signin/signin.service.spec.ts` | 连续3天签到通过单次查询计算连续天数 |
