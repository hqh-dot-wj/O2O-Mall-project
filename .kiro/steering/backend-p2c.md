---
inclusion: fileMatch
fileMatchPattern: '{apps/backend/**/*.ts,apps/backend/docs/**/*.md}'
---

# P2C 后端需求到代码生成规则

当根据 PRD 生成后端代码时，**先将需求结构化为接口规约，再按规约生成代码**。
核心理念：**穷举每个分支，禁止模糊；每条规则有 Rule ID，每个 Rule ID 有测试**。

## 1. P2C 工作流（四步）

### 第一步：PRD → 结构化规约

将自然语言 PRD 解析为 JSON 结构（EndpointSpec）：

1. 识别模块和实体
2. 提取接口列表
3. 穷举正常场景（Given/When/Then）
4. 穷举错误场景
5. 分配 Rule ID：`R-{CATEGORY}-{DOMAIN}-{SEQ}`
6. 向用户确认

### 第二步：判断 Spec 级别

涉及状态转换、Decimal 计算、并发/锁、幂等性 → Full（10 章）；否则 → Lite（4 章）。

### 第三步：生成代码

按顺序：DTO → VO → Repository → Service → Controller → Module → Process Spec → 测试

### 第四步：完整性自检

逐条核对 Rule ID 是否都有代码实现和测试覆盖。

## 2. 规约到代码的映射规则

- scenarios → Service 方法分解（validate/check/do/apply）
- errorCases → `BusinessException.throwIf`
- stateTransitions → 状态机方法
- scenarios → 测试用例（Given/When/Then 命名）

## 3. 接口类型自动判断

| caller | tenantType   | Controller 位置           | 守卫                    |
| ------ | ------------ | ------------------------- | ----------------------- |
| client | TenantScoped | `module/client/{domain}/` | `MemberAuthGuard`       |
| admin  | TenantScoped | `module/admin/{domain}/`  | Bearer                  |
| admin  | PlatformOnly | `module/admin/{domain}/`  | Bearer + `@RequireRole` |

## 4. 质量检查清单

- [ ] PRD 中每个"如果/当/否则/异常"都映射为 scenario 或 errorCase
- [ ] 每个 scenario 和 errorCase 都有 Rule ID
- [ ] Service 方法按 validate/check/do/apply 分解
- [ ] 每个 Rule ID 在测试文件中有至少 1 条用例
- [ ] 测试命名使用 Given/When/Then 格式
- [ ] DTO 字段有完整的校验装饰器
- [ ] 错误信息与 PRD 原文一致

## 5. 禁止事项

- 禁止跳过结构化直接写代码
- 禁止编造 errorCase 的错误信息
- 禁止省略 Rule ID
- 禁止写 `should work correctly` 这类模糊测试名
- 禁止在 Service 主方法中堆砌所有逻辑
