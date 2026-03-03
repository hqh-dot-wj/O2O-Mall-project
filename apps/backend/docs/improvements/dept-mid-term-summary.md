# 部门管理模块中期任务完成总结

> 完成时间：2026-03-03
> 任务来源：apps/backend/docs/tasks/dept-task-list.md

## 已完成任务

| 任务 | 描述               | 完成情况 |
| ---- | ------------------ | -------- |
| T-5  | 实现部门移动功能   | ✅       |
| T-6  | 实现部门人员统计   | ✅       |
| T-7  | 实现负责人变更历史 | ✅       |

## 新增功能

### T-5: 部门移动功能

- 新增 `MoveDeptDto`：`deptId` + `newParentId`
- 新增 `DeptService.move()` 方法
- 新增 `PUT /system/dept/move` 接口
- 校验：不能移动到自己、不能移动到子部门、目标父部门必须存在
- 自动更新 ancestors 和子部门的 ancestors

### T-6: 部门人员统计

- 新增 `DeptService.getDeptUserStats()` 方法
- 新增 `GET /system/dept/:id/stats` 接口
- 返回：直属用户数、总用户数（含子部门）、子部门数量

### T-7: 负责人变更历史

- 新增 `SysDeptLeaderLog` 数据模型（Prisma schema）
- 新增 `QueryLeaderLogDto`：支持按部门ID、时间范围、分页查询
- 新增 `DeptService.getLeaderChangeHistory()` 方法
- 新增 `GET /system/dept/leader/history` 接口
- 修改 `update()` 方法：自动记录负责人变更

## 测试结果

```
Test Suites: 1 passed, 1 total
Tests:       38 passed, 38 total
```

新增测试用例：

- move: 5 个（正常移动、同父部门、移动到自己、移动到子部门、部门不存在）
- getDeptUserStats: 3 个（正常统计、部门不存在、无子部门）
- getLeaderChangeHistory: 2 个（分页查询、按部门ID过滤）

## 数据模型变更

新增 `SysDeptLeaderLog` 表：

```prisma
model SysDeptLeaderLog {
  id         Int      @id @default(autoincrement())
  tenantId   String   @map("tenant_id") @db.VarChar(20)
  deptId     Int      @map("dept_id")
  deptName   String   @map("dept_name") @db.VarChar(30)
  oldLeader  String?  @map("old_leader") @db.VarChar(20)
  newLeader  String?  @map("new_leader") @db.VarChar(20)
  operator   String   @db.VarChar(64)
  createTime DateTime @default(now()) @map("create_time")
  @@map("sys_dept_leader_log")
}
```

## 上线后监控项

- 部门移动操作的成功率
- 负责人变更记录的完整性
- 部门统计接口的响应时间（涉及子部门递归查询）

## 遗留任务

长期任务待后续迭代：

- T-8: 实现部门合并功能 (5d)
- T-9: 实现层级深度限制 (1d)
