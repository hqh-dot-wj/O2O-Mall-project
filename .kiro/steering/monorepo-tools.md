---
inclusion: manual
---

# Monorepo 工具链指南

> 手动引用: `#monorepo-tools`。配置 pnpm 或 Turborepo 时使用。

本文档引用 Anthony Fu 的 Monorepo 工具 Skills。

## pnpm 最佳实践

### Workspace 管理

- workspace 协议使用
- 依赖提升策略
- catalog 版本管理

### 性能优化

- 缓存策略
- 并行安装
- 依赖去重

### 常见问题

- 幽灵依赖处理
- 版本冲突解决
- lockfile 管理

## Turborepo 最佳实践

### 任务编排

- 任务依赖配置
- 并行执行策略
- 缓存配置

### 性能优化

- 远程缓存
- 增量构建
- 任务过滤

### 最佳实践

- Pipeline 设计
- 输出配置
- 环境变量管理

---

**注意**: 需要先安装：

```bash
pnpx skills add antfu/skills --skill='pnpm,turborepo'
```

## 项目配置

- pnpm 版本: 10.5.0
- Turborepo 版本: 2.3.0
- 配置文件: `pnpm-workspace.yaml`, `turbo.json`
- 详细规范见 `monorepo.md`
