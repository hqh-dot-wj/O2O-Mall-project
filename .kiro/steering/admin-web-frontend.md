---
inclusion: fileMatch
fileMatchPattern: 'apps/admin-web/**/*'
---

# Admin-Web 前端开发规范（Coding Rules & Conventions）

编辑 `apps/admin-web` 时遵循。本规范以 `apps/admin-web/src/views/system` 为参考实现（如 `role`、`user`、`dept`），适用于 admin-web 下所有业务视图的开发与扩展。命名与结构对齐业界常见实践（如大厂管理后台的目录、组件、API 约定）。

## 1. File Structure

每个实体模块（如 `role`、`user`、`dept`）推荐采用以下目录结构：

```
src/views/[module]/[entity_name]/
├── index.vue                          # 列表/主视图
└── modules/                           # 子组件目录
    ├── [entity]-operate-drawer.vue    # 新增/编辑（侧滑抽屉）
    ├── [entity]-search.vue            # 搜索区（可选，树形/主从页可无）
    ├── [entity]-[feature]-drawer.vue  # 功能抽屉（如 auth-user, data-scope）
    └── [entity]-[feature]-modal.vue   # 功能弹窗（如 import, cascade-delete）
```

- **Drawer**：侧滑抽屉，用于表单、详情、配置；文件命名 `*-drawer.vue`。
- **Modal**：居中对话框，用于确认、导入、批量操作；文件命名 `*-modal.vue`。
- **复杂模块**（如 `file-manager`）：可增加 `components/`、`constants/`、`hooks/` 等子目录。

**示例（system）：** `src/views/system/role/index.vue`、`role-operate-drawer.vue`、`role-search.vue`、`menu-cascade-delete-modal.vue`。

## 2. Naming Conventions

- **目录**：kebab-case（如 `role`、`user-payment`、`tenant-package`）。
- **文件**：kebab-case（如 `role-search.vue`、`user-operate-drawer.vue`）。
- **组件名（defineOptions）**：PascalCase（如 `name: 'RoleSearch'`、`name: 'UserList'`）。
- **子组件**：以实体名为前缀（如 `RoleSearch`、`RoleOperateDrawer`）。
- **变量/方法**：camelCase；**常量**：UPPER_SNAKE_CASE。
- **类型**：PascalCase；优先使用 `Api.[Module].[Entity]`，**禁止 `any`**。
- **文案**：可展示给用户的文本使用 `$t()` 国际化（`@/locales`）。

## 3. Component Responsibilities & Patterns

### 3.1 Main List View (`index.vue`)

- 编排列表、搜索、操作；使用 `useTable` / `useTableOperate`；`[Entity]Search` 置顶绑定 `v-model:model`；`NDataTable` 展示列表；`[Entity]OperateDrawer` 置模板末尾，用 `visible`、`operateType` 控制。
- API：定义 `fetchList` 传入 `useTable`。

### 3.2 Search Component (`modules/[entity]-search.vue`)

- `model`：defineModel 绑定搜索参数（`Api.System.[Entity]SearchParams`）；emit `search`、`reset`。
- UI：NCollapse → NForm → NGrid；`useNaiveForm`；重置时清空 model 并 emit `reset`。

### 3.3 Operate Drawer (`modules/[entity]-operate-drawer.vue`)

- Props：`operateType: 'add' | 'edit'`，`rowData`（可空），`visible`（defineModel）。
- Emit：`submitted`（接口成功后）。
- 逻辑：watch `visible`，add 重置表单、edit 用 `rowData` 填表；`useNaiveForm` + rules；内部调 `fetchCreate`/`fetchUpdate`；成功 `$message.success` 并 emit `submitted`。

## 4. Common Hooks & Utils

- Table：`@/hooks/common/table`（`useTable`、`useTableOperate`）。
- Tree Table：`@/hooks/common/tree-table`（`useTreeTable`、`useTreeTableOperate`）。
- Form：`@/hooks/common/form`（`useNaiveForm`）。
- Boolean：`@/hooks/business/useBoolean`；字典：`useDict`；I18n：`$t`。
- **API**：优先 `@/service/api/[module]/[entity]`；多实体时可从 `@/service/api/[module]` 的 index 导入。
- **API 命名**：`fetchGet[Entity]List`、`fetchCreate[Entity]`、`fetchUpdate[Entity]`、`fetchDelete[Entity]`。

## 5. 代码风格与模板约定

- **模板**：指令缩写（`:value`、`@click`）；`v-for` 必须 `key` 且稳定唯一；频繁切换用 `v-show`，否则 `v-if`。
- **TypeScript**：**类型安全强制**，见 §8；入参/出参显式类型；**禁止 `any`**；异步用 `try/catch` 并提示错误。
- **样式**：单文件组件 `<style scoped>`，避免污染全局。

## 6. 页面布局规范

新开模块按数据关系选**一种**布局，参考 `src/views/system` 对应页面。

| 布局 | 适用 | 参考 |
|------|------|------|
| **6.1 标准（Search + Table）** | 扁平列表 | role, post, tenant |
| **6.2 左侧树筛选** | 列表按树筛选 | user, post |
| **6.3 左侧树主从** | 树为主 + 详情+子表 | menu, dict |
| **6.4 树形表格** | 表格树展开/折叠 | dept |

- 6.1：上方 Search，下方 NCard + NDataTable；`useTable`。
- 6.2：`TableSiderLayout`，左树右表，树选中参与 searchParams；`useTable` + `useLoading`(树)。
- 6.3：`TableSiderLayout`，左树，右侧 NDescriptions + 子表；`useLoading`。
- 6.4：Search + NCard + 树形 NDataTable；`useTreeTable`，配置 `idField`。

## 7. 性能、样式与实现细节（20 条摘要）

1. **DOM 深度**：单路径不超过 5～6 层；用 NCard、NForm 等语义组件。
2. **Flex**：一维排布、对齐、均分用 Flex（工具栏、表单项一行）。
3. **Grid**：二维网格、多列表单用 Grid（NGrid + NFormItemGi、仪表盘卡片）。
4. **v-if / v-show**：频繁切换 v-show，否则 v-if。
5. **v-for key**：必写，用稳定唯一 id，禁止用 index（有增删排序时）。
6. **大列表**：虚拟滚动或分页，不一次渲染全部。
7. **防抖/节流**：搜索输入、resize、滚动等高频逻辑。
8. **按需加载**：路由懒加载，大弹层可 `defineAsyncComponent`。
9. **CSS scoped**：默认 scoped；改第三方用 `:deep()`。
10. **类名**：kebab-case（如 `.role-search-form`）。
11. **选择器**：不过 3 层，避免 `!important`。
12. **Drawer vs Modal**：表单/配置用 Drawer，简单确认用 Modal。
13. **computed vs method**：需缓存用 computed，副作用/一次用 method。
14. **请求时机**：挂载或筛选变更时请求，不在模板里调接口。
15. **loading/错误**：列表带 loading；失败 message 或错误态。
16. **表单校验**：提交前 `validate()`，rules 声明必填。
17. **图片**：控制尺寸/懒加载；图标用 SvgIcon/NIcon。
18. **事件清理**：resize/定时器等在 `onUnmounted` 移除。
19. **a11y**：按钮/链接有文案或 aria-label；表单项关联 label。
20. **响应式**：用 Naive responsive 或断点，避免魔法数字。

## 8. TypeScript 类型安全（强制）

前端为 TypeScript，**类型安全强制**，禁止放宽。

### 8.1 禁止 any

- 禁止 `any`、`as any`、`@ts-ignore`。无法推断时用 `unknown` + 类型收窄。
- 优先使用 `src/typings/` 下类型（如 `Api.System.Role`、`Api.System.RoleSearchParams`）。

### 8.2 API 必须带类型

- 请求参数、响应体使用 `Api.[Module].*`；新接口先在 typings 补充类型再写业务，不得用 `any` 占位。

### 8.3 Props / Emits 显式类型

- Props/Emits 用 interface 或 type；`defineModel<T>` 带泛型；`defineEmits` 类型化签名。

```ts
interface Props { operateType: NaiveUI.TableOperateType; rowData?: Api.System.Role | null; }
const props = defineProps<Props>();
const visible = defineModel<boolean>('visible', { default: false });
const model = defineModel<Api.System.RoleSearchParams>('model', { required: true });
interface Emits { (e: 'submitted'): void; }
const emit = defineEmits<Emits>();
```

### 8.4 ref / reactive 带类型

- `ref<Api.System.Role[]>([])`、`reactive<RoleOperateParams>({...})`；禁止无泛型 `ref([])`。

### 8.5 函数入参与返回值声明类型

- 函数/箭头函数入参、返回值显式类型；async 返回 `Promise<T>`。

### 8.6 表格列与表单 rules 带类型

- columns：`DataTableColumns<Api.System.Role>`；rules 的 key 与 model 字段一致。

### 8.7 严格空值

- 可能为空用 `?.`、默认值用 `??`；类型用 `?`、`| null`。

### 8.8 类型导入

- 仅类型用 `import type`。

### 8.9 速查

| 场景 | 要求 |
|------|------|
| 禁止 any | unknown + 收窄或正确类型 |
| API | 参数、返回值 Api.* / typings |
| Props/Emits | interface + 类型化 |
| defineModel | 泛型 |
| ref/reactive | 泛型或接口 |
| 函数 | 入参、返回值类型 |
| columns | DataTableColumns<RowType> |
| 可选/可空 | `?.`、`??`、`?` 与 `null` 类型 |
| 类型导入 | `import type` |

---

## 9. 测试规范

- **单元/组件测试**：Vitest + `@vue/test-utils`，用例放在 `src/**/*.spec.{ts,tsx,vue}`，配置见 `vitest.config.ts`、入口 `src/test/setup.ts`。
- **E2E 测试**：Playwright，用例放在 `e2e/*.spec.ts`，配置见 `playwright.config.ts`。详见 `docs/TESTING.md`。

### 9.1 可直接编写（简单）

以下情况**无需先问**，可直接补充或修改测试：

- **工具函数**：`src/utils`、`src/constants` 等纯函数，无全局依赖或仅简单 mock。
- **简单组件**：无路由/Pinia/复杂 Naive 依赖，或 mock 方式明确（如仅需 `$t`、`$message`）。
- **冒烟 E2E**：访问某路由、页面可见、基础可点击（如已有 `e2e/smoke.spec.ts` 风格）。
- **与本次改动强相关**：新增/修改了某函数或小组件，顺带补同文件的 `*.spec.ts` 或单用例。

编写时遵守：单测用 `describe`/`it`/`expect`，组件用 `mount` + 断言 DOM 或 emit；E2E 用 `page.goto`、`page.locator`、`expect`，不依赖未约定的环境（如固定账号密码）。

### 9.2 需先询问（有难度）

以下情况**先与用户确认**再实现，不擅自写复杂或易失效的用例：

- **复杂 mock**：需 mock 路由、Pinia、多层级 Naive 组件、请求拦截范围与返回值等，方案不唯一。
- **强依赖环境/权限的 E2E**：登录态、多角色、特定后端数据或环境变量，需约定账号、数据或是否用 mock 接口。
- **大范围/长流程 E2E**：跨多页、多步骤的关键业务流程（如下单、审批），需确认覆盖范围与可维护性。
- **历史遗留或第三方逻辑**：被测代码难以理解或强耦合，需确认是否值得补测、优先级与粒度。
- **性能/快照类测试**：如 Vitest 快照、Playwright 视觉回归、性能阈值，需确认是否引入、阈值与 CI 策略。

询问时尽量给出：可选方案（例如「只测 happy path」或「加 mock 登录」）、工作量粗估、对现有流水线的影响；由用户选择后再写。
