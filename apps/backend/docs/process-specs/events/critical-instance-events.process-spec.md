# 0. Meta

- Domain: events
- Action: critical-instance-events
- Level: Full
- Service: `MarketingEventListener`

# 1. Why

为 `INSTANCE_SUCCESS / INSTANCE_FAILED / INSTANCE_TIMEOUT` 提供可执行的消费逻辑，确保关键实例事件不再是“仅日志无消费者”，并形成可观测统计基础。

# 2. Input

- Event type: `instance.success` / `instance.failed` / `instance.timeout`
- Event payload: `instanceId`, `configId`, `memberId`, `timestamp`, optional `tenantId`

# 3. PreConditions

- `R-PRE-EVENT-01`: 监听器通过 `@OnEvent` 订阅对应事件类型。
- `R-PRE-EVENT-02`: 事件时间戳可序列化为日期分区键。

# 4. HappyPath

- `R-FLOW-EVENT-01`: 监听器可正常注入并运行。
- `R-FLOW-EVENT-02`: `INSTANCE_SUCCESS` 事件写入 Redis 统计与最近事件列表。
- `R-FLOW-EVENT-03`: `INSTANCE_FAILED` 事件写入 Redis 统计与最近事件列表。
- `R-FLOW-EVENT-04`: `INSTANCE_TIMEOUT` 事件写入 Redis 统计与最近事件列表。

# 5. BranchRules

- `R-BRANCH-EVENT-01`: 事件未携带 `tenantId` 时，使用默认租户 `000000`。
- `R-BRANCH-EVENT-02`: Redis 写入异常时记录错误日志，不中断监听流程。

# 6. StateMachine

- N/A（事件消费不直接驱动实例状态迁移）。

# 7. ExceptionStrategy

- 监听器内部捕获所有异常并记录日志，避免影响事件总线其他监听器。

# 8. Idempotency

- `R-CONCUR-EVENT-01`: 统计键使用 `tenantId + date + eventType` 分区，支持重复事件可累积统计。

# 9. Observability

- `R-LOG-EVENT-01`: 关键事件处理失败记录 `instanceId + error`，便于回溯。

# 10. TestMapping

| Rule ID           | 测试类型 | Given            | When                  | Then               |
| ----------------- | -------- | ---------------- | --------------------- | ------------------ |
| R-FLOW-EVENT-01   | 单元     | 监听器依赖已注入 | 初始化                | 监听器实例可用     |
| R-FLOW-EVENT-02   | 单元     | SUCCESS 事件     | handleInstanceSuccess | 写入 success 统计  |
| R-FLOW-EVENT-03   | 单元     | FAILED 事件      | handleInstanceFailed  | 写入 failed 统计   |
| R-FLOW-EVENT-04   | 单元     | TIMEOUT 事件     | handleInstanceTimeout | 写入 timeout 统计  |
| R-BRANCH-EVENT-01 | 单元     | tenantId 缺失    | handleInstanceSuccess | 使用默认租户统计   |
| R-BRANCH-EVENT-02 | 单元     | Redis 异常       | handleInstanceSuccess | 不抛异常并记录错误 |
