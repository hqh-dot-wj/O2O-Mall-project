# Cursor Rules 改造执行方案

> 整合 `cursor-rules-refactor-plan.md` 与 `cursor-rules-refactor-critique-and-supplement.md`，给出**具体怎么改**的分阶段执行计划。

---

## 一、改造原则

1. **先验证再落地**：Cursor Hooks/Commands/Agents 的实际行为先确认，再写脚本
2. **增量改造**：不一次性大改，每阶段可独立验证、可回退
3. **补齐缺口**：优先补齐批判分析中的缺口（模糊需求、部分实现、测试质量、跨模块顺序）
4. **项目结合**：利用现有 config-operate-drawer、RuleSchema、Notion 等能力

---

## 二、阶段总览

| 阶段               | 内容                              | 产出              | 预估 |
| ------------------ | --------------------------------- | ----------------- | ---- |
| **0. 验证**        | Cursor 能力验证                   | 验证报告          | 0.5d |
| **1. 入口增强**    | AGENTS.md + 新 Commands           | 文档与命令        | 0.5d |
| **2. Hooks 基础**  | afterFileEdit、beforeSubmitPrompt | hooks.json + 脚本 | 1d   |
| **3. Rules 精简**  | common/ + 应用层拆分              | 新 rules 结构     | 1d   |
| **4. Skills 迁移** | P2C、D2C 等迁出 rules             | skills 目录       | 0.5d |
| **5. 缺口补齐**    | gap-analysis、测试自检、llms.txt  | 新命令与文档      | 1d   |

---

## 三、阶段 0：Cursor 能力验证（必须先做）

### 3.1 验证清单

| 项             | 操作                                                            | 预期                                         |
| -------------- | --------------------------------------------------------------- | -------------------------------------------- |
| Hooks 支持     | 创建 `.cursor/hooks.json`，写最小 afterFileEdit（echo stdin）   | 编辑文件后脚本被调用                         |
| Hooks 输入格式 | 脚本内 `console.error(JSON.stringify(JSON.parse(stdin)))`       | 确认 path/file 等字段名                      |
| Commands 发现  | 用户输入 `/`                                                    | 是否列出 code-review、create-pr、run-tests   |
| Agents 调用    | 用户 @verifier 或类似                                           | Agent 是否被加载、如何触发                   |
| **子代理支持** | 查 Cursor 文档 + 实测：是否支持 delegate 到子 Agent（串行即可） | 若支持，可设计 方案探索→实现→测试 的链式调用 |
| Rules globs    | 编辑 `apps/backend/xxx.ts`                                      | backend.mdc 是否被注入                       |

### 3.2 验证脚本（最小可用）

```json
// .cursor/hooks.json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [
      {
        "command": "node -e \"const d=require('fs').readFileSync(0,'utf8');require('fs').writeSync(2,d);process.stdout.write(d)\"",
        "description": "Echo test"
      }
    ]
  }
}
```

若 Cursor 无 `hooks.json` 或格式不同，**阶段 2 改为「文档化建议」**，不实现脚本。

---

## 四、阶段 1：入口增强（AGENTS.md + 新 Commands）

### 4.1 根 AGENTS.md 补充

在现有 AGENTS.md 末尾（或「分层指引」前）增加：

```markdown
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
```

### 4.2 新增 Commands

| 命令文件                                  | 内容                                                                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.cursor/commands/gap-analysis.md`        | 输入：@需求文档 + 可选路径。输出：已完成项、待完成项、冲突项。步骤：1) 读需求 2) 语义搜索相关代码 3) 逐项对比 4) 输出表格                                                       |
| `.cursor/commands/plan.md`                | 输入：模糊需求或 @文档。输出：澄清清单 或 任务列表。步骤：1) 若模糊则输出澄清问题 2) 若已结构化则按 task-execution 拆任务 3) 实现前含方案探索                                   |
| `.cursor/commands/design-alternatives.md` | 输入：需求或技术场景（如「列表查询数据量大」「Redis 缓存」）。输出：2–3 种方案、优缺点、适用条件、选择依据。典型：DB vs ES、雪崩/穿透/击穿、并发、一致性、接口设计（详见 §8.5） |
| `.cursor/commands/test-self-check.md`     | 编写测试后的自检清单：边界、异常、断言具体性、应失败用例                                                                                                                        |

### 4.3 llms.txt（项目速览）

在根目录或 `docs/` 创建 `llms.txt` 或 `docs/llms-project-overview.md`（< 200 行）：

```markdown
# Nest-Admin-Soybean — LLM 速览

## 技术栈

- Backend: NestJS + Prisma + Redis
- Admin: Vue3 + Naive UI + Pinia
- Miniapp: uniapp + wot-design-uni

## 目录

- apps/backend/src/module/ — 按能力域
- apps/admin-web/src/views/ — 按模块/实体
- libs/common-types — API 类型（OpenAPI 生成）

## 必遵

- API 类型来自 @libs/common-types
- Backend: Result.ok / BusinessException.throwIf
- 提交前: pnpm verify-monorepo; pnpm lint; pnpm typecheck; pnpm test

## 低代码/配置化参考

- config-operate-drawer.vue — RuleSchema 动态表单 + Iframe 预览
- template-operate-drawer.vue — Schema Builder
- rule-validator.service.ts — 规则校验
```

---

## 五、阶段 2：Hooks 基础

**前提**：阶段 0 验证通过。

### 5.1 hooks.json

```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [
      {
        "command": "node .cursor/hooks/after-file-edit.js",
        "description": "Format + ESLint on edited file"
      }
    ],
    "beforeSubmitPrompt": [
      {
        "command": "node .cursor/hooks/before-submit-prompt.js",
        "description": "Detect secrets in prompt"
      }
    ]
  }
}
```

### 5.2 after-file-edit.js 逻辑

1. 读 stdin JSON，取 `path` 或 `file`
2. 排除：node_modules、dist、_.spec.ts、_.test.ts
3. 若路径在 apps/backend → `pnpm --filter @apps/backend exec eslint --fix <path>`
4. 若在 apps/admin-web → 同上
5. 若在 apps/miniapp-client → 同上
6. 原样回传 stdin 到 stdout
7. **策略**：lint 失败时 `exit 0` 仅警告（不阻断），避免编辑体验过差

### 5.3 before-submit-prompt.js 逻辑

1. 读 stdin，取 `prompt` 文本
2. 正则检测：`sk-[a-zA-Z0-9]`、`ghp_[a-zA-Z0-9]`、`AKIA[A-Z0-9]{16}`
3. 命中 → `exit 2` 阻断，stderr 输出提示
4. 否则 `exit 0`

### 5.4 Windows 兼容

- 脚本用 Node.js，不用 bash
- 路径用 `path.join`，不用 `/`
- 命令用 `child_process.spawn`，不依赖 shell

---

## 六、阶段 3：Rules 精简

### 6.1 新结构

```
.cursor/rules/
├── common/
│   ├── core.mdc          # 类型安全、异常、复杂度、提交前（< 50 行）
│   ├── monorepo.mdc      # workspace:*、catalog、包边界（< 60 行）
│   └── security.mdc      # 敏感数据、幂等、限流（< 40 行）
├── backend/
│   └── nestjs.mdc        # Result、BusinessException、Repository、租户（globs: apps/backend/**）
├── admin-web/
│   └── vue.mdc           # Props/Emits、API 类型、目录结构（globs: apps/admin-web/**）
└── miniapp/
    └── uniapp.mdc        # 条件编译、Design Token（globs: apps/miniapp-client/**）
```

### 6.2 迁移对照

| 原规则                                                                                                        | 处理                                                                       |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| core-principles.mdc                                                                                           | 压缩 → common/core.mdc                                                     |
| monorepo.mdc                                                                                                  | 压缩 → common/monorepo.mdc                                                 |
| backend.mdc                                                                                                   | 拆「响应/异常/Repository」→ backend/nestjs.mdc；安全 → common/security.mdc |
| admin-web.mdc                                                                                                 | 压缩 → admin-web/vue.mdc                                                   |
| miniapp-client.mdc                                                                                            | 压缩 → miniapp/uniapp.mdc                                                  |
| backend-p2c、miniapp-d2c、process-testing、documentation、task-execution、commit-message、backend-third-party | 迁出 → skills/                                                             |
| architecture-\*、testing、notion-workspace                                                                    | 保留在 rules/ 或移 docs/，按需                                             |

### 6.3 miniapp 应用级 rules

- `apps/miniapp-client/.cursor/rules/` 保留
- 明确：应用级 rules 与根 rules/miniapp/ 的关系——**应用级优先**，根级作补充
- 若重复，合并到应用级，根 miniapp/uniapp.mdc 只写「见 apps/miniapp-client/.cursor/rules/」

---

## 七、阶段 4：Skills 迁移

### 7.1 新建 Skills 目录

| Skill                    | 来源                        | description                                                                                                                                                                      |
| ------------------------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| backend-p2c              | backend-p2c.mdc             | Generate backend code from PRD. Use when creating NestJS code from requirements.                                                                                                 |
| miniapp-d2c              | miniapp-d2c.mdc             | Generate miniapp UI from design. Use when converting design to Vue code.                                                                                                         |
| miniapp-p2c              | miniapp-p2c.mdc             | Generate miniapp logic from PRD. Use when injecting logic from requirements.                                                                                                     |
| process-testing          | process-testing.mdc         | Process Spec + Rule ID testing. Use when writing backend tests for state/amount/concurrency.                                                                                     |
| commit-message           | commit-message.mdc          | Generate commit messages. Use when user asks for commit message.                                                                                                                 |
| task-execution           | task-execution-workflow.mdc | Execute tasks from requirements. Use when user provides requirements doc.                                                                                                        |
| marketing-config-pattern | 新增                        | Marketing config with RuleSchema. Use when extending play templates or config drawers.                                                                                           |
| solution-exploration     | 新增                        | Before implementation: list 2–3 alternatives with pros/cons. Use when data volume, cache (avalanche/penetration/breakdown), concurrency, consistency, or API design is involved. |

### 7.2 迁移后删除 rules 中对应文件

---

## 八、阶段 5：缺口补齐

### 8.1 gap-analysis 命令（已见 4.2）

### 8.2 测试自检清单（test-self-check.md）

```markdown
# 测试自检

编写测试后，逐项检查：

- [ ] 是否覆盖 null/undefined/0/负数/空字符串
- [ ] 是否覆盖「应失败」场景（如参数非法、权限不足）
- [ ] 断言是否具体（避免 toBeTruthy、toBeDefined）
- [ ] 是否有对应 Process Spec 的 Rule ID（若适用）
- [ ] 命名是否用 Given/When/Then 格式（若适用）
```

### 8.3 红绿对抗（Cursor 限制下的替代）

**若 Cursor 不支持多子代理并行**，用「单 Agent 两轮」替代：

1. **第一轮**：写实现 + 主路径测试 + 边界测试
2. **第二轮**：同一 Agent，提示「现在你扮演红方，尝试找出上述测试的漏洞：漏掉的边界、错误的断言、应失败但未写的用例」，输出补充用例

通过「两轮提示」模拟红绿对抗，无需多 Agent。

### 8.4 task-execution 增强

在 task-execution Skill 中补充：

- **增量模式**：若任务清单中部分已打勾，只执行未完成；不重写已完成
- **依赖顺序**：跨模块时，后端任务先于前端
- **Notion 串联**：若需求在 Notion，先拉取内容再结构化
- **方案探索前置**：实现前先完成方案探索（2–3 种方案、优缺点、选型依据）；涉及数据量、缓存、并发、一致性时必做

### 8.5 方案探索参考（design-alternatives 与 solution-exploration 用）

| 场景             | 典型方案                         | 简要优劣                                        |
| ---------------- | -------------------------------- | ----------------------------------------------- |
| 数据量大、需搜索 | 直接 DB vs ES                    | DB 简单、ES 全文/聚合强；选型看 QPS、查询复杂度 |
| Redis 雪崩       | 过期随机化、多级缓存、限流       | 随机化易实现；多级缓存降 DB 压力；限流保稳定    |
| Redis 穿透       | 空值缓存、布隆过滤器、接口校验   | 空值缓存简单；布隆省内存；校验防恶意            |
| Redis 击穿       | 互斥锁、逻辑过期                 | 互斥锁强一致；逻辑过期高并发                    |
| 并发控制         | 乐观锁 vs 悲观锁 vs 分布式锁     | 选型看冲突频率、跨进程需求                      |
| 数据一致性       | 同步 vs 异步、最终一致 vs 强一致 | 选型看业务容忍度、复杂度                        |

---

## 九、执行顺序与依赖

```
阶段 0（验证） ← 立即
    ↓
阶段 1（入口增强） ← 无依赖，可并行
    ↓
阶段 2（Hooks） ← 依赖阶段 0 通过
    ↓
阶段 3（Rules 精简） ← 可独立
    ↓
阶段 4（Skills 迁移） ← 依赖阶段 3 完成
    ↓
阶段 5（缺口补齐） ← 依赖阶段 1 的 Commands 框架
```

**建议**：先做阶段 0 + 阶段 1，验证 Cursor 行为并补齐入口，再决定是否投入阶段 2（Hooks 脚本）。

---

## 十、不做的（或延后）

| 项                      | 原因                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| tmux 相关 Hook          | Windows 为主，tmux 不适用                                                                                  |
| sessionStart/End 持久化 | 复杂度高，Phase 5 可选                                                                                     |
| 变异测试（Stryker）     | 引入新依赖，先用手动自检                                                                                   |
| 多子代理并行            | 已支持，但 token 消耗成倍（5 子代理 ≈ 5x）；红绿对抗可并行或两轮提示                                       |
| 子代理串行链            | **已支持**。编排器模式：Planner → Implementer → Verifier；可用 `/verifier`、`/debugger` 或自然语言显式调用 |
| .kiro/steering 同步     | 改造稳定后再定策略                                                                                         |

---

## 十一、验收标准

| 阶段 | 验收                                                                                                                  |
| ---- | --------------------------------------------------------------------------------------------------------------------- |
| 0    | 验证报告写明：Hooks、Commands、Rules globs、**子代理（串行/并行）** 是否支持                                          |
| 1    | 用户说「继续完成」时，AGENTS.md 引导先 gap 分析；/gap-analysis、/plan 可被调用                                        |
| 2    | Agent 编辑 .ts 文件后 afterFileEdit 触发；prompt 含 sk- 时 beforeSubmitPrompt 阻断                                    |
| 3    | rules 目录符合新结构，单条 < 80 行                                                                                    |
| 4    | P2C、D2C 等已迁入 skills，原 rules 已删                                                                               |
| 5    | /test-self-check、/design-alternatives 存在；task-execution 含增量模式与方案探索前置；solution-exploration Skill 可用 |
