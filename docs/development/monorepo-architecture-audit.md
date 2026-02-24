# Monorepo 架构审计报告

**审计日期**: 2026-02-24
**审计范围**: 整个 Monorepo 项目架构（工具链 + 代码质量 + 工程规范）
**当前综合完成度**: ~65%

---

## 1. 概述

本文档记录对项目 Monorepo 架构的全面审计结果。审计分三轮进行：

1. **自动化校验 + 人工检查**（§2-§3）：12 项自动化检查 + 配置/结构问题，已全部修复
2. **深度审计**（§4）：代码质量、架构健康度、前端结构、数据库等 7 个维度
3. **联网搜索对标**（§5）：对照 2025 行业最佳实践，补充 5 项新发现

### 1.1 仓库结构概览

```
nest-admin-soybean-monorepo/
├── apps/
│   ├── backend/          (@apps/backend)    NestJS + Prisma
│   ├── admin-web/        (@apps/admin-web)  Vue3 + Soybean + Vite7
│   └── miniapp-client/   (@apps/miniapp-client)  uni-app + Vue3 + Vite5
├── libs/
│   ├── common-types/     (@libs/common-types)
│   ├── common-utils/     (@libs/common-utils)
│   └── common-constants/ (@libs/common-constants)
├── apps/admin-web/packages/  (@sa/* 内部包，10 个)
├── docs/
├── scripts/
│   └── verify-monorepo.mjs   (12 项自动化检查)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 2. 自动化检查结果（P1-P12）— ✅ 全部通过

| 编号 | 检查项                  | 状态 | 说明                                                     |
| ---- | ----------------------- | ---- | -------------------------------------------------------- |
| P1   | 共享依赖版本一致性      | ✅   | catalog 统一管理 40+ 共享依赖                            |
| P2   | 内部包引用 workspace:\* | ✅   | 所有内部包使用 workspace 协议                            |
| P3   | 无子级锁文件            | ✅   | 仅根目录保留 pnpm-lock.yaml                              |
| P4   | tsconfig 继承根配置     | ✅   | 各子包 extends tsconfig.base.json                        |
| P5   | 无分散 Git Hooks        | ✅   | 仅根目录配置 simple-git-hooks                            |
| P6   | 环境变量文件命名规范    | ✅   | 仅允许 .env / .env.{development,production,test,example} |
| P7   | 各应用提供 .env.example | ✅   | 所有 app 均有 .env.example                               |
| P8   | Backend 脚本无 .bat/.sh | ✅   | 使用跨平台脚本格式                                       |
| P9   | Backend 脚本 kebab-case | ✅   | 脚本文件名符合命名规范                                   |
| P10  | 包命名规范              | ✅   | @apps/_, @libs/_, @sa/\*                                 |
| P11  | 无内部包循环依赖        | ✅   | DFS 检测无环                                             |
| P12  | 包边界正确              | ✅   | libs 不依赖 apps                                         |

---

## 3. 第一轮人工审计（配置与结构）— ✅ 已全部修复

### 3.1 P0 级（阻塞性）— ✅ 已修复

1. **子包独立 .git/ 目录** — 删除 3 个子包的 `.git/`，根 `.gitignore` 加防护规则
2. **admin-web 非规范 .env 文件** — 删除 `.env.dev`、`.env.prod`（与规范文件内容一致）
3. **Backend 无效 logs:\* 脚本** — 删除 5 个引用不存在 `view-logs.sh` 的脚本

### 3.2 P1 级（高优先级）— ✅ 已修复

1. **应用包缺 private: true** — admin-web、miniapp-client 已补齐
2. **Backend 缺 typecheck 脚本** — 已添加 `"typecheck": "tsc --noEmit"`
3. **@sa/utils crypto-js 未用 catalog** — 已改为 `catalog:`
4. **子包独立配置文件** — .editorconfig/.commitlintrc/.gitattributes/.npmrc 合并到根；ESLint 按技术栈合理分离并优化（backend 1146->877，admin-web 410->377）
5. **miniapp-client 冗余 env/ 目录** — 文件提升到根级，删除 env/
6. **engines 声明不一致** — 统一为 `node>=20.19.0, pnpm>=10.5.0`

### 3.3 P2 级（中优先级）— ✅ 已修复

1. **子包 IDE 配置目录** — 已清理，.gitignore 已覆盖
2. **P6 检查增强** — 裸 `.env` 纳入检测范围
3. **ESLint 配置分散** — 已在 P1-4 中处理
4. **sass 版本不一致** — 统一为 `1.94.0` 纳入 catalog

---

## 4. 深度审计发现（代码质量 + 架构健康度）

### 4.1 后端 Service 质量

#### 4.1.1 God Class（违反规范 §14.2：Service <= 300 行）

14 个 Service 超标：

| Service                       | 行数 | 超标 | 优先级 |
| ----------------------------- | ---- | ---- | ------ |
| file-manager.service.ts       | 840  | 2.8x | P0     |
| upload.service.ts             | 603  | 2x   | P0     |
| ledger.service.ts             | 599  | 2x   | P1     |
| tenant.service.ts             | 599  | 2x   | P1     |
| tool.service.ts               | 568  | 1.9x | P1     |
| rule-validator.service.ts     | 522  | 1.7x | P1     |
| approval.service.ts           | 447  | 1.5x | P1     |
| user.service.ts               | 437  | 1.5x | P1     |
| store-order.service.ts        | 418  | 1.4x | P2     |
| order.service.ts (client)     | 391  | 1.3x | P2     |
| config.service.ts (marketing) | 367  | 1.2x | P2     |
| course-group-buy.service.ts   | 348  | 1.2x | P2     |
| redis.service.ts              | 343  | 1.1x | P2     |
| product.service.ts (store)    | 338  | 1.1x | P2     |

建议：file-manager（840 行）和 upload（603 行）优先拆分，按职责分为多个子 Service。其余 1.1x-1.5x 的可在改动时顺带偿还。

#### 4.1.2 any 使用泛滥（违反规范"禁止 any"）

| 位置                   | any 数量  |
| ---------------------- | --------- |
| backend/marketing      | 176       |
| backend/admin          | 147       |
| backend/common (infra) | 127       |
| admin-web              | 222       |
| miniapp-client         | 94        |
| backend/client         | 33        |
| backend/lbs            | 25        |
| **总计**               | **~820+** |

策略：不强制一次性清除，采用**顺带偿还**模式 — 改动文件时消除该文件的 any。新代码严格禁止 any。

### 4.2 后端结构问题

#### 4.2.1 重复目录 — constant/ vs constants/

`apps/backend/src/common/` 下同时存在 `constant/` 和 `constants/` 两个目录，内容有重叠（都有 `business.constant(s).ts`）。应合并为一个。

优先级：P1（低成本修复，消除混淆）

#### 4.2.2 空模块/空目录

- `worker/` 模块是空目录（app.module.ts 未导入，不影响运行但占位置）
- `apps/admin-web/packages/ofetch/` 是空目录，没有 package.json

优先级：P2（删除即可）

#### 4.2.3 RiskModule 不应 @Global()

RiskModule 标记为 `@Global()`，所有模块都能注入 RiskService。但实际只有 order 模块需要它，应改为普通模块，由需要的模块显式 import。

优先级：P1

#### 4.2.4 Backend strictNullChecks: false

`tsconfig.base.json` 设置了 `strictNullChecks: true`，但 backend 的 `tsconfig.json` 覆盖为 `false`。空值安全完全失效，大量潜在 NPE 不会被编译器捕获。

优先级：P1（但修复工作量大，需渐进开启）

#### 4.2.5 FinanceModule 导出 Repository

FinanceModule 的 exports 中包含 4 个 Repository（WithdrawalRepository、CommissionRepository、WalletRepository、TransactionRepository）。按规范应只导出 Service，Repository 是内部实现细节。

优先级：P2

#### 4.2.6 MarketingModule 7 个 forwardRef 循环依赖

MarketingPlayModule 使用 `forwardRef(() => MarketingPlayModule)` 导入导出，说明存在模块间循环依赖。虽然 forwardRef 能让它跑起来，但这是架构异味。

优先级：P2（重构时解决）

### 4.3 前端结构问题

#### 4.3.1 admin-web API 文件组织不一致

`service/api/` 下，system、monitor、pms、store、lbs、tool 按目录组织，但 marketing（6 个文件）、finance、member、order 等散落在根目录。应统一按模块目录组织。

优先级：P2（改动时顺带整理）

#### 4.3.2 admin-web 共享类型使用率极低

16 个 API typings 文件中，只有 `system.api.d.ts` 引用了 `@libs/common-types`（3 个类型：Config、Role、User）。其余 15 个文件全部手写类型，与 OpenAPI 生成的类型脱节。

优先级：P2（渐进偿还，改动时顺带迁移，不强制一次性全量）

#### 4.3.3 @sa/\* 内部包无质量脚本

10 个 @sa/\* 包没有 lint/build/typecheck 脚本，`pnpm lint` 和 `pnpm typecheck` 完全不覆盖这些包。

优先级：P1

### 4.4 libs 共享层问题

#### 4.4.1 libs 缺 private: true

3 个 libs 包都没有 `private: true`，可能被意外 publish 到 npm。

优先级：P0（5 分钟修复）

#### 4.4.2 libs 缺 lint/typecheck 脚本

`pnpm lint` 和 `pnpm typecheck` 不覆盖 libs 包，质量盲区。

优先级：P1

#### 4.4.3 libs 缺 README

3 个 libs 包都没有 README，新人不知道每个包的用途和 API。

优先级：P2

#### 4.4.4 libs 使用 CommonJS module

libs 的 tsconfig 设置 `"module": "commonjs"`，但 admin-web 和 miniapp-client 都是 ESM 项目。可能导致 tree-shaking 失效。

优先级：P3（当前能跑，改 Internal Packages 模式时一并解决）

### 4.5 文档与 README

#### 4.5.1 根目录缺 README.md

整个 monorepo 没有根 README。新人 clone 后不知道项目是什么、怎么启动。

优先级：P1

#### 4.5.2 backend 和 admin-web 缺根 README

两个主要应用都没有 README.md。

优先级：P2

### 4.6 数据库层

#### 4.6.1 Prisma schema 单文件过大

55 个 model、33 个 enum、160 个 @@index、17 个 @@unique、19 个 migration，共 2340 行单文件。团队协作时容易冲突。

优先级：P3（渐进改善，Prisma multi-file schema 支持还较新）

索引覆盖看起来不错，这部分做得好。

### 4.7 监控与可观测性

健康检查（Terminus + liveness/readiness）和 Prometheus 指标已配置，做得不错。

缺 OpenTelemetry 分布式追踪。

优先级：⚠️ **当前阶段过度设计** — 单体应用 + 单进程部署，分布式追踪收益极低。等拆分微服务或多实例部署时再引入。

---

## 5. 联网搜索对标（2025 行业最佳实践）

基于 Turborepo、pnpm、NestJS 的 2025 生产级 monorepo 最佳实践进行对标，新增 5 项发现。

### 5.1 实际问题（应修复）

#### 5.1.1 CI 缺 pnpm audit（供应链安全）

CI 中未执行 `pnpm audit`，已知漏洞的依赖可能长期留在项目中无人感知。文档中提到了 `pnpm audit`，但 `.github/workflows/ci.yml` 未包含。

修复：CI 中 install 后加一步 `pnpm audit --audit-level=high`。

优先级：P1（一行命令，供应链安全基线）

#### 5.1.2 turbo.json 缺 globalDependencies / globalPassThroughEnv

修改 `tsconfig.base.json` 或环境变量后，Turbo 缓存不会自动失效，可能导致构建结果不一致。

修复：

```json
{
  "globalDependencies": ["tsconfig.base.json"],
  "globalPassThroughEnv": ["NODE_ENV", "CI"]
}
```

优先级：P0（10 分钟修复，防缓存不一致）

#### 5.1.3 CI 缺 timeout-minutes

`.github/workflows/ci.yml` 中无 `timeout-minutes`，挂起的 CI 会浪费 runner 资源。

修复：job 级别加 `timeout-minutes: 15`。

优先级：P1（5 分钟修复）

#### 5.1.4 根缺 clean 脚本

缓存污染或构建异常时，开发者没有标准化的清理方式。

修复：根 package.json 加 `"clean": "turbo run clean"` 和各包的 clean 脚本。

优先级：P1（10 分钟修复，DX 提升）

### 5.2 渐进改善（有价值但不紧急）

#### 5.2.1 libs 改用 Internal Packages 模式（Live Types）

当前 libs 使用编译模式（`main: "dist/index.js"`），消费方需要先 `^build` 才能获得类型。Turborepo 官方推荐 Internal Packages 模式，直接指向源码（`main: "./src/index.ts"`），即时类型反馈，无需 build 步骤。

收益：开发体验大幅提升，`dev` 任务不再需要 `dependsOn: ["^build"]`。
工时：1-2 小时，需要改 libs 的 package.json exports + tsconfig。

#### 5.2.2 CI 使用 turbo --affected

当前 CI 全量执行 lint/typecheck/test/build。Turborepo 2.x 支持 `--affected` 仅运行受变更影响的包。

收益：PR CI 时间减少 60-80%。
现状：当前 3 个 app + 3 个 libs 规模不大，全量跑也能接受。规模增长后再引入。

#### 5.2.3 配置 Dependabot/Renovate

当前无自动化依赖更新工具。手动更新容易遗漏安全补丁。

收益：自动创建依赖更新 PR，减少人工维护。
现状：非阻塞，但建议近期配置。

### 5.3 当前阶段过度设计（不建议现在做）

| 项目                                   | 理由                             |
| -------------------------------------- | -------------------------------- |
| License 合规检查（pnpm licenses list） | 内部项目非开源分发，优先级极低   |
| Docker + turbo prune 多阶段构建        | 没有容器化部署需求前不需要       |
| OpenTelemetry 分布式追踪               | 单体应用阶段收益极低             |
| Changesets 版本管理                    | 内部包不发布 npm，无需语义化版本 |
| Prisma multi-file schema               | 当前单人/小团队开发，冲突概率低  |

### 5.4 已确认存在（之前误判为缺失）

| 项目                               | 状态                                 |
| ---------------------------------- | ------------------------------------ |
| `.github/CODEOWNERS`               | ✅ 已有，内容详细到模块级别          |
| `.github/PULL_REQUEST_TEMPLATE.md` | ✅ 已有，覆盖变更类型/测试/安全/性能 |
| `.github/ISSUE_TEMPLATE/`          | ✅ 已有                              |

---

## 6. 综合完成度评估

### 6.1 各维度评分（14 维度）

| 维度               | 完成度 | 关键问题                                                  |
| ------------------ | ------ | --------------------------------------------------------- |
| Monorepo 工具链    | 80%    | 缺 globalDependencies/Env、clean 脚本                     |
| 依赖管理           | 90%    | catalog 完善；缺 CI audit、无 Dependabot                  |
| 配置一致性         | 85%    | 已合并大部分；ESLint 按技术栈合理分离                     |
| CI/CD 质量门禁     | 70%    | 缺 audit、timeout-minutes、--affected                     |
| 质量门禁（自动化） | 95%    | 12 项检查全部通过                                         |
| 共享层成熟度       | 60%    | 缺 private/lint/README；未用 Live Types；CommonJS         |
| 跨应用类型安全     | 65%    | miniapp-client 已接入；admin-web 仅 3 个类型              |
| 测试覆盖           | 30%    | backend ~10 spec；admin-web 0；miniapp-client 0；libs 0   |
| TypeScript 严格性  | 55%    | 820+ any；backend strictNullChecks:false                  |
| 后端架构健康度     | 50%    | 14 God Class；forwardRef 循环依赖；RiskModule @Global     |
| 后端代码质量       | 50%    | 820+ any；重复目录；空模块；FinanceModule 导出 Repository |
| 前端架构健康度     | 60%    | API 组织混乱；@sa/\* 无质量脚本；共享类型脱节             |
| 文档与 README      | 60%    | 缺根 README；缺 app README；libs 无 README                |
| 数据库设计         | 80%    | 索引覆盖好；schema 单文件过大（渐进改善）                 |

### 6.2 综合评估

```
综合完成度: ~65%

已完成:
  [════════════════════════════════░░░░░░░░░░░░░░░░░░] 65%

各维度雷达:
  Monorepo 工具链       ████████░░ 80%
  依赖管理              █████████░ 90%
  配置一致性            ████████░░ 85%
  CI/CD 质量门禁        ███████░░░ 70%
  质量门禁（自动化）    █████████░ 95%
  共享层成熟度          ██████░░░░ 60%
  跨应用类型安全        ██████░░░░ 65%
  测试覆盖              ███░░░░░░░ 30%
  TypeScript 严格性     █████░░░░░ 55%
  后端架构健康度        █████░░░░░ 50%
  后端代码质量          █████░░░░░ 50%
  前端架构健康度        ██████░░░░ 60%
  文档与 README         ██████░░░░ 60%
  数据库设计            ████████░░ 80%
```

### 6.3 与 88% 的差异说明

第一轮审计（§2-§3）仅覆盖 Monorepo 工具链维度，得出 88%。深度审计扩展到代码质量、架构健康度、测试等维度后，综合完成度降至 65%。主要拉低项：测试覆盖（30%）、后端架构/代码质量（50%）、TypeScript 严格性（55%）。

---

## 7. 修复优先级总览

### 7.1 快速修复（< 1 小时，立即可做）

| 序号 | 任务                                                  | 工时    | 来源   |
| ---- | ----------------------------------------------------- | ------- | ------ |
| Q1   | libs 加 private: true                                 | 5 分钟  | §4.4.1 |
| Q2   | turbo.json 加 globalDependencies/globalPassThroughEnv | 10 分钟 | §5.1.2 |
| Q3   | CI 加 timeout-minutes: 15                             | 5 分钟  | §5.1.3 |
| Q4   | CI 加 pnpm audit --audit-level=high                   | 5 分钟  | §5.1.1 |
| Q5   | 根 package.json 加 clean 脚本                         | 10 分钟 | §5.1.4 |
| Q6   | 删除空模块 worker/、ofetch/                           | 5 分钟  | §4.2.2 |

### 7.2 短期修复（1-5 天）

| 序号 | 任务                              | 工时    | 来源   |
| ---- | --------------------------------- | ------- | ------ |
| S1   | 合并 constant/ 和 constants/      | 1 小时  | §4.2.1 |
| S2   | RiskModule 去掉 @Global()         | 30 分钟 | §4.2.3 |
| S3   | libs 加 lint/typecheck 脚本       | 1 小时  | §4.4.2 |
| S4   | @sa/\* 加 lint/typecheck 脚本     | 2 小时  | §4.3.3 |
| S5   | 编写根 README.md                  | 1 小时  | §4.5.1 |
| S6   | libs 加 README                    | 1 小时  | §4.4.3 |
| S7   | FinanceModule 停止导出 Repository | 1 小时  | §4.2.5 |
| S8   | libs 改 Internal Packages 模式    | 2 小时  | §5.2.1 |
| S9   | 配置 Dependabot                   | 30 分钟 | §5.2.3 |

### 7.3 中期偿还（渐进式，改动时顺带）

| 序号 | 任务                              | 策略                                     | 来源   |
| ---- | --------------------------------- | ---------------------------------------- | ------ |
| M1   | 消除 any（820+）                  | 改动文件时消除该文件的 any               | §4.1.2 |
| M2   | admin-web 共享类型迁移            | 改动 API 时顺带迁移到 @libs/common-types | §4.3.2 |
| M3   | admin-web API 目录整理            | 改动模块时顺带移入对应目录               | §4.3.1 |
| M4   | backend strictNullChecks 渐进开启 | 按模块逐步开启                           | §4.2.4 |

### 7.4 长期重构（需专项排期）

| 序号 | 任务                                         | 工时        | 来源   |
| ---- | -------------------------------------------- | ----------- | ------ |
| L1   | 拆分 file-manager.service（840 行）          | 1-2 天      | §4.1.1 |
| L2   | 拆分 upload.service（603 行）                | 1 天        | §4.1.1 |
| L3   | 拆分其余 12 个超标 Service                   | 各 0.5-1 天 | §4.1.1 |
| L4   | 解决 MarketingPlayModule forwardRef 循环依赖 | 1-2 天      | §4.2.6 |
| L5   | 补充测试覆盖（当前 ~30%）                    | 持续        | §6.1   |

### 7.5 不建议现在做（过度设计）

| 项目                     | 理由                 |
| ------------------------ | -------------------- |
| OpenTelemetry 分布式追踪 | 单体应用，收益极低   |
| License 合规检查         | 内部项目，非开源分发 |
| Docker + turbo prune     | 无容器化部署需求     |
| Changesets 版本管理      | 内部包不发布 npm     |
| Prisma multi-file schema | 小团队冲突概率低     |
| CI turbo --affected      | 当前规模全量跑可接受 |

---

## 8. 已完成的架构改进（回顾）

| 步骤   | 内容                                                     | 完成日期   |
| ------ | -------------------------------------------------------- | ---------- |
| Step 1 | miniapp-client 集成到 Monorepo                           | 2026-02-24 |
| Step 2 | 扩展共享层（@libs/common-utils、@libs/common-constants） | 2026-02-24 |
| Step 3 | 增强质量门禁（P10-P12 检查）                             | 2026-02-24 |
| Step 4 | 跨应用类型安全链（miniapp-client 接入共享类型）          | 2026-02-24 |
| Step 5 | P0/P1/P2 全部修复（§3 所有问题）                         | 2026-02-24 |
| Step 6 | CI pipeline 建立 + steering 规范更新                     | 2026-02-24 |
| Step 7 | admin-web handleTree/isNull 提取到共享层                 | 2026-02-24 |

---

## 9. 相关文档

- [依赖管理规范](dependency-management.md)
- [架构优化任务记录](architecture-optimization-tasks.md)
- [Monorepo 开发规范](../../.kiro/steering/monorepo.md)
- [verify-monorepo 校验脚本](../../scripts/verify-monorepo.mjs)
- [CODEOWNERS 使用指南](codeowners-guide.md)
- [GitHub 配置指南](github-setup.md)

---

**文档版本**: 2.0.0
**编写日期**: 2026-02-24
**最后更新**: 2026-02-24
**变更记录**:

- v2.0.0 (2026-02-24): 全面重写，新增深度审计（§4）+ 联网搜索对标（§5），14 维度评估，综合完成度从 88% 修正为 65%
- v1.1.0 (2026-02-24): P0/P1/P2 全部修复完成
- v1.0.0 (2026-02-24): 初始版本
  **维护者**: @linlingqin77
