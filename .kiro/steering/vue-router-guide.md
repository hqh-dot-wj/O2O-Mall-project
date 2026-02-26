---
inclusion: fileMatch
fileMatchPattern: 'apps/admin-web/src/router/**/*.{ts,vue}'
---

# Vue Router 最佳实践

> 编辑路由相关文件时自动加载。

本文档引用 Anthony Fu 的 Vue Router 最佳实践 Skill。

## 官方最佳实践（Anthony Fu Skills）

### 路由配置

- 路由定义和组织
- 懒加载策略
- 嵌套路由设计

### 路由守卫

- 全局守卫最佳实践
- 路由级权限控制
- 导航流程优化

### 类型安全

- TypeScript 路由类型定义
- 路由参数类型推断

---

**注意**: 需要先安装：

```bash
pnpx skills add antfu/skills --skill='vue-router-best-practices'
```

## 项目特定规范

本项目使用 `@elegant-router/vue` 进行路由管理，路由配置在 `src/router/` 目录下。
