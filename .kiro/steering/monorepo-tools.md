---
inclusion: manual
---

# Monorepo 工具链指南

> 手动引用: `#monorepo-tools`

pnpm/Turborepo 详细规范已整合到 `monorepo.md` 中（`#monorepo` 或编辑配置文件时自动加载）。

## 快速参考

- pnpm 10.5.0 + Turborepo 2.3.0
- 内部包引用: `workspace:*`
- 共享依赖版本: catalog 统一
- 配置文件: `pnpm-workspace.yaml`, `turbo.json`

### pnpm 要点

- workspace 协议、依赖提升策略、catalog 版本管理
- 幽灵依赖处理、版本冲突解决、lockfile 管理

### Turborepo 要点

- 任务依赖配置、并行执行策略、缓存配置
- Pipeline 设计、输出配置、环境变量管理

## Anthony Fu Skills

```bash
pnpx skills add antfu/skills --skill='pnpm,turborepo'
```
