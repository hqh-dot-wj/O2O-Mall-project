---
trigger: always_on
---

# Admin-Web 前端开发规范（Coding Rules & Conventions）

本规范以 `apps/admin-web/src/views/system` 为参考实现（如 `role`、`user`、`dept`），适用于 admin-web 下所有业务视图的开发与扩展。命名与结构对齐业界常见实践（如大厂管理后台的目录、组件、API 约定）。

## 1. File Structure

Each entity module (e.g., `role`, `user`, `dept`) should follow this directory structure:

src/views/system/[entity_name]/

├── index.vue # Main list view

└── modules/ # Sub-components directory

    ├── [entity]-operate-drawer.vue   # Add/Edit form (Drawer/Modal)

    ├── [entity]-search.vue           # Search filter component

    ├── [entity]-[feature]-drawer.vue # 功能抽屉（如 auth-user, data-scope）
    └── [entity]-[feature]-modal.vue  # 功能弹窗（如 import, cascade-delete）

- **Drawer**：侧滑抽屉，用于表单、详情、配置；文件命名 `*-drawer.vue`。
- **Modal**：居中对话框，用于确认、导入、批量操作；文件命名 `*-modal.vue`。
- **复杂模块**（如 `file-manager`）：可增加 `components/`、`constants/`、`hooks/` 等子目录。

**示例（system）：**

- `src/views/system/role/index.vue`
- `src/views/system/role/modules/role-operate-drawer.vue`
- `src/views/system/role/modules/role-search.vue`
- `src/views/system/menu/modules/menu-cascade-delete-modal.vue`

## 2. Naming Conventions

- **Directories**: Kebab-case (e.g., `role`, `user-payment`).
- **Files**: Kebab-case (e.g., `role-search.vue`).
- **Component Names**: PascalCase in `defineOptions` (e.g., `name: 'RoleSearch'`).
- **Sub-components**: Prefix with the entity name (e.g., `RoleSearch`, `RoleOperateDrawer`).

## 3. Component Responsibilities & Patterns

### 3.1 Main List View (`index.vue`)

- **Responsibility**: Orchestrates the list, search, and operations.
- **State Management**:
  - Use `useTable` hook for data fetching, pagination, and loading state.
  - Use `useTableOperate` hook for handling add/edit/delete actions and drawer visibility.
- **Composition**:
  - `[Entity]Search`: Placed at the top. Binds `searchParams` via `v-model:model`.
  - `NDataTable`: Displays the list.
  - `[Entity]OperateDrawer`: Placed inside the component (usually at the end). Controlled via `visible` and `operateType`.
- **API**:
  - Defines `fetchList` function passed to `useTable`.

### 3.2 Search Component (`modules/[entity]-search.vue`)

- **Responsibility**: Provides filter inputs for the list.
- **Props**:
  - `model`: Two-way binding (`defineModel`) for search parameters (`Api.System.[Entity]SearchParams`).
- **Emits**:
  - `search`: Triggered when "Search" is clicked or valid.
  - `reset`: Triggered when "Reset" is clicked.
- **UI Pattern**:
  - Use `NCollapse` (optional but common) -> `NForm` -> `NGrid`.
  - Use `useNaiveForm` for basic validation or restoration.
  - "Reset" should clear `model` values and emit `reset`.

### 3.3 Operate Drawer (`modules/[entity]-operate-drawer.vue`)

- **Responsibility**: Handles "Add" and "Edit" logic.
- **Props**:
  - `operateType`: `'add' | 'edit'`.
  - `rowData`: The data of the row being edited (nullable).
  - `visible`: Two-way binding (`defineModel`) for visibility.
- **Emits**:
  - `submitted`: Triggered after a successful API call.
- **Logic**:
  - **Initialization**: Watch `visible`. When true, if `operateType` is 'add', reset form. If 'edit', clone `rowData` to form model.
  - **Validation**: Use `useNaiveForm` and define `rules`.
  - **API Interaction**: Perform `fetchCreate` or `fetchUpdate` inside the drawer component.
  - **Feedback**: Show success message (`window.$message.success`) and emit `submitted`.

## 4. Common Hooks & Utils

- **Table**: `@/hooks/common/table` (`useTable`, `useTableOperate`).
- **Tree Table**: `@/hooks/common/tree-table` (`useTreeTable`, `useTreeTableOperate`).
- **Form**: `@/hooks/common/form` (`useNaiveForm`).
- **Boolean State**: `@/hooks/business/useBoolean`.
- **Dictionaries**: `@/hooks/business/dict` (`useDict`).
- **I18n**: `@/locales` (`$t`).

- **API**：优先从 `@/service/api/[module]/[entity]` 按实体文件导入；同一 module 多实体时可从 `@/service/api/[module]` 的 index 导入。
- **API 命名**：`fetchGet[Entity]List`、`fetchCreate[Entity]`、`fetchUpdate[Entity]`、`fetchDelete[Entity]`。

## 5. 代码风格与模板约定（对齐大厂实践）

- **模板**：指令使用缩写（`:value`、`@click`）；`v-for` 必须设置 `key`；频繁切换用 `v-show`，否则用 `v-if`。
- **TypeScript**：**类型安全为强制要求**，详见 [§8 TypeScript 类型安全（强制）](#8-typescript-类型安全强制)；方法入参、出参显式声明类型；**禁止使用 `any`**；异步逻辑用 `try/catch` 并妥善提示错误。
- **组件样式**：单文件组件样式使用 `scoped`，避免污染全局。

## 6. 页面布局规范（Page Layout Patterns）

新开模块时，根据数据关系选择以下**一种**标准布局，保持整站一致。

---

### 6.1 标准布局：搜索 + 表格（Search + Table）

- **适用**：扁平列表（角色、岗位、租户、品牌等）。
- **结构示意**：
  ```
  ┌─────────────────────────────────────────────────────────┐
  │  [Entity]Search（NCollapse + NForm + 查询/重置）          │
  └─────────────────────────────────────────────────────────┘
  ┌─────────────────────────────────────────────────────────┐
  │  NCard                                                   │
  │  ├── 工具栏（新增、删除、导出等）                          │
  │  └── NDataTable（分页）                                   │
  └─────────────────────────────────────────────────────────┘
  │  [Entity]OperateDrawer（置于模板末尾，v-model:visible）   │
  ```
- **Hook**：`useTable`、`useTableOperate`。
- **参考**：`src/views/system/role/index.vue`。

---

### 6.2 布局 A：左侧树筛选（Side Tree Filter）

- **适用**：主列表需按某一层级维度筛选（如用户按部门树筛选）。
- **结构示意**：
  ```
  ┌──────────────┬──────────────────────────────────────────┐
  │ TableSider   │  右侧主内容区                              │
  │ Layout       │  ├── [Entity]Search（可选，在 header-extra）│
  │ 左侧树       │  └── NCard + NDataTable                   │
  │ (NTree)      │  └── [Entity]OperateDrawer                 │
  └──────────────┴──────────────────────────────────────────┘
  ```
- **要点**：左侧树与右侧表格数据源独立；树选中项作为 `searchParams` 之一参与列表请求。
- **Hook**：`useTable`（表格）+ `useLoading`（树加载）。
- **参考**：`src/views/system/user/index.vue`、`src/views/system/post/index.vue`。

---

### 6.3 布局 B：左侧树导航 + 主从详情（Side Tree Master-Detail)

- **适用**：树即主导航，右侧展示当前节点详情及子节点表格（菜单、分类等）。
- **结构示意**：
  ```
  ┌──────────────┬──────────────────────────────────────────┐
  │ TableSider   │  右侧                                      │
  │ Layout       │  ├── NDescriptions（当前节点详情）          │
  │ 左侧树       │  ├── 工具栏（新增子节点等）                  │
  │ (主导航)     │  └── NDataTable（当前节点的子记录）         │
  └──────────────┴──────────────────────────────────────────┘
  ```
- **要点**：树选中驱动右侧详情与子表数据；无全局 [Entity]Search 或放在 header-extra。
- **Hook**：`useLoading`（树 + 子列表）。
- **参考**：`src/views/system/menu/index.vue`、`src/views/system/dict/index.vue`。

---

### 6.4 布局 C：树形表格（Tree Table）

- **适用**：层级数据用表格树展示，支持展开/折叠（如部门）。
- **结构示意**：
  ```
  ┌─────────────────────────────────────────────────────────┐
  │  [Entity]Search（NCollapse + NForm）                      │
  └─────────────────────────────────────────────────────────┘
  ┌─────────────────────────────────────────────────────────┐
  │  NCard                                                   │
  │  ├── 工具栏（展开全部/折叠全部、新增、删除等）              │
  │  └── NDataTable（tree 形态，children 字段）                │
  └─────────────────────────────────────────────────────────┘
  ```
- **Hook**：`useTreeTable`、`useTreeTableOperate`；需配置 `idField`（如 `deptId`）。
- **参考**：`src/views/system/dept/index.vue`。

---

### 6.5 布局选择速查

| 数据类型           | 推荐布局       | 参考页面           |
| ------------------ | -------------- | ------------------ |
| 扁平列表           | 6.1 标准       | role, post, tenant |
| 列表按树筛选       | 6.2 左侧树筛选 | user, post         |
| 树为主 + 详情+子表 | 6.3 主从       | menu, dict         |
| 表格树（展开折叠） | 6.4 树形表格   | dept               |

---

## 7. 性能、样式与实现细节规范（约 20 条）

以下每条给出**规则 + 何时用/何时不用 + 示例**，便于统一实现与 Code Review。

| #      | 类别                   | 规则                                                                                              | 示例 / 说明                                                                                                                                                    |
| ------ | ---------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | **DOM 深度**           | 单条渲染路径上 DOM 嵌套不宜超过 **5～6 层**，否则影响布局与性能。                                 | 避免：`div > div > section > div > div > span`；可接受：`NCard > NDataTable` 或 `NForm > NGrid > NFormItemGi`。用语义组件（NCard、NForm）替代无意义 div 包裹。 |
| **2**  | **Flex 使用场景**      | **一维排布**（横向或纵向一条线）、对齐、均分、换行用 Flex。                                       | 工具栏：`class="flex items-center justify-between gap-2"`；表单项一行多个：`flex gap-4`；头像+文案：`flex items-center gap-2`。                                |
| **3**  | **Grid 使用场景**      | **二维网格**、按列数/行数规则排布、表单多列、卡片网格用 Grid。                                    | 搜索区：`NGrid responsive="screen" item-responsive` + `NFormItemGi span="24 m:6"`；仪表盘卡片：`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`。        |
| **4**  | **v-if 与 v-show**     | 频繁切换用 **v-show**，否则用 **v-if**，减少无谓节点。                                            | Tab 内容、折叠面板内容用 `v-show`；根据权限/类型只渲染一种块用 `v-if`。                                                                                        |
| **5**  | **列表 key**           | **v-for 必须写 key**，且 key 为**稳定唯一**（如 id），禁止用 index 作 key（在增删排序时会错乱）。 | `v-for="item in list" :key="item.id"` ✅；`:key="index"` ❌（仅静态只读列表可勉强接受）。                                                                      |
| **6**  | **性能 - 大列表**      | 超长列表（数百行以上）用**虚拟滚动**或分页，避免一次渲染全部 DOM。                                | `NDataTable` 用服务端分页；若前端大列表用 `NVirtualList` 或 Naive 的 virtual-scroll 能力。                                                                     |
| **7**  | **性能 - 防抖/节流**   | 搜索输入、窗口 resize、滚动回调等高频触发逻辑要**防抖或节流**。                                   | 搜索框：`watch(searchKeyword, useDebounceFn(fn, 300))`；resize：`useThrottleFn(handleResize, 200)`。                                                           |
| **8**  | **性能 - 按需加载**    | 路由使用**懒加载**，大组件/弹层可异步组件，减少首屏体积。                                         | `component: () => import('@/views/system/role/index.vue')`；弹层：`defineAsyncComponent(() => import('./heavy-modal.vue'))`。                                  |
| **9**  | **CSS - 作用域**       | 单文件组件样式默认 **scoped**，避免污染全局；全局样式放 `styles/` 并慎用。                        | `<style scoped lang="scss">`；修改第三方组件样式时用 `:deep(.n-button)` 等。                                                                                   |
| **10** | **CSS - 类名**         | 自定义类名**小写 + 短横线**（kebab-case），与 BEM 类似可加块-元素修饰。                           | `.role-search-form`、`.operate-drawer-footer`；避免 `.roleSearch`、随机缩写。                                                                                  |
| **11** | **CSS - 选择器**       | 避免过深选择器（如超过 3 层），避免用 `!important` 覆盖；优先用类名。                             | 推荐：`.card-wrapper .n-card`；避免：`.a .b .c .d .e`。                                                                                                        |
| **12** | **Drawer vs Modal**    | **表单、配置、多步操作**用 Drawer；**简单确认、单次提示、导入结果**用 Modal。                     | 新增/编辑用 `NDrawer`；删除二次确认、导入弹窗用 `NModal`。                                                                                                     |
| **13** | **computed vs method** | 依赖响应式数据且需**复用/缓存**用 **computed**；有副作用或仅用一次可用 **method**。               | 表格列配置、根据 operateType 算标题用 `computed`；点击提交用 `method`。                                                                                        |
| **14** | **请求时机**           | 列表数据在**页面/组件挂载或搜索/筛选变更时**请求，不在模板里调接口。                              | 在 `onMounted` 或 `getData()` 里调 `fetchGetXxxList`；不用 `{{ fetchXxx() }}`。                                                                                |
| **15** | **加载与错误态**       | 异步列表/详情必须带 **loading**；接口失败要有 **message 提示**或错误态 UI。                       | `useTable` 的 `loading` 绑到 `NDataTable`；`try/catch` 里 `window.$message?.error(err.message)`。                                                              |
| **16** | **表单校验**           | 提交前**统一校验**（如 `validate()`），必填项在 `rules` 中声明，不在业务逻辑里散写 if。           | `const { validate } = useNaiveForm()`；提交前 `await validate()`，失败不请求。                                                                                 |
| **17** | **资源与图片**         | 图片尽量**控制尺寸/压缩**，大图用懒加载；静态资源放 `assets` 或 CDN，路径用别名。                 | `<img loading="lazy" />`；图标用 SvgIcon 或 Naive 的 NIcon，避免巨大位图。                                                                                     |
| **18** | **事件与清理**         | 在组件内注册的**全局监听（resize、scroll）或定时器**在 `onUnmounted` 中移除，避免泄漏。           | `onMounted(() => { window.addEventListener('resize', fn); }); onUnmounted(() => { window.removeEventListener('resize', fn); });`                               |
| **19** | **可访问性**           | 按钮/链接要有**可读文案或 aria-label**；表单必填项关联 `label`；重要状态可加 `role`/`aria-*`。    | `<NButton aria-label="关闭">`；`NFormItem` 的 label 与控件正确关联。                                                                                           |
| **20** | **响应式**             | 需要适配多端时，用 **Naive 的 `responsive` 或断点**（如 `s:12 m:6`），或统一断点变量。            | `NGrid item-responsive` + `span="24 s:12 m:6"`；避免到处写魔法数字 `768px`。                                                                                   |

**速记**：DOM 浅、Flex 一维 Grid 二维、v-if/v-show 与 key 不乱用、大列表虚拟或分页、防抖节流、scoped+类名规范、Drawer 表单 Modal 确认、computed 缓存、请求在脚本里、loading+错误态、表单校验、事件清理、能写 a11y 与响应式则写。

---

## 8. TypeScript 类型安全（强制）

前端为 TypeScript 项目，**类型安全为强制要求**，Code Review 与 CI 中禁止放宽。以下必须遵守。

### 8.1 禁止 any，优先使用项目已有类型

- **禁止**：`any` 类型（包括显式写 `: any`、`as any`、`// @ts-ignore` 规避类型）。
- **允许**：在确实无法推断时使用 `unknown`，并在使用前做**类型收窄**（typeof、in、自定义 type guard）。
- **优先**：使用 `src/typings/` 下与 API 对齐的类型（如 `Api.System.Role`、`Api.System.RoleSearchParams`）。

```ts
// ❌ 禁止
const list: any[] = [];
function handle(row: any) {}

// ✅ 使用项目类型
const list: Api.System.Role[] = [];
function handle(row: Api.System.Role) {}

// ✅ 无法确定时用 unknown + 收窄
function handle(data: unknown) {
  if (data && typeof data === 'object' && 'roleId' in data) {
    const row = data as Api.System.Role;
    // ...
  }
}
```

### 8.2 API 请求与响应必须带类型

- 请求参数、响应体必须使用 `Api.[Module].[Entity]` 或 `Api.[Module].[XxxParams]` / `XxxVo` 等已定义类型。
- 若接口尚未在 `typings` 中声明，**先补充类型定义**再写业务代码；不得用 `any` 占位。

```ts
// ✅ 参数与返回值有类型
const fetchGetRoleList = (params: Api.System.RoleSearchParams) =>
  request<Api.System.RolePageResult>({ url: '/system/role/list', params });

// 使用处
const res = await fetchGetRoleList(searchParams);
// res 为 Api.System.RolePageResult，res.rows 等有完整类型
```

### 8.3 组件 Props / Emits 必须显式类型

- 使用 **interface** 或 **type** 定义 Props 与 Emits，禁止不写类型或写成 `any`。
- `defineModel` 需带泛型；`defineEmits` 使用**类型化签名**（对象形式或类型别名）。

```ts
// ✅ Props
interface Props {
  operateType: NaiveUI.TableOperateType;
  rowData?: Api.System.Role | null;
}
const props = defineProps<Props>();

// ✅ defineModel 带泛型
const visible = defineModel<boolean>('visible', { default: false });
const model = defineModel<Api.System.RoleSearchParams>('model', { required: true });

// ✅ Emits 类型化
interface Emits {
  (e: 'submitted'): void;
  (e: 'reset'): void;
  (e: 'search'): void;
}
const emit = defineEmits<Emits>();
```

### 8.4 ref / reactive 必须带类型

- `ref<T>`、`reactive` 的引用需有明确类型 T；复杂对象用 interface 描述，避免 `ref()` 无泛型。
- 数组、表格数据等统一用 `Ref<Api.xxx[]>` 或 `ref<Api.System.Role[]>([])`。

```ts
// ❌ 禁止
const list = ref([]);
const form = reactive({});

// ✅ 明确类型
const list = ref<Api.System.Role[]>([]);
const form = reactive<Api.System.RoleOperateParams>({ roleName: '', roleKey: '', status: '0', ... });
```

### 8.5 函数入参与返回值必须声明类型

- 所有 **function** / **箭头函数** 的入参与返回值均需显式类型；仅极简单回调（如 `() => true`）可依赖推断。
- 异步函数返回 `Promise<T>`，T 为实际解析类型。

```ts
// ✅
function getTitle(type: NaiveUI.TableOperateType): string {
  return type === 'add' ? '新增' : '编辑';
}
async function loadList(): Promise<void> {
  const res = await fetchGetRoleList(searchParams);
  data.value = res.rows;
}
```

### 8.6 表格列、表单 rules 等配置需类型

- `NDataTable` 的 `columns` 使用 `DataTableColumns<Api.System.Role>` 等，保证 `row` 有类型。
- `FormRules`、`FormItemRule` 使用 Naive 或项目内已有类型，rule 的 `key` 与 model 字段一致。

```ts
import type { DataTableColumns } from 'naive-ui';

const columns: DataTableColumns<Api.System.Role> = [
  { key: 'roleName', title: '角色名称', minWidth: 120 },
  {
    key: 'status',
    title: '状态',
    render(row) {
      return row.status;
    },
  }, // row 为 Api.System.Role
];
```

### 8.7 严格空值检查

- 可选链与空值合并：访问可能为 `null`/`undefined` 的属性用 `?.`，默认值用 `??`。
- 类型中可选字段用 `?`，可空用 `| null`，不要用 `any` 逃避。

```ts
// ✅
const name = rowData?.roleName ?? '';
params.value?.beginTime;
```

### 8.8 类型导入

- 仅作类型使用的导入使用 `import type`，减少运行时产物与循环依赖风险。

```ts
import type { DataTableColumns } from 'naive-ui';
import type { Api } from '@/typings/api';
```

### 8.9 速查（类型安全）

| 场景         | 要求                                         |
| ------------ | -------------------------------------------- | ----- |
| 禁止 any     | 用 `unknown` + 类型收窄或补充正确类型        |
| API          | 参数、返回值使用 `Api.*` / typings 定义      |
| Props/Emits  | interface + defineProps/defineEmits 类型化   |
| defineModel  | 带泛型，如 `defineModel<boolean>('visible')` |
| ref/reactive | 带泛型或接口类型                             |
| 函数         | 入参、返回值显式类型                         |
| 表格 columns | `DataTableColumns<RowType>`                  |
| 可选/可空    | `?.`、`??`、`?`、`                           | null` |
| 类型导入     | 仅类型用 `import type`                       |
