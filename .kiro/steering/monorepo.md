---
inclusion: fileMatch
fileMatchPattern: '{package.json,pnpm-workspace.yaml,turbo.json,**/package.json,pnpm-lock.yaml}'
---

# Monorepo 项目开发规范

开发时**必须**意识到这是 **pnpm + Turborepo** 的 monorepo，所有改动需符合根目录与工作区约定。

## 1. 仓库结构

- **根目录**：仅保留 `package.json`、`pnpm-workspace.yaml`、`turbo.json`、`scripts/`、共享配置。**依赖只在根或各子包声明，不重复安装。**
- **apps/**：可部署应用（`backend`、`admin-web`、`miniapp-client`）。
- **apps/admin-web/packages/**：admin-web 内部共享包，命名空间 `@sa/*`。
- **libs/**：跨应用共享库（`@libs/common-types`、`@libs/common-utils`、`@libs/common-constants`）。

## 2. 依赖与版本

- **内部包引用**：**必须**使用 `workspace:*`，禁止写死版本。
- **共享依赖版本**：`pnpm-workspace.yaml` 中通过 **catalog** 统一版本。子包优先使用 `catalog:` 引用。
- **安装位置**：依赖装在**使用它的那个包**的 `package.json` 里。
- **锁文件**：仅根目录保留 `pnpm-lock.yaml`。

## 3. Turbo 与脚本

- 任务定义在根目录 `turbo.json`。需要先构建依赖包时使用 `dependsOn: ["^build"]`。
- 运行方式从根目录用 pnpm 跑 Turbo：`pnpm dev`、`pnpm build`、`pnpm generate-types`、`pnpm lint`、`pnpm typecheck`、`pnpm test`。

## 4. 跨包引用与边界

- **禁止**通过相对路径跨到其他 app 的源码。跨应用共享只通过 `@libs/*` 或 API 调用。
- **允许**同一 app 内子包互相引用，均用 `workspace:*`。

## 5. 配置与 Git

- 各子包 `tsconfig.json` 应 **extends** 根目录的 `tsconfig.base.json`。
- Git Hooks 只在**根目录**配置。
- 环境变量：`.env.development`、`.env.production`、`.env.test`、`.env.example`。

## 6. 运行环境

- 开发环境为 **Windows**，终端为 **PowerShell**。
- PowerShell **不支持** `&&` 串联命令，使用 `;` 分隔。
- package.json scripts 内可使用 `&&`（Node 环境解析）。

## 7. 校验与 CI

改完依赖或结构后执行 **`pnpm verify-monorepo`**，通过后再提交。

## 8. 项目补充规则

1. **路径别名**：backend 用 `@src/*`，admin-web/miniapp-client 用 `@/*`。
2. **API 类型来源**：前端 `Api.*` 类型必须来自 `@libs/common-types` 的 generate-types 生成。
3. **类型生成顺序**：先构建 backend → 再 `pnpm generate-types`。
4. **根 pnpm.overrides**：子包不要对同一依赖再写 overrides。
5. **lint-staged 范围**：新增 app 时须在根 `package.json` 的 `lint-staged` 中加入路径。
6. **新增共享依赖**：先加入 catalog，子包用 `catalog:` 引用。
7. **Turbo 新任务**：产出文件的任务必须配置 **outputs**。
8. **应用包 private**：可部署 app 保持 `private: true`。
9. **Prisma 归属**：仅 backend 使用，migrate/seed/generate 仅在 backend 目录执行。
10. **根 prepare 脚本**：勿删除，保证 Git hooks 生效。
11. **Backend scripts**：禁止 `.bat`、`.sh`；脚本文件名使用 kebab-case。
12. **engines 对齐**：各 app 的 `engines` 建议与根对齐。

## 9. AI 协作纪律

- **复杂任务先拆解**：先列出阶段计划再动手。
- **研究成果及时落盘**：每读取 2-3 个文件后总结关键发现。
- **错误 3-Strike 协议**：同一问题最多尝试 3 种方案；3 次未解决则向用户说明。
- **完成前核对**：标记完成前回顾最初目标。
- **不重复犯错**：已证明失败的路径不再尝试。

## 10. 共享层管理规范

| 包                       | 职责                                   |
| ------------------------ | -------------------------------------- |
| `@libs/common-types`     | OpenAPI 生成的 API 类型 + 业务实体别名 |
| `@libs/common-utils`     | 跨应用通用工具函数                     |
| `@libs/common-constants` | 跨应用共享常量                         |

**提取条件**：至少 2 个 app 使用、签名和行为一致、无平台特定依赖。

## 11. 跨应用类型安全规范

- **类型来源优先级**：首选 `@libs/common-types` 中 OpenAPI 生成类型，次选业务实体别名，末选各 app 内部 typings。
- **新增 API 流程**：后端修改 → 构建 backend → `pnpm generate-types` → 前端从 `@libs/common-types` 引用。

## 12. CI/CD 质量门禁

CI 执行顺序：`pnpm install` → `pnpm verify-monorepo` → `pnpm lint` → `pnpm typecheck` → `pnpm test` → `pnpm build`。任一步骤失败则阻塞合并。
