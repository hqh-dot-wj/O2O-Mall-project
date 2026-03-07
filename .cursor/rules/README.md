# Cursor Rules 文档

本目录包含项目的 Cursor AI 规则（`.mdc` 文件），用于在编写代码或文档时提供持久化指导。规则与 `.kiro/steering` 中的规范对齐，由 steering 生成或同步。

## 规则清单

| 规则文件                      | 说明                                                                                                            | 触发方式                                                                                                                           | 来源                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `core-principles.mdc`         | 核心开发原则（Monorepo、类型安全、响应异常、复杂度控制、提交前检查）                                            | 始终应用                                                                                                                           | `.kiro/steering/00-core-principles.md`      |
| documentation Skill           | 需求文档与设计文档规范（7 类图、11/14 章节、目录归类、缺陷分析、大模块流程）                                    | 编辑 `docs/**`、`**/docs/**`；已迁至 `.cursor/skills/documentation/`                                                               | `.kiro/steering/documentation.md`           |
| `backend.mdc`                 | NestJS 后端开发规范（响应、异常、DTO、Repository、事务、Controller、测试、性能、安全、多租户、Client 与能力域） | 编辑 `apps/backend/**/*.ts`                                                                                                        | `.kiro/steering/backend-nestjs.md`          |
| `admin-web.mdc`               | Admin-Web 前端开发规范（Vue 生态、目录结构、命名、布局、性能、CSS、TypeScript、测试）                           | 编辑 `apps/admin-web/**/*`                                                                                                         | `.kiro/steering/admin-web-frontend.md`      |
| `miniapp-client.mdc`          | miniapp-client 开发规范（uniapp、条件编译、样式、API、包体积、安全、性能）                                      | 编辑 `apps/miniapp-client/**/*`                                                                                                    | `.kiro/steering/miniapp-client.md`          |
| `monorepo.mdc`                | Monorepo 项目开发规范（结构、依赖、Turbo、共享层、类型安全、CI 门禁、AI 协作纪律）                              | 始终应用                                                                                                                           | `.kiro/steering/monorepo.md`                |
| `testing.mdc`                 | 测试规范（命名、目录、覆盖率、Mock、Fixture、类型安全 Mock、PR 门禁）                                           | 编辑 `**/*.spec.*`、`**/test/**`、`**/e2e/**`                                                                                      | `.kiro/steering/testing.md`                 |
| `windows-dev.mdc`             | Windows 开发环境命令规范（禁止 Unix 命令、PowerShell 替代、项目命令执行）                                       | 编辑 `**/*.ps1`、`**/*.bat`、`scripts/**`                                                                                          | `.kiro/steering/windows-dev-environment.md` |
| `commit-message.mdc`          | Commit Message 规范（Conventional Commits）                                                                     | 生成 commit message 时                                                                                                             | 项目约定                                    |
| `todo2.mdc`                   | Todo2 工作流（任务创建、研究、实现、评审）                                                                      | 始终应用                                                                                                                           | 项目约定                                    |
| `todo2-overview.mdc`          | Todo2 任务概览（自动生成）                                                                                      | 始终应用                                                                                                                           | 自动维护                                    |
| `notion-workspace.mdc`        | Notion 工作区规范（6 张表、字段清单、配置顺序、Relation、MCP 链接）                                             | 编辑 `**/*notion*.md`                                                                                                              | 项目约定                                    |
| `task-execution-workflow.mdc` | 任务执行工作流（架构审查、任务清单、逐个执行、测试驱动、批量总结）                                              | 编辑 `docs/**`、`apps/backend/docs/**`、`apps/admin-web/docs/**`、`apps/miniapp-client/docs/**`（tasks/requirements/improvements） | `.kiro/steering/task-execution-workflow.md` |
| `architecture-meta-model.mdc` | 架构决策元模型（相态感知、四棱镜、结构元模型、风险感知、决策模板、认知陷阱）                                    | 编辑 `docs/design/**`、`docs/requirements/**`、`**/*.module.ts`、`apps/backend/src/module/**`、`apps/*/docs/**`                    | `.kiro/steering/architecture-meta-model.md` |

## 规则与 Steering 对应关系

```
.kiro/steering/                    .cursor/rules/
├── 00-core-principles.md   ──→    core-principles.mdc
├── documentation.md        ──→    skills/documentation/（已迁出 rules）
├── documentation-workflow.md      （流程已并入 documentation.mdc）
├── backend-nestjs.md       ──→    backend.mdc
├── admin-web-frontend.md   ──→    admin-web.mdc
├── vue-best-practices.md           （admin-web.mdc 覆盖）
├── vue-ecosystem.md                （Vue 生态要点已并入 admin-web.mdc）
├── vue-router-guide.md             （admin-web.mdc 覆盖）
├── monorepo.md             ──→    monorepo.mdc
├── monorepo-tools.md               （pnpm/Turborepo 工具链要点已并入 monorepo.mdc）
├── testing.md              ──→    testing.mdc
├── testing-guide.md                （testing.mdc 覆盖）
├── miniapp-client.md        ──→    miniapp-client.mdc
├── windows-dev-environment.md ──→  windows-dev.mdc
├── task-execution-workflow.md  ──→  task-execution-workflow.mdc
├── architecture-meta-model.md  ──→  architecture-meta-model.mdc
└── （notion 规范已迁移至 notion-workspace.mdc，.kiro 中对应文件已删除）
```

## 更新规则

当 `.kiro/steering` 中的规范有变更时，应同步更新对应的 `.cursor/rules/*.mdc` 文件，保持规则与 steering 一致。

**最后同步**：2026-02-27（新增 task-execution-workflow.mdc、architecture-meta-model.mdc，完整同步 .kiro/steering 对应规范）
