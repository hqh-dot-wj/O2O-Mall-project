# Steering 文件组织说明

本目录包含项目的开发规范和最佳实践指南，采用分层加载策略优化 AI context 消耗。

## 📁 文件结构

```
.kiro/steering/
├── 00-core-principles.md          # Always - 核心原则
├── dev-cognitive-flow.md          # Always - 开发认知流程（Fast/Slow Mode）
├── commit-message.md              # Auto - Commit 规范（始终加载）
│
├── [File Match - 自动触发]
│   ├── admin-web-frontend.md      # apps/admin-web/src/**/*.{vue,ts,tsx}
│   ├── backend-nestjs.md          # apps/backend/src/**/*.ts
│   ├── miniapp-client.md          # apps/miniapp-client/src/**/*.{vue,ts,tsx}
│   ├── monorepo.md                # package.json, turbo.json, pnpm-*
│   ├── windows-dev-environment.md # **/*.ps1, scripts/**/*
│   ├── build-tools.md             # **/vite.config.ts, **/uno.config.ts
│   ├── vue-router-guide.md        # apps/admin-web/src/router/**/*
│   ├── vue-best-practices.md      # apps/admin-web/src/**/*.{vue,ts,tsx}
│   ├── vue-ecosystem.md           # apps/admin-web/src/**/*.vue
│   │
│   ├── testing.md                 # **/*.spec.*, **/*.test.*, **/e2e/**
│   ├── testing-guide.md           # **/*.spec.*, **/*.test.*, **/e2e/**
│   ├── process-testing.md         # apps/backend/**/*.ts, process-specs/**
│   │
│   ├── documentation.md           # docs/**/*.md, **/docs/**/*.md
│   ├── task-execution-workflow.md  # docs/tasks/**, docs/requirements/**
│   ├── architecture-meta-model.md # docs/design/**, *.module.ts, module/**
│   ├── architecture-checklist.md  # docs/design/**, docs/requirements/**
│   ├── architecture-playbook.md   # docs/design/**, docs/tasks/**
│   │
│   ├── backend-p2c.md             # apps/backend/**/*.ts, backend/docs/**
│   ├── backend-third-party.md     # apps/backend/**/adapters/**, ports/**
│   ├── miniapp-d2c.md             # apps/miniapp-client/**/*.vue
│   ├── miniapp-p2c.md             # apps/miniapp-client/**/*.{vue,ts}
│   ├── miniapp-ui-spec.md         # apps/miniapp-client/**/*.{vue,scss,ts}
│   └── notion-workspace.md        # **/*notion*.md
│
└── [Manual - 手动引用]
    ├── monorepo-tools.md          # #monorepo-tools
    ├── documentation-workflow.md  # #doc-workflow
    └── prompt-templates.md        # #prompts
```

## 🎯 触发机制

### Always / Auto（始终加载）

- `00-core-principles.md` - 核心原则（~75 tokens）
- `dev-cognitive-flow.md` - 开发认知流程（Fast/Slow Mode 思维协议）
- `commit-message.md` - Commit 规范（生成 commit 时始终需要）

### File Match（文件匹配自动触发）

编辑匹配路径的文件时自动加载，与 `.cursor/rules` 的 globs 对齐：

| 文件                       | 触发条件               | 用途                |
| -------------------------- | ---------------------- | ------------------- |
| admin-web-frontend.md      | 编辑 admin-web 源码    | 前端开发规范        |
| backend-nestjs.md          | 编辑 backend 源码      | 后端开发规范        |
| miniapp-client.md          | 编辑小程序源码         | 小程序开发规范      |
| monorepo.md                | 编辑 monorepo 配置     | Monorepo 管理规范   |
| build-tools.md             | 编辑构建配置           | Vite/UnoCSS 配置    |
| vue-router-guide.md        | 编辑路由文件           | Vue Router 最佳实践 |
| vue-best-practices.md      | 编辑 Vue 文件          | Vue 3 最佳实践      |
| vue-ecosystem.md           | 编辑 Vue 组件          | Vue/Pinia/VueUse    |
| windows-dev-environment.md | 编辑脚本文件           | Windows 命令规范    |
| testing.md                 | 编辑测试文件           | 测试规范            |
| testing-guide.md           | 编辑测试文件           | 测试最佳实践        |
| process-testing.md         | 编辑后端代码/流程规约  | 流程规约驱动测试    |
| documentation.md           | 编辑文档               | 文档编写规范        |
| task-execution-workflow.md | 编辑需求/任务/改进文档 | 任务执行工作流      |
| architecture-meta-model.md | 编辑设计文档/模块文件  | 架构决策元模型      |
| architecture-checklist.md  | 编辑设计/需求文档      | 架构决策检查清单    |
| architecture-playbook.md   | 编辑设计/任务文档      | 架构决策项目落地    |
| backend-p2c.md             | 编辑后端代码/文档      | 后端 P2C 生成规则   |
| backend-third-party.md     | 编辑 adapter/port 文件 | 第三方 API 对接规范 |
| miniapp-d2c.md             | 编辑小程序 Vue 文件    | D2C 设计稿到代码    |
| miniapp-p2c.md             | 编辑小程序代码         | P2C 需求到代码      |
| miniapp-ui-spec.md         | 编辑小程序 UI 文件     | 小程序 UI/UX 规范   |
| notion-workspace.md        | 编辑 notion 相关文档   | Notion 工作区规范   |

### Manual（手动引用，仅 3 个）

仅保留无法通过文件匹配自动触发的通用工具类文档：

| 引用方式          | 文件                      | 用途                  |
| ----------------- | ------------------------- | --------------------- |
| `#monorepo-tools` | monorepo-tools.md         | pnpm/Turborepo 工具链 |
| `#doc-workflow`   | documentation-workflow.md | 文档编写工作流        |
| `#prompts`        | prompt-templates.md       | 提示词模板            |

## 📊 与 Cursor Rules 对应关系

```
.kiro/steering/                      .cursor/rules/
├── 00-core-principles.md     ──→    core-principles.mdc (alwaysApply)
├── dev-cognitive-flow.md     ──→    dev-cognitive-flow.mdc (alwaysApply)
├── commit-message.md         ──→    commit-message.mdc (alwaysApply)
├── admin-web-frontend.md     ──→    admin-web.mdc
├── backend-nestjs.md         ──→    backend.mdc
├── miniapp-client.md         ──→    miniapp-client.mdc
├── monorepo.md               ──→    monorepo.mdc
├── testing.md                ──→    testing.mdc
├── documentation.md          ──→    documentation.mdc
├── architecture-meta-model.md ──→   architecture-meta-model.mdc
├── architecture-checklist.md  ──→   architecture-checklist.mdc
├── architecture-playbook.md   ──→   architecture-playbook.mdc
├── task-execution-workflow.md ──→   task-execution-workflow.mdc
├── backend-p2c.md             ──→   backend-p2c.mdc
├── backend-third-party.md     ──→   backend-third-party.mdc
├── miniapp-d2c.md             ──→   miniapp-d2c.mdc
├── miniapp-p2c.md             ──→   miniapp-p2c.mdc
├── miniapp-ui-spec.md         ──→   miniapp-ui-spec.mdc
├── notion-workspace.md        ──→   notion-workspace.mdc
├── process-testing.md         ──→   process-testing.mdc
├── vue-best-practices.md            （admin-web.mdc 覆盖）
├── vue-ecosystem.md                 （admin-web.mdc 覆盖）
├── vue-router-guide.md              （admin-web.mdc 覆盖）
├── testing-guide.md                 （testing.mdc 覆盖）
├── monorepo-tools.md                （monorepo.mdc 覆盖）
├── windows-dev-environment.md       （无独立 cursor rule）
├── build-tools.md                   （无独立 cursor rule）
├── documentation-workflow.md        （无独立 cursor rule）
└── prompt-templates.md              （无独立 cursor rule）
```

## 🧠 Dev Cognitive Flow Skills（分析能力）

`dev-cognitive-flow` Rule 的 Slow Mode 按需调用以下 Skills：

| Cursor Skill            | 触发信号                                   | 分析方法                       |
| ----------------------- | ------------------------------------------ | ------------------------------ |
| `root-cause-analysis`   | 信号 5（复杂 Bug）、信号 6（系统异常）     | 5 Whys + 因果链 + Bug 修复流程 |
| `impact-analysis`       | 信号 2（影响范围异常）、信号 6（系统异常） | 依赖追踪 + 影响范围 + 二阶效应 |
| `hypothesis-validation` | 信号 1/3/4（不一致/不清/高风险）           | 假设 + 证据 + 反例             |

层级关系：`Rules（行为协议）→ Skills（分析能力）→ Playbooks（架构决策三件套）`

## 🔧 Anthony Fu Skills 集成

| Steering 文件         | 引用的 Skills                      |
| --------------------- | ---------------------------------- |
| vue-ecosystem.md      | vue, pinia, vueuse-functions       |
| vue-best-practices.md | vue-best-practices                 |
| vue-router-guide.md   | vue-router-best-practices          |
| build-tools.md        | vite, unocss                       |
| testing-guide.md      | vitest, vue-testing-best-practices |
| monorepo-tools.md     | pnpm, turborepo                    |

```bash
pnpx skills add antfu/skills --skill='vue,pinia,vite,unocss,vueuse-functions,vue-router-best-practices,vue-best-practices'
pnpx skills add antfu/skills --skill='pnpm,turborepo,vitest,vue-testing-best-practices'
```

## 🔄 维护规则

1. `.cursor/rules` 为权威来源，变更后同步到 `.kiro/steering`
2. cursor 的 `globs` 对应 kiro 的 `fileMatchPattern`
3. cursor 的 `alwaysApply: true` 对应 kiro 的 `inclusion: auto`
4. 新增规范优先 fileMatch，避免 manual

**最后同步**：2026-03-08
