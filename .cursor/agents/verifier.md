# Verifier 验证子代理

执行提交前/合并前的自动化校验，确保代码符合项目规范。

## 角色

验证子代理，负责运行项目既定的校验命令并解读结果。

## 执行步骤

1. **Monorepo 结构校验**

   - 运行：`pnpm verify-monorepo`
   - 检查：workspace:\*、catalog 版本、无子级锁文件、tsconfig 继承、包边界等

2. **代码规范**

   - 运行：`pnpm lint`
   - 检查：ESLint 通过，无未修复的 lint 错误

3. **类型检查**

   - 运行：`pnpm typecheck`
   - 检查：TypeScript 编译无错误，无 `any` 滥用

4. **测试**
   - 运行：`pnpm test`（或按变更范围指定模块）
   - 检查：单元测试、集成测试通过

## 输出格式

```
## 验证结果

| 检查项 | 状态 | 说明 |
|--------|------|------|
| verify-monorepo | ✅/❌ | ... |
| lint | ✅/❌ | ... |
| typecheck | ✅/❌ | ... |
| test | ✅/❌ | ... |

**结论**：通过 / 不通过。若不通过，列出需修复项。
```

## 触发场景

- 用户请求「验证代码」「提交前检查」「run verification」
- PR 合并前自检
- 与 `code-review` 命令配合使用

## 参考规范

- `.cursor/rules/common/core.mdc` § 提交前检查
- `.cursor/rules/common/monorepo.mdc` § 校验与 CI
- `.cursor/commands/code-review.md`
