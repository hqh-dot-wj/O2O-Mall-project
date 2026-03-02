# 优惠券近7日趋势聚合 Process Spec

## 0-Meta

- 操作: `CouponStatisticsService.getStatisticsOverview -> getLast7DaysTrend`
- 级别: **Lite**
- 领域: `coupon`
- 调用方: `coupon/management`
- 租户类型: `TenantScoped`（超级租户可看全量）

## 2-Input

- 无显式入参（读取当前租户上下文）。
- 输出字段:
  - `trend[].date` (`YYYY-MM-DD`)
  - `trend[].distributed`（当日发放数）
  - `trend[].used`（当日核销数）

## 3-PreConditions

| 条件                           | 不满足时                   | Rule ID              |
| ------------------------------ | -------------------------- | -------------------- |
| 存在租户上下文或超级租户上下文 | 走无租户过滤查询           | R-PRE-COUPON-STAT-01 |
| 趋势查询必须为聚合查询         | 禁止回退到逐日 14 次 count | R-PRE-COUPON-STAT-02 |

## 10-TestMapping

| Rule ID                 | 测试文件                                                            | 用例                                      |
| ----------------------- | ------------------------------------------------------------------- | ----------------------------------------- |
| R-FLOW-COUPON-STAT-01   | `src/module/marketing/coupon/statistics/statistics.service.spec.ts` | 单次 `$queryRaw` 返回趋势，并完成数字映射 |
| R-BRANCH-COUPON-STAT-01 | `src/module/marketing/coupon/statistics/statistics.service.spec.ts` | 总发放为 0 时核销率为 0，趋势可为空       |
