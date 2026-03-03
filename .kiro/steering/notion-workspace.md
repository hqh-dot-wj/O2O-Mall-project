---
inclusion: fileMatch
fileMatchPattern: '**/*notion*.md'
---

# Notion 工作区设计规范与落地指南

> 核心原则：宁可少一张表，也不要多一个「自由发挥」。
> 没字段 → 不记录 | 没模板 → 不创建 | 没负责人 → 不存在

## 全局设计约定

| 约定            | 说明             |
| --------------- | ---------------- |
| 负责人（Owner） | 每条记录必须有   |
| 关联 Project    | 必须能关联到项目 |
| Status          | 必须有状态字段   |

## 核心数据库（6 张表）

| 序号 | 数据库       | 用途              |
| ---- | ------------ | ----------------- |
| 1    | Projects     | 项目              |
| 2    | Requirements | 需求              |
| 3    | Tasks        | 任务 / 每日执行   |
| 4    | Issues       | Bug / 问题 / 事故 |
| 5    | Releases     | 版本 / 发布       |
| 6    | Knowledge    | 知识索引          |

## 配置顺序

Projects（根表）→ Releases → Requirements → Tasks → Issues → Knowledge

## Relation 依赖图

```
Projects（根）
  ├── Releases → Projects
  ├── Requirements → Projects
  ├── Tasks → Projects
  ├── Issues → Projects
  └── Knowledge → Projects

Requirements ←→ Tasks
Requirements ←→ Issues
Issues ←→ Tasks
Releases → Requirements
```

## MCP 已创建数据库（2026-02-26）

| 数据库       | Notion 链接                                            |
| ------------ | ------------------------------------------------------ |
| Projects     | https://www.notion.so/c42a780eb38648318ad2a8e5107f4e9a |
| Requirements | https://www.notion.so/15491d08a529458899eb82bbb321b886 |
| Tasks        | https://www.notion.so/f9c627a3fcd6451faeb0ad895bb968da |
| Issues       | https://www.notion.so/d32ac5bbcd37404c8a887456052a4c09 |
| Releases     | https://www.notion.so/041fe996e2b74e89989ffb3e47f04217 |
| Knowledge    | https://www.notion.so/4b47de3239004badbb3c772601b4ed60 |
