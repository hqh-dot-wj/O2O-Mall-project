# 优惠券手动发放批量上限 Process Spec

## 0-Meta

- 操作: `CouponDistributionService.distributeManually`
- 级别: **Lite**
- 领域: `coupon`
- 调用方: `coupon/distribution`
- 租户类型: `TenantScoped`

## 2-Input

- 输入:
  - `templateId`
  - `memberIds[]`
- 输出:
  - 批量发放结果列表

## 3-PreConditions

| 条件                 | 不满足时         | Rule ID              |
| -------------------- | ---------------- | -------------------- |
| `memberIds` 最大 500 | 抛业务异常       | R-PRE-COUPON-DIST-01 |
| DTO 校验同样限制 500 | 请求参数校验失败 | R-IN-COUPON-DIST-01  |

## 10-TestMapping

| Rule ID              | 测试文件                                                                | 用例                          |
| -------------------- | ----------------------------------------------------------------------- | ----------------------------- |
| R-PRE-COUPON-DIST-01 | `src/module/marketing/coupon/distribution/distribution.service.spec.ts` | 超过 500 人时抛异常且不查模板 |
