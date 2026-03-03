---
inclusion: fileMatch
fileMatchPattern: 'apps/admin-web/src/router/**/*.{ts,vue}'
---

# Vue Router 最佳实践

> 编辑路由相关文件时自动加载。

路由相关规范已整合到 `admin-web-frontend.md` 中。

## 项目特定规范

- 使用 `@elegant-router/vue` 进行路由管理
- 路由配置在 `src/router/` 目录下
- 路由守卫处理权限控制
- 懒加载策略用于非首屏路由

## Anthony Fu Skills

```bash
pnpx skills add antfu/skills --skill='vue-router-best-practices'
```
