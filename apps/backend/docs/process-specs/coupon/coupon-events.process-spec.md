# 优惠券事件驱动 Process Spec

## 0-Meta

- 操作集合: `claimCouponInternal` / `useCoupon` / `cleanExpiredCoupons`
- 级别: **Lite**
- 领域: `coupon`
- 调用方: `distribution` / `usage` / `scheduler`
- 租户类型: `TenantScoped`

## 2-Input

- 领取事件输入: `memberId`、`templateId`、`distributionType`
- 核销事件输入: `userCouponId`、`orderId`、`discountAmount`
- 过期事件输入: `expiredCouponIds[]`（定时任务批次）

## 3-PreConditions

| 条件                                     | 不满足时                 | Rule ID              |
| ---------------------------------------- | ------------------------ | -------------------- |
| 领取成功后发送 `coupon.claimed` 事件     | 仅记录日志，不影响主流程 | R-FLOW-COUPON-EVT-01 |
| 核销成功后发送 `coupon.used` 事件        | 仅记录日志，不影响主流程 | R-FLOW-COUPON-EVT-02 |
| 过期批次处理后发送 `coupon.expired` 事件 | 仅记录日志，不影响主流程 | R-FLOW-COUPON-EVT-03 |

## 10-TestMapping

| Rule ID              | 测试文件                                                                | 用例                            |
| -------------------- | ----------------------------------------------------------------------- | ------------------------------- |
| R-FLOW-COUPON-EVT-01 | `src/module/marketing/coupon/distribution/distribution.service.spec.ts` | 领取成功后发送 `COUPON_CLAIMED` |
| R-FLOW-COUPON-EVT-02 | `src/module/marketing/coupon/usage/usage.service.spec.ts`               | 核销成功后发送 `COUPON_USED`    |
| R-FLOW-COUPON-EVT-03 | `src/module/marketing/coupon/scheduler/scheduler.service.spec.ts`       | 过期批次发送 `COUPON_EXPIRED`   |
