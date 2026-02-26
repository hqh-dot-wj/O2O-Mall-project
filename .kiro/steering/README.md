# Steering 文件组织说明

本目录包含项目的开发规范和最佳实践指南，采用分层加载策略优化 AI context 消耗。

## 📁 文件结构

```
.kiro/steering/
├── 00-core-principles.md          # Always (75 tokens) - 核心原则
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
│   └── vue-ecosystem.md           # apps/admin-web/src/**/*.vue
│
└── [Manual - 手动引用]
    ├── architecture-meta-model.md # #architecture
    ├── testing.md                 # #testing
    ├── testing-guide.md           # #testing-guide
    ├── monorepo-tools.md          # #monorepo-tools
    ├── documentation.md           # #doc
    ├── documentation-workflow.md  # #doc-workflow
    └── prompt-templates.md        # #prompts
```

## 🎯 触发机制

### Always Included（始终加载）

- `00-core-principles.md` - 仅 ~75 tokens，包含最核心的 5 条原则

### File Match（文件匹配触发）

编辑匹配路径的文件时自动加载：

| 文件                  | 触发条件            | 用途                |
| --------------------- | ------------------- | ------------------- |
| admin-web-frontend.md | 编辑 admin-web 源码 | 前端开发规范        |
| backend-nestjs.md     | 编辑 backend 源码   | 后端开发规范        |
| miniapp-client.md     | 编辑小程序源码      | 小程序开发规范      |
| monorepo.md           | 编辑 monorepo 配置  | Monorepo 管理规范   |
| build-tools.md        | 编辑构建配置        | Vite/UnoCSS 配置    |
| vue-router-guide.md   | 编辑路由文件        | Vue Router 最佳实践 |
| vue-best-practices.md | 编辑 Vue 文件       | Vue 3 最佳实践      |
| vue-ecosystem.md      | 编辑 Vue 组件       | Vue/Pinia/VueUse    |

### Manual（手动引用）

在聊天中使用 `#文件名` 引用：

| 引用方式          | 文件                       | 用途                  |
| ----------------- | -------------------------- | --------------------- |
| `#architecture`   | architecture-meta-model.md | 架构设计和重构        |
| `#testing`        | testing.md                 | 测试规范（详细版）    |
| `#testing-guide`  | testing-guide.md           | 测试最佳实践 + Skills |
| `#monorepo-tools` | monorepo-tools.md          | pnpm/Turborepo 工具链 |
| `#doc`            | documentation.md           | 文档编写规范          |
| `#doc-workflow`   | documentation-workflow.md  | 文档工作流            |
| `#prompts`        | prompt-templates.md        | 提示词模板            |

## 📊 Context 消耗对比

### 改造前（最坏情况）

```
开启新对话: ~8,000 tokens (所有 steering 文件)
```

### 改造后

```
开启新对话:        ~75 tokens (仅核心原则)
编辑 Vue 文件:   ~3,000 tokens (前端规范 + Vue ecosystem)
编辑后端文件:   ~1,500 tokens (后端规范)
编辑配置文件:   ~2,000 tokens (monorepo + 构建工具)
写测试 (#testing-guide): ~2,500 tokens (测试规范 + Skills)
```

## 🔧 Anthony Fu Skills 集成

以下文件引用了 Anthony Fu 的官方 Skills（需要先安装）：

### 安装命令

```bash
# 核心技术栈（File Match 触发）
pnpx skills add antfu/skills --skill='vue,pinia,vite,unocss,vueuse-functions,vue-router-best-practices,vue-best-practices'

# 工具链（Manual 触发）
pnpx skills add antfu/skills --skill='pnpm,turborepo,vitest,vue-testing-best-practices'
```

### Skills 映射

| Steering 文件         | 引用的 Skills                      |
| --------------------- | ---------------------------------- |
| vue-ecosystem.md      | vue, pinia, vueuse-functions       |
| vue-best-practices.md | vue-best-practices                 |
| vue-router-guide.md   | vue-router-best-practices          |
| build-tools.md        | vite, unocss                       |
| testing-guide.md      | vitest, vue-testing-best-practices |
| monorepo-tools.md     | pnpm, turborepo                    |

## 💡 使用建议

1. **日常开发**: 只需关注 `00-core-principles.md`，其他规范会自动加载
2. **架构设计**: 手动引用 `#architecture`
3. **编写测试**: 手动引用 `#testing-guide`
4. **配置工具**: 编辑配置文件时自动加载对应指南
5. **查看文档**: 手动引用 `#doc` 或 `#doc-workflow`

## 🔄 维护规则

1. **00-core-principles.md**: 保持 < 50 行，只放最核心的原则
2. **File Match 文件**: 可以详细，但避免重复内容
3. **Manual 文件**: 用于特定场景，不常用但很重要的内容
4. **新增规范**: 优先考虑 File Match，避免 Always Included

## ✅ 验证

检查配置是否生效：

```bash
# 1. 开启新对话，应该只看到 00-core-principles.md
# 2. 编辑 apps/admin-web/src/views/test.vue，应该看到 admin-web-frontend.md + vue-*.md
# 3. 编辑 apps/backend/src/test.ts，应该看到 backend-nestjs.md
# 4. 输入 #testing，应该看到 testing.md
```
