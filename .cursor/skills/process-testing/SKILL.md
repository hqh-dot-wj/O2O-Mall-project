---
name: process-testing
description: >
  Write backend tests driven by Process Spec and Rule ID.
  Trigger: user asks to write tests for Service/Repository; testing state
  transitions, amounts, concurrency, or business rules in apps/backend.
---

# Process Spec 驱动测试

每个业务操作编写 Process Spec，为每条规则分配 Rule ID，每个 Rule ID 至少映射一条测试用例。与 `backend-p2c` 协同：EndpointSpec 的 scenario.ruleId 必须在测试中有对应用例。

## Instructions

1. **列出 ruleId**：从 EndpointSpec/Process Spec 或 Service 逻辑中提取所有 ruleId。
2. **映射测试**：每个 ruleId 至少 1 条 `it(...)`；命名用 Given/When/Then 格式。
3. **标注 ruleId**：测试用例上方注释 `// R-XXX-YYY-NNN`，便于追溯。
4. **Mock 依赖**：Repository、外部 Service 用 `useValue: mockXxx` 注入；幂等/状态逻辑优先单测。
5. **断言具体**：避免 `toBeTruthy`；断言返回值、状态变化、调用次数。

Rule ID 格式：`R-{CATEGORY}-{DOMAIN}-{SEQ}`。Service 方法前缀：`validate*`（输入）、`check*`（前置）、`do*`（主干）、`apply*Rules`（分支）、`transition*State`（状态机）。

## Example

**Process Spec 片段**（freezePoints 规则）：

```yaml
R-PRE-POINTS-01: Given 积分账户不存在, When freezePoints, Then 抛出业务异常
R-PRE-POINTS-02: Given 可用积分不足, When freezePoints, Then 抛出业务异常
R-FLOW-POINTS-01: Given 账户可用积分充足, When freezePoints, Then 乐观锁更新并生成交易记录
```

**测试代码**：

```ts
describe('deductPoints', () => {
  // R-PRE-POINTS-01
  it('Given 积分账户不存在, When freezePoints, Then 抛出业务异常', async () => {
    mockAccountRepo.findByMemberId.mockResolvedValue(null);
    await expect(service.freezePoints('m1', 10)).rejects.toThrow(BusinessException);
    expect(mockAccountRepo.updateWithOptimisticLock).not.toHaveBeenCalled();
  });

  // R-PRE-POINTS-02
  it('Given 可用积分不足, When freezePoints, Then 抛出业务异常', async () => {
    mockAccountRepo.findByMemberId.mockResolvedValue({ availablePoints: 5 });
    await expect(service.freezePoints('m1', 10)).rejects.toThrow(BusinessException);
  });

  // R-FLOW-POINTS-01
  it('Given 账户可用积分充足, When freezePoints, Then 乐观锁更新并生成交易记录', async () => {
    mockAccountRepo.findByMemberId.mockResolvedValue({ availablePoints: 100, version: 1 });
    mockAccountRepo.updateWithOptimisticLock.mockResolvedValue({ availablePoints: 90, frozenPoints: 10 });
    const result = await service.freezePoints('m1', 10);
    expect(mockAccountRepo.updateWithOptimisticLock).toHaveBeenCalledWith(
      expect.objectContaining({ availablePoints: 90, frozenPoints: 10 }),
    );
    expect(mockTransactionRepo.create).toHaveBeenCalled();
  });
});
```

## Validation

- [ ] 每个 ruleId 至少 1 条测试
- [ ] 测试命名含 Given/When/Then 或等价语义
- [ ] 用例上方有 `// R-XXX-YYY-NNN` 注释
- [ ] 断言具体（非 toBeTruthy）
- [ ] `pnpm --filter @apps/backend test -- {module}` 通过
