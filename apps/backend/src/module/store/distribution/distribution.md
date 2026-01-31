# 分销管理模块 (Distribution Module)

本模块负责门店分销规则的配置管理，包括佣金比例设置、跨店分销逻辑以及规则变更审计。

## 📂 文件树

```text
distribution/
├── dto/
│   ├── commission-preview.dto.ts  # 佣金预估请求/返回对象
│   └── update-dist-config.dto.ts  # 更新分销配置请求对象
├── vo/
│   └── dist-config.vo.ts          # 分销配置及日志展示对象
├── distribution.controller.ts     # 接口层：定义分销相关路由
├── distribution.module.ts         # 模块层：依赖注入配置
├── distribution.service.ts        # 业务层：核心逻辑实现
└── distribution.service.spec.ts   # 测试层：单元测试
```

## 📝 文件说明

- **distribution.controller.ts**: 暴露分销配置查询、更新以及佣金预览的 HTTP 接口。
- **distribution.service.ts**: 处理分销规则的核心逻辑，如比例校验、配置持久化（Upsert）、操作日志记录以及分销比例预估。
- **dto & vo**: 定义前后端交互的数据结构，包含详细的 Swagger 文档描述和校验规则。

## 🗄️ 数据库与关联

### 使用的表
1. **`sysDistConfig`**: 存储各租户（门店）的分销配置信息（如 1/2 级分佣比例、跨店开关等）。
2. **`sysDistConfigLog`**: 分销配置变更的审计日志表。
3. **`sysTenant`**: 查询门店名称，用于佣金预览时的友好提示。
4. **`umsMember`**: 查询推荐人所属租户，用于判断是否触发跨店分销规则。

### 关联关系
- **租户关联**: 所有数据均通过 `tenantId` 进行隔离。
- **配置与日志**: 配置更新时，自动向日志表插入一条记录，通过 `operator` 追踪责任人。

## 🚀 接口作用

| 接口路径 | 方法 | 作用 | 关键点 |
| :--- | :--- | :--- | :--- |
| `/store/distribution/config` | GET | 获取分销规则配置 | 若无则返回系统默认配置 |
| `/store/distribution/config` | POST | 更新分销规则配置 | 需校验 1+2 级比例总和 $\le$ 100% |
| `/store/distribution/config/logs` | GET | 获取规则变更历史 | 最近 20 条审计记录 |
| `/store/distribution/commission/preview` | GET | 佣金预估 (前端提示) | 判断是否跨店并计算有效比例 |

---
*注：本模块侧重于“规则配置”，实际的佣金计算与发放由订单/财务模块结合此规则执行。*
