---
name: vue-best-practices
description: Vue 3 + TypeScript 组件设计、性能优化、类型安全最佳实践。Use when editing Vue components, SFCs, or TypeScript in admin-web (apps/admin-web/src/**/*.{vue,ts,tsx}).
---

# Vue 3 + TypeScript 最佳实践

编辑 `apps/admin-web` 下 `.vue`、`.ts`、`.tsx` 文件时应用。项目详细规范见 `.cursor/rules/admin-web.mdc`。

## 组件设计

- **单一职责**：组件聚焦单一功能
- **Props**：用 `defineProps<Props>()`，interface 显式声明
- **Emits**：`defineEmits<Emits>()` 类型化，如 `(e: 'submitted'): void`
- **Slots**：具名 slot 优于默认 slot 传复杂内容

```ts
interface Props {
  operateType: 'add' | 'edit';
  rowData?: Api.System.Role | null;
}
defineProps<Props>();
const visible = defineModel<boolean>('visible', { default: false });
```

## 性能优化

| 场景 | 选择 |
| --- | --- |
| 频繁切换显示 | `v-show` |
| 条件渲染 | `v-if` |
| 列表 | `v-for` 必须 `key`，用稳定 id，不用 index |
|  computed vs method | 需缓存用 computed，副作用/一次性用 method |
| 大组件/弹层 | `defineAsyncComponent` 懒加载 |

## TypeScript 集成

- **禁止** `any`、`as any`、`@ts-ignore`；用 `unknown` + 类型收窄
- **ref/reactive**：`ref<Api.System.Role[]>([])`，禁止无泛型 `ref([])`
- **函数**：入参、返回值显式类型；async 返回 `Promise<T>`
- **columns**：`DataTableColumns<Api.System.Role>`
- **类型导入**：`import type` 导入纯类型

## 代码组织

- **Composables**：单一职责，按功能拆分
- **目录**：`index.vue` + `modules/` 子组件，kebab-case 文件名
