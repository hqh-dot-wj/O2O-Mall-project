# Nest-Admin-Soybean 项目方针

## 项目概述

基于 **pnpm + Turborepo** 的 monorepo，包含：

- **backend**：NestJS + Prisma + 多租户
- **admin-web**：Vue3 + Naive UI 管理后台
- **miniapp-client**：uniapp 小程序 + H5

## 核心原则

1. **类型安全**：禁止 `any`；API 类型来自 `@libs/common-types`（OpenAPI 生成）
2. **Monorepo 约定**：内部包用 `workspace:*`；共享依赖用 catalog 统一版本
3. **简洁优先**：优先已有方案，不为假设的未来需求增加抽象
4. **跨包边界**：禁止 app 间直接引用源码；共享通过 `@libs/*` 或 API

## 提交前必做

```bash
pnpm verify-monorepo
pnpm lint
pnpm typecheck
pnpm test
```

## 运行命令（从根目录）

| 场景     | 命令                                                                       |
| -------- | -------------------------------------------------------------------------- |
| 开发     | `pnpm dev` / `pnpm dev:backend` / `pnpm dev:admin` / `pnpm dev:mp`         |
| 构建     | `pnpm build` / `pnpm build:backend` / `pnpm build:admin` / `pnpm build:mp` |
| 生成类型 | `pnpm generate-types`（先构建 backend）                                    |

## 环境

- **Windows + PowerShell**：命令串联用 `;` 而非 `&&`
- **Node**：>= 20.19.0
- **pnpm**：>= 10.5.0

## 需求与任务

### 模糊需求时

- 先澄清：目标、范围、现有参考（可 @ 项目内文件）
- 可引导：写 PRD 或 Notion 需求页，再 @ 该文档

### 部分实现时（后端/前端已做一部分）

- 先 gap 分析：需求 vs 代码，输出已完成/待完成/冲突
- 按依赖顺序：后端 → pnpm generate-types → 前端
- **只补缺口，不重写已完成部分**（非必要重构、风格统一不在此列）
- **遗留问题处理**：若发现已完成部分有 bug/安全/逻辑错误，应修复；修复若影响前后端契约，需同步更新前端及对应测试
- **测试同步**：每次实现或修复后，必须及时补充/更新对应测试用例

### 方案探索（实现前必做）

- 收到需求后，先思考 2–3 种实现方案，再选型
- 输出：方案列表 → 各方案优缺点 → 适用条件 → 选择依据
- 典型场景：数据量大（DB vs ES）、缓存策略（雪崩/穿透/击穿）、并发控制、数据一致性、接口设计等
- 融入 /plan、task-execution：实现前先完成方案探索，再写代码

### 跨模块时（后端+前端）

- 顺序：后端 API → 构建 → generate-types → 前端
- 禁止前端手写与后端重复的类型

### 编写测试时

- 自检：边界（null/0/负数）、异常路径、断言是否具体（避免 toBeTruthy）
- 关键逻辑建议人工 review

## 常用命令

| 命令                 | 何时用                                                    |
| -------------------- | --------------------------------------------------------- |
| /code-review         | 变更后做规范检查                                          |
| /run-tests           | 跑测试                                                    |
| /create-pr           | 生成 PR 描述                                              |
| /gap-analysis        | 需求文档 + 部分实现时，分析已完成/待完成                  |
| /plan                | 模糊需求时，先拆解任务；实现前做方案探索                  |
| /design-alternatives | 技术选型/性能/缓存等场景，列出 2–3 种方案及优劣，辅助选型 |
| /test-self-check     | 编写测试后的自检清单                                      |

### 子代理（Subagents）

可用 `/名称` 或自然语言显式调用子代理，实现串行编排（如 Planner → Implementer → Verifier）：

| 子代理             | 用途                                                           |
| ------------------ | -------------------------------------------------------------- |
| /planner           | 需求澄清、任务拆解、gap 分析、方案探索                         |
| /debugger          | 排查报错、定位根因、调试问题                                   |
| /verifier          | 验证实现是否符合规范（verify-monorepo、lint、typecheck、test） |
| /security-reviewer | 安全审查：敏感数据、权限、注入、资金类风险                     |
| /red-agent         | 红队：攻击性测试、写失败用例、找边界与异常                     |
| /green-agent       | 绿队：修复实现使红队测试通过、防御性验证                       |

**红绿对抗**：`/red-agent` 写失败用例 → `/green-agent` 修复使通过，可多轮直到无遗漏。

详见 `.cursor/agents/` 各子代理文件及 `docs/cursor-hooks-verification.md` §子代理。

## 分层指引

- 前端相关 → 见 `apps/admin-web/AGENTS.md`
- 后端相关 → 见 `apps/backend/AGENTS.md`
- 小程序相关 → 见 `apps/miniapp-client/AGENTS.md`
