# 0. Meta

- Domain: infra-cache
- Action: cache-interceptor
- Level: Full
- Service: `MarketingCacheInterceptor`

# 1. Why

为 `@Cacheable` 与 `@CacheEvict` 提供真实缓存行为，消除“仅元数据不生效”问题，提升高频读场景性能并保证写后缓存一致性。

# 2. Input

- Handler metadata:
  - `cache:key`
  - `cache:ttl`
  - `cache:evict`
- Runtime input:
  - `ExecutionContext.getArgs()`
  - `TenantContext.getTenantId()`

# 3. PreConditions

- `R-PRE-CACHE-01`: 未配置任何缓存元数据时，拦截器应透明放行。
- `R-PRE-CACHE-02`: `cache:evict` 仅在业务方法成功后触发。

# 4. HappyPath

- `R-FLOW-CACHE-01`: 无缓存元数据时直接执行原方法。
- `R-FLOW-CACHE-02`: 命中缓存时直接返回缓存结果，不执行原方法。
- `R-FLOW-CACHE-03`: 未命中缓存时执行原方法并回写缓存。
- `R-FLOW-CACHE-04`: 写操作成功后按前缀删除对应缓存。

# 5. BranchRules

- `R-BRANCH-CACHE-01`: Redis 读写异常不阻断主流程，仅记录告警日志。

# 6. StateMachine

- N/A（本流程不涉及业务状态机）。

# 7. ExceptionStrategy

- 读缓存失败：降级为直接执行原方法。
- 写缓存失败：忽略缓存错误，返回业务结果。
- 清理缓存失败：忽略缓存错误，返回业务结果。

# 8. Idempotency

- `R-CONCUR-CACHE-01`: 缓存键由租户 + 处理器 + 参数哈希构成，避免跨租户和参数冲突。

# 9. Observability

- `R-LOG-CACHE-01`: Redis 操作异常统一记录 warn 日志，附带错误信息与 key/pattern。

# 10. TestMapping

| Rule ID         | 测试类型 | Given          | When      | Then                         |
| --------------- | -------- | -------------- | --------- | ---------------------------- |
| R-FLOW-CACHE-01 | 单元     | 无缓存元数据   | intercept | 直接执行原逻辑               |
| R-FLOW-CACHE-02 | 单元     | 缓存命中       | intercept | 返回缓存结果且不执行业务方法 |
| R-FLOW-CACHE-03 | 单元     | 缓存未命中     | intercept | 执行业务并写入缓存           |
| R-FLOW-CACHE-04 | 单元     | 存在清理元数据 | intercept | 成功后删除匹配缓存           |
