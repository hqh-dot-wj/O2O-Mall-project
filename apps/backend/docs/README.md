# Backend 文档索引

本目录包含后端项目的所有文档。

## 📁 文档分类

### 🧪 测试文档
- **[e2e-tests/](./e2e-tests/)** - 端到端测试文档
  - [快速参考](./e2e-tests/E2E_TEST_QUICK_REFERENCE.md)
  - [测试结果](./e2e-tests/E2E_TEST_RESULTS_SUMMARY.md)
  - [任务总结](./e2e-tests/TASK_9_SUMMARY.md)
- **[E2E_TEST_GUIDE.md](./E2E_TEST_GUIDE.md)** - 端到端测试完整指南

### 🏗️ 架构与设计
- **[COMPLETE_BUSINESS_FLOW.md](./COMPLETE_BUSINESS_FLOW.md)** - 完整业务流程
- **[PLATFORM_COMMISSION_GUIDE.md](./PLATFORM_COMMISSION_GUIDE.md)** - 平台抽成设计指南
- **[PLATFORM_COMMISSION_REALITY_CHECK.md](./PLATFORM_COMMISSION_REALITY_CHECK.md)** - 平台抽成实际情况
- **[MULTI_TENANT_MIGRATION.md](./MULTI_TENANT_MIGRATION.md)** - 多租户迁移指南
- **[MAAS_ARCHITECTURE_IMPROVEMENT.md](./MAAS_ARCHITECTURE_IMPROVEMENT.md)** - MaaS 架构改进

### 📦 功能实现
- **[COURSE_PRODUCTS_SEED_GUIDE.md](./COURSE_PRODUCTS_SEED_GUIDE.md)** - 课程商品种子数据指南
- **[COURSE_GROUP_BUY_EXTENSION_IMPLEMENTATION.md](./COURSE_GROUP_BUY_EXTENSION_IMPLEMENTATION.md)** - 课程拼团扩展实现
- **[MARKETING_TEMPLATES_AND_EXTENSIONS.md](./MARKETING_TEMPLATES_AND_EXTENSIONS.md)** - 营销模板与扩展
- **[MARKETING_RESET_GUIDE.md](./MARKETING_RESET_GUIDE.md)** - 营销模板重置指南
- **[DEMO_ACCOUNT_GUIDE.md](./DEMO_ACCOUNT_GUIDE.md)** - 演示账号指南

### ⚙️ 配置管理
- **[CONFIG_README.md](./CONFIG_README.md)** - 配置系统说明
- **[CONFIG_REFACTORING.md](./CONFIG_REFACTORING.md)** - 配置重构文档
- **[CONFIG_MIGRATION.md](./CONFIG_MIGRATION.md)** - 配置迁移指南
- **[ENTERPRISE_CONFIG_SOLUTION.md](./ENTERPRISE_CONFIG_SOLUTION.md)** - 企业级配置方案
- **[CAPTCHA_CONFIG_CACHE_FIX.md](./CAPTCHA_CONFIG_CACHE_FIX.md)** - 验证码配置缓存修复

### 🚀 快速开始
- **[QUICK_START.md](./QUICK_START.md)** - 项目快速开始
- **[QUICK_START_MARKETING.md](./QUICK_START_MARKETING.md)** - 营销功能快速开始
- **[DEPLOYMENT_SEED.md](./DEPLOYMENT_SEED.md)** - 部署种子数据

### 🔧 优化与重构
- **[OPTIMIZATION_README.md](./OPTIMIZATION_README.md)** - 优化总览
- **[OPTIMIZATION_QUICK_START.md](./OPTIMIZATION_QUICK_START.md)** - 优化快速开始
- **[OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md)** - 优化总结
- **[P0_OPTIMIZATION_FINAL_REPORT.md](./P0_OPTIMIZATION_FINAL_REPORT.md)** - P0 优化最终报告
- **[P1_OPTIMIZATION_COMPLETE.md](./P1_OPTIMIZATION_COMPLETE.md)** - P1 优化完成报告
- **[PERFORMANCE_OPTIMIZATION_SUMMARY.md](./PERFORMANCE_OPTIMIZATION_SUMMARY.md)** - 性能优化总结
- **[DATABASE_OPTIMIZATION.md](./DATABASE_OPTIMIZATION.md)** - 数据库优化
- **[STRONG_TYPE_OPTIMIZATION.md](./STRONG_TYPE_OPTIMIZATION.md)** - 强类型优化

### 📝 开发规范
- **[COMMIT_MESSAGE.md](./COMMIT_MESSAGE.md)** - 提交信息规范
- **[CODE_OPTIMIZATION_ANALYSIS.md](./CODE_OPTIMIZATION_ANALYSIS.md)** - 代码优化分析
- **[BUSINESS_CODE_OPTIMIZATION.md](./BUSINESS_CODE_OPTIMIZATION.md)** - 业务代码优化

### 🐛 问题修复
- **[LOCAL_DEVELOPMENT_LOGGING.md](./LOCAL_DEVELOPMENT_LOGGING.md)** - 本地开发日志
- **[TEST_IMPLEMENTATION_SUMMARY.md](./TEST_IMPLEMENTATION_SUMMARY.md)** - 测试实现总结

### 📊 报告与分析
- **[REFACTORING_REPORT.md](./REFACTORING_REPORT.md)** - 重构报告
- **[OPTIMIZATION_CHECKLIST.md](./OPTIMIZATION_CHECKLIST.md)** - 优化检查清单
- **[OPTIMIZATION_IMPLEMENTATION_REPORT.md](./OPTIMIZATION_IMPLEMENTATION_REPORT.md)** - 优化实现报告

## 🔗 外部资源

### 脚本文件
- `apps/backend/scripts/` - 各种执行脚本
  - `test-e2e.bat/sh` - E2E 测试脚本
  - `seed-courses.bat/sh` - 课程种子数据脚本
  - `reset-marketing-full.bat/sh` - 营销重置脚本
  - `setup-tenant.bat/sh` - 租户设置脚本

### 测试文件
- `apps/backend/test/` - 测试文件
  - `e2e-marketing-flow.test.ts` - 营销活动 E2E 测试

### Prisma 种子
- `apps/backend/prisma/` - 数据库种子文件
  - `seed-course-products.ts` - 课程商品种子
  - `reset-marketing-templates.ts` - 重置营销模板
  - `setup-tenant-courses.ts` - 设置租户课程

## 📖 推荐阅读顺序

### 新手入门
1. [QUICK_START.md](./QUICK_START.md) - 项目快速开始
2. [COMPLETE_BUSINESS_FLOW.md](./COMPLETE_BUSINESS_FLOW.md) - 了解业务流程
3. [E2E_TEST_GUIDE.md](./E2E_TEST_GUIDE.md) - 运行测试验证

### 功能开发
1. [MARKETING_TEMPLATES_AND_EXTENSIONS.md](./MARKETING_TEMPLATES_AND_EXTENSIONS.md) - 营销模板
2. [COURSE_PRODUCTS_SEED_GUIDE.md](./COURSE_PRODUCTS_SEED_GUIDE.md) - 课程商品
3. [PLATFORM_COMMISSION_GUIDE.md](./PLATFORM_COMMISSION_GUIDE.md) - 平台抽成设计

### 系统优化
1. [OPTIMIZATION_README.md](./OPTIMIZATION_README.md) - 优化总览
2. [DATABASE_OPTIMIZATION.md](./DATABASE_OPTIMIZATION.md) - 数据库优化
3. [PERFORMANCE_OPTIMIZATION_SUMMARY.md](./PERFORMANCE_OPTIMIZATION_SUMMARY.md) - 性能优化

## 🆘 常见问题

### 如何运行 E2E 测试？
参考 [E2E_TEST_GUIDE.md](./E2E_TEST_GUIDE.md) 或 [e2e-tests/README.md](./e2e-tests/README.md)

### 如何添加课程商品？
参考 [COURSE_PRODUCTS_SEED_GUIDE.md](./COURSE_PRODUCTS_SEED_GUIDE.md)

### 平台抽成如何实现？
参考 [PLATFORM_COMMISSION_REALITY_CHECK.md](./PLATFORM_COMMISSION_REALITY_CHECK.md)

### 如何配置系统？
参考 [CONFIG_README.md](./CONFIG_README.md)

## 📅 文档更新

- 2026-02-08: 整理文档结构，创建 e2e-tests 子目录
- 2026-02-08: 添加平台抽成实际情况说明
- 2026-02-08: 完成 E2E 测试文档

---

**维护者**: 开发团队
**最后更新**: 2026-02-08
