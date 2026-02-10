# Monorepo 项目现状审查报告

## 1. 现状评估
当前项目 `Nest-Admin-Soybean` 已经具备了 Monorepo 的基础雏形：
- **包管理器**: 使用 `pnpm` workspace (`pnpm-workspace.yaml`)。
- **结构**: 包含 `apps` (backend, admin-web, miniapp) 和 `libs` (common-types)。
- **依赖关联**: `admin-web` 内部通过 workspace 协议引用了其 `packages` 下的模块。

然而，作为一个**现代化、高效**的 Monorepo，它还缺少通过工具链带来的自动化、标准化和性能优化能力。

## 2. 核心缺失项 (Gap Analysis)

### 2.1 🔴 缺失构建系统与任务编排 (Build System & Orchestration)
目前项目没有集成 **Turborepo** 或 **Nx**。
- **现状**: 根目录 `package.json` 中定义了 `dev:backend`, `dev:admin` 等独立脚本，无法并行启动或按依赖顺序构建。
- **影响**:
    - **无缓存**: 每次构建都是全量构建，无法利用缓存跳过未修改的模块。
    - **无依赖拓扑执行**: 无法自动识别 "修改了 lib A，需要重新构建依赖 A 的 app B"。
    - **开发体验**: 需要开多个终端分别启动服务。
- **建议**: 引入 **Turborepo** (`turbo.json`) 来接管 `build`, `dev`, `lint` 等任务。

### 2.2 🟠 共享配置未抽离 (Shared Configurations)
- **现状**:
    - `tsconfig.json`: `apps/admin-web/tsconfig.json` 定义了完整的 `compilerOptions`，没有继承根目录或共享的配置。
    - `eslint`/`prettier`: 各个应用似乎各自维护或依赖根目录配置，缺乏统一的 `@repo/eslint-config` 包。
- **建议**: 创建 `packages/config` 或类似目录，统一管理 `tsconfig.base.json`, `eslint-preset` 等，各应用通过 `extends` 继承。

### 2.3 🟡 依赖引用方式不规范 (Direct Path Analysis)
- **现状**: `apps/admin-web/tsconfig.json` 使用了路径别名 `"@common/*": ["../../libs/common-types/src/*"]` 来访问共享库。
- **问题**: 这是一种 "隐式依赖"。
    - `package.json` 中没有声明对 `@libs/common-types` 的依赖。
    - 构建工具（如 Vite/Webpack）需要额外配置才能识别该路径。
    - 可能会导致 "幻影依赖" 问题，且破坏了包的封装性。
- **建议**:
    1. 在 `apps/admin-web/package.json` 中添加 `"@libs/common-types": "workspace:*"`。
    2. 删除 `tsconfig` 中的 `../../` 相对路径映射，改由包管理器处理链接。

### 2.4 ⚪ 发版与版本控制 (Versioning & Publishing)
- **现状**: 未发现版本管理工具。
- **建议**: 引入 **Changesets** (`.changeset` 目录)，用于自动化管理多包的版本号升级和 Changelog 生成。

### 2.5 🟣 后端与前端类型共享流程 (Type Sharing)
- **现状**: `common-types` 似乎是通过脚本从后端 `openApi.json` 生成类型。
- **建议**: 这是一个不错的方向。配合 Turborepo，可以将 "后端构建 -> 生成 OpenAPI -> 生成 Types -> 前端开发" 这一流程自动化串联。

## 3. 改进路线图 (Roadmap)

1. **第一阶段 (基础建设)**:
    - [ ] 安装并配置 Turborepo (`turbo.json`)。
    - [ ] 修正 `common-types` 的引用方式（从路径别名改为 workspace 依赖）。
2. **第二阶段 (规范化)**:
    - [ ] 抽离 `tsconfig` 到 `packages/tsconfig`。
    - [ ] 抽离 eslint/prettier 配置。
3. **第三阶段 (自动化)**:
    - [ ] 配置 Changesets。
    - [ ] 优化 CI 流程（只构建受影响的包）。
