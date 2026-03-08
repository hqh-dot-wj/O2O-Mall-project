---
name: vue-router
description: >
  Add or modify routes in admin-web; elegant-router config.
  Trigger: user asks to add/modify routes, guards, or navigation in
  apps/admin-web; editing src/router/**/*.{ts,vue}.
---

# Vue Router（@elegant-router）

编辑 `apps/admin-web/src/router/` 时应用。项目使用 `@elegant-router/vue`。详细规范见 `.cursor/rules/admin-web.mdc` §1 Vue Router。

## Instructions

1. **配置位置**：`src/router/elegant/`，约定式路由。
2. **懒加载**：路由级组件用 `() => import(...)`。
3. **嵌套路由**：树形结构，子路由配置 `children`。
4. **守卫**：`router.beforeEach` 处理权限、登录态；`meta.roles`、`meta.permissions` 控制访问；鉴权 → 重定向或放行，避免死循环。
5. **类型安全**：`useRoute()` 参数类型来自 elegant-router 生成；`router.push` 使用类型安全路径常量。

## Example

```ts
// 路由配置
{
  path: '/system/role',
  component: () => import('@/views/system/role/index.vue'),
  meta: { roles: ['admin'], permissions: ['system:role:list'] }
}
```

## Validation

- [ ] 路由级组件懒加载
- [ ] PlatformOnly 路由有权限/角色 meta
- [ ] `pnpm --filter admin-web typecheck` 通过
