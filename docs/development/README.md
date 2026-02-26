# 开发文档

本目录包含项目开发相关的文档和指南。

---

## 📚 文档索引

### 快速开始

- [快速开始](./getting-started.md) - 项目环境搭建和运行指南

### 开发规范

- [CODEOWNERS 使用指南](./codeowners-guide.md) - 代码所有权和审查规则
- [依赖管理规范](./dependency-management.md) - Monorepo 依赖版本管理
- [GitHub 配置指南](./github-setup.md) - 分支保护、团队配置等

### AI 辅助开发

- [Steering 快速开始](./steering-quick-start.md) - Kiro AI 配置验证和使用指南
- [Steering 重构说明](./steering-refactoring.md) - Context 优化技术细节
- [Steering 变更日志](./steering-changelog.md) - 配置变更记录
- [Skills 安装指南](./skills-installation.md) - Anthony Fu Skills 安装和配置

### 测试

- [测试标准化分析](./testing-standardization-analysis.md) - 测试规范和最佳实践

### 架构优化

- [架构优化任务记录](./architecture-optimization-tasks.md) - 架构改进任务的完成记录和进度跟踪

---

## 🗂️ 文档分类说明

### `/docs/guide/` - 用户指南

面向使用者的文档，包括：

- 项目介绍
- 快速开始
- 功能说明
- 常见问题

### `/docs/development/` - 开发文档（当前目录）

面向开发者的文档，包括：

- 开发环境搭建
- 开发规范
- 测试指南
- 架构优化记录

### `/docs/design/` - 设计文档

架构设计和分析文档，包括：

- 架构分析
- 模块设计
- 技术选型

### `/docs/deployment/` - 部署文档

部署相关文档，包括：

- 部署概览
- 环境配置
- 运维指南

### `/docs/deploy-online/` - 在线部署

具体的在线部署步骤，包括：

- MySQL 配置
- Nginx 配置
- Redis 配置
- PM2 配置

---

## 📝 文档命名规范

### 文件命名

- 使用 kebab-case（小写字母 + 连字符）
- 例如: `getting-started.md`, `dependency-management.md`

### 标题规范

- 一级标题: 文档主题
- 二级标题: 主要章节
- 三级标题: 子章节

### 内容组织

1. 概述/目录
2. 主要内容
3. 示例/代码
4. 相关资源
5. 更新记录

---

## 🔄 文档维护

### 更新频率

- **开发规范**: 有变更时立即更新
- **架构优化记录**: 每次完成任务后更新
- **测试文档**: 测试策略变更时更新

### 维护责任

- 文档所有者: @linlingqin77
- 审查要求: 文档变更需要 PR 审查

---

**最后更新**: 2026-02-23  
**维护者**: @linlingqin77
