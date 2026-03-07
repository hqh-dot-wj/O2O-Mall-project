# Admin-Web 前端指引

## 技术栈

Vue3 + Pinia + VueUse + Naive UI + @elegant-router/vue + TypeScript

## 目录约定

```
src/views/[module]/[entity]/
├── index.vue                    # 列表主视图
└── modules/
    ├── [entity]-operate-drawer.vue
    ├── [entity]-search.vue
    └── [entity]-[feature]-modal.vue
```

- **Drawer**：表单、详情、配置
- **Modal**：确认、导入、批量操作

## 类型安全（强制）

- 禁止 `any`、`as any`、`@ts-ignore`
- Props/Emits 用 interface 显式类型
- API 类型来自 `@libs/common-types`，禁止手写重复
- `ref<T>()`、`reactive<T>()` 必须带泛型

## 常用 Hooks

- Table：`useTable`、`useTableOperate`（`@/hooks/common/table`）
- Form：`useNaiveForm`（`@/hooks/common/form`）
- API：`@/service/api/[module]/[entity]`

## 多租户

租户由 `authStore.userInfo.user?.tenantId` 注入请求头 `tenant-id`，业务代码无需再设。

## 参考实现

`src/views/system/role`、`user`、`dept` 为标准实现。
