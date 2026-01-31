# LBS Region 模块文档

## 📂 文件树 with 功能简述
```text
region/
├── dto/                   # 数据传输对象定义
├── vo/                    # 视图对象定义
├── region.controller.ts   # 控制器：定义行政区划查询 API 接口
├── region.service.ts      # 核心服务：处理区划初始化、缓存管理及树形构建逻辑
├── region.repository.ts   # 仓储层：封装对 SysRegion 表的数据库操作
└── region.service.spec.ts # 单元测试：验证数据初始化与查询逻辑
```
- **region.service.ts**: 具备自初始化（Seeding）能力，模块启动时自动检测并从 `pcas-code.json` 导入全国省市区数据。

## 🗄️ 数据库表与逻辑关联

| 表名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `sys_region` | 维度表 | 存储全国行政区划信息。关键字段：`code` (PK), `parent_code` (FK), `level`, `name`。 |

**逻辑关联**：
- **自关联结构**：通过 `parent_code` 指向 `code` 实现“省-市-区-街道”的无限极树形关联。
- **业务耦合**：该表作为系统维信息，被 `sys_station` (网点) 或用户收货地址等模块引用，用于地址级联选择。

## 🔌 核心接口作用 (API & Service)

| 核心接口/方法 | 技术关键词 | 业务描述 |
| :--- | :--- | :--- |
| **GET /list** | `getChildren`, `ParentCode` | **业务闭环：级联选择。** 根据父级编码异步加载下级区域（如选择省份后加载对应城市），减少前端一次性加载压力。 |
| **GET /name/:code** | `getRegionName` | **业务闭环：数据回显。** 根据编码快速获取区域名称（如：310000 -> 上海市），用于订单、地址详情的纯文本展示。 |
| **onModuleInit** | `fs`, `Seeding`, `Batch` | **技术闭环：环境预热。** 模块首次运行自动将 `assets` 下的静态区划数据批量插入（Batch Insert）数据库，确保环境零配置。 |
| **getTree** | `@SystemCacheable`, `Redis` | **技术闭环：性能优化。** 采用 Redis 缓存（缓存 24 小时）存储全量区划树，支持前端大屏或选择器的高速访问。 |

## 💡 核心逻辑重点
- **数据一致性**：使用标准 PCA (Province-City-Area) 编码，确保与主流地图 API (高德/百度) 兼容。
- **冷热分离**：行政区划属于高频查询、极低变更的静态数据，逻辑上强制依赖 **分布式缓存 (Redis)** 以承载高并发。
- **高效插入**：初始化采用 `createMany` 配合 `BATCH_SIZE=1000` 的分批入库，提升数千条数据导入时的系统吞吐量。
