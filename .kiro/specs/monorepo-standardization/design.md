# 设计文档：Monorepo 标准化改造

## 概述

本设计文档描述 Nest-Admin-Soybean monorepo 的标准化改造方案。改造核心思路是"自底向上"：先统一基础设施（依赖、TypeScript、ESLint），再建立构建编排（Turborepo），最后完善 CI/CD 和开发体验。每个改造步骤都设计为向后兼容，可以增量执行。

### 设计原则

1. **增量迁移**：每一步改造都保持项目可运行，不做大爆炸式重构
2. **约定优于配置**：建立统一约定，减少各应用的配置差异
3. **最小侵入**：尽量不改变各应用的内部架构，只统一工程基础设施
4. **向后兼容**：Backend 的 CommonJS 模式保持不变，仅统一可统一的部分

## 架构

### 改造后的 Monorepo 结构

```
nest-admin-soybean-monorepo/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # 主 CI 流水线
│   │   └── deploy-docs.yml           # 文档部署（保留）
│   └── CODEOWNERS
├── .kiro/
├── apps/
│   ├── backend/                      # NestJS 后端
│   ├── admin-web/                    # Vue3 管理后台
│   │   └── packages/                 # @sa/* 内部包
│   └── miniapp-client/               # uni-app 小程序
├── libs/
│   └── common-types/                 # 共享类型库
├── docs/                             # VitePress 文档站（纳入工作区）
├── scripts/                          # 根级脚本
├── turbo.json                        # Turborepo 配置
├── tsconfig.base.json                # 共享 TS 基础配置
├── pnpm-workspace.yaml               # 工作区 + catalog
├── package.json                      # 根 package.json
├── .commitlintrc.json
├── .prettierrc.json
└── .gitignore
```

### 构建依赖拓扑

```mermaid
graph TD
    A[apps/backend] -->|build 输出 openApi.json| B[libs/common-types]
    B -->|generate-types| C[apps/admin-web]
    B -->|generate-types| D[apps/miniapp-client]
    E[apps/admin-web/packages/*] --> C
```

## 组件与接口

### 1. Turborepo 构建编排

**turbo.json 配置：**

```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "openApi.json"],
      "cache": true
    },
    "generate-types": {
      "dependsOn": ["@apps/backend#build"],
      "outputs": ["src/api.d.ts", "dist/**"],
      "cache": true
    },
    "dev": {
      "dependsOn": ["^build"],
      "persistent": true,
      "cache": false
    },
    "lint": {
      "dependsOn": [],
      "cache": true
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "test": {
      "dependsOn": ["^build"],
      "cache": true
    }
  }
}
```

**根 package.json scripts 更新：**

```jsonc
{
  "scripts": {
    "dev": "turbo run dev",
    "dev:backend": "turbo run dev --filter=@apps/backend",
    "dev:admin": "turbo run dev --filter=@apps/admin-web",
    "dev:mp": "turbo run dev --filter=@apps/miniapp-client",
    "build": "turbo run build",
    "build:backend": "turbo run build --filter=@apps/backend",
    "build:admin": "turbo run build --filter=@apps/admin-web",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "prepare": "simple-git-hooks"
  }
}
```

### 2. pnpm Workspace + Catalog

**pnpm-workspace.yaml：**

```yaml
packages:
  - 'apps/*'
  - 'apps/admin-web/packages/*'
  - 'libs/*'
  - 'docs'

catalog:
  # TypeScript
  typescript: '5.8.3'

  # 运行时共享
  dayjs: '1.11.19'
  axios: '1.12.2'
  vue: '3.5.24'
  vue-router: '4.6.3'
  pinia: '3.0.4'
  vue-i18n: '9.14.2'

  # 开发工具共享
  '@types/node': '22.15.0'
  eslint: '9.39.1'
  prettier: '3.3.3'

  # 测试
  vitest: '2.1.9'

  # Git hooks
  simple-git-hooks: '2.13.1'
  lint-staged: '15.2.10'
  '@commitlint/cli': '19.8.1'
  '@commitlint/config-conventional': '19.8.1'
```

**各包 package.json 迁移示例（以 typescript 为例）：**

```jsonc
// 迁移前（各包独立版本）
// backend:    "typescript": "^5.1.3"
// admin-web:  "typescript": "5.9.3"
// miniapp:    "typescript": "~5.8.0"
// common-types: "typescript": "^5.0.0"

// 迁移后（统一使用 catalog）
"typescript": "catalog:"
```

### 3. TypeScript 共享配置

**tsconfig.base.json（根目录新建）：**

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "sourceMap": true,
    "incremental": true
  },
  "exclude": ["node_modules", "dist"]
}
```

**Backend tsconfig.json 迁移后：**

```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2021",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "removeComments": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "noImplicitAny": true,
    "paths": {
      "@src/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

> 注意：Backend 继承 `strict: true` 和 `strictNullChecks: true`。这是一个破坏性变更，需要逐步修复类型错误。建议先用 `// @ts-expect-error` 标记已知问题，后续逐步修复。

**Admin-Web tsconfig.json 迁移后：**

```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "jsxImportSource": "vue",
    "lib": ["DOM", "ESNext"],
    "baseUrl": ".",
    "noUnusedLocals": false,
    "paths": {
      "@/*": ["./src/*"],
      "~/*": ["./*"]
    },
    "types": ["vite/client", "node", "unplugin-icons/types/vue", "naive-ui/volar"]
  },
  "include": ["./**/*.ts", "./**/*.tsx", "./**/*.vue"],
  "exclude": ["node_modules", "dist"]
}
```

> 关键变更：移除了 `"@common/*": ["../../libs/common-types/src/*"]` 路径别名，改为通过 workspace 依赖导入。

**Miniapp-Client tsconfig.json 迁移后：**

```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "lib": ["esnext", "dom"],
    "baseUrl": ".",
    "outDir": "dist",
    "allowJs": true,
    "noImplicitThis": true,
    "paths": {
      "@/*": ["./src/*"],
      "@img/*": ["./src/static/*"]
    },
    "types": [
      "@dcloudio/types",
      "@uni-helper/uni-types",
      "@uni-helper/vite-plugin-uni-pages",
      "miniprogram-api-typings",
      "z-paging/types",
      "./src/types/async-component.d.ts",
      "./src/types/async-import.d.ts",
      "./src/typings.d.ts",
      "wot-design-uni/global.d.ts"
    ]
  },
  "vueCompilerOptions": {
    "plugins": ["@uni-helper/uni-types/volar-plugin"]
  },
  "include": ["package.json", "src/**/*.ts", "src/**/*.js", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.jsx", "src/**/*.vue", "src/**/*.json"],
  "exclude": ["node_modules", "dist"]
}
```

**Common-Types tsconfig.json 迁移后：**

```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2021",
    "outDir": "./dist",
    "baseUrl": "./"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Common-Types package.json 添加 exports：**

```jsonc
{
  "name": "@libs/common-types",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./enums": {
      "types": "./dist/enums/index.d.ts",
      "default": "./dist/enums/index.js"
    }
  }
}
```

### 4. ESLint 统一配置

**设计决策**：由于 Backend（NestJS）和前端（Vue3/uni-app）的 ESLint 生态差异较大，采用"共享基础规则 + 各应用扩展"的策略，而非强制统一为单一配置。

**根目录 eslint.config.js（新建）：**

```js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**'],
  },
];
```

**Backend eslint.config.js 迁移（替换 .eslintrc.js）：**

```js
import rootConfig from '../../eslint.config.js';
import tseslint from 'typescript-eslint';

export default [
  ...rootConfig,
  {
    languageOptions: {
      parserOptions: {
        project: 'tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
        sourceType: 'module',
      },
    },
  },
  {
    rules: {
      // Backend 特定：逐步收紧，初期保持 warn
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    ignores: ['dist/**', 'coverage/**', 'scripts/**/*.cjs'],
  },
];
```

> 注意：Backend 迁移到 flat config 需要同时将 `package.json` 添加 `"type": "module"` 或将配置文件命名为 `eslint.config.mjs`。由于 Backend 是 CommonJS 项目，建议使用 `eslint.config.mjs` 文件名。

### 5. CI/CD 工作流

**.github/workflows/ci.yml：**

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm typecheck

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build
```

**.github/CODEOWNERS：**

```
# 默认审查者
* @linlingqin77

# 后端
/apps/backend/ @linlingqin77
/prisma/ @linlingqin77

# 前端管理后台
/apps/admin-web/ @linlingqin77

# 小程序
/apps/miniapp-client/ @linlingqin77

# 共享库
/libs/ @linlingqin77

# 基础设施（需要更谨慎的审查）
turbo.json @linlingqin77
pnpm-workspace.yaml @linlingqin77
tsconfig.base.json @linlingqin77
.github/ @linlingqin77
```

### 6. Git Hooks 统一

**根 package.json 配置：**

```jsonc
{
  "simple-git-hooks": {
    "commit-msg": "pnpm commitlint --edit $1",
    "pre-commit": "pnpm lint-staged"
  },
  "lint-staged": {
    "apps/backend/**/*.ts": [
      "eslint --fix"
    ],
    "apps/admin-web/**/*.{ts,tsx,vue}": [
      "eslint --fix"
    ],
    "apps/miniapp-client/**/*.{ts,tsx,vue}": [
      "eslint --fix"
    ],
    "*.{json,md,yaml,yml}": [
      "prettier --write"
    ]
  }
}
```

**迁移步骤：**
1. 在根 `package.json` 添加 `simple-git-hooks`、`lint-staged`、`@commitlint/cli`、`@commitlint/config-conventional` 为 devDependencies
2. 添加上述 `simple-git-hooks` 和 `lint-staged` 配置
3. 从 Backend `package.json` 移除 `simple-git-hooks` 配置和 `prepare` 脚本
4. 从 Admin-Web `package.json` 移除 `simple-git-hooks` 配置和 `prepare` 脚本
5. 从 Miniapp-Client 移除 `husky` 依赖、`.husky/` 目录、`lint-staged` 配置和 `prepare` 脚本
6. 根 `package.json` 添加 `"prepare": "simple-git-hooks"` 脚本

### 7. 环境变量规范化

**命名统一方案：**

| 应用 | 当前 | 迁移后 |
|------|------|--------|
| Backend | `.env.development`, `.env.production` | 不变（已符合规范） |
| Admin-Web | `.env.dev`, `.env.prod`, `.env.test` | `.env.development`, `.env.production`, `.env.test` |
| Miniapp-Client | `env/.env.development`, `env/.env.production` | `.env.development`, `.env.production` |

**Admin-Web Vite 配置迁移：**

Admin-Web 的 `vite.config.ts` 中 `envDir` 和 mode 映射需要同步更新。当前使用 `--mode dev` 对应 `.env.dev`，迁移后使用 `--mode development` 对应 `.env.development`。

需要更新 `package.json` scripts：
```jsonc
{
  "scripts": {
    "dev": "vite --mode development",
    "build": "vite build --mode production",
    "build:dev": "vite build --mode development",
    "build:test": "vite build --mode test"
  }
}
```

**Miniapp-Client 迁移：**

当前 `vite.config.ts` 中可能配置了 `envDir: 'env/'`，需要移除该配置（Vite 默认从项目根目录读取 `.env.*`）。

**.env.example 模板（每个应用提供）：**

```bash
# apps/backend/.env.example
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# 服务端口
PORT=3000
```

## 数据模型

本改造不涉及业务数据模型变更。核心"数据模型"是各配置文件之间的依赖关系：

```mermaid
graph TD
    subgraph "配置层级"
        A[pnpm-workspace.yaml + catalog] --> B[package.json × N]
        C[tsconfig.base.json] --> D[apps/*/tsconfig.json]
        E[根 eslint.config.js] --> F[apps/*/eslint.config.js]
        G[turbo.json] --> H[package.json scripts]
        I[根 simple-git-hooks] --> J[lint-staged]
    end

    subgraph "构建产物流"
        K[Backend build] -->|openApi.json| L[common-types generate-types]
        L -->|dist/| M[Admin-Web build]
        L -->|dist/| N[Miniapp-Client build]
    end
```



## 正确性属性

*正确性属性是一种在系统所有有效执行中都应成立的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范与机器可验证正确性保证之间的桥梁。*

由于本改造主要涉及工程基础设施配置（而非业务逻辑），大多数验收标准属于配置文件的存在性/正确性检查（example 类型），不适合用属性测试。以下列出适合作为属性验证的标准：

### Property 1：共享依赖版本一致性

*For any* 第三方依赖，如果它被两个或更多工作区包引用，则所有引用该依赖的包 SHALL 使用 `catalog:` 协议或相同的版本号。

**Validates: Requirements 2.2**

### Property 2：内部包引用使用 Workspace Protocol

*For any* 工作区包的 `package.json`，如果它依赖另一个工作区内部包（`@apps/*`、`@libs/*`、`@sa/*`），则该依赖 SHALL 使用 `workspace:*` 协议声明。

**Validates: Requirements 2.4**

### Property 3：无子级锁文件

*For any* 工作区包目录，该目录下 SHALL NOT 存在 `package-lock.json` 或独立的 `pnpm-lock.yaml` 文件。

**Validates: Requirements 2.6**

### Property 4：TypeScript 配置继承基础配置

*For any* 工作区包的 `tsconfig.json`，该文件 SHALL 包含 `extends` 字段且指向根目录的 `tsconfig.base.json`。

**Validates: Requirements 3.3**

### Property 5：无分散的 Git Hooks 配置

*For any* 工作区包的 `package.json`，该文件 SHALL NOT 包含 `simple-git-hooks` 或 `husky` 相关配置，且包目录下 SHALL NOT 存在 `.husky/` 目录。

**Validates: Requirements 6.4**

### Property 6：环境变量文件命名规范

*For any* 应用目录下的 `.env.*` 文件，其文件名 SHALL 匹配 `.env.development`、`.env.production`、`.env.test` 或 `.env.example` 模式（不使用缩写如 `.env.dev`、`.env.prod`）。

**Validates: Requirements 7.1**

### Property 7：每个应用提供环境变量模板

*For any* `apps/` 下的应用目录，该目录 SHALL 包含 `.env.example` 文件。

**Validates: Requirements 7.4**

### Property 8：Backend 脚本无平台特定格式

*For any* `apps/backend/scripts/` 目录下的文件，其扩展名 SHALL NOT 为 `.bat` 或 `.sh`。

**Validates: Requirements 11.1**

### Property 9：Backend 脚本命名规范

*For any* `apps/backend/scripts/` 目录下的文件（不含扩展名），其文件名 SHALL 匹配 kebab-case 格式（`[a-z][a-z0-9]*(-[a-z0-9]+)*`）。

**Validates: Requirements 11.2**

## 错误处理

### 迁移风险与回滚策略

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Backend `strictNullChecks: true` 导致大量类型错误 | 构建失败 | 先统计错误数量，使用 `// @ts-expect-error` 逐步修复，设置 milestone |
| pnpm catalog 版本与某应用不兼容 | 运行时错误 | 逐个依赖迁移，每次迁移后运行完整测试 |
| ESLint flat config 迁移遗漏规则 | lint 行为变化 | 迁移前后对比 lint 输出，确保无新增/遗漏 |
| 环境变量重命名导致 Vite 找不到配置 | 开发/构建失败 | 同步更新 vite.config.ts 中的 mode 映射 |
| 移除嵌套 .git 导致子模块历史丢失 | 无法回溯子模块历史 | 迁移前确认所有历史已合并到主仓库 |
| Turborepo 缓存导致过时产物 | 构建结果不正确 | 提供 `pnpm clean` 命令清除 `.turbo` 缓存 |

### 回滚方案

每个改造步骤都应在独立的 Git 分支上进行，合并前确保 CI 通过。如果某步骤导致问题：
1. 回退该步骤的 commit
2. 在修复后重新提交
3. 不影响其他已完成的步骤（因为步骤间设计为低耦合）

## 测试策略

### 验证方法

由于本改造主要涉及配置文件和工程基础设施，传统的单元测试和属性测试的适用性有限。采用以下验证策略：

#### 1. 配置验证脚本

编写一个 `scripts/verify-monorepo.ts` 脚本，验证所有正确性属性（Property 1-9）。该脚本：
- 遍历所有工作区包的 `package.json` 和 `tsconfig.json`
- 检查依赖版本一致性、workspace protocol 使用、tsconfig 继承等
- 输出通过/失败的检查项列表
- 可在 CI 中作为检查步骤运行

#### 2. 冒烟测试

每个改造步骤完成后执行：
- `pnpm install`：依赖安装无错误
- `pnpm lint`：所有应用 lint 通过
- `pnpm typecheck`：所有应用类型检查通过
- `pnpm build`：所有应用构建成功
- `pnpm test`：现有测试全部通过

#### 3. 属性测试库

如果需要对配置验证脚本进行属性测试，使用 `fast-check`（Backend 已安装）。但鉴于本改造的性质，配置验证脚本使用简单的断言即可，不需要随机输入生成。

#### 4. CI 集成

配置验证脚本纳入 CI 流水线，确保后续开发不会破坏已建立的 monorepo 规范。
