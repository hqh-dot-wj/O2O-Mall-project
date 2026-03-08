---
name: vue-best-practices
description: >
  Create or edit Vue 3 components (SFC, TS) in admin-web.
  Trigger: user asks to create/edit Vue components in apps/admin-web;
  implementing CRUD pages, drawers, modals, or view modules.
---

# Vue 3 + TypeScript 组件

创建或编辑 `apps/admin-web` 下 `.vue`、`.ts`、`.tsx` 时应用。详细规范见 `.cursor/rules/admin-web.mdc`。

## Instructions

1. **目录结构**：`index.vue` + `modules/`，kebab-case 文件名；Drawer 用 `*-drawer.vue`，Modal 用 `*-modal.vue`。
2. **Props/Emits**：`defineProps<Props>()`、`defineEmits<Emits>()` 显式类型；`defineModel<boolean>('visible', { default: false })` 双向绑定。
3. **类型安全**：禁止 `any`、`as any`、`@ts-ignore`；`ref<T>()`、`reactive<T>()` 带泛型；API 类型来自 `@libs/common-types`。
4. **性能**：频繁切换用 `v-show`，条件渲染用 `v-if`；`v-for` 必须 `key` 且稳定 id；大组件用 `defineAsyncComponent`。
5. **表格列**：`DataTableColumns<Api.System.Role>`；`import type` 导入纯类型。

## Example

```ts
interface Props {
  operateType: 'add' | 'edit';
  rowData?: Api.System.Role | null;
}
defineProps<Props>();
const visible = defineModel<boolean>('visible', { default: false });
const emit = defineEmits<{ (e: 'submitted'): void }>();
```

## Validation

- [ ] Props/Emits 有 interface 类型
- [ ] 无 `any`、`as any`、`@ts-ignore`
- [ ] ref/reactive 带泛型
- [ ] `pnpm --filter admin-web typecheck` 通过
