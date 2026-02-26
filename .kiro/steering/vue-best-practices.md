---
inclusion: fileMatch
fileMatchPattern: 'apps/admin-web/src/**/*.{vue,ts,tsx}'
---

# Vue 3 + TypeScript 最佳实践

> 编辑 admin-web 源码时自动加载。补充 Vue 官方最佳实践。

本文档引用 Anthony Fu 的 Vue 最佳实践 Skills。

## 官方最佳实践（Anthony Fu Skills）

### 组件设计

- 单一职责原则
- Props 设计模式
- Emits 类型安全
- Slots 使用最佳实践

### 性能优化

- 计算属性 vs 方法
- v-if vs v-show
- 列表渲染优化
- 组件懒加载

### TypeScript 集成

- 类型推断优化
- 泛型组件设计
- 类型安全的 Props/Emits
- 全局类型定义

### 代码组织

- Composables 设计
- 状态管理模式
- 目录结构最佳实践

---

**注意**: 需要先安装：

```bash
pnpx skills add antfu/skills --skill='vue-best-practices'
```

## 项目特定规范

详细的前端开发规范请参考 `admin-web-frontend.md`：

- 文件结构: `index.vue` + `modules/`
- Hooks: `useTable`, `useTableOperate`, `useNaiveForm`
- 类型安全: 强制类型，禁止 `any`
- 布局模式: 标准列表、左侧树筛选、左侧树主从、树形表格
