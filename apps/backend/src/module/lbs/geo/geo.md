# LBS Geo 模块文档

## 📂 文件树与功能简述
```text
geo/
├── geo.service.ts         # 核心服务：处理 PostGIS 空间运算、坐标转换及地理围栏逻辑
└── geo.service.spec.ts    # 单元测试：验证空间计算准确性
```
- **geo.service.ts**: 封装了基于 PostGIS 的原始 SQL 查询，处理复杂的空间几何计算（如点在多边形内校验、球面距离计算）。

## 🗄️ 数据库表与逻辑关联

| 表名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `sys_station` | 实体表 | 存储服务网点基础信息（名称、租户ID、基础经纬度）。 |
| `sys_geo_fence` | 空间表 | 存储地理围栏数据，核心字段为 `geom` (Geometry 类型，SRID 4326)。 |

**逻辑关联**：
- `sys_geo_fence` 与 `sys_station` 通过 `station_id` 进行关联。
- 该模块采用 **PostGIS** 扩展，通过 `ST_Contains` 等函数实现“物理空间”与“业务实体”的映射。

## 🔌 核心接口作用 (Service Methods)

| 核心方法 | 技术关键词 | 业务描述 |
| :--- | :--- | :--- |
| **toPolygonWKT** | `WKT`, `Polygon` | 将前端传参的坐标数组转换为标准 WKT (Well-Known Text) 格式，用于地理围栏的持久化存储。 |
| **findStationByPoint** | `ST_Contains`, `SRID 4326` | **业务闭环：定位派发。** 根据用户当前经纬度，反向查询其所属的业务覆盖网点（Station），实现按地理范围的服务分包。 |
| **calculateDistance** | `ST_DistanceSphere` | **业务闭环：运费/履约校验。** 基于地球球体模型计算两点间精确直线距离（米），作为物流运费计算或近距离下单校验的基准。 |

## 💡 核心逻辑重点
- **空间安全**：所有地理空间查询均采用参数化 `WKT` 注入，配合 `ST_GeomFromText` 确保 SQL 安全。
- **坐标标准**：强制使用 **4326 (WGS 84)** 坐标系，确保与移动端 GPS 坐标的一致性。
- **性能优化**：通过 `ST_Contains` 配合 `sys_geo_fence.geom` 的空间索引，实现毫秒级的围栏匹配。
