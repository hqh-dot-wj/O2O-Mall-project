# 📚 项目文档完整索引

> 本文档索引帮助您快速找到所需的文档资料

---

## 🚀 快速导航

| 类别 | 文档 | 说明 |
|------|------|------|
| 📖 **入门** | [README.md](../README.md) | 项目介绍与快速开始 |
| 🎯 **演示** | [演示账户指南](../apps/backend/docs/DEMO_ACCOUNT_GUIDE.md) | 演示账户完整使用说明 |
| ⚡ **优化** | [优化报告](../apps/backend/docs/OPTIMIZATION_README.md) | 性能优化总结（A级91分） |
| 🏗️ **架构** | [架构优化](../apps/backend/docs/ARCHITECTURE_OPTIMIZATION.md) | 系统架构设计与优化 |
| 🚢 **部署** | [部署步骤](deploy-online/step.md) | 生产环境部署流程 |

### 📂 各应用文档入口（Monorepo）

| 应用 | 文档首页 | 说明 |
|------|----------|------|
| **Backend** | [apps/backend/docs/README.md](../apps/backend/docs/README.md) | 后端文档索引、快速开始、API、E2E 测试 |
| **Admin Web** | [apps/admin-web/QUICK_START.md](../apps/admin-web/QUICK_START.md) · [docs/](../apps/admin-web/docs/) | 管理端快速开始与功能文档 |
| **Miniapp** | [apps/miniapp-client/README.md](../apps/miniapp-client/README.md) | 小程序说明与开发入口 |
| **仓库结构** | [DOCUMENTATION_AND_STRUCTURE_GUIDE.md](DOCUMENTATION_AND_STRUCTURE_GUIDE.md) | 文档与项目结构整理说明 |

---

## 📁 完整文档列表

### 📖 入门文档

#### 核心文档
- [README.md](../README.md) - 项目概览、技术栈、功能特性
- [CHANGELOG.md](../CHANGELOG.md) - 版本更新历史
- [快速开始](guide/quick-start.md) - 快速开始指南

#### 配置文档
- [配置说明](../apps/backend/docs/CONFIG_README.md) - 配置项详细说明
- [配置迁移](../apps/backend/docs/CONFIG_MIGRATION.md) - 环境变量配置
- [配置重构](../apps/backend/docs/CONFIG_REFACTORING.md) - 配置系统重构

---

### 🏗️ 架构文档

#### 系统架构
- [架构优化](../apps/backend/docs/ARCHITECTURE_OPTIMIZATION.md) - 系统架构设计与优化方案
- [多租户迁移](../apps/backend/docs/MULTI_TENANT_MIGRATION.md) - 多租户架构实施指南
- [性能优化总结](../apps/backend/docs/PERFORMANCE_OPTIMIZATION_SUMMARY.md) - 性能优化实践

#### 优化报告（⭐ 重点）
- [优化概览](../apps/backend/docs/OPTIMIZATION_README.md) - 项目优化总结（P0+P1，91分）
- [优化分析](../apps/backend/docs/archive/OPTIMIZATION_ANALYSIS.md) - 详细优化分析报告（已归档）
- [优化实施报告](../apps/backend/docs/archive/OPTIMIZATION_IMPLEMENTATION_REPORT.md) - 优化实施详情（已归档）
- [代码优化分析](../apps/backend/docs/archive/CODE_OPTIMIZATION_ANALYSIS.md) - 代码质量优化（已归档）
- [业务代码优化](../apps/backend/docs/archive/BUSINESS_CODE_OPTIMIZATION.md) - 业务逻辑优化（已归档）
- [数据库优化](../apps/backend/docs/DATABASE_OPTIMIZATION.md) - 数据库性能优化
- [强类型优化](../apps/backend/docs/STRONG_TYPE_OPTIMIZATION.md) - TypeScript 类型优化

---

### 🎯 功能模块

#### 演示账户系统（🆕 最新功能）
- [演示账户指南](../apps/backend/docs/DEMO_ACCOUNT_GUIDE.md) - 完整使用说明、测试验证
- [实施完成总结](../apps/backend/docs/archive/DEMO_ACCOUNT_IMPLEMENTATION_COMPLETE.md) - 实施报告与测试结果（已归档）
- [初始化脚本](../apps/backend/scripts/init-demo.sh) - 一键初始化脚本
- [TypeScript 脚本](../apps/backend/scripts/init-demo-account.ts) - 数据库初始化

#### 日志与开发
- [本地开发日志](../apps/backend/docs/LOCAL_DEVELOPMENT_LOGGING.md) - 开发环境日志配置

---

### 🚢 部署运维

#### 部署指南
- [部署步骤](deploy-online/step.md) - 完整的生产环境部署流程
- [Nginx 配置](deploy-online/nginx.md) - Nginx 反向代理配置
- [MySQL 配置](deploy-online/mysql.md) - MySQL 数据库配置
- [Redis 配置](deploy-online/redis.md) - Redis 缓存配置
- [PM2 配置](deploy-online/pm2.md) - PM2 进程管理配置
- [部署种子数据](../apps/backend/docs/DEPLOYMENT_SEED.md) - 生产环境数据初始化

---

### 📊 数据库

#### Prisma ORM
- [Schema 定义](../apps/backend/prisma/schema.prisma) - 数据库模型定义
- [种子数据说明](../apps/backend/prisma/SEED_README.md) - 种子数据文档
- [迁移历史](../apps/backend/prisma/migrations/) - 数据库迁移记录

#### SQL 脚本
- [演示账户初始化](../apps/backend/prisma/) - 数据库与种子脚本（无独立 sql 目录时请参考 prisma）

---

### 🛠️ 开发指南

#### 重构与阶段报告（已归档，仅作参考）
- [重构完成报告](../apps/backend/docs/archive/REFACTORING_COMPLETE.md) - 项目重构总结
- [重构报告](../apps/backend/docs/archive/REFACTORING_REPORT.md) - 详细重构记录
- [用户服务重构](../apps/backend/docs/archive/USER_SERVICE_REFACTORING.md) - 用户服务优化
- [Phase 1-2 完成](../apps/backend/docs/archive/PHASE_1_2_COMPLETE.md) - 前两阶段完成报告
- [Phase 3 完成](../apps/backend/docs/archive/PHASE_3_COMPLETE.md) - 第三阶段完成报告

---

### 📝 API 文档

- **Swagger UI**: http://localhost:8080/api/docs
- **OpenAPI Spec**: [openApi.json](../apps/backend/public/openApi.json)
- **健康检查**: http://localhost:8080/api/health
- **Prometheus 指标**: http://localhost:8080/api/metrics

---

### 🎨 项目截图

查看 [screenshots/](screenshots/) 目录了解系统界面。

主要截图：
- [登录页面](screenshots/login.png)
- [首页仪表板](screenshots/dashboard.png)
- [用户管理](screenshots/user.png)
- [角色管理](screenshots/role.png)
- [菜单管理](screenshots/menu.png)
- [租户管理](screenshots/tenant.png)
- [定时任务](screenshots/job.png)
- [系统监控](screenshots/monitor.png)

---

### 📋 脚本工具

#### 初始化脚本
```bash
apps/backend/scripts/
├── init-demo.sh               # 演示账户快速初始化（Bash）
├── init-demo-account.ts       # 演示账户初始化（TypeScript）
└── generate-rsa-keys.cjs      # 生成 RSA 加密密钥
```

#### 部署脚本
```bash
apps/backend/scripts/
├── deploy.cjs                 # 自动化部署脚本
└── ecosystem.config.cjs       # PM2 进程配置
```

---

## 🔍 按场景查找

### 🆕 我是新用户，想快速了解项目
1. [README.md](../README.md) - 了解项目概况
2. [快速开始](guide/quick-start.md) - 搭建开发环境
3. [演示账户指南](../apps/backend/docs/DEMO_ACCOUNT_GUIDE.md) - 体验演示功能

### ⚙️ 我要配置开发环境
1. [快速开始](guide/quick-start.md) - 环境搭建
2. [配置说明](../apps/backend/docs/CONFIG_README.md) - 配置详解
3. [Prisma 种子数据](../apps/backend/prisma/SEED_README.md) - 初始化数据

### 🚀 我要部署到生产环境
1. [部署步骤](deploy-online/step.md) - 部署流程
2. [Nginx 配置](deploy-online/nginx.md) - Web 服务器
3. [PM2 配置](deploy-online/pm2.md) - 进程管理
4. [部署种子数据](../apps/backend/docs/DEPLOYMENT_SEED.md) - 生产数据

### 🏗️ 我要了解系统架构
1. [架构优化](../apps/backend/docs/ARCHITECTURE_OPTIMIZATION.md) - 架构设计
2. [多租户迁移](../apps/backend/docs/MULTI_TENANT_MIGRATION.md) - 多租户架构
3. [优化报告](../apps/backend/docs/OPTIMIZATION_README.md) - 性能优化

### 🔐 我要添加演示账户功能
1. [演示账户指南](../apps/backend/docs/DEMO_ACCOUNT_GUIDE.md) - 完整指南
2. [初始化脚本](../apps/backend/scripts/init-demo.sh) - 快速初始化
3. [实施报告](../apps/backend/docs/archive/DEMO_ACCOUNT_IMPLEMENTATION_COMPLETE.md) - 实施参考（已归档）

### 📊 我要了解开发与日志
1. [本地开发日志](../apps/backend/docs/LOCAL_DEVELOPMENT_LOGGING.md) - 开发配置与日志

### 🐛 我遇到了问题
1. [GitHub Issues](https://github.com/linlingqin77/Nest-Admin-Soybean/issues) - 搜索类似问题
2. [常见问题](../apps/backend/docs/DEMO_ACCOUNT_GUIDE.md#常见问题) - FAQ
3. [配置文档](../apps/backend/docs/CONFIG_README.md) - 配置问题

---

## 📊 文档统计

| 类型 | 数量 | 说明 |
|------|------|------|
| **核心文档** | 3 | README、CHANGELOG、QUICK_START |
| **架构文档** | 10 | 架构设计、优化报告、重构文档 |
| **功能文档** | 5 | 演示账户、日志监控等 |
| **部署文档** | 8 | 部署步骤、配置说明 |
| **数据库文档** | 4 | Schema、迁移、种子数据 |
| **脚本工具** | 6 | 初始化、部署脚本 |
| **总计** | 36+ | 持续更新中 |

---

## 📈 文档更新历史

| 日期 | 更新内容 |
|------|----------|
| 2025-12-22 | 添加演示账户系统文档 |
| 2025-12-21 | 完成优化报告（91分） |
| 2025-12-20 | 添加日志监控文档 |
| 2025-12-15 | 完成架构优化文档 |
| 2025-12-10 | 添加多租户迁移指南 |

---

## 🤝 贡献文档

### 文档规范
- 使用 Markdown 格式
- 保持清晰的目录结构
- 添加代码示例和截图
- 及时更新文档索引

### 提交文档
1. Fork 本仓库
2. 添加或修改文档
3. 更新本索引文件
4. 提交 Pull Request

---

## 📞 获取帮助

- **GitHub Issues**: [提交问题](https://github.com/linlingqin77/Nest-Admin-Soybean/issues)
- **社区讨论**: [Discussions](https://github.com/linlingqin77/Nest-Admin-Soybean/discussions)
- **邮箱**: linlingqin77@qq.com

---

## 📅 维护信息

- **最近更新**: 2026-02-10（修正 server→apps/backend 路径，增加各应用文档入口）
- **维护状态**: 🟢 活跃维护
- **文档覆盖率**: 95%+
- **语言**: 简体中文

---

<div align="center">

**完善的文档让开发更高效**

[返回首页](../README.md) | [快速开始](guide/quick-start.md) | [优化报告](../apps/backend/docs/OPTIMIZATION_README.md)

Made with ❤️ by [linlingqin77](https://github.com/linlingqin77)

</div>
