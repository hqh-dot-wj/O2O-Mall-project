# 积分任务完成记录查询 Process Spec

## 0-Meta

- 操作: `PointsTaskService.getUserCompletions`
- 级别: **Lite**
- 领域: `points`
- 调用方: `client/marketing/points`
- 租户类型: `TenantScoped`

## 2-Input

- 输入:
  - `memberId`
  - `pageNum`
  - `pageSize`
- 输出:
  - `rows[].taskName`
  - `rows[].completionTime`
  - `rows[].pointsAwarded`

## 3-PreConditions

| 条件                             | 不满足时                     | Rule ID          |
| -------------------------------- | ---------------------------- | ---------------- |
| 完成记录任务信息查询使用批量条件 | 使用 `WHERE IN` 一次查询任务 | R-PRE-TASK-02    |
| 任务信息缺失时可降级展示         | `taskName` 回退为“未知任务”  | R-BRANCH-TASK-01 |

## 10-TestMapping

| Rule ID          | 测试文件                                                | 用例                                 |
| ---------------- | ------------------------------------------------------- | ------------------------------------ |
| R-FLOW-TASK-02   | `src/module/marketing/points/task/task.service.spec.ts` | 多条完成记录通过批量任务查询组装返回 |
| R-BRANCH-TASK-01 | `src/module/marketing/points/task/task.service.spec.ts` | 任务信息缺失回退“未知任务”           |
