# Cursor Hooks 验证报告

> 参考：[Cursor Hooks 官方文档](https://cursor.com/cn/docs/hooks)

## 结论

**Cursor 支持 Hooks**。需注意触发条件与输入格式。

## 关键说明

### 1. 触发条件（易混淆）

| Hook                   | 触发时机                                      |
| ---------------------- | --------------------------------------------- |
| **afterFileEdit**      | **Agent**（Cmd+K / Agent Chat）编辑文件时触发 |
| **afterTabFileEdit**   | **Tab**（行内补全）编辑文件时触发             |
| **beforeSubmitPrompt** | 用户点击发送前触发                            |

**手动编辑并保存**（如直接改代码后 Ctrl+S）**不会**触发 `afterFileEdit`。只有 AI Agent 或 Tab 通过工具编辑文件时才会触发。

### 2. 正确验证方式

**验证 afterFileEdit：**

1. 打开 Cursor，使用 **Cmd+K**（或 Ctrl+K）或 **Agent Chat**
2. 输入：「在 `apps/backend/src/main.ts` 第 1 行加一个空行」
3. 让 Agent 执行编辑
4. 检查 `.cursor/hooks-debug.log` 是否有新记录

**验证 beforeSubmitPrompt：**

1. 在输入框输入 `sk-123456789012345678901234567890`
2. 点击发送 → 应被拦截并提示敏感信息

### 3. 输入格式（官方文档）

- **afterFileEdit** 输入：`{ "file_path": "<absolute path>", "edits": [...] }`
- **beforeSubmitPrompt** 输入：`{ "prompt": "<text>", "attachments": [...] }`

脚本已按 `file_path`、`prompt` 等字段适配。

### 4. 调试

- Cursor 设置中有 **Hooks** 选项卡，可查看已配置和已执行的 hooks
- **Hooks 输出通道** 可查看错误

## 验证结果（2026-03-07）

- **afterFileEdit**：已通过。Agent 编辑文件时，`.cursor/hooks-debug.log` 有记录，ESLint 正常执行
- **beforeSubmitPrompt**：可输入 `sk-` 开头的长字符串测试拦截

## 子代理（Subagents）支持

Cursor 支持子代理，可串行或并行运行。

### 运行方式

- 每个子代理有独立上下文，父代理通过 prompt 传入信息，子代理返回结果
- 子代理无法访问主会话历史，从干净上下文开始

### 开启方式

| 方式         | 说明                                                                 |
| ------------ | -------------------------------------------------------------------- |
| **自动委派** | Agent 按任务复杂度自动决定，内置 explore、bash、browser 会被自动调用 |
| **显式调用** | `/verifier`、`/debugger` 或自然语言「使用 verifier 子代理确认...」   |

### 串行 vs 并行

| 模式                   | 行为                     | 适用场景                 |
| ---------------------- | ------------------------ | ------------------------ |
| **前台（Foreground）** | 阻塞等待子代理完成后返回 | 串行任务，依赖上一步输出 |
| **后台（Background）** | 立即返回，子代理独立运行 | 长任务或并行工作流       |

**编排器模式**（串行）：Planner 分析需求 → Implementer 实现 → Verifier 验证。

### 多子代理并行

- 支持同时启动多个子代理（如同时审查 API 变更并更新文档）
- 注意：并行子代理会成倍增加 token 消耗（5 个子代理 ≈ 5 倍 token）
- **限制**：子代理不支持嵌套，仅单层结构

## 项目配置

- 项目级配置：`.cursor/hooks.json`
- 脚本路径：`.cursor/hooks/after-file-edit.js`、`.cursor/hooks/before-submit-prompt.js`
- 项目 hooks 从**项目根目录**运行，路径已按文档配置
