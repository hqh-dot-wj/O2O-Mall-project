---
name: marketing-config-pattern
description: Marketing config with RuleSchema. Use when extending play templates or config drawers.
---

# 营销配置模式

扩展玩法模板、配置抽屉时，参考项目既有能力。

## 参考实现

- `config-operate-drawer.vue` — RuleSchema 动态表单 + Iframe 预览
- `template-operate-drawer.vue` — Schema Builder
- `rule-validator.service.ts` — 规则校验

## 模式

- 配置用 RuleSchema 描述，动态渲染表单
- 规则校验统一走 rule-validator
- 预览用 Iframe 或独立路由
