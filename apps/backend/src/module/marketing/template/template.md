# Play Template 营销玩法模板模块

## 📂 文件树与功能简述
```text
template/
├── dto/                    # 数据传输对象 (新增、修改、分页查询)
├── vo/                     # 视图对象 (列表及详情响应模型)
├── template.controller.ts  # 控制器 (CRUD 接口入口)
├── template.module.ts      # 模块配置 (注册 Service 与 Repository)
├── template.repository.ts  # 仓储层 (编码唯一性检索、软删除)
├── template.service.ts     # 业务逻辑 (核心校验、生命周期管理)
└── template.md             # 模块文档
```
- **核心定位**：营销系统的“元数据中心”，定义了系统支持的所有营销玩法（如拼团、砍价、抽奖）的基础元信息，是其他营销模块的逻辑蓝图。

## 🗄️ 数据库表与逻辑关联
该模块主要驱动并维护以下数据：
- **`PlayTemplate` (营销玩法模板表)**: 
    - **逻辑关联**: 
        - **核心键值**: `code` (如 `GROUP_BUY`)。这是整个营销系统的逻辑纽带，连接了代码中的 `IMarketingStrategy` 实现。
        - **元信息**: 存储玩法名称、描述、图标、默认规则 JSON 骨架等。
    - **系统影响**: 
        - 向下驱动 `StorePlayConfig`: 创建门店配置时，必须关联一个有效的 `PlayTemplate`。
        - 路由 `PlayStrategy`: 策略工厂根据此表定义的 `code` 动态分发业务逻辑。

## ⚙️ 核心接口作用
| 接口 | 技术关键词 | 业务闭环能力 |
| :--- | :--- | :--- |
| **查询列表** | `Search`, `SoftDelete` | 展示系统目前支持的所有营销玩法，用于后台配置时的玩法选择器。 |
| **创建模板** | `CodeUniqueness`, `@Transactional` | **元数据定义**：初始化一种新玩法。通过严格的 `code` 校验防止业务代码冲突。 |
| **更新模板** | `Validation`, `VoFormat` | 动态调整玩法的元描述信息或默认规则骨架。 |
| **删除模板** | `Repository.softDelete` | **软下架**：标记玩法失效，防止旧有配置因关联缺失而导致的系统异常。 |

---
*注：本模块管理的是“玩法定义”级别的静态数据。具体的玩法逻辑执行逻辑分布在 `marketing/play` 下，而业务配置则在 `marketing/config` 下。*
