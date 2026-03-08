---
name: marketing-config-pattern
description: >
  Extend play templates or marketing config drawers with RuleSchema.
  Trigger: user asks to add/edit marketing play templates, store config
  drawers, or rule-based dynamic forms in admin-web.
---

# 营销配置模式（RuleSchema + 动态表单）

扩展玩法模板、门店配置抽屉时，复用项目既有模式。配置用 RuleSchema 描述，动态渲染表单；规则校验统一走 rule-validator。

## Instructions

1. **玩法模板**：参考 `apps/admin-web/src/views/marketing/template/modules/template-operate-drawer.vue` — 含 Schema Builder（动态添加 ruleSchema.fields）；基础信息 + 规则定义器。
2. **门店配置抽屉**：参考 `apps/admin-web/src/views/store/distribution/activity/modules/config-operate-drawer.vue` — 根据所选模板的 RuleSchema 动态渲染表单项；左右分栏 + Iframe 预览。
3. **RuleSchema**：`{ fields: [{ name, type, label, required, ... }] }`；模板存 ruleSchema，门店配置时解析后渲染。
4. **规则校验**：后端 `rule-validator.service.ts` 统一校验；前端 useNaiveForm + rules。
5. **预览**：用 `usePreview` Hook + Iframe，postMessage 同步表单到预览页；previewUrl 根据模式切换。

## Example

**模板 Schema Builder**：ruleSchema.fields 数组，支持 number/string/boolean 等类型；动态添加/删除字段。

**配置抽屉**：选中模板 → 拉取 template.ruleSchema → 遍历 fields 渲染 NFormItem（NInput/NInputNumber/NSwitch 等）→ watch model 变化 → usePreview 同步 Iframe。

## Validation

- [ ] 新增字段类型已在 Schema Builder 支持
- [ ] 规则校验走 rule-validator
- [ ] 预览页路由与 previewUrl 一致
