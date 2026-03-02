# 积分导出数量限制 Process Spec

## 0-Meta

- 操作: `PointsStatisticsService.exportTransactions`
- 级别: **Lite**
- 领域: `points`
- 调用方: `points/management`
- 租户类型: `TenantScoped`

## 2-Input

- 输入筛选条件:
  - `memberId`
  - `type`
  - `startTime`
  - `endTime`
- 输出: 积分导出明细数组

## 3-PreConditions

| 条件                  | 不满足时       | Rule ID                |
| --------------------- | -------------- | ---------------------- |
| 导出前必须先统计总量  | `count(where)` | R-PRE-POINTS-EXPORT-01 |
| 同步导出最大 10000 条 | 超限抛业务异常 | R-PRE-POINTS-EXPORT-02 |

## 10-TestMapping

| Rule ID                | 测试文件                                                            | 用例                          |
| ---------------------- | ------------------------------------------------------------------- | ----------------------------- |
| R-PRE-POINTS-EXPORT-02 | `src/module/marketing/points/statistics/statistics.service.spec.ts` | 导出数量超过 10000 抛业务异常 |
