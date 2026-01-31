# LBS Station 模块文档

## 📂 文件树 with 功能简述
```text
station/
├── dto/                   # 数据传输对象（如 StationDto、PointDto）
├── vo/                    # 视图对象定义
├── station.controller.ts  # 控制器：服务站增删改查及位置校验 API
├── station.service.ts     # 核心服务：处理站点业务逻辑与地理围栏同步
├── station.repository.ts  # 仓储层：封装 SysStation 软删除及空间 SQL 操作
└── station.service.spec.ts # 单元测试：验证站点创建及围栏关联逻辑
```
- **station.service.ts**: 负责站点生命周期管理，支持在创建站点时同步写入 PostGIS 空间围栏数据，并提供基于坐标的围栏匹配功能。

## 🗄️ 数据库表与逻辑关联

| 表名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `sys_station` | 实体表 | 存储网点基础信息（名称、经纬度、所属租户）。继承软删除。 |
| `sys_geo_fence` | 空间表 | 存储站点的多边形服务区围栏，通过 `geom` 字段进行空间索引。 |

**逻辑关联**：
- **1:N 关联**：一个 `sys_station` 可以对应多个 `sys_geo_fence`（如营业范围围栏、配送范围围栏）。
- **空间关联**：站点物理位置（经纬度）与电子围栏（多边形区域）在业务上互补，用于支撑服务准入校验。

## 🔌 核心接口作用 (API & Service)

| 核心接口/方法 | 技术关键词 | 业务描述 |
| :--- | :--- | :--- |
| **POST /** | `Transactional`, `WKT` | **业务闭环：网点入驻。** 原子化创建站点实体及其对应的 GeoJSON 围栏，确保业务数据与空间数据同步。 |
| **GET /check-region** | `findNearby`, `PostGIS` | **业务闭环：服务准入。** C端用户下单前根据 GPS 坐标实时检测是否在服务范围内，返回归属网点信息。 |
| **upsertMainStation** | `O2O Adapter`, `Coverage` | **技术闭环：同步适配。** 支持租户主站点的覆盖更新逻辑，自动维护服务区多边形的最新状态。 |
| **deleteFencesByStationId** | `Raw SQL`, `Geometry` | **数据维护：围栏清理。** 在更新站点范围前精准清理旧的空间记录，维护空间索引的性能。 |

## 💡 核心逻辑重点
- **软删除支持**：站点删除采用 `SoftDeleteRepository`，防止因人为误操作导致历史订单关联失效。
- **参数化空间写入**：使用 `$executeRaw` 配合 `ST_GeomFromText` 写入围栏，严格防范 SQL 注入攻击。
- **多环支持**：支持 GeoJSON 标准的多环多边形（Polygon），能够处理带有“孔洞”或复杂边界的服务区域。
