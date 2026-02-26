---
inclusion: fileMatch
fileMatchPattern: 'apps/admin-web/src/**/*.vue'
---

# Vue 生态系统最佳实践

> 编辑 Vue 组件时自动加载。提供 Vue 3、Pinia、VueUse 的官方最佳实践。

本文档引用 Anthony Fu 的官方 Skills，补充项目特定的 Vue 开发规范。

## 官方最佳实践（Anthony Fu Skills）

### Vue 3 核心

- Composition API 使用模式
- Reactivity 系统最佳实践
- 组件设计原则
- 性能优化技巧

### Pinia 状态管理

- Store 定义和组织
- 类型安全的状态管理
- Actions 和 Getters 最佳实践
- 模块化 Store 设计

### VueUse Composables

- 200+ 实用 Composition 函数
- 常见场景的最佳实践
- 自定义 Composables 设计

---

**注意**: 这些 Skills 需要先安装 Anthony Fu 的 Skills 集合：

```bash
# 如果支持 skills CLI
pnpx skills add antfu/skills --skill='vue,pinia,vueuse-functions'
```

如果未安装，请参考项目现有的 Vue 开发规范（`admin-web-frontend.md`）。
