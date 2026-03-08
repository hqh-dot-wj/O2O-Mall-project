# Cursor Rules 文档

本目录包含项目的 Cursor AI 规则（`.mdc` 文件），用于在编写代码或文档时提供持久化指导。

## 规则清单（与实际结构一致）

### 始终应用（alwaysApply）

| 规则文件              | 说明                                                             |
| --------------------- | ---------------------------------------------------------------- |
| `common/core.mdc`     | 核心开发原则（类型安全、响应异常、复杂度控制、提交前检查）       |
| `common/monorepo.mdc` | Monorepo 规范（结构、依赖、Turbo、共享层、CI 门禁、AI 协作纪律） |

### 按路径触发（globs）

| 规则文件                      | 说明                                    | 触发路径                                                      |
| ----------------------------- | --------------------------------------- | ------------------------------------------------------------- |
| `backend.mdc`                 | NestJS 后端开发规范                     | `apps/backend/**/*.ts`                                        |
| `backend/nestjs.mdc`          | NestJS 补充（引用 backend.mdc）         | `apps/backend/**`                                             |
| `admin-web.mdc`               | Admin-Web 前端规范                      | `apps/admin-web/**`                                           |
| `admin-web/vue.mdc`           | Vue 补充（引用 admin-web.mdc）          | `apps/admin-web/**`                                           |
| `miniapp-client.mdc`          | miniapp-client 规范                     | `apps/miniapp-client/**`                                      |
| `miniapp/uniapp.mdc`          | uniapp 补充                             | `apps/miniapp-client/**`                                      |
| `miniapp-ui-spec.mdc`         | 小程序 UI/UX 规范（Design Token、组件） | `apps/miniapp-client/**`                                      |
| `testing.mdc`                 | 测试规范（命名、目录、覆盖率、PR 门禁） | `**/*.spec.*`、`**/test/**`、`**/e2e/**`                      |
| `notion-workspace.mdc`        | Notion 工作区规范                       | `**/*notion*.md`                                              |
| `architecture-meta-model.mdc` | 架构决策元模型                          | `docs/design/**`、`docs/requirements/**`、`**/*.module.ts` 等 |
| `architecture-playbook.mdc`   | 项目相态与信号                          | 架构相关                                                      |
| `architecture-checklist.mdc`  | PR 决策模板                             | 架构相关                                                      |
| `common/security.mdc`         | 安全规范                                | 按需引用                                                      |

### 已迁出至 Skills

| 原规则          | 现位置                                    |
| --------------- | ----------------------------------------- |
| documentation   | `.cursor/skills/documentation/SKILL.md`   |
| process-testing | `.cursor/skills/process-testing/SKILL.md` |
| backend-p2c     | `.cursor/skills/backend-p2c/SKILL.md`     |
| miniapp-p2c     | `.cursor/skills/miniapp-p2c/SKILL.md`     |
| miniapp-d2c     | `.cursor/skills/miniapp-d2c/SKILL.md`     |
| commit-message  | `.cursor/skills/commit-message/SKILL.md`  |

### 未创建（README 中曾列出）

- `windows-dev.mdc`：Windows 开发环境命令规范
- `task-execution-workflow.mdc`：任务执行工作流（流程已并入 task-execution Skill）
- `todo2.mdc`、`todo2-overview.mdc`：Todo2 工作流

## 目录结构

```
.cursor/rules/
├── common/
│   ├── core.mdc          # 核心原则（始终应用）
│   ├── monorepo.mdc      # Monorepo（始终应用）
│   └── security.mdc      # 安全规范
├── backend.mdc
├── backend/
│   └── nestjs.mdc
├── admin-web.mdc
├── admin-web/
│   └── vue.mdc
├── miniapp-client.mdc
├── miniapp/
│   └── uniapp.mdc
├── miniapp-ui-spec.mdc
├── testing.mdc
├── notion-workspace.mdc
├── architecture-meta-model.mdc
├── architecture-playbook.mdc
└── architecture-checklist.mdc
```

## 更新规则

当规范有变更时，应同步更新对应的 `.cursor/rules/*.mdc` 或 `.cursor/skills/*/SKILL.md`。

**最后更新**：2026-03-07（规则清单与实际结构对齐）
