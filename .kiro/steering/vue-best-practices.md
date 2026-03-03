---
inclusion: fileMatch
fileMatchPattern: 'apps/admin-web/src/**/*.{vue,ts,tsx}'
---

# Vue 3 + TypeScript 最佳实践

> 编辑 admin-web 源码时自动加载。

详细的 Vue 3 前端开发规范（组件设计、TypeScript 集成、性能优化、代码组织）已整合到 `admin-web-frontend.md` 中，编辑 admin-web 源码时会同时加载。

## 项目特定规范（快速参考）

- 文件结构: `index.vue` + `modules/`
- Hooks: `useTable`, `useTableOperate`, `useNaiveForm`
- 类型安全: 强制类型，禁止 `any`
- 布局模式: 标准列表、左侧树筛选、左侧树主从、树形表格
- 标签顺序: `<script setup lang="ts">` → `<template>` → `<style scoped>`
- Props/Emits 用 interface 定义，defineModel 带泛型

## Anthony Fu Skills

```bash
pnpx skills add antfu/skills --skill='vue-best-practices'
```
