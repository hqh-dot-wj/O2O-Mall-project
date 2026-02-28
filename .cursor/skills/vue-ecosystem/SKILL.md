---
name: vue-ecosystem
description: Vue 3 生态 Pinia、VueUse 使用最佳实践。Use when editing Vue components, Pinia stores, or composables in admin-web (apps/admin-web/src/**/*.vue, **/stores/**/*.ts, **/hooks/**/*.ts).
---

# Vue 生态系统最佳实践

编辑 Vue 组件、Pinia store、 composables 时应用。项目规范见 `.cursor/rules/admin-web.mdc`。

## Vue 3 核心

- **Composition API**：逻辑复用用 composables，避免 mixins
- **Reactivity**：`ref` 用于基本类型和替换引用，`reactive` 用于对象，避免解构丢失响应性
- **组合式**：`onMounted`、`onUnmounted` 清理事件监听、定时器

## Pinia 状态管理

- **Store 组织**：按模块划分，如 `stores/modules/auth.ts`
- **类型安全**：`defineStore` 定义 state、getters、actions 类型
- **Getters**：只做派生计算，不写副作用
- **Actions**：异步请求、业务逻辑放在 action，不在组件中直接调 API

```ts
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isLoggedIn = computed(() => !!user.value);
  async function login(params: LoginParams) { /* ... */ }
  return { user, isLoggedIn, login };
});
```

## VueUse Composables

- **按需使用**：只导入需要的方法，如 `import { useDebounceFn } from '@vueuse/core'`
- **常见场景**：`useDebounceFn` 搜索、`useStorage` 持久化、`useElementSize` 尺寸监听
- **自定义 Composables**：单一职责，命名 `useXxx`，返回响应式数据或方法
