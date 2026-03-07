---
name: commit-message
description: Generate commit messages. Use when user asks for commit message or /create-pr.
---

# Commit Message 规范

遵循 Conventional Commits，通过 `commitlint` 校验。

## 格式

```
<type>(<scope>): <description>
```

- **type**：feat、fix、docs、refactor、test、chore 等
- **scope**：backend、admin-web、miniapp-client、libs
- **description**：简短描述，**须使用中文**

## 示例

```
feat(backend): 新增订单导出接口
fix(admin-web): 修复表格分页在 Safari 下的展示异常
```

## 详细规范

见 `.cursor/rules/commit-message.mdc`。
