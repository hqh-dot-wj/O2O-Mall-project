# 文档组织说明

本文档说明项目文档的组织结构和命名规范。

---

## 📂 文档目录结构

```
docs/
├── guide/                    # 用户指南（面向使用者）
│   ├── introduction.md       # 项目介绍
│   ├── quick-start.md        # 快速开始
│   ├── prerequisites.md      # 环境要求
│   ├── directory-structure.md # 目录结构
│   ├── multi-tenant.md       # 多租户
│   ├── rbac.md              # 权限控制
│   ├── encryption.md        # 加密
│   └── faq.md               # 常见问题
│
├── development/             # 开发文档（面向开发者）
│   ├── README.md            # 开发文档索引
│   ├── getting-started.md   # 开发环境搭建
│   ├── codeowners-guide.md  # 代码所有权指南
│   ├── dependency-management.md # 依赖管理规范
│   ├── github-setup.md      # GitHub 配置指南
│   ├── testing-standardization-analysis.md # 测试规范
│   ├── architecture-optimization-tasks.md # 架构优化记录
│   └── documentation-organization.md # 文档组织说明（本文档）
│
├── design/                  # 设计文档
│   ├── architecture-comprehensive-analysis.md # 架构全方位分析
│   └── admin-module-analysis.md # 管理模块分析
│
├── deployment/              # 部署文档
│   └── overview.md          # 部署概览
│
├── deploy-online/           # 在线部署步骤
│   ├── step.md             # 部署步骤
│   ├── mysql.md            # MySQL 配置
│   ├── nginx.md            # Nginx 配置
│   ├── redis.md            # Redis 配置
│   └── pm2.md              # PM2 配置
│
├── features/                # 功能说明
│   └── demo-account.md      # 演示账号
│
└── screenshots/             # 截图资源
    └── *.png
```

---

## 📝 文档命名规范

### 1. 文件名规范

**强制要求**：

- 全部使用小写字母
- 单词之间用连字符 `-` 分隔
- 使用英文命名
- 扩展名为 `.md`

**示例**：

```
✅ 正确
- getting-started.md
- dependency-management.md
- architecture-optimization-tasks.md
- codeowners-guide.md

❌ 错误
- Getting-Started.md          # 首字母大写
- DEPENDENCY_MANAGEMENT.md    # 全大写 + 下划线
- Architecture_Optimization.md # 混合大小写 + 下划线
- CodeOwnersGuide.md          # 驼峰命名
```

### 2. 目录名规范

**规则**：

- 使用小写字母
- 单词之间用连字符 `-`
- 简洁明了

**示例**：

```
✅ 正确
- development/
- deploy-online/
- screenshots/

❌ 错误
- Development/
- Deploy_Online/
- screenShots/
```

---

## 🗂️ 文档分类规则

### 1. 用户指南 (`guide/`)

**适用文档**：

- 项目介绍和概述
- 快速开始指南
- 功能使用说明
- 常见问题解答
- 面向最终用户的文档

**特点**：

- 语言通俗易懂
- 步骤清晰
- 配有截图
- 避免技术细节

### 2. 开发文档 (`development/`)

**适用文档**：

- 开发环境搭建
- 开发规范和约定
- 代码审查指南
- 依赖管理
- 测试指南
- 架构优化记录

**特点**：

- 面向开发者
- 包含技术细节
- 有代码示例
- 有最佳实践

### 3. 设计文档 (`design/`)

**适用文档**：

- 架构设计
- 模块设计
- 技术选型
- 系统分析

**特点**：

- 包含架构图
- 有设计决策说明
- 分析优缺点
- 提供改进建议

### 4. 部署文档 (`deployment/` 和 `deploy-online/`)

**适用文档**：

- 部署概览 (`deployment/`)
- 具体部署步骤 (`deploy-online/`)
- 环境配置
- 运维指南

**特点**：

- 步骤详细
- 有配置示例
- 包含故障排查

---

## 🔄 文档迁移记录

### 2026-02-23 文档整理

**迁移的文档**：

| 原路径                          | 新路径                                                | 原因                                                                      |
| ------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------- |
| `docs/COMPLETED-TASKS.md`       | `docs/development/architecture-optimization-tasks.md` | 1. 归类到 development 目录<br>2. 改为小写+连字符命名<br>3. 更准确的文件名 |
| `docs/GITHUB-SETUP.md`          | `docs/development/github-setup.md`                    | 1. 归类到 development 目录<br>2. 改为小写命名                             |
| `docs/DEPENDENCY-MANAGEMENT.md` | `docs/development/dependency-management.md`           | 1. 归类到 development 目录<br>2. 改为小写命名                             |
| `docs/CODEOWNERS-GUIDE.md`      | `docs/development/codeowners-guide.md`                | 1. 归类到 development 目录<br>2. 改为小写命名                             |

**新增的文档**：

| 文档                                             | 说明                   |
| ------------------------------------------------ | ---------------------- |
| `docs/development/README.md`                     | 开发文档索引           |
| `docs/development/documentation-organization.md` | 文档组织说明（本文档） |

---

## 📋 文档维护规范

### 1. 新增文档时

**步骤**：

1. 确定文档类型（用户指南/开发文档/设计文档/部署文档）
2. 选择对应的目录
3. 使用小写+连字符命名
4. 更新对应目录的 README.md 索引

**示例**：

```bash
# 新增一个依赖升级指南
# 1. 确定类型：开发文档
# 2. 选择目录：docs/development/
# 3. 命名：dependency-upgrade-guide.md
# 4. 更新：docs/development/README.md
```

### 2. 更新文档时

**要求**：

- 更新文档底部的"最后更新"日期
- 如果是重大变更，添加变更记录
- 保持文档结构一致

### 3. 归档文档时

**时机**：

- 文档过时或不再适用
- 功能已废弃
- 被新文档替代

**操作**：

```bash
# 创建归档目录（如果不存在）
mkdir -p docs/archive/2026-02/

# 移动文档
mv docs/development/old-doc.md docs/archive/2026-02/

# 在原位置添加重定向说明
echo "此文档已归档，请查看 [归档版本](../archive/2026-02/old-doc.md)" > docs/development/old-doc.md
```

---

## 🔍 文档查找指南

### 按类型查找

| 需求             | 查找位置                                    |
| ---------------- | ------------------------------------------- |
| 如何使用某个功能 | `docs/guide/`                               |
| 如何搭建开发环境 | `docs/development/getting-started.md`       |
| 代码规范是什么   | `docs/development/`                         |
| 架构是如何设计的 | `docs/design/`                              |
| 如何部署到服务器 | `docs/deployment/` 或 `docs/deploy-online/` |

### 按关键词查找

**使用 grep 搜索**：

```bash
# 搜索包含 "依赖" 的文档
grep -r "依赖" docs/

# 搜索包含 "CODEOWNERS" 的文档
grep -r "CODEOWNERS" docs/
```

**使用 IDE 搜索**：

- VS Code: `Ctrl+Shift+F` (Windows/Linux) 或 `Cmd+Shift+F` (Mac)
- 搜索范围限定在 `docs/` 目录

---

## 📊 文档统计

### 当前文档数量

| 目录             | 文档数 | 说明     |
| ---------------- | ------ | -------- |
| `guide/`         | 8      | 用户指南 |
| `development/`   | 7      | 开发文档 |
| `design/`        | 2      | 设计文档 |
| `deployment/`    | 1      | 部署概览 |
| `deploy-online/` | 5      | 部署步骤 |
| `features/`      | 1      | 功能说明 |
| **总计**         | **24** | -        |

### 文档覆盖率

| 类别     | 覆盖情况 | 待补充                   |
| -------- | -------- | ------------------------ |
| 用户指南 | ✅ 完善  | -                        |
| 开发规范 | ✅ 完善  | -                        |
| 架构设计 | ⚠️ 基本  | 可补充更多模块设计文档   |
| 部署运维 | ✅ 完善  | -                        |
| API 文档 | ❌ 缺失  | 建议使用 Swagger/OpenAPI |

---

## 🎯 改进建议

### 短期（1个月内）

1. **补充 API 文档**
   - 使用 Swagger UI 自动生成
   - 补充接口说明和示例

2. **完善测试文档**
   - 单元测试指南
   - 集成测试指南
   - E2E 测试指南

3. **添加故障排查文档**
   - 常见问题及解决方案
   - 日志分析指南
   - 性能调优指南

### 中期（3个月内）

1. **模块设计文档**
   - 为每个主要模块编写设计文档
   - 包含需求、设计、实现

2. **最佳实践文档**
   - 代码最佳实践
   - 性能优化最佳实践
   - 安全最佳实践

3. **贡献指南**
   - 如何贡献代码
   - PR 流程
   - 代码审查标准

### 长期（6个月内）

1. **视频教程**
   - 快速开始视频
   - 功能演示视频
   - 开发教程视频

2. **交互式文档**
   - 使用 VitePress 构建
   - 支持搜索和导航
   - 支持多语言

---

## 📚 相关资源

### 文档规范

- [文档编写规范](../../.kiro/steering/documentation.md)
- [Markdown 规范](https://commonmark.org/)

### 工具

- [VitePress](https://vitepress.dev/) - 文档站点生成器
- [Mermaid](https://mermaid.js.org/) - 图表生成
- [Swagger](https://swagger.io/) - API 文档

---

**文档版本**: 1.0.0  
**编写日期**: 2026-02-23  
**最后更新**: 2026-02-23  
**维护者**: @linlingqin77
