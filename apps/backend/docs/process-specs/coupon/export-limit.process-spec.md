# 优惠券导出数量限制 Process Spec

## 0-Meta

- 操作: `CouponStatisticsService.exportUsageRecords`
- 级别: **Lite**
- 领域: `coupon`
- 调用方: `coupon/management`
- 租户类型: `TenantScoped`

## 2-Input

- 输入筛选条件:
  - `memberId`
  - `templateId`
  - `startTime`
  - `endTime`
- 输出: xlsx 文件流

## 3-PreConditions

| 条件                  | 不满足时       | Rule ID                |
| --------------------- | -------------- | ---------------------- |
| 导出前必须先统计总量  | `count(where)` | R-PRE-COUPON-EXPORT-01 |
| 同步导出最大 10000 条 | 超限抛业务异常 | R-PRE-COUPON-EXPORT-02 |

## 10-TestMapping

| Rule ID                 | 测试文件                                                            | 用例                                |
| ----------------------- | ------------------------------------------------------------------- | ----------------------------------- |
| R-BRANCH-COUPON-STAT-02 | `src/module/marketing/coupon/statistics/statistics.service.spec.ts` | 导出记录超 10000 抛异常且不执行查询 |
