# 更新日志

所有重要的项目变更都将记录在此文件中。

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [2.2.0] - 2025-12-22

### ✨ 新增

- **演示账户系统** - 为演示站点设计的完整只读账户功能
  - 创建演示角色（仅查看权限）
  - 登录页面快速入口卡片
  - 一键初始化脚本
  - 完整的文档说明

### 🔧 优化

- **项目清理** - 删除无用的测试脚本和过渡文件
  - 移除 test-api.ts, test-folder-files.ts 等测试文件
  - 移除旧的 MySQL SQL 脚本
  - 清理过渡版本的配置文件

### 📚 文档

- 更新 README.md，添加演示账户使用说明
- 新增 DEMO_ACCOUNT_GUIDE.md 详细指南
- 新增 DEMO_ACCOUNT_IMPLEMENTATION_COMPLETE.md 实施总结

---

## [2.1.0] - 2025-12-21

### 🚀 性能优化

- **P0 安全优化** - 项目评分从 80 提升至 91
  - 修复 Guard 执行顺序，确保租户隔离优先
  - 加固租户过滤器，防止跨租户数据泄露
  - 优化数据库索引，提升查询性能
  - 实现请求加密的 IV 随机化

### ⚡ 性能提升

- **P1 性能优化**
  - Prisma 连接池优化，减少连接开销
  - Redis 缓存层实现，热点数据加速
  - 查询优化，减少 N+1 问题
  - 日志系统优化，异步写入

### 🔒 安全增强

- 完善租户隔离机制
- 加强权限验证逻辑
- 敏感数据自动脱敏
- 操作日志审计完善

### 📊 监控

- 集成 Prometheus 指标采集
- 添加健康检查端点
- 完善日志结构化输出
- 添加性能监控面板

### 📚 文档

- 新增 OPTIMIZATION_README.md 优化报告
- 更新架构文档
- 完善 API 文档
- 添加性能优化指南

---

## [2.0.0] - 2025-12-01

### 🎉 重大更新

- **多租户架构** - 完整的 SaaS 多租户系统
  - 租户数据完全隔离
  - 租户套餐管理
  - 动态租户配置

### ✨ 新增

- **Prisma ORM** - 从 TypeORM 迁移至 Prisma
  - 类型安全的数据库访问
  - 自动化迁移管理
  - 强大的查询能力

- **请求加密** - AES + RSA 混合加密
  - 敏感数据传输加密
  - 自动加解密处理
  - 密钥管理系统

- **日志系统** - Pino 结构化日志
  - 高性能日志输出
  - 自动脱敏处理
  - 日志分级管理

### 🔄 变更

- 数据库从 MySQL 迁移至 PostgreSQL
- 前端 UI 框架更新至 Naive UI
- 构建工具升级至 Vite 7.x

---

## [1.0.0] - 2025-10-01

### 🎉 首次发布

- 基础的管理系统功能
- 用户、角色、菜单管理
- 部门、岗位、字典管理
- 操作日志、登录日志
- 系统监控功能
- 文件上传管理

---

## 版本说明

- **主版本号（Major）**: 不兼容的 API 修改
- **次版本号（Minor）**: 向下兼容的功能性新增
- **修订号（Patch）**: 向下兼容的问题修正

## 链接

- [未发布的变更](https://github.com/linlingqin77/Nest-Admin-Soybean/compare/v2.2.0...HEAD)
- [2.2.0](https://github.com/linlingqin77/Nest-Admin-Soybean/compare/v2.1.0...v2.2.0)
- [2.1.0](https://github.com/linlingqin77/Nest-Admin-Soybean/compare/v2.0.0...v2.1.0)
- [2.0.0](https://github.com/linlingqin77/Nest-Admin-Soybean/compare/v1.0.0...v2.0.0)
- [1.0.0](https://github.com/linlingqin77/Nest-Admin-Soybean/releases/tag/v1.0.0)
