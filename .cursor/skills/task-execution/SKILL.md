---
name: task-execution
description: >
  Execute tasks from requirements doc or task list.
  Trigger: user provides a requirements doc, PRD, task list, or Notion page;
  asks to implement features step by step; uses /plan for task breakdown.
---

# 任务执行工作流

用户提供需求文档或任务清单后，按此工作流执行。

## Instructions

1. **架构审查**（跨模块/技术选型时）：相态判断、四棱镜扫描、需求补全。参考 `.cursor/rules/architecture-playbook.mdc`、`.cursor/rules/architecture-meta-model.mdc`、`.cursor/rules/architecture-checklist.mdc`。
2. **创建任务清单**：从需求提取任务，按 docs 约定放置（`apps/backend/docs/tasks/` 等）。
3. **方案探索前置**：实现前若有技术选型（缓存、并发、数据量），先完成 2–3 种方案、优缺点、选型依据（见 `solution-exploration` skill）。
4. **逐个执行**：打勾、写代码、补测试；**增量模式**：部分已打勾时只执行未完成，不重写已完成。
5. **依赖顺序**：跨模块时，后端 → `pnpm generate-types` → 前端。
6. **Notion 串联**：若需求在 Notion，先拉取内容再结构化。

## Validation

- [ ] 任务清单已创建且路径符合 docs 约定
- [ ] 增量执行时不重写已完成部分
- [ ] 跨模块时后端先于前端，已执行 generate-types
