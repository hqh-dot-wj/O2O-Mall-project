---
name: backend-p2c
description: Generate backend code from PRD. Use when creating NestJS code from requirements or structured PRD.
---

# Backend P2C（需求到代码）

根据 PRD 生成后端代码时，先将需求结构化为接口规约，再按规约生成。**穷举每个分支，禁止模糊；每条规则有 Rule ID，每个 Rule ID 有测试**。

## 结构化 PRD 格式

- `BackendStructuredPRD`：title、background、modules
- `EndpointSpec`：method、path、summary、tenantType、caller、sloCategory、request、response、scenarios、errorCases
- `ScenarioSpec`：given、when、then、ruleId

## 关键约定

- 接口类型：TenantScoped | PlatformOnly | TenantAgnostic
- SLO 分级：payment | core-trade | list-query | admin-config
- 错误场景必须显式穷举
- 状态转换单独列出

## EndpointSpec 字段说明

| 字段        | 说明                                                   |
| ----------- | ------------------------------------------------------ |
| tenantType  | TenantScoped / PlatformOnly / TenantAgnostic           |
| caller      | admin / client / internal                              |
| sloCategory | payment / core-trade / list-query / admin-config       |
| errorCases  | 显式穷举：参数非法、权限不足、状态不允许、资源不存在等 |

## ScenarioSpec 与 Rule ID

- 每个 scenario 对应 `given`、`when`、`then`、`ruleId`
- ruleId 格式：`R-{CATEGORY}-{DOMAIN}-{SEQ}`（如 R-IN-ORDER-001）
- 状态转换单独列出，每条转换有 ruleId 与测试
