---
name: vue-ecosystem
description: >
  Use Pinia store, VueUse, or composables in admin-web.
  Trigger: user asks to add/modify Pinia store, composables, or state
  management in apps/admin-web; `**/stores/**/*.ts`, `**/hooks/**/*.ts`.
---

# Vue 生态（Pinia + VueUse + Composables）

编辑 Pinia store、composables 时应用。详细规范见 `.cursor/rules/admin-web.mdc`。

## Instructions

1. **Pinia Store**：按模块划分（如 `stores/modules/auth.ts`）；`defineStore` 内用 `ref`/`computed`；异步逻辑放 actions，组件中不直接调 API。
2. **Getters**：只做派生计算，不写副作用。
3. **VueUse**：按需导入，如 `import { useDebounceFn } from '@vueuse/core'`；常见 `useDebounceFn` 搜索、`useStorage` 持久化。
4. **自定义 Composables**：单一职责，命名 `useXxx`，返回响应式数据或方法；避免 mixins。
5. **Reactivity**：`ref` 用于基本类型，`reactive` 用于对象；解构时注意响应性丢失。

## Example

```ts
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isLoggedIn = computed(() => !!user.value);
  async function login(params: LoginParams) {
    const res = await fetchLogin(params);
    user.value = res.data;
  }
  return { user, isLoggedIn, login };
});
```

## Validation

- [ ] Store 类型完整，无 `any`
- [ ] Actions 放异步逻辑，组件不直接调 API
- [ ] Composables 单一职责
