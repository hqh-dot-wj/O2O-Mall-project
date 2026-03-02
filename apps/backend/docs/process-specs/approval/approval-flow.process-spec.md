# 0. Meta

- Domain: approval
- Action: approval-flow
- Level: Full
- Service: `ApprovalService`

# 1. Why

为营销配置提供可审计的审批流，确保“提交-审批-驳回-重提”状态流转可追踪，并为上线门禁提供统一依据。

# 2. Input

- `submitApproval(dto: SubmitApprovalDto)`
- `approve(dto: ApprovalActionDto)`
- `reject(dto: ApprovalActionDto)`
- `getApprovalStatus(configId: string)`
- `canPublish(configId: string)`

# 3. PreConditions

- `R-PRE-APPROVAL-01`: 已通过状态不可再次提交审批。
- `R-PRE-APPROVAL-02`: 仅 `PENDING` 状态允许驳回。
- `R-PRE-APPROVAL-03`: 配置必须存在且未删除。

# 4. HappyPath

- `R-FLOW-APPROVAL-01`: 服务可正常初始化并提供审批能力。
- `R-FLOW-APPROVAL-02`: `DRAFT/REJECTED -> PENDING`，写入提交人、提交时间。
- `R-FLOW-APPROVAL-03`: `PENDING -> APPROVED`，写入审批人、审批时间，保留提交信息。

# 5. BranchRules

- `R-BRANCH-APPROVAL-01`: `canPublish` 仅在 `APPROVED` 时返回 `true`，其余状态返回 `false`。

# 6. StateMachine

- 合法流转：
  - `DRAFT -> PENDING`
  - `PENDING -> APPROVED`
  - `PENDING -> REJECTED`
  - `REJECTED -> PENDING`
- 非法流转：其余全部组合。

# 7. ExceptionStrategy

- `R-IN-APPROVAL-01`: 驳回必须提供非空原因。
- `R-PRE-APPROVAL-03`: 配置不存在时抛出业务异常。

# 8. Idempotency

- `R-CONCUR-APPROVAL-01`: 同一状态重复操作依赖状态机校验拦截（如 `APPROVED` 再次提交）。

# 9. Observability

- `R-LOG-APPROVAL-01`: 记录提交、通过、驳回日志，包含 `configId` 与操作者信息。

# 10. TestMapping

| Rule ID              | 测试类型 | Given                | When              | Then                |
| -------------------- | -------- | -------------------- | ----------------- | ------------------- |
| R-FLOW-APPROVAL-01   | 单元     | 服务初始化           | 获取实例          | 实例可用            |
| R-FLOW-APPROVAL-02   | 单元     | 配置处于 DRAFT       | submitApproval    | 状态写入为 PENDING  |
| R-PRE-APPROVAL-01    | 单元     | 配置处于 APPROVED    | submitApproval    | 返回非法流转错误    |
| R-FLOW-APPROVAL-03   | 单元     | 配置处于 PENDING     | approve           | 状态写入为 APPROVED |
| R-IN-APPROVAL-01     | 单元     | 驳回原因为空白       | reject            | 返回参数错误        |
| R-PRE-APPROVAL-02    | 单元     | 配置处于 DRAFT       | reject            | 返回非法流转错误    |
| R-RESP-APPROVAL-01   | 单元     | 配置无 approval 字段 | getApprovalStatus | 返回 DRAFT          |
| R-BRANCH-APPROVAL-01 | 单元     | 配置处于 APPROVED    | canPublish        | 返回 true           |
