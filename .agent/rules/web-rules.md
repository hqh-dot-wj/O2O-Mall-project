---
trigger: always_on
---

# Coding Rules & Conventions: System Module

Based on the analysis of `apps/admin-web/src/views/system/role`, the following coding rules and patterns should be followed when developing or extending system modules.

## 1. File Structure

Each entity module (e.g., `role`, `user`, `dept`) should follow this directory structure:

src/views/system/[entity_name]/

├── index.vue                # Main list view

└── modules/                 # Sub-components directory

    ├── [entity]-operate-drawer.vue   # Add/Edit form (Drawer/Modal)
    
    ├── [entity]-search.vue           # Search filter component
    
    └── [entity]-[feature]-drawer.vue # Specific feature components (e.g., auth-user, data-scope)

**Example:**

- `src/views/system/role/index.vue`
- `src/views/system/role/modules/role-operate-drawer.vue`
- `src/views/system/role/modules/role-search.vue`

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

- API functions should be imported from `@/service/api/[module]/[entity]`.
- Naming: `fetchGet[Entity]List`, `fetchCreate[Entity]`, `fetchUpdate[Entity]`, `fetchDelete[Entity]`.

## 6. Page Layout Patterns

When starting a new module, choose one of the following standardized layouts based on the data relationship:

### 6.1 Standard Layout (Search + Table)
- **Use Case**: Simple flat list data (e.g., Brand, Role).
- **Structure**: `[Entity]Search` at the top, a single `NCard` containing `NDataTable` below.
- **Hook**: `useTable`.

### 6.2 Layout A: Side Tree Filter
- **Use Case**: Main data needs to be filtered by a secondary hierarchical dimension (e.g., User list filtered by Department tree).
- **Structure**: `TableSiderLayout`. Tree on the left, Table on the right. Both manage independent data sources.
- **Hook**: `useTable` (Table) + `useLoading` (Tree).

### 6.3 Layout B: Side Tree Navigation (Master-Detail)
- **Use Case**: Strongly hierarchical data where the tree itself is the primary navigation (e.g., Menu management, Category management).
- **Structure**: `TableSiderLayout`. Tree on the left. Right side contains:
    1. `NDescriptions` showing the selected node's detail.
    2. `NDataTable` showing the immediate sub-records (child nodes).
- **Hook**: `useLoading` (Tree) + `useLoading` (Sub-list).
