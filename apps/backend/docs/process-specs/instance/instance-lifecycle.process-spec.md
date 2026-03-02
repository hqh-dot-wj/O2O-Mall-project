# 实例创建与状态流转 Process Spec

## 0-Meta

- 操作集合: `create` / `transitStatus` / `batchTransitStatus`
- 级别: **Full**
- 领域: `instance`
- 调用方: `admin` / `client`（由上层 Controller 路由决定）
- 租户类型: `TenantScoped`

## 1-Why

- 目标是保证营销实例在**库存、状态机、幂等、并发**四个维度的一致性。
- STRONG_LOCK 场景必须避免“库存已扣但实例未创建”与“终态重复回补”。

## 2-Input

- `create(dto)`
  - `dto.configId: string`（必填）
  - `dto.memberId: string`（必填）
  - `dto.instanceData.quantity?: number`（可选，默认 1）
- `transitStatus(id, nextStatus, extraData?)`
  - `id: string`（必填）
  - `nextStatus: PlayInstanceStatus`（必填）
- `batchTransitStatus(ids, nextStatus, extraData?)`
  - `ids: string[]`（必填，非空）
  - `nextStatus: PlayInstanceStatus`（必填）

## 3-PreConditions

| 条件                     | 不满足时                       | Rule ID           |
| ------------------------ | ------------------------------ | ----------------- |
| 活动配置存在             | 抛业务异常“活动配置不存在”     | R-PRE-INSTANCE-01 |
| 用户在灰度范围内         | 抛业务异常“该活动暂未对您开放” | R-PRE-INSTANCE-02 |
| 批量流转 ID 全部有效     | 直接中止批量操作               | R-PRE-INSTANCE-03 |
| 批量流转每条都满足状态机 | 直接中止批量操作               | R-PRE-INSTANCE-04 |

## 4-HappyPath

| 步骤                                      | 说明               | Rule ID            |
| ----------------------------------------- | ------------------ | ------------------ |
| create 前检查参与幂等缓存                 | 避免重复创建       | R-FLOW-INSTANCE-01 |
| STRONG_LOCK 预扣库存                      | 创建前完成库存锁定 | R-FLOW-INSTANCE-02 |
| 创建实例并记录 stockLocked 元数据         | 便于终态回补判定   | R-FLOW-INSTANCE-03 |
| transitStatus 单实例流转                  | 锁 + 状态机 + 事件 | R-FLOW-INSTANCE-04 |
| batchTransitStatus 逐条复用 transitStatus | 统一行为与副作用   | R-FLOW-INSTANCE-05 |

## 5-BranchRules

| 分支                                 | 行为                                | Rule ID              |
| ------------------------------------ | ----------------------------------- | -------------------- |
| 预扣成功但创建失败                   | 自动回补库存                        | R-BRANCH-INSTANCE-01 |
| 终态流转且 stockLocked=true 且未回补 | 回补库存并设置 `stockReleased=true` | R-BRANCH-INSTANCE-02 |
| 终态再次流转                         | 不得重复回补库存                    | R-BRANCH-INSTANCE-03 |

## 6-StateMachine

| 当前状态      | 目标状态  | 允许性 | Rule ID             |
| ------------- | --------- | ------ | ------------------- |
| `PENDING_PAY` | `TIMEOUT` | 允许   | R-STATE-INSTANCE-01 |
| `PAID`        | `SUCCESS` | 允许   | R-STATE-INSTANCE-02 |
| `TIMEOUT`     | `SUCCESS` | 不允许 | R-STATE-INSTANCE-03 |

## 7-ExceptionStrategy

- 状态机不合法一律抛业务异常并中止：`R-STATE-INSTANCE-03`
- 批量流转中任一实例不合法，全批次中止：`R-PRE-INSTANCE-04`

## 8-Idempotency

- 参与创建: `checkJoinIdempotency/cacheJoinResult`。
- 状态流转: `withStateLock`。
- Rule ID:
  - `R-CONCUR-INSTANCE-01`（创建幂等）
  - `R-CONCUR-INSTANCE-02`（状态流转分布式锁）

## 9-Observability

- 关键节点必须有日志：
  - 预扣库存失败/回补失败
  - 非法状态流转
  - 重复事件忽略
- Rule ID: `R-LOG-INSTANCE-01`

## 10-TestMapping

| Rule ID              | 测试文件                                                 | 用例                       |
| -------------------- | -------------------------------------------------------- | -------------------------- |
| R-FLOW-INSTANCE-02   | `src/module/marketing/instance/instance.service.spec.ts` | STRONG_LOCK 参与时预扣库存 |
| R-BRANCH-INSTANCE-01 | `src/module/marketing/instance/instance.service.spec.ts` | 预扣后创建失败自动回补     |
| R-BRANCH-INSTANCE-02 | `src/module/marketing/instance/instance.service.spec.ts` | 终态流转回补并打标         |
| R-PRE-INSTANCE-04    | `src/module/marketing/instance/instance.service.spec.ts` | 批量流转非法状态拒绝       |
| R-FLOW-INSTANCE-05   | `src/module/marketing/instance/instance.service.spec.ts` | 批量合法流转逐条复用       |
