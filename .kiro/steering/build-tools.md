---
inclusion: fileMatch
fileMatchPattern: '{**/vite.config.{ts,js},**/uno.config.{ts,js}}'
---

# 构建工具配置指南

> 编辑 Vite 或 UnoCSS 配置文件时自动加载。

本文档引用 Anthony Fu 的构建工具 Skills。

## Vite 配置最佳实践

### 插件配置

- 插件加载顺序
- 插件选项优化
- 自定义插件开发

### 构建优化

- 代码分割策略
- 依赖预构建
- 生产构建优化

### 开发体验

- HMR 配置
- 代理配置
- 环境变量管理

## UnoCSS 配置最佳实践

### Presets 配置

- 预设选择和组合
- 自定义预设开发

### Transformers

- 指令转换器
- 变体组转换器

### 性能优化

- 扫描策略
- 缓存配置

---

**注意**: 需要先安装：

```bash
pnpx skills add antfu/skills --skill='vite,unocss'
```

## 项目特定配置

- admin-web 使用 Vite 7.2.2
- UnoCSS 66.5.6 with preset-uno
- 配置文件: `apps/admin-web/vite.config.ts`, `apps/admin-web/uno.config.ts`
