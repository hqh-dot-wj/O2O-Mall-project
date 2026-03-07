# Cursor Rules 改造方案（基于 ECC 与项目现状）

> **X 链接说明**：Longform Guide (https://x.com/affaanmustafa/status/2014040193557471352) 内容已由用户补充，已并入本方案第十二节及后续扩展章节。

---

## 一、问题诊断

### 1.1 现状

| 维度         | 当前状态                                              | 问题                                             |
| ------------ | ----------------------------------------------------- | ------------------------------------------------ |
| **Rules**    | 20+ 条，部分 alwaysApply，部分 glob 触发              | 内容过长，单条规则数百行；对话中编码时模型常忽略 |
| **Skills**   | 3 个（vue-best-practices, vue-ecosystem, vue-router） | 与 rules 重叠，触发依赖 description 匹配，不稳定 |
| **Commands** | 3 个（code-review, create-pr, run-tests）             | 仅描述性指令，无强制执行                         |
| **Agents**   | 2 个（verifier, security-reviewer）                   | 需用户主动调用，未嵌入编码流程                   |
| **Hooks**    | 无                                                    | 无任何「关键时刻」的自动校验或阻断               |

### 1.2 根因（借鉴 ECC）

1. **Rules 被动**：规则在上下文中，但模型在专注编码时容易忽略冗长规则。
2. **无关键时刻执行**：缺少在「编辑后」「提交前」「执行命令前」的自动校验。
3. **规则过载**：单条规则数百行，token 压力大，模型难以全部关注。
4. **职责混在一起**：Rules 同时承担「原则」「流程」「模板」「检查清单」，边界不清。

---

## 二、ECC 核心思路（可借鉴）

### 2.1 分层职责

| 层级         | 职责                 | 示例                                          |
| ------------ | -------------------- | --------------------------------------------- |
| **Rules**    | 极简、始终遵循的原则 | 禁止 any、禁止 throw new Error、文件 < 800 行 |
| **Skills**   | 具体任务的「怎么做」 | P2C 工作流、D2C 组件映射、Process Spec        |
| **Commands** | 显式触发的工作流入口 | /code-review 调用 code-reviewer 子代理        |
| **Hooks**    | 关键时刻的自动执行   | afterFileEdit 跑 format + typecheck           |
| **Agents**   | 有边界的子代理       | verifier、security-reviewer                   |

### 2.2 Rules 精简原则（ECC common/coding-style.md 约 50 行）

- 每条规则 **< 80 行**，优先 < 50 行。
- 只写「必须遵守」的，不写「建议」。
- 具体流程、模板、检查清单 → 移到 Skills 或 Commands。

### 2.3 Hooks 作为执行层

| Hook                   | 用途                                     | ECC 示例                                        |
| ---------------------- | ---------------------------------------- | ----------------------------------------------- |
| `afterFileEdit`        | 编辑后自动 format + typecheck + 规则检查 | 跑 format、tsc、console.log 警告                |
| `beforeSubmitPrompt`   | 提交前检查                               | 检测 prompt 中的 sk-、ghp\_、AKIA 等密钥        |
| `beforeReadFile`       | 读文件前                                 | 警告读取 .env、.key、.pem                       |
| `beforeShellExecution` | 执行命令前                               | 阻止非 tmux 下跑 dev server、git push 前 review |

**关键**：`exit code 2` = 阻断操作；`exit code 0` = 放行。

---

## 三、改造方案总览

### 3.1 目标结构

```
.cursor/
├── rules/                    # 精简后的规则（按 ECC 分层）
│   ├── common/               # 通用原则（alwaysApply）
│   │   ├── core.mdc          # 类型安全、异常、简洁优先、复杂度
│   │   ├── monorepo.mdc      # workspace:*、catalog、包边界
│   │   └── security.mdc      # 敏感数据、幂等、限流
│   ├── backend/              # 后端专用（globs: apps/backend/**）
│   │   ├── nestjs.mdc        # Result、BusinessException、Repository
│   │   └── tenant.mdc        # 租户隔离、接口类型
│   ├── admin-web/           # 前端专用（globs: apps/admin-web/**）
│   │   └── vue.mdc           # Props/Emits 类型、API 类型来源
│   └── miniapp/             # 小程序专用（globs: apps/miniapp-client/**）
│       └── uniapp.mdc       # 条件编译、Design Token
├── skills/                   # 任务级知识（按需触发）
│   ├── backend-p2c/          # PRD → 后端代码
│   ├── miniapp-d2c/          # 设计稿 → 小程序 UI
│   ├── process-testing/      # Process Spec + Rule ID
│   ├── commit-message/       # Conventional Commits
│   └── vue-best-practices/   # 已有
├── commands/                 # 显式工作流
│   ├── code-review.md        # 调用 verifier 子代理
│   ├── create-pr.md
│   └── run-tests.md
├── agents/                   # 子代理
│   ├── verifier.md
│   └── security-reviewer.md
└── hooks.json                # 【新增】关键时刻执行
```

### 3.2 改造阶段

| 阶段        | 内容                                              | 优先级 |
| ----------- | ------------------------------------------------- | ------ |
| **Phase 1** | 新增 Hooks（afterFileEdit、beforeSubmitPrompt）   | P0     |
| **Phase 2** | 精简 Rules，拆 common/ + 应用层                   | P0     |
| **Phase 3** | 迁移长规则到 Skills（P2C、D2C、documentation 等） | P1     |
| **Phase 4** | 强化 Commands 与 Agents 的联动                    | P1     |
| **Phase 5** | 可选：sessionStart 注入上下文                     | P2     |

---

## 四、Phase 1：Hooks 设计（最关键）

### 4.1 为什么 Hooks 优先

- 在「编辑后」「提交前」自动执行，不依赖模型是否记得规则。
- 可阻断（exit 2）危险操作，或输出警告供用户决策。
- 与现有 `pnpm lint`、`pnpm typecheck` 自然衔接。

### 4.2 建议的 hooks.json

```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [
      {
        "command": "node .cursor/hooks/after-file-edit.js",
        "description": "Format + ESLint + TypeScript check on edited file"
      }
    ],
    "beforeSubmitPrompt": [
      {
        "command": "node .cursor/hooks/before-submit-prompt.js",
        "description": "Detect secrets (sk-, ghp_, AKIA, etc.) in prompt"
      }
    ],
    "beforeReadFile": [
      {
        "command": "node .cursor/hooks/before-read-file.js",
        "description": "Warn when reading .env, .key, .pem"
      }
    ]
  }
}
```

### 4.3 after-file-edit.js 逻辑（需实现）

1. 读取 stdin JSON（Cursor 传入 `path`/`file` 等）。
2. 根据路径判断应用：
   - `apps/backend/**` → 运行 `pnpm --filter @apps/backend exec eslint --fix <path>`（或等价命令）
   - `apps/admin-web/**` → 同上
   - `apps/miniapp-client/**` → 同上
3. 可选：对 `.ts`/`.tsx`/`.vue` 跑 `pnpm typecheck`（可仅对变更文件所在包）。
4. 将原始 stdin 原样写到 stdout（保持 Cursor 兼容）。
5. 若 lint/typecheck 失败，可 `process.exit(2)` 阻断，或 `exit(0)` 仅输出警告（取决于策略）。

**注意**：全量 typecheck 可能较慢，可先只做 format + lint，typecheck 交给 pre-commit 或 CI。

### 4.4 before-submit-prompt.js 逻辑

1. 读取 stdin JSON，提取 `prompt` 文本。
2. 正则检测：`sk-[a-zA-Z0-9]`、`ghp_[a-zA-Z0-9]`、`AKIA[A-Z0-9]{16}` 等。
3. 若命中 → `process.exit(2)` 阻断提交，并输出提示。
4. 否则 `process.exit(0)`，原样回传 stdin。

### 4.5 待确认问题

- [ ] **afterFileEdit 是否阻断**：lint/typecheck 失败时 exit 2 还是仅警告？
- [ ] **作用范围**：是否只对 `apps/*` 下业务代码生效，排除 `node_modules`、`dist`？
- [ ] **Windows 兼容**：hook 脚本用 Node.js 以保证跨平台，是否满足需求？

---

## 五、Phase 2：Rules 精简与拆分

### 5.1 当前 Rules 映射到新结构

| 当前规则                    | 目标位置                                 | 处理方式                                  |
| --------------------------- | ---------------------------------------- | ----------------------------------------- |
| core-principles.mdc         | common/core.mdc                          | 压缩到 < 60 行，只保留强制项              |
| monorepo.mdc                | common/monorepo.mdc                      | 压缩，移除 AI 协作纪律（可放 AGENTS.md）  |
| commit-message.mdc          | skills/commit-message/                   | 迁移为 Skill，rules 中只留一行引用        |
| backend.mdc                 | backend/nestjs.mdc + common/security.mdc | 拆成「响应/异常/Repository」+「安全清单」 |
| admin-web.mdc               | admin-web/vue.mdc                        | 压缩，只保留类型安全、API 来源、目录结构  |
| miniapp-client.mdc          | miniapp/uniapp.mdc                       | 压缩，条件编译 + Design Token             |
| backend-p2c.mdc             | skills/backend-p2c/                      | 迁移为 Skill                              |
| miniapp-p2c.mdc             | skills/miniapp-p2c/                      | 迁移为 Skill                              |
| miniapp-d2c.mdc             | skills/miniapp-d2c/                      | 迁移为 Skill                              |
| miniapp-ui-spec.mdc         | skills/miniapp-d2c/ 的 reference         | 作为 reference.md                         |
| process-testing.mdc         | skills/process-testing/                  | 迁移为 Skill                              |
| documentation.mdc           | skills/documentation/                    | 迁移为 Skill                              |
| task-execution-workflow.mdc | skills/task-execution/                   | 迁移为 Skill                              |
| architecture-\*.mdc         | 保留在 rules/ 或 docs/                   | 仅架构决策时引用，可不 alwaysApply        |
| testing.mdc                 | common/core.mdc 中 1 段 + skills         | 核心要求进 core，详细进 skill             |
| backend-third-party.mdc     | skills/backend-third-party/              | 迁移为 Skill                              |
| notion-workspace.mdc        | 保留或移出 .cursor                       | 与编码无关，可放 docs                     |

### 5.2 common/core.mdc 示例（精简版）

```markdown
---
description: 核心原则（类型安全、异常、复杂度、提交前检查）
alwaysApply: true
---

# 核心原则

## 类型安全（强制）

- 禁止 any、as any、@ts-ignore
- API 类型来自 @libs/common-types
- Props/Emits/ref/reactive 显式类型

## 异常

- Backend: Result.ok / BusinessException.throwIf
- 禁止 throw new Error()

## 复杂度

- 嵌套 ≤ 3 层
- 函数 > 50 行需审视
- 重复 3 次以上提取

## 提交前

pnpm verify-monorepo; pnpm lint; pnpm typecheck; pnpm test
```

目标：**< 50 行**。

### 5.3 待确认问题

- [ ] **alwaysApply 规则数量**：建议 ≤ 3 条（core、monorepo、security），其余用 globs。
- [ ] **架构类规则**：architecture-meta-model、playbook、checklist 是否保留在 rules，还是移到 docs？

---

## 六、Phase 3：Skills 迁移清单

| 原 Rule                     | 新 Skill            | 触发描述（description）                                                                        |
| --------------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| backend-p2c.mdc             | backend-p2c         | "Generate backend code from PRD. Use when creating NestJS code from requirements."             |
| miniapp-p2c.mdc             | miniapp-p2c         | "Generate miniapp logic from PRD. Use when injecting logic from requirements."                 |
| miniapp-d2c.mdc             | miniapp-d2c         | "Generate miniapp UI from design. Use when converting design to Vue code."                     |
| process-testing.mdc         | process-testing     | "Process Spec + Rule ID testing. Use when writing backend tests for state/amount/concurrency." |
| commit-message.mdc          | commit-message      | "Generate commit messages. Use when user asks for commit message."                             |
| documentation.mdc           | documentation       | "Write requirements/design docs. Use when creating docs in docs/\*\*."                         |
| task-execution-workflow.mdc | task-execution      | "Execute tasks from requirements. Use when user provides requirements doc."                    |
| backend-third-party.mdc     | backend-third-party | "Third-party API integration. Use when integrating external APIs."                             |

---

## 七、Phase 4：Commands 与 Agents 联动

### 7.1 当前 Commands 问题

- 多为「描述性指令」，未明确「调用哪个 Agent」「执行哪些步骤」。
- 与 Hooks 无配合，用户需主动执行。

### 7.2 改进方向

1. **code-review.md**：明确写「以 verifier 子代理身份执行」，并列出必跑命令（verify-monorepo、lint、typecheck）和检查项。
2. **run-tests.md**：可直接包含「执行 `pnpm test` 或 `pnpm --filter @apps/backend test -- <path>`」的指令，让 Agent 实际跑命令。
3. **create-pr.md**：引用 commit-message Skill，并包含 PR 模板。

### 7.3 可选：beforeShellExecution Hook

- 在 `git push` 前自动跑 `pnpm verify-monorepo` 和 `pnpm lint`。
- 失败则 exit 2 阻断 push。
- 需评估是否与现有 simple-git-hooks 冲突。

---

## 八、Phase 5：Session 上下文与内存管理（Longform Guide 核心）

> 来源：@affaanmustafa 的 Longform Guide，解决「上下文腐烂、跨会话断档」问题。

### 8.1 跨会话记忆（sessionStart + sessionEnd）

| 机制         | 实现方式                         | 本项目适配                                                                                                 |
| ------------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **会话总结** | Stop/SessionEnd 钩子自动提取进度 | 在 `sessionEnd` 中调用脚本，将「本次修改文件、未完成任务」写入 `~/.cursor/sessions/YYYY-MM-DD-<topic>.tmp` |
| **无缝接续** | 下次会话 `@` 该文件              | 用户手动 `@sessions/xxx.tmp` 或 sessionStart 自动注入最近会话                                              |
| **策略清空** | 计划完成后清空无关探索历史       | 在 Command `/compact` 或 `/clear` 中提示「是否保留计划执行部分」                                           |

**实现细节**：

- `sessionEnd` 脚本：解析 Cursor 传入的 JSON，提取 `modified_files`、`conversation_summary`，写入 `~/.cursor/sessions/` 或项目内 `.cursor/sessions/`
- 文件命名：`YYYY-MM-DD-<模块名>-<简短描述>.tmp`，如 `2026-03-07-backend-order-export.tmp`
- sessionStart：若存在「今日」或「昨日」会话文件，可将其路径/摘要注入 prompt（需确认 Cursor sessionStart 输出格式）

### 8.2 动态系统提示注入

- **原理**：系统提示优先级 > 用户消息 > 工具输出。关键规则应进入系统层。
- **Cursor 适配**：AGENTS.md 即系统提示的一部分；可将「当前任务相关」的 3–5 条核心规则在 sessionStart 时动态追加。
- **实现**：sessionStart 脚本根据 `git status` 判断当前在改 backend/admin/miniapp，输出「请额外遵循 rules/backend/nestjs.mdc 中的 X、Y、Z」类提示，写入临时文件供 Cursor 读取（若 Cursor 支持）。

### 8.3 钩子自动化清单

| 钩子             | 自动化动作                                                          |
| ---------------- | ------------------------------------------------------------------- |
| **preCompact**   | 保存当前状态（修改文件列表、TODO）到 sessions，避免 compaction 丢失 |
| **sessionStart** | 加载最近会话摘要，注入「当前模块」上下文                            |
| **sessionEnd**   | 提取进度，写入 sessions 文件                                        |
| **stop**         | 可选：触发「学习」流程，提取非平凡解法到 skills/learned/            |

---

## 九、Phase 6：Token 优化（Longform Guide）

> 目标：省钱 + 防限额，让 Cursor 从「能用」变成「高效生产力工具」。

### 9.1 子代理 / 模型路由

| 任务类型                               | 推荐模型          | 说明       |
| -------------------------------------- | ----------------- | ---------- |
| 架构设计、复杂调试                     | Opus / 高能力模型 | 深度推理   |
| 常规编码、格式化、简单重构             | Sonnet / 中等模型 | 默认       |
| 重复任务、清晰规则（lint fix、补类型） | Haiku / 快模型    | 成本约 1/5 |

**Cursor 适配**：若 Cursor 支持「按任务路由模型」，可在 Commands 中声明；否则在 AGENTS.md 中写「简单任务优先用快速模型」。

### 9.2 工具与上下文瘦身

| 策略             | 做法                                                 |
| ---------------- | ---------------------------------------------------- |
| **工具替换**     | 用 `mgrep` 代替 `grep`（若可用，省约一半 token）     |
| **后台处理**     | 耗时命令（build、test）用 tmux 跑，只让 Agent 看摘要 |
| **代码库瘦身**   | 模块化 + 定期清理死代码，减少 read_file token        |
| **系统提示瘦身** | Rules 精简到 < 50 行/条，可砍掉 ~40% 静态开销        |

### 9.3 本项目可落地的 Token 优化

1. **Rules 瘦身**：Phase 2 已规划，单条 < 80 行。
2. **Skills 按需加载**：description 精确匹配，避免无关 skill 被加载。
3. **AGENTS.md 分层**：根 AGENTS.md 极简，应用级 AGENTS.md 仅在该应用编辑时注入（若 Cursor 支持路径感知）。
4. **MCP 精简**：禁用未用 MCP，每个工具描述都占 token。

---

## 十、Phase 7：验证循环与评估（Longform Guide）

> 防技术债：检查点评估 + 连续评估 + 自动防死代码。

### 10.1 检查点 vs 连续评估

| 模式           | 适用场景                 | 实现                                                                  |
| -------------- | ------------------------ | --------------------------------------------------------------------- |
| **检查点评估** | 线性任务（如实现某功能） | 每阶段完成后跑 `pnpm lint`、`pnpm typecheck`、`pnpm test`，通过才继续 |
| **连续评估**   | 长会话                   | 每 N 分钟（如 15）跑全套测试，立即修复回归                            |

**与 Hooks 结合**：

- `afterFileEdit`：对变更文件跑 lint（轻量）
- `postToolUse`（若 Cursor 支持）：每次工具调用后可选跑 typecheck
- 新增 Command `/verify`：跑 verify-monorepo + lint + typecheck + test，作为「阶段完成」的显式检查点

### 10.2 评级器类型

| 类型       | 特点                               | 本项目                                |
| ---------- | ---------------------------------- | ------------------------------------- |
| **代码型** | 快、确定，但脆（规则变了要改脚本） | ESLint、vue-tsc、Jest                 |
| **模型型** | 灵活，但随机                       | 可选：用 LLM 评估「代码是否符合规范」 |
| **人工型** | 最准                               | PR Review                             |

**建议**：以代码型为主（lint、typecheck、test），模型型仅用于「无法用规则表达」的场景。

### 10.3 防死代码与重复

- **PostToolUse + codemap**：每次编辑后更新「模块依赖图」或「文件清单」，用于检测死代码、重复文件。
- **本项目**：可简化为先依赖 `pnpm lint` 的 unused 规则，暂不引入 codemap。

---

## 十一、Phase 8：持续学习与自改进（Longform Guide）

> Claude 解决非平凡问题时，自动提取为新技能，实现「越用越聪明」。

### 11.1 Stop 钩子提取技能

- **时机**：会话结束（stop）时。
- **逻辑**：若本次会话解决了「调试技巧、项目特有模式」等非平凡问题，自动提取为 skill，存到 `~/.cursor/skills/learned/` 或 `.cursor/skills/learned/`。
- **实现**：stop 钩子调用脚本，将「对话摘要 + 关键代码片段」传给 LLM，生成 SKILL.md 草稿，写入 learned 目录。

### 11.2 手动提取：/learn 命令

- **用途**：会话中途，用户认为「这段解法值得复用」时，执行 `/learn`。
- **输出**：生成 skill 草稿，用户确认后保存。

### 11.3 会话后反思（可选）

- **反思代理**：sessionEnd 时，用轻量模型对会话做「什么有效/无效」的反思，写入 sessions 文件。
- **定期建议**：每 15 分钟（若会话足够长）主动建议「可优化点」。

**本项目优先级**：P2，先完成 Hooks + Rules + 基础 Session，再考虑学习闭环。

---

## 十二、Phase 9：并行策略与项目启动（Longform Guide）

### 12.1 Git Worktrees + 级联法

| 策略              | 做法                                             |
| ----------------- | ------------------------------------------------ |
| **Git worktrees** | 多个 Cursor 实例在不同 worktree，互不冲突        |
| **级联法**        | 主聊天改代码，fork 只做研究/问答，不直接改主分支 |
| **实例数量**      | 2–4 个足够，不随意开 5+                          |

### 12.2 项目启动双实例

- **实例 1**：建脚手架 + 配置（初始化项目、依赖、脚本）
- **实例 2**：深度研究 + PRD + 架构图

### 12.3 llms.txt 模式

- **含义**：项目根目录放 `llms.txt`，提供 LLM 优化的文档（结构清晰、关键词突出）。
- **本项目**：可将 AGENTS.md 精简版 + 关键规则摘要写入 `llms.txt`，供 Cursor 优先读取。

### 12.4 核心哲学（引用 @omarsar0）

> 前期花时间建可复用模式（子代理、技能、命令、规划），后期复利爆炸，且可迁移到其他代理（如 Codex）。

**落地**：本改造方案就是在建「可复用模式」；完成后可复用到其他 Cursor 项目或 Codex。

---

## 十三、Phase 10：其他实用 Tips（Longform Guide）

### 13.1 MCP 与 CLI 替代

- MCP（GitHub、Supabase 等）会占用上下文；若使用频率低，可用 CLI + 自定义 Command 替代，释放 token。
- 本项目：Notion MCP 若仅偶尔用，可考虑用 `npx` 或脚本替代部分能力。

### 13.2 扩展改造阶段表（含 Longform 新增）

| 阶段    | 内容                                                       | 优先级 |
| ------- | ---------------------------------------------------------- | ------ |
| Phase 1 | Hooks（afterFileEdit、beforeSubmitPrompt、beforeReadFile） | P0     |
| Phase 2 | Rules 精简，拆 common/ + 应用层                            | P0     |
| Phase 3 | Skills 迁移（P2C、D2C、documentation 等）                  | P1     |
| Phase 4 | Commands 与 Agents 联动                                    | P1     |
| Phase 5 | Session 上下文与内存（sessionStart/End、preCompact）       | P2     |
| Phase 6 | Token 优化（Rules 瘦身、MCP 精简）                         | P2     |
| Phase 7 | 验证循环（/verify 命令、检查点评估）                       | P2     |
| Phase 8 | 持续学习（Stop 提取、/learn 命令）                         | P3     |
| Phase 9 | 并行策略、llms.txt                                         | P3     |

---

## 十四、执行顺序建议

1. **Phase 1（Hooks）**：实现 afterFileEdit、beforeSubmitPrompt、beforeReadFile，验证 Cursor 能正确调用。
2. **Phase 2（Rules 精简）**：拆 common/ + 应用层，单条 < 80 行。
3. **Phase 3（Skills 迁移）**：将 P2C、D2C、documentation 等迁出 rules。
4. **Phase 4（Commands 强化）**：明确与 Agents 的联动。
5. **Phase 5–9（可选）**：Session 内存、Token 优化、验证循环、持续学习、llms.txt，按需逐步落地。

---

## 十五、参考链接

- [everything-claude-code](https://github.com/affaan-m/everything-claude-code)
- [ECC Rules README](https://github.com/affaan-m/everything-claude-code/blob/main/rules/README.md)
- [ECC Cursor hooks.json](https://github.com/affaan-m/everything-claude-code/blob/main/.cursor/hooks.json)
- [Cursor Hooks 官方文档](https://cursor.com/docs/agent/hooks)

---

## 十二、Longform Guide 补充（X 长帖：《Claude Code 长篇指南》）

> 来源：@affaanmustafa 进阶长文，聚焦如何让 AI 编码从「能用」变成「高效生产力工具」。以下要点已适配 Cursor 与本项目。

### 12.1 上下文与内存管理（核心痛点）

| 能力                 | 说明                                                                                           | 本项目适配                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **跨会话记忆**       | 用技能自动总结进度 → 保存到 `~/.cursor/sessions/YYYY-MM-DD-topic.tmp`，下次 `@` 该文件无缝接续 | 新增 sessionEnd Hook：生成 `docs/.cursor-sessions/YYYY-MM-DD-{模块}.md` 摘要    |
| **策略清空上下文**   | 计划完成后清空无关探索历史，只保留计划执行                                                     | 在 `/plan` 或 task-execution Command 末尾提示用户「可 /compact 清空探索上下文」 |
| **动态系统提示注入** | 关键规则获得更高优先级（系统 > 用户 > 工具）                                                   | AGENTS.md 作为根级系统提示；sessionStart 可注入「当前模块」上下文               |
| **钩子自动化**       | PreCompact、SessionStart、SessionEnd 自动保存/加载状态                                         | 见 Phase 5、Phase 6 实现                                                        |

### 12.2 持续学习与自改进内存

| 能力                  | 说明                                                                   | 本项目适配                                                                                |
| --------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Stop 钩子提取技能** | 每次解决非平凡问题时，自动提取为新技能存到 `~/.cursor/skills/learned/` | 新增 stop Hook：可选调用「反思代理」提取「有效/无效」模式                                 |
| **/learn 命令**       | 中途手动提取当前会话中的可复用模式                                     | 新增 `/learn` Command：将当前对话中的调试技巧、项目特有模式写入 `.cursor/skills/learned/` |
| **会话后反思**        | 反思代理提取「什么有效/无效」                                          | 可选：sessionEnd 时输出「本次会话可沉淀的 3 条经验」供用户确认                            |

### 12.3 Token 优化（省钱 + 防限额）

| 策略             | 说明                                               | 本项目适配                                                                           |
| ---------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **子代理路由**   | 复杂任务用强模型，重复/清晰任务降级（成本差 5 倍） | Cursor 无直接模型路由；可在 Commands 中注明「此任务建议用更强模型」                  |
| **工具替换**     | 用 mgrep 代替 grep 省 token                        | 若 Cursor 支持自定义工具，可配置；否则在 Rules 中写「优先语义搜索，grep 仅精确匹配」 |
| **后台处理**     | 耗时命令用 tmux 跑，只让 Agent 看摘要              | beforeShellExecution：`pnpm dev` 等建议在 tmux 中跑，避免占用对话                    |
| **代码库瘦身**   | 模块化 + 定期清理死代码，减少读文件 token          | 在 verify-monorepo 或 lint 中增加「未引用导出」检查；/refactor-clean Command         |
| **系统提示瘦身** | 可砍掉 ~40% 静态开销                               | Rules 精简（Phase 2）即为此服务                                                      |

### 12.4 验证循环与评估（防技术债）

| 模式                      | 说明                                                   | 本项目适配                                                                     |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| **检查点评估**            | 线性任务每阶段验证通过才能继续                         | task-execution Command：每完成一任务必须跑对应测试，checkbox 更新前需通过      |
| **连续评估**              | 长会话每 N 分钟跑全套测试，立即修复回归                | afterFileEdit 可选：累计编辑 > 5 个文件时提示「建议运行 pnpm test」            |
| **评级器类型**            | 代码型（快但脆）、模型型（灵活但随机）、人工型（最准） | 当前以代码型为主（lint、typecheck、test）；复杂评审用 security-reviewer 模型型 |
| **PostToolUse + codemap** | 自动防死代码、重复文件                                 | 可选：postToolUse 钩子更新 `docs/codemap.md`，标记新增/删除文件                |

### 12.5 并行化策略（多实例协作）

| 策略              | 说明                             | 本项目适配                                                        |
| ----------------- | -------------------------------- | ----------------------------------------------------------------- |
| **Git worktrees** | 多个 Cursor 实例互不冲突         | 文档中补充：大功能可 `git worktree add ../feature-xxx` 开独立目录 |
| **级联法**        | 主聊天改代码，fork 只做研究/问答 | AGENTS.md 中写：研究类问题可开新 Chat，主 Chat 专注实现           |
| **最小必要并行**  | 不要随意开 5+ 实例，通常 2–4 个  | 作为最佳实践写入 docs                                             |

### 12.6 项目启动基础与哲学

| 要点              | 说明                                                                       |
| ----------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **双实例启动**    | 一个建脚手架+配置，另一个做深度研究+PRD+架构图                             |
| **llms.txt 模式** | 提供 LLM 优化的项目文档，便于快速理解                                      | 新增 `llms.txt` 或 `docs/llms-project-overview.md`：项目结构、关键约定、常用命令 |
| **核心哲学**      | 前期建可复用模式（子代理、技能、命令、规划），后期复利，且可迁移到其他代理 |

### 12.7 其他实用 Tips

- MCP 可用 CLI + 自定义命令/技能替代，释放上下文窗口。
- 本项目已有 Notion MCP，可评估是否高频使用；低频可改为「需要时 @Notion 文档」。

---

## 十三、Phase 5 扩展：Session 与内存（基于 Longform Guide）

### 13.1 sessionStart 钩子（详细设计）

**输入**：Cursor 传入的 JSON，含 `workspace_roots`、`conversation_id` 等。

**输出**：通过 stdout 返回增强后的上下文 JSON，或写入 `.cursor/sessions/current-context.md` 供用户 `@`。

**逻辑**：

1. 执行 `git status --short`、`git diff --name-only HEAD~5` 获取最近变更。
2. 根据变更路径判断主模块：`apps/backend` / `apps/admin-web` / `apps/miniapp-client`。
3. 生成摘要：`当前焦点：backend | 最近修改：user.service.ts, role.controller.ts`。
4. 若有 `~/.cursor/sessions/YYYY-MM-DD-<topic>.tmp` 且日期为今天，追加「上轮进度」。
5. 将摘要写入 stdout 或文件。

**实现文件**：`.cursor/hooks/session-start.js`

### 13.2 sessionEnd / stop 钩子（会话摘要）

**触发**：会话结束或 Agent 完成一轮任务。

**逻辑**：

1. 收集本次会话中修改的文件列表（从 Cursor 传入或从 git diff 推断）。
2. 提取关键决策（若 Cursor 支持传入 summary，否则用占位）。
3. 写入 `~/.cursor/sessions/YYYY-MM-DD-HHmm-topic.tmp`。
4. 可选：调用「持续学习」逻辑，提取可复用模式到 `skills/learned/`。

**实现文件**：`.cursor/hooks/session-end.js`、`.cursor/hooks/stop.js`

### 13.3 preCompact 钩子（压缩前保存）

**触发**：上下文即将压缩时。

**逻辑**：将当前计划、待办、关键文件路径写入 `.cursor/sessions/pre-compact-state.json`，便于压缩后恢复。

### 13.4 目录结构

```
.cursor/
├── hooks/
│   ├── session-start.js
│   ├── session-end.js
│   ├── stop.js
│   ├── pre-compact.js
│   └── ...
├── sessions/                 # 项目级会话缓存（可选）
│   └── .gitignore           # 忽略 *.tmp
└── hooks.json
```

用户级：`~/.cursor/sessions/` 存放跨项目会话摘要。

---

## 十四、Phase 6：Token 优化与 llms.txt

### 14.1 llms.txt 或 docs/llms-project-overview.md

**目的**：让 LLM 在最少 token 内理解项目结构、技术栈、关键约定。

**建议结构**（< 200 行）：

```markdown
# Nest-Admin-Soybean — LLM 速览

## 技术栈

- Backend: NestJS + Prisma + Redis
- Admin: Vue3 + Naive UI + Pinia
- Miniapp: uniapp + wot-design-uni

## 目录

- apps/backend/src/module/ — 按能力域划分
- apps/admin-web/src/views/ — 按模块/实体
- libs/common-types — API 类型（OpenAPI 生成）

## 必遵

- API 类型来自 @libs/common-types
- Backend: Result.ok / BusinessException.throwIf
- 提交前: pnpm verify-monorepo; pnpm lint; pnpm typecheck; pnpm test

## 参考

- 详细规范: .cursor/rules/
- 工作流: .cursor/commands/
```

**放置**：`llms.txt`（根目录）或 `docs/llms-project-overview.md`。Cursor 是否自动读取需查文档；若无，可在 AGENTS.md 中引用。

### 14.2 Rules 瘦身对 Token 的影响

| 当前                        | 目标                     | 预估节省              |
| --------------------------- | ------------------------ | --------------------- |
| 20+ 条 rules，合计 ~8000 行 | 9 条 rules，合计 ~400 行 | ~60% 规则相关 token   |
| alwaysApply 5+ 条           | alwaysApply 3 条         | 每次请求少 2–3k token |

### 14.3 子代理与任务路由（Cursor 限制）

Cursor 无显式「子代理模型路由」。可做：

- **Commands 说明**：在 `/code-review` 中写「建议使用较强模型」。
- **Agent 定义**：verifier、security-reviewer 的 description 明确「适合复杂评审」，引导用户在有需要时切换模型。

---

## 十五、Phase 7：验证循环（防技术债）

### 15.1 检查点验证（task-execution Skill）

在 task-execution-workflow 中强制：

- 每完成一个任务，必须运行 `pnpm --filter @apps/backend test -- <module>` 或等价命令。
- 失败则不允许标记任务完成。
- 在任务清单模板中显式写「验证命令」。

### 15.2 连续验证（可选 Hook）

**方案 A**：PostToolUse 每 N 次 Edit 后触发 `pnpm test`。

- 优点：及时发现问题。
- 缺点：可能频繁、耗时长。
- 建议：N=20 或可配置，且仅对 `apps/backend` 生效。

**方案 B**：仅在 sessionEnd 时跑一次 `pnpm test`。

- 优点：不打断编辑。
- 缺点：问题发现滞后。

**推荐**：先不实现自动连续验证，依赖 pre-commit 的 lint-staged + 用户主动 `/run-tests`。待 Phase 1–4 稳定后再考虑。

### 15.3 死代码与重复文件检测

- 新增 `/dead-code-scan` 命令：用 `ts-prune` 或 `knip` 扫描未导出引用。
- 输出到 `docs/dead-code-report.md`，供人工清理。
- 可选：afterFileEdit 维护 `docs/codemap.json`（模块 → 文件列表），便于后续分析。

---

## 十六、Phase 8：持续学习（/learn 与 Stop 钩子）

### 16.1 /learn 命令

**触发**：用户输入 `/learn` 或「提取当前会话模式」。

**逻辑**：

1. 分析当前对话中的关键决策、解决模式、项目特有约定。
2. 生成草稿：`skills/learned/draft-YYYYMMDD-HHmm.md`。
3. 内容结构：问题描述、解决方案、可复用要点、建议的 Skill 名称。
4. 用户审阅后，可移动到 `skills/<name>/SKILL.md`。

### 16.2 Stop 钩子（自动提取）

**触发**：Agent 完成一轮任务（stop 事件）。

**逻辑**：

1. 获取本次修改的文件列表。
2. 若修改涉及非 trivial 逻辑（如新增 Service 方法、修复并发 bug），则：
   - 生成简短摘要。
   - 追加到 `~/.cursor/sessions/learned-patterns.log`。
3. 不自动创建 Skill，仅积累日志；用户可定期从 log 中提炼 Skill。

**简化版**：仅做 session 摘要，不做模式提取，降低误报。

---

## 十七、实施优先级与依赖关系

```
Phase 1 (Hooks 基础)     ← 立即
    ↓
Phase 2 (Rules 精简)     ← 依赖 Phase 1 验证 Hooks 可用
    ↓
Phase 3 (Skills 迁移)    ← 与 Phase 2 可并行
    ↓
Phase 4 (Commands 强化)  ← 依赖 Phase 2、3
    ↓
Phase 5 (Session 上下文) ← 可选，Phase 1 后即可做
Phase 6 (Token/llms.txt) ← 与 Phase 2 并行
Phase 7 (验证循环)       ← 依赖 Phase 4
Phase 8 (持续学习)       ← 可选，Phase 5 后
```

---

## 十八、待确认与开放问题（更新）

### 18.1 已补充 Longform Guide

- [x] X Longform Guide 要点已并入第十二节及 Phase 5–8。

### 18.2 仍需确认

1. **Hook 严格程度**：afterFileEdit 中 lint/typecheck 失败时，exit 2 阻断还是仅警告？
2. **simple-git-hooks 与 beforeShellExecution**：是否需要对 `git push` 做额外校验？
3. **Session 摘要存放**：项目级 `.cursor/sessions/` 还是仅用户级 `~/.cursor/sessions/`？
4. **llms.txt 自动加载**：Cursor 是否支持根目录 `llms.txt` 自动注入？若不支持，是否在 AGENTS.md 中手写「请先阅读 docs/llms-project-overview.md」？
5. **持续学习粒度**：Stop 钩子仅做摘要，还是尝试提取模式？若提取，误报率如何控制？

### 18.3 实现清单（细化）

| 项                                   | 文件/位置                             | 状态         |
| ------------------------------------ | ------------------------------------- | ------------ |
| hooks.json                           | .cursor/hooks.json                    | 待创建       |
| after-file-edit.js                   | .cursor/hooks/after-file-edit.js      | 待实现       |
| before-submit-prompt.js              | .cursor/hooks/before-submit-prompt.js | 待实现       |
| before-read-file.js                  | .cursor/hooks/before-read-file.js     | 待实现       |
| session-start.js                     | .cursor/hooks/session-start.js        | Phase 5 可选 |
| session-end.js                       | .cursor/hooks/session-end.js          | Phase 5 可选 |
| stop.js                              | .cursor/hooks/stop.js                 | Phase 8 可选 |
| llms.txt 或 llms-project-overview.md | docs/ 或根目录                        | Phase 6      |
| /learn 命令                          | .cursor/commands/learn.md             | Phase 8      |
| /session-summary 命令                | .cursor/commands/session-summary.md   | Phase 5      |
| /dead-code-scan 命令                 | .cursor/commands/dead-code-scan.md    | Phase 7 可选 |
