# PMS Product 商品管理模块

该模块是商品库（PMS）的核心，负责管理商品（SPU）及其规格组合（SKU）的生命周期，支持**实物商品**与**服务商品**两种核心业务形态。

## 📂 文件树与功能简述

```text
pms/
├── attribute/           # 属性管理：定义规格项与参数项
├── brand/               # 品牌管理：实物商品品牌档案
├── category/            # 分类管理：多级分类树与属性绑定
├── dto/                 # DTO：商品录入及分页查询参数校验
├── product/             # 底层封装：
│   ├── product.repository.ts # SPU 仓储：封装商品主表及关联查询
│   └── sku.repository.ts     # SKU 仓储：封装多规格库存与价格定义
├── pms.module.ts        # 模块入口：全局依赖注入中心
├── product.controller.ts # 控制器：对外暴露商品发布、列表及详情接口
└── product.service.ts    # 服务层：核心逻辑（SPU/SKU 联动、分销参数配置、实物/服务类型适配）
```

---

## 🗄️ 数据库表与逻辑关联

模块构建了一套灵活的“标准商品库”模型，涉及核心表及其层次化关系：

1.  **PmsProduct (商品主表 - SPU)**：核心容器。
    *   **类型区分**：通过 `ProductType` 区分 `REAL`（扣库存发货）和 `SERVICE`（扣运力核销）。
    *   **基础属性**：关联 `PmsCategory` 和 `PmsBrand`。
2.  **PmsGlobalSku (标准 SKU 表)**：规格执行单元。
    *   存储 `specValues`（规格组合 JSON）及 `guidePrice`（总部指导价）。
    *   **分销配置**：定义 `guideRate`（分销比例）及价格上下限风控。
3.  **PmsProductAttrValue (属性值表)**：非规格特征。
    *   记录 SPU 对应 `PmsAttribute` 的具体参数值（如：产地、有效期）。
4.  **逻辑关联链**：
    *   **模型层次**：`SPU (Product) -> SKU (GlobalSku) -> TenantSku (门店重写)`。本项目此模块主要维护 SPU 与 GlobalSku 的总部基准。

---

## 🛠️ 核心接口作用

| 接口名称 | 技术关键词 | 业务闭环描述 |
| :--- | :--- | :--- |
| **create** | `@Transactional` / 多表联动 | **商品发布闭环**。一次性完成商品主表、多规格 SKU 及扩展参数的原子化保存。 |
| **findAll** | 关联映射 / 分页助手 | **目录展示闭环**。提供聚合了首条 SKU 价格和分类信息的列表，支撑管理后台的高效选品及维护。 |
| **update** | Diff 算法 / 全量覆盖缓存 | **资产变更闭环**。通过对比 SKU ID 实现规格的增删改，并采用全量覆盖策略同步商品扩展参数。 |
| **findOne** | 深度预加载 (Include) | **详情渲染闭环**。深度查询商品所有关联元数据，实现编辑页数据的全量精准回显。 |

---

## 💡 核心逻辑亮点

*   **异构商品适配**：通过 `serviceDuration`（服务时长）等字段，使同一套系统能够同时管理“卖货”与“卖工时”两种完全不同的业务模式。
*   **精细化分销风控**：在 SKU 维度引入 `minDistRate` 与 `maxDistRate`，为 SAAS 多租户环境下各门店的自主定价提供了安全的红线管控。
*   **Repository 高聚合查询**：通过 `findWithRelations` 封装了复杂的 Prisma 多表 Include 逻辑，确保业务代码（Service）仅关注业务决策而非底层 SQL 拼接。
