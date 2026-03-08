---
name: commit-message
description: >
  Generate Conventional Commits messages for changes.
  Trigger: user asks for commit message, /create-pr, or to describe
  git changes in conventional format.
---

# Commit Message 规范

遵循 Conventional Commits，通过 `commitlint` 校验。

## Instructions

1. **识别 scope**：从改动文件推断 — `apps/backend/**` → backend；`apps/admin-web/**` → admin-web；`apps/miniapp-client/**` → miniapp-client；`libs/**` → libs。
2. **选择 type**：feat（新功能）、fix（修复）、docs（文档）、refactor（重构）、test（测试）、chore（构建/工具）。
3. **撰写 description**：简短描述变更，**须使用中文**；首字母小写，句尾无标点。

## 格式

```
<type>(<scope>): <description>
```

- **type**：feat、fix、docs、refactor、test、chore
- **scope**：backend、admin-web、miniapp-client、libs
- **description**：简短描述，**中文**

## Example

```
feat(backend): 新增订单导出接口
fix(admin-web): 修复表格分页在 Safari 下展示异常
docs(libs): 更新 common-types 接口说明
```

## Validation

- [ ] type 符合 Conventional Commits
- [ ] scope 与改动文件对应
- [ ] description 使用中文
