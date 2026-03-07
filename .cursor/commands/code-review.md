# 代码审查

执行项目规范的代码审查流程，确保变更符合 Monorepo 约定与类型安全要求。

## 执行步骤

1. **运行校验命令**（从项目根目录）：

   ```bash
   pnpm verify-monorepo
   pnpm lint
   pnpm typecheck
   ```

   若任一步骤失败，先修复再继续。

2. **审查变更内容**：

   - 内部包引用是否使用 `workspace:*`
   - 是否禁止 `any`、`as any`、`@ts-ignore`
   - API 类型是否来自 `@libs/common-types`
   - Backend 是否使用 `Result.ok` / `BusinessException.throwIf`
   - 新增/修改接口是否补充对应测试

3. **输出审查结论**：
   - 按「通过 / 需修复」给出结论
   - 需修复时列出具体项与建议

## 审查清单（快速参考）

- [ ] `pnpm verify-monorepo` 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm typecheck` 通过
- [ ] 无 `any`、`as any`、`@ts-ignore`
- [ ] 内部包使用 `workspace:*`
- [ ] 新增接口/页面有对应测试
