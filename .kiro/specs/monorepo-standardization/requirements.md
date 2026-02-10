# 需求文档：Monorepo 标准化改造

## 简介

本文档定义 Nest-Admin-Soybean 单体仓库（monorepo）的标准化改造需求。项目当前包含三个应用（backend、admin-web、miniapp-client）和一个共享库（common-types），存在构建编排缺失、依赖版本漂移、TypeScript 配置不一致、ESLint 体系分裂、CI/CD 缺失等系统性问题。本改造旨在建立统一的工程基础设施，提升开发效率、构建可靠性和代码质量。

## 术语表

- **Monorepo**：将多个项目存放在同一个代码仓库中的工程实践
- **Turborepo**：Vercel 出品的高性能 monorepo 构建编排工具，支持任务缓存和依赖拓扑
- **pnpm catalog**：pnpm 工作区的依赖版本集中管理机制，在 `pnpm-workspace.yaml` 中统一声明版本
- **Workspace_Protocol**：pnpm 的 `workspace:*` 协议，用于引用工作区内部包
- **Flat_Config**：ESLint v9 引入的新配置格式（`eslint.config.js`），替代旧的 `.eslintrc.*` 格式
- **Pipeline**：Turborepo 中定义任务依赖关系和执行顺序的配置
- **Backend**：`apps/backend`，基于 NestJS + Prisma 的后端服务
- **Admin_Web**：`apps/admin-web`，基于 Vue3 + Vite + Naive UI 的管理后台前端
- **Miniapp_Client**：`apps/miniapp-client`，基于 uni-app Vue3 的小程序客户端
- **Common_Types**：`libs/common-types`，从 OpenAPI 生成的共享类型库
- **CODEOWNERS**：GitHub 的代码所有者配置文件，用于自动分配 PR 审查者

## 需求

### 需求 1：构建编排与任务缓存（P0）

**用户故事：** 作为开发者，我希望 monorepo 具备统一的构建编排系统，以便自动处理跨应用依赖关系、启用构建缓存并支持并行开发。

#### 验收标准

1. THE Monorepo SHALL 使用 Turborepo 作为构建编排工具，在根目录提供 `turbo.json` 配置文件
2. WHEN 执行 `pnpm build` 时，THE Pipeline SHALL 按照依赖拓扑顺序执行构建：Backend 构建输出 `openApi.json` → Common_Types 生成类型 → Admin_Web 和 Miniapp_Client 构建
3. WHEN 源代码未发生变更时，THE Turborepo SHALL 使用本地缓存跳过重复构建任务
4. WHEN 执行 `pnpm dev` 时，THE Pipeline SHALL 并行启动所有应用的开发服务器
5. THE Monorepo SHALL 在根 `package.json` 中提供统一的脚本命令：`dev`、`build`、`lint`、`typecheck`、`test`
6. WHEN 仅修改单个应用代码时，THE Turborepo SHALL 仅重新构建受影响的应用及其下游依赖

### 需求 2：依赖版本统一管理（P0）

**用户故事：** 作为开发者，我希望所有工作区包使用统一的依赖版本，以避免版本漂移导致的运行时错误和类型不兼容。

#### 验收标准

1. THE Monorepo SHALL 在 `pnpm-workspace.yaml` 中使用 `catalog:` 机制集中声明共享依赖的版本
2. WHEN 多个工作区包依赖同一个第三方库时，THE pnpm_catalog SHALL 确保所有包使用相同的版本号
3. THE Monorepo SHALL 统一以下关键依赖的版本：typescript、dayjs、axios、@types/node、vue、vue-router、pinia、eslint、prettier
4. WHEN 工作区包引用内部包时，THE 工作区包 SHALL 在 `package.json` 的 `dependencies` 中使用 Workspace_Protocol 声明依赖，而非通过 tsconfig 路径别名引用
5. THE Admin_Web 和 Miniapp_Client SHALL 在各自 `package.json` 中声明对 `@libs/common-types` 的 Workspace_Protocol 依赖
6. THE Monorepo SHALL 移除 `libs/common-types/package-lock.json` 和 `apps/miniapp-client/pnpm-lock.yaml` 以及 `apps/backend/pnpm-lock.yaml` 等子级锁文件，仅保留根级 `pnpm-lock.yaml`

### 需求 3：TypeScript 配置统一（P0）

**用户故事：** 作为开发者，我希望所有工作区包共享一套基础 TypeScript 配置，以确保类型检查行为一致并减少配置重复。

#### 验收标准

1. THE Monorepo SHALL 在根目录提供 `tsconfig.base.json` 作为所有工作区包的共享基础配置
2. THE `tsconfig.base.json` SHALL 包含统一的严格模式设置：`strict: true`、`strictNullChecks: true`、`forceConsistentCasingInFileNames: true`
3. WHEN 工作区包需要特定的 TypeScript 设置时，THE 工作区包 SHALL 通过 `extends` 继承 `tsconfig.base.json` 并仅覆盖必要的差异项
4. THE Backend SHALL 将 `strictNullChecks` 从 `false` 迁移为 `true`，并修复由此产生的类型错误
5. THE Common_Types SHALL 将 `target` 从 `es2017` 升级为与其他包一致的现代目标，并在 `package.json` 中添加 `exports` 字段
6. THE Admin_Web 和 Miniapp_Client SHALL 移除 `@common/*` 路径别名，改为通过 Workspace_Protocol 导入 `@libs/common-types`

### 需求 4：ESLint 配置统一（P1）

**用户故事：** 作为开发者，我希望所有工作区包使用统一的 ESLint 配置体系，以确保代码风格一致并简化维护。

#### 验收标准

1. THE Monorepo SHALL 在根目录提供共享的 ESLint 基础配置，所有工作区包从该配置继承
2. THE Backend SHALL 从旧格式 `.eslintrc.js` 迁移到 Flat_Config 格式 `eslint.config.js`
3. THE Backend SHALL 将 `@typescript-eslint/no-explicit-any` 规则从 `off` 改为 `warn`，逐步消除 `any` 的使用
4. WHEN 工作区包有特定的 ESLint 需求时（如 Vue 插件、uni-app 插件），THE 工作区包 SHALL 在继承共享配置的基础上添加特定规则
5. THE Monorepo SHALL 在根 `package.json` 中提供 `pnpm lint` 命令，一次性检查所有工作区包的代码

### 需求 5：CI/CD 流水线（P0）

**用户故事：** 作为开发者，我希望每次提交和 PR 都自动执行代码质量检查，以在合并前发现问题。

#### 验收标准

1. THE Monorepo SHALL 提供 GitHub Actions CI 工作流，在每次 PR 和推送到主分支时自动执行
2. WHEN CI 工作流执行时，THE CI SHALL 依次运行：安装依赖 → lint 检查 → 类型检查 → 单元测试 → 构建验证
3. THE CI 工作流 SHALL 使用路径过滤，仅在相关文件变更时触发对应应用的检查
4. THE CI 工作流 SHALL 利用 Turborepo 缓存和 pnpm store 缓存加速执行
5. IF CI 中任一检查步骤失败，THEN THE CI SHALL 阻止 PR 合并并在 PR 页面显示失败详情
6. THE Monorepo SHALL 提供 CODEOWNERS 文件，为不同应用目录指定代码审查负责人

### 需求 6：Git Hooks 统一（P1）

**用户故事：** 作为开发者，我希望所有工作区包使用统一的 Git Hooks 工具和检查流程，以确保提交前的代码质量一致。

#### 验收标准

1. THE Monorepo SHALL 在根级别统一使用 `simple-git-hooks` 管理 Git Hooks，移除 Miniapp_Client 中的 `husky` 依赖
2. THE 根级 `pre-commit` hook SHALL 使用 `lint-staged` 仅对暂存文件执行 lint 和格式化检查
3. THE 根级 `commit-msg` hook SHALL 使用 `commitlint` 验证提交信息格式
4. WHEN 根级 Git Hooks 配置完成后，THE 各工作区包 SHALL 移除各自的 `simple-git-hooks`、`husky` 配置和 `prepare` 脚本
5. THE Monorepo SHALL 在根 `package.json` 中配置 `lint-staged`，按文件类型和路径分别执行对应工作区的 lint 命令

### 需求 7：环境变量规范化（P1）

**用户故事：** 作为开发者，我希望所有应用使用统一的环境变量命名和管理方式，以降低配置错误风险并方便新成员上手。

#### 验收标准

1. THE Monorepo SHALL 统一环境变量文件命名为 `.env.development`、`.env.production`、`.env.test`（使用完整环境名称）
2. THE Admin_Web SHALL 将 `.env.dev`、`.env.prod`、`.env.test` 重命名为 `.env.development`、`.env.production`、`.env.test`
3. THE Miniapp_Client SHALL 将 `env/` 子目录中的环境变量文件移至项目根目录，与其他应用保持一致的目录结构
4. THE 每个应用 SHALL 提供 `.env.example` 模板文件，列出所有必需的环境变量及说明
5. IF 必需的环境变量缺失，THEN THE 应用 SHALL 在启动时输出明确的错误提示信息

### 需求 8：仓库清理与项目边界（P1）

**用户故事：** 作为开发者，我希望仓库结构清晰、无冗余文件，以降低认知负担并避免混淆。

#### 验收标准

1. THE Monorepo SHALL 移除根目录下的无关文件：`.jpg` 图片文件、`list2.json`、`pcas-code.json`、`repro_sse.js`、`test.dio`
2. THE Monorepo SHALL 移除嵌套的 `.git` 目录：`apps/backend/.git`、`apps/admin-web/.git`、`apps/miniapp-client/.git`
3. THE Miniapp_Client SHALL 将 `package.json` 的 `name` 字段从 `miniapp-client` 改为 `@apps/miniapp-client`，与其他应用保持一致的作用域命名
4. THE Backend SHALL 合并 `src/common/constant/` 和 `src/common/constants/` 为统一的 `src/common/constants/` 目录
5. THE Backend SHALL 移除未使用的 `src/common/utils/result.ts`（旧版 `ResultData` 类），仅保留 `src/common/response/result.ts`
6. THE Monorepo SHALL 将根级 `.gitignore` 作为唯一的忽略规则文件，各工作区包仅在有特殊需求时保留补充性的 `.gitignore`
7. THE `docs/` 目录 SHALL 纳入 pnpm 工作区管理，移除其独立的 `pnpm-lock.yaml`

### 需求 9：共享库完善（P2）

**用户故事：** 作为开发者，我希望跨应用共享的类型、枚举和工具函数有统一的来源，以避免代码重复和不一致。

#### 验收标准

1. THE Common_Types SHALL 在 `package.json` 中添加 `exports` 字段，明确声明模块的公开入口
2. THE Backend SHALL 评估并迁移 `src/common/enum/` 中与前端共享的枚举到 Common_Types 库
3. WHEN Admin_Web 和 Backend 存在功能重复的工具函数时（如日期格式化、树结构处理、深拷贝），THE Monorepo SHALL 将其提取到共享库中
4. THE Common_Types SHALL 移除对旧版 `ResultData` schema 的引用，统一使用 `Result` 类型

### 需求 10：测试基础设施（P2）

**用户故事：** 作为开发者，我希望所有应用具备基本的测试基础设施，以便通过自动化测试保障代码质量。

#### 验收标准

1. THE Monorepo SHALL 在根 `package.json` 中提供 `pnpm test` 命令，通过 Turborepo 编排所有应用的测试执行
2. THE Miniapp_Client SHALL 配置 Vitest 作为单元测试框架，与 Admin_Web 保持一致
3. WHEN 通过 Turborepo 执行测试时，THE Pipeline SHALL 支持测试结果缓存，未变更的应用跳过测试

### 需求 11：脚本规范化（P2）

**用户故事：** 作为开发者，我希望项目脚本使用统一的命名和跨平台方案，以便在不同操作系统上可靠执行。

#### 验收标准

1. THE Backend SHALL 将 `scripts/` 目录中的 `.bat`/`.sh` 脚本对统一为跨平台的 Node.js/TypeScript 脚本
2. THE Backend SHALL 统一 `scripts/` 目录中的文件命名为 kebab-case 格式
3. THE 根目录 `scripts/` SHALL 使用 TypeScript 编写，并通过 `tsx` 执行以确保跨平台兼容

### 需求 12：文档整合（P3）

**用户故事：** 作为开发者，我希望项目文档有统一的入口和结构，以便快速找到所需信息。

#### 验收标准

1. THE Monorepo SHALL 在根目录提供 `CONTRIBUTING.md`，说明开发环境搭建、分支策略、提交规范和 PR 流程
2. THE Backend SHALL 清理 `docs/` 目录中过时的文档，并在 `README.md` 中提供文档索引
3. THE Monorepo SHALL 移除根目录的 `MONOREPO_REVIEW.md`、`MONOREPO_DEEP_REVIEW.md`、`MIGRATION_GUIDE.md` 等临时审查文件，将有价值的内容整合到正式文档中
