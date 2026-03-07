---
name: task-execution
description: Execute tasks from requirements. Use when user provides requirements doc or task list.
---

# 任务执行工作流

用户提供需求文档后，按此工作流执行。

## 步骤

1. **架构审查**：相态判断、四棱镜扫描、需求补全检查
2. **创建任务清单**：提取任务，按 docs 约定放置
3. **逐个执行**：打勾、写代码、补测试
4. **增量模式**：部分已打勾时，只执行未完成；不重写已完成
5. **方案探索前置**：实现前先完成 2–3 种方案、优缺点、选型依据
6. **依赖顺序**：跨模块时，后端 → generate-types → 前端

## Notion 串联

若需求在 Notion，先拉取内容再结构化。

## 架构审查参考

- 相态判断：`architecture-playbook.mdc`
- 四棱镜：`architecture-meta-model.mdc`
- 需求补全：`architecture-checklist.mdc`
