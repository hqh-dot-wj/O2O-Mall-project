---
inclusion: fileMatch
fileMatchPattern: 'apps/admin-web/src/**/*.vue'
---

# Vue 生态系统最佳实践

> 编辑 Vue 组件时自动加载。

Vue 3、Pinia、VueUse 的项目规范已整合到 `admin-web-frontend.md` 中。

## 快速参考

- Composition API + `<script setup>` 优先
- Pinia Store: `setup()` 风格，按模块组织
- VueUse: 200+ 实用 Composition 函数，优先使用已有方案
- 响应式: ref 用于基本类型，reactive 用于对象，均需显式类型

## Anthony Fu Skills

```bash
pnpx skills add antfu/skills --skill='vue,pinia,vueuse-functions'
```
