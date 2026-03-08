# 文档目录归类规范

## 文档位置选择

| 文档层级       | 位置               | 适用范围                               |
| -------------- | ------------------ | -------------------------------------- |
| **项目级文档** | `docs/`            | 整个项目的通用文档、用户指南、部署指南 |
| **应用级文档** | `apps/{app}/docs/` | 特定应用的技术文档、需求文档、设计文档 |

**选择原则**：后端模块文档放 `apps/backend/docs/`；Admin 前端功能文档放 `apps/admin-web/docs/`；**小程序文档放 `apps/miniapp-client/docs/`**；项目通用指南放 `docs/`。

## 后端文档目录（apps/backend/docs/）

| 文档类型 | 目录            | 示例                                                         |
| -------- | --------------- | ------------------------------------------------------------ |
| 需求文档 | `requirements/` | `requirements/finance/commission/commission-requirements.md` |
| 设计文档 | `design/`       | `design/finance/commission/commission-design.md`             |
| 指南文档 | `guides/`       | `guides/quick-start.md`                                      |
| 任务文档 | `tasks/`        | `tasks/architecture-optimization.md`                         |
| 改进文档 | `improvements/` | `improvements/p1-eliminate-finance-any-types.md`             |
| 归档文档 | `archive/`      | `archive/marketing-reset-guide.md`                           |

**模块对齐**：文档路径与 `src/module/` 同构。

## 项目级文档（docs/）

| 文档类型 | 目录           |
| -------- | -------------- |
| 用户指南 | `guide/`       |
| 开发文档 | `development/` |
| 架构设计 | `design/`      |
| 部署文档 | `deployment/`  |

## 小程序文档（apps/miniapp-client/docs/）

| 大类 | 目录                   | 用途                    |
| ---- | ---------------------- | ----------------------- |
| 架构 | `architecture/`        | 整体技术架构、现状清单  |
| 设计 | `design/{功能}/`       | 页面/模块设计、交互设计 |
| 需求 | `requirements/{功能}/` | PRD、用户故事、验收标准 |
| 测试 | `testing/{功能}/`      | 测试策略、用例          |
| 指南 | `guides/`              | 开发指南、最佳实践      |

**功能目录**：`index`、`me`、`product`、`category`、`cart`、`order`、`address`、`marketing`、`pay`、`upgrade`。

**禁止**：小程序相关文档勿放在项目级 `docs/design/` 下。
