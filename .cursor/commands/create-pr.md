# 创建 PR

根据当前变更生成 PR 描述，遵循项目规范。

## 执行步骤

1. **分析变更**：查看 `git status`、`git diff`，识别影响的模块与类型。

2. **确定 scope**：

   - `backend`：apps/backend
   - `admin-web`：apps/admin-web
   - `miniapp-client`：apps/miniapp-client
   - `libs`：libs/\*
   - `common-types`：libs/common-types

3. **生成 PR 标题**：`<type>(<scope>): <简短描述>`，description 使用中文。

4. **生成 PR 描述**，包含：
   - **变更说明**：做了什么、为什么
   - **影响范围**：涉及的应用/模块
   - **测试情况**：是否补充测试、是否运行通过
   - **检查项**：`verify-monorepo`、`lint`、`typecheck`、`test` 是否通过

## Commit Message 规范（参考）

| type     | 说明     |
| -------- | -------- |
| feat     | 新功能   |
| fix      | 修复 Bug |
| docs     | 文档     |
| refactor | 重构     |
| test     | 测试     |
| chore    | 杂项     |

Scope 示例：`backend`、`admin-web`、`miniapp-client`、`libs`。

## 输出格式

```markdown
## 变更说明

（简述变更内容）

## 影响范围

- [ ] backend
- [ ] admin-web
- [ ] miniapp-client
- [ ] libs

## 测试情况

- [ ] 已补充/更新测试
- [ ] `pnpm test` 通过

## 检查项

- [ ] `pnpm verify-monorepo` 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm typecheck` 通过
```
