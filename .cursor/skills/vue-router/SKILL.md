---
name: vue-router
description: Vue Router 与 @elegant-router 路由配置、守卫、类型安全最佳实践。Use when editing route files in admin-web (apps/admin-web/src/router/**/*.{ts,vue}).
---

# Vue Router 最佳实践

编辑 `apps/admin-web/src/router/` 下路由相关文件时应用。项目使用 `@elegant-router/vue`。

## 路由配置

- **配置位置**：`src/router/`，elegant-router 约定式路由
- **懒加载**：路由级组件用 `() => import(...)` 实现懒加载
- **嵌套路由**：树形结构，子路由配置 `children`

## 路由守卫

- **全局守卫**：`router.beforeEach` 处理权限、登录态
- **路由级**：`meta.roles`、`meta.permissions` 控制访问
- **导航流程**：鉴权 → 重定向或放行，避免死循环

## 类型安全

- **路由参数**：使用 `useRoute()` 时，参数类型来自 elegant-router 生成
- **路由跳转**：`router.push` 使用类型安全的路径常量

## 项目约定

- 路由配置在 `src/router/elegant/` 下
- 详见 `.cursor/rules/admin-web.mdc` 第 1 节 Vue Router 部分
