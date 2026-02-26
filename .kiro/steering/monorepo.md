---
inclusion: fileMatch
fileMatchPattern: '{package.json,pnpm-workspace.yaml,turbo.json,**/package.json,pnpm-lock.yaml}'
---

# Monorepo 项目开发规范（详细版）

> 编辑 monorepo 配置文件时自动加载。核心原则见 `00-core-principles.md`。

开发时**必须**意识到这是 **pnpm + Turborepo** 的 monorepo，所有改动需符合根目录与工作区约定。

## 1. 仓库结构

- **根目录**：仅保留 `package.json`、`pnpm-workspace.yaml`、`turbo.json`、`scripts/`、共享配置（如 `tsconfig.base.json`）。**依赖只在根或各子包声明，不重复安装。**
- **apps/**：可部署应用（如 `backend`、`admin-web`、`miniapp-client`）。每个应用有独立 `package.json`，通过 Turbo 任务参与 `dev`/`build`。
- **apps/admin-web/packages/**：admin-web 内部共享包，命名空间 `@sa/*`。
- **libs/**：跨应用共享库（如 `@libs/common-types`、`@libs/common-utils`、`@libs/common-constants`）。
- **docs**：文档包（若存在）。

新增应用放 `apps/`，新增跨应用共享库放 `libs/`，仅 admin-web 用的放 `apps/admin-web/packages/`。新增后需在 `pnpm-workspace.yaml` 的 `packages` 中已有通配符覆盖（如 `apps/*`、`libs/*`），无需改 workspace 配置除非新加顶层目录。

## 2. 依赖与版本

- **内部包引用**：凡依赖 `@apps/*`、`@libs/*`、`@sa/*` 的，**必须**使用 `workspace:*`（或 `workspace:^` 等），禁止写死版本。
  ```json
  "@libs/common-types": "workspace:*",
  "@sa/utils": "workspace:*"
  ```
- **共享依赖版本**：根目录 `pnpm-workspace.yaml` 中通过 **catalog** 统一版本（如 TypeScript、Vue、axios、eslint 等）。子包优先使用 `catalog:` 引用；若未进 catalog，则各子包间**同一依赖版本须一致**，避免同一依赖多版本。
- **安装位置**：依赖装在**使用它的那个包**的 `package.json` 里，不要只在根装而子包不声明。
- **锁文件**：仅根目录保留 `pnpm-lock.yaml`，**禁止**在 `apps/*` 或 `libs/*` 下出现 `package-lock.json` / `pnpm-lock.yaml`。

## 3. Turbo 与脚本

- **任务定义**：在根目录 `turbo.json` 中统一定义 `build`、`dev`、`lint`、`typecheck`、`test` 等。需要先构建依赖包时使用 `dependsOn: ["^build"]`；`dev` 使用 `persistent: true`、`cache: false`。
- **运行方式**：开发/构建**从根目录**用 pnpm 跑 Turbo，例如：
  - `pnpm dev` / `pnpm dev:backend` / `pnpm dev:admin` / `pnpm dev:mp`
  - `pnpm build` / `pnpm build:backend` / `pnpm build:admin` / `pnpm build:mp`
  - `pnpm generate-types`（先构建 backend，再生成 common-types）
  - `pnpm lint` / `pnpm typecheck` / `pnpm test`
- **单包脚本**：若需在某个 app 下执行命令，先确认是否应改为在根用 `pnpm --filter <包名> <script>` 或已有根脚本封装。

## 4. 跨包引用与边界

- **禁止**在应用或包内通过相对路径跨到**其他 app** 的源码（如 `admin-web` 直接引用 `backend` 的 ts 源文件）。跨应用共享只通过 **发布/workspace 包**（如 `@libs/*`）或 API 调用。
- **允许**同一 app 内子包互相引用（如 `@sa/axios` 依赖 `@sa/utils`），均用 `workspace:*`。

## 5. 配置与 Git

- **TypeScript**：各子包 `tsconfig.json` 应 **extends** 根目录的 `tsconfig.base.json`，不重复写一整套 compilerOptions。
- **Git Hooks / Husky**：只在**根目录**配置（如 `simple-git-hooks`、commitlint、lint-staged）。子包**不得**再配自己的 hooks 或 `.husky`。
- **环境变量**：应用级仅使用 `.env.development`、`.env.production`、`.env.test`、`.env.example`；每个 app 需提供 `.env.example`。

## 6. 运行环境

- **当前主要环境**：开发/运行环境为 **Windows**，终端为 **PowerShell**。
- **PowerShell 与命令串联**：PowerShell **不支持** `&&` 串联命令。应使用 **`;`** 分隔顺序执行的多条命令。
- **文档与示例命令**：README、文档及需要用户手动在终端执行的示例中，**避免仅写** `cmd1 && cmd2`；若需串联命令，应使用 `;` 或同时给出 PowerShell 与 Bash 两种写法。
- **package.json scripts**：脚本内的命令串联由 npm/pnpm 在 Node 环境中解析，通常仍可使用 `&&`；若某脚本需在 PowerShell 中**直接复制粘贴**执行，则改用 `;` 或分步说明。

## 7. 校验与 CI

- 改完依赖或结构后，在根目录执行 **`pnpm verify-monorepo`**（即 `node scripts/verify-monorepo.mjs`），通过后再提交。CI 也应跑该脚本。
- 校验项包括：共享依赖版本一致、内部包用 `workspace:*`、无子级锁文件、tsconfig 继承根配置、无分散 Git Hooks、环境变量文件命名、各应用有 `.env.example`、backend 脚本无 `.bat`/`.sh` 且脚本名为 kebab-case、包命名规范（`@apps/*`/`@libs/*`/`@sa/*`）、无内部包循环依赖、包边界正确（libs 不依赖 apps）。

## 8. 结合本项目的补充规则（15 条）

1. **路径别名**：backend 使用 `@src/*`（映射 `src/*`），admin-web、miniapp-client 使用 `@/*`（映射 `./src/*`）。各 app 内统一用该 app 已有别名，不混用或新增未在 tsconfig 中声明的别名。
2. **API 类型来源**：前端使用的 `Api.*` 类型必须来自 `@libs/common-types` 的 **generate-types** 生成的 `api.d.ts`（源为 backend 的 openApi.json），不手写重复类型；新接口以 OpenAPI/后端为准，再生成类型。
3. **类型生成顺序**：生成前端类型前须先构建 backend（产出 `public/openApi.json`），再在 `libs/common-types` 执行 `generate-types`。Turbo 已配置 `generate-types` 的 `dependsOn: ["@apps/backend#build"]`，从根跑 `pnpm --filter @libs/common-types generate-types` 会按依赖顺序执行。
4. **新应用包名**：新增 app 时包名建议与 backend、admin-web 一致使用 `@apps/xxx`（如 `@apps/miniapp-client`），便于 filter 与内部引用统一。
5. **根 pnpm.overrides**：根 `package.json` 的 `pnpm.overrides` 已统一部分依赖（如 typescript）。子包**不要**对同一依赖再写 overrides，避免版本分裂。
6. **lint-staged 范围**：根目录 lint-staged 仅对 `apps/backend/**/*.ts`、`apps/admin-web/**/*.{ts,tsx,vue}`、`apps/miniapp-client/**/*.{ts,tsx,vue}` 及根级 `*.{json,md,yaml,yml}` 生效。**新增 app 时**若需 pre-commit 校验，须在根 `package.json` 的 `lint-staged` 中显式加入路径。
7. **新增共享依赖**：需要多包共用的依赖先加入 `pnpm-workspace.yaml` 的 **catalog**，子包用 `catalog:` 引用（如 `"typescript": "catalog:"`），保证版本一致并便于 verify-monorepo 通过。
8. **Turbo 新任务**：在 `turbo.json` 中新增会产出文件的任务时，必须配置 **outputs**（如 `["dist/**"]`、`["src/api.d.ts"]`），否则缓存行为异常或无法正确复用。
9. **应用包 private**：可部署的 app（backend、admin-web、miniapp-client 等）的 `package.json` 保持 **`private: true`**，不发布到 npm。
10. **Prisma 归属**：Prisma 仅 backend 使用。migrate、seed、generate 等仅在 **backend 目录**或通过 backend 的 scripts（如 `pnpm --filter @apps/backend prisma:migrate`）执行，不在根或其它 app 执行。
11. **根 prepare 脚本**：根目录 **prepare** 脚本（当前为 `simple-git-hooks`）用于安装 Git hooks，**勿删除**，保证 `pnpm install` 后 commit/pre-commit 等 hooks 生效。
12. **Backend scripts 目录**：`apps/backend/scripts` 下仅使用跨平台脚本（`.cjs`、`.mjs`、`.ts` 等），**禁止** `.bat`、`.sh`；脚本文件名使用 **kebab-case**（与 verify-monorepo P8、P9 一致）。
13. **engines 对齐**：各 app 若声明 `engines`（如 admin-web 的 `node: ">=20.19.0"`、`pnpm: ">=10.5.0"`），建议与根或其它 app 对齐，避免本地与 CI 环境不一致。
14. **docs 包**：若存在 `docs` 包，仅作文档/静态站点，**不**参与构建链的强依赖（不在 turbo 的 build 链里 dependsOn backend 等），避免文档构建强依赖后端产物。
15. **Backend 环境变量跨平台**：backend 的 build/dev 脚本通过 **cross-env** 设置 `NODE_ENV`（如 `cross-env NODE_ENV=development nest start --watch`），保证 Windows 与 Unix 行为一致。

## 9. AI 协作纪律（复杂任务执行规范）

以下规则适用于多步骤、跨模块、需要研究或调试的复杂任务。简单问答、单文件修改等轻量操作可跳过。

### 9.1 复杂任务先拆解

涉及 3 个以上步骤、跨多个子项目、或需要先调研再实现的任务，先列出阶段计划再动手。每个阶段有明确的完成标准。

### 9.2 研究成果及时落盘

每读取 2-3 个文件或文档后，将关键发现总结出来（可以在回复中说明，或写入项目文档），避免上下文膨胀后遗忘前期调研结论。

### 9.3 错误 3-Strike 协议

同一个问题最多尝试 3 种不同方案。每次失败记录：错误现象、尝试的方案、失败原因。3 次仍未解决，停下来向用户说明情况并请求指导，不盲目重试。

### 9.4 完成前核对

标记任务完成前，回顾最初目标，确认所有要求都已满足。不遗漏子任务，不跳过验证步骤。

### 9.5 不重复犯错

遇到过的错误和无效方案要记住，后续步骤中不再尝试已证明失败的路径。换方向时说明为什么换。

## 10. 共享层管理规范

### 10.1 共享库职责

| 包                       | 职责                                   | 内容示例                                                 |
| ------------------------ | -------------------------------------- | -------------------------------------------------------- |
| `@libs/common-types`     | OpenAPI 生成的 API 类型 + 业务实体别名 | `User`、`Role`、`ApiResult<T>`、`RequestParams`          |
| `@libs/common-utils`     | 跨应用通用工具函数                     | `listToTree`、`isEmpty`、`isNotEmpty`、`getErrorMessage` |
| `@libs/common-constants` | 跨应用共享常量                         | 正则（手机号、邮箱、密码）、枚举映射                     |

### 10.2 什么应该提取到共享层

满足以下**全部**条件时，才考虑提取：

1. **至少 2 个 app 使用**相同或高度相似的逻辑
2. **函数签名和行为语义一致**（不是"看起来像"而是"做的事一样"）
3. **无平台特定依赖**（不依赖 DOM、uni-app API、NestJS 装饰器等）
4. **提取后调用方改动小**（理想情况：换个 import 路径即可）

### 10.3 什么不应该提取

- 仅 1 个 app 使用的工具函数（如 `formatFileSize` 仅 admin-web 用）
- 签名或返回结构不同的"同名函数"（如 backend 的 `ListToTree` 返回 `{id, label, children}`，与前端的 `listToTree` 保留原始结构不同）
- 依赖特定运行时的代码（如 `crypto` 封装依赖 `JSEncrypt`/浏览器环境）
- 各 app 已有成熟生态方案的（如 debounce — admin-web 用 lodash/vueuse，miniapp-client 用 es-toolkit fork）

### 10.4 提取流程

1. 在 `libs/common-utils/src/` 下新增模块文件（如 `date.ts`）
2. 在 `libs/common-utils/src/index.ts` 中 `export * from './date'`
3. 在 `libs/common-utils/package.json` 的 `exports` 中添加子路径导出
4. 调用方 app 的 `package.json` 添加 `"@libs/common-utils": "workspace:*"`（如未添加）
5. 调用方原有实现改为 re-export 或直接替换 import（优先 re-export 以减少改动面）
6. 运行 `pnpm verify-monorepo` 确认通过

### 10.5 re-export 模式（推荐）

提取共享逻辑后，原文件保留导出别名，避免大面积修改调用方：

```typescript
// apps/admin-web/src/utils/common.ts
import { listToTree } from '@libs/common-utils';
export const handleTree = listToTree; // 保持原有导出名
```

```typescript
// apps/backend/src/common/utils/error.ts
export { getErrorMessage, getErrorStack, getErrorInfo } from '@libs/common-utils/error';
```

## 11. 跨应用类型安全规范

### 11.1 类型来源优先级

1. **首选**：`@libs/common-types` 中 OpenAPI 生成的类型（`components["schemas"]["XxxVo"]`）
2. **次选**：`@libs/common-types` 中手动定义的业务实体别名（如 `export type User = components["schemas"]["UserVo"]`）
3. **末选**：各 app 内部 typings 中手写的类型定义

### 11.2 新增 API 接口时的类型流程

1. 后端新增/修改接口 → 构建 backend 生成 `openApi.json`
2. 运行 `pnpm generate-types` → 更新 `@libs/common-types` 的 `api.d.ts`
3. 如果是常用实体，在 `libs/common-types/src/index.ts` 中添加别名（如 `export type Order = components["schemas"]["OrderVo"]`）
4. 前端 app 通过 `@libs/common-types` 引用类型，不手写重复定义

### 11.3 admin-web 类型迁移规则

admin-web 的 `src/typings/api/*.d.ts` 中已有部分类型引用了 `@libs/common-types`（如 `Config`、`Role`、`User`）。后续新增或修改 API 类型时：

- **新增类型**：必须从 `@libs/common-types` 引用，禁止手写与后端 VO/DTO 重复的类型定义
- **已有类型**：改动时顺带迁移到 `@libs/common-types` 引用（顺带偿还，不强制一次性全量迁移）
- **前端独有类型**（如 UI 状态、表单临时类型）：保留在 app 内部 typings，不提取到共享层

### 11.4 miniapp-client 类型规则

miniapp-client 的 `src/api/*.ts` 已使用 `@libs/common-types` 的共享类型。后续：

- API 请求/响应类型优先从 `@libs/common-types` 导入
- C 端独有的类型（如小程序特有的页面参数、组件 props）保留在 app 内部

## 12. CI/CD 质量门禁

### 12.1 CI pipeline 执行顺序

GitHub Actions CI 在 push/PR 到 main/master 时自动运行，执行顺序：

1. `pnpm install --frozen-lockfile` — 安装依赖
2. `pnpm verify-monorepo` — 结构校验（12 项检查）
3. `pnpm lint` — ESLint 检查
4. `pnpm typecheck` — TypeScript 类型检查
5. `pnpm test` — 单元测试
6. `pnpm build` — 构建

任一步骤失败则 CI 失败，阻塞合并。

### 12.2 verify-monorepo 必须通过

`verify-monorepo` 是合并的硬性前提。12 项检查覆盖：

- P1: 共享依赖版本一致性（catalog）
- P2: 内部包引用 workspace:\*
- P3: 无子级锁文件
- P4: tsconfig 继承根配置
- P5: 无分散 Git Hooks
- P6: 环境变量文件命名规范
- P7: 各应用提供 .env.example
- P8: Backend 脚本无 .bat/.sh
- P9: Backend 脚本 kebab-case
- P10: 包命名规范
- P11: 无内部包循环依赖
- P12: 包边界正确（libs 不依赖 apps）

### 12.3 本地提交前检查

提交前建议运行：

```bash
pnpm verify-monorepo  # 结构校验
pnpm lint             # 代码规范
pnpm typecheck        # 类型检查
```
