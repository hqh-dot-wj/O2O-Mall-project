# Client Location 模块文档

模型名称：Gemini 2.0 Flash、模型大小：未知、模型类型：对话模型及其修订版本：2026-05-14

### **1. 文件树与作用简述 (File Tree & Architecture)**

```text
location/
├── dto/
│   └── location.dto.ts      # 输入校验：经纬度坐标入参 Dto
├── vo/
│   └── location.vo.ts       # 输出渲染：匹配到的租户、附近商家列表 Vo
├── location.controller.ts   # 路由控制：位置匹配与附近搜索接口
├── location.module.ts       # 模块配置：关联 GeoService 及系统配置
└── location.service.ts      # 业务逻辑：核心 LBS 逻辑（电子围栏匹配、距离算法）
```

---

### **2. 数据库表与逻辑关联 (Database & Relationships)**

- **SysTenant (租户表)**：存储门店/商家的基础信息（名称、状态）。
- **SysTenantGeo (租户地理配置表)**：存储租户的中心经纬度坐标。
- **GeoStation (LBS 站点表 - 逻辑引用)**：通过 `GeoService` 查询，涉及 PostGIS 电子围栏数据。

**逻辑关联**：
- `GeoStation.tenantId` ➔ `SysTenant.tenantId`：通过地理围栏确定当前坐标所属的业务租户。
- `SysTenantGeo.tenantId` ➔ `SysTenant.tenantId`：支撑基于距离的“附近商家”检索。

---

### **3. 核心接口与业务闭环 (API & Business Closure)**

| 接口方法 | 技术关键词 | 业务闭环作用 |
| :--- | :--- | :--- |
| `matchTenant` | `PostGIS`, `GeoFence` | 进店匹配。利用 `GeoService` 判定用户坐标所在的**电子围栏**，实现自动进店/站点匹配。 |
| `getNearbyTenants` | `Haversine Formula` | 商家发现。计算用户坐标与各门店中心点的**弧面距离**，按距离升序推荐。 |
| `calculateDistanceSimple` | `Spherical Law` | 算法底座。纯数学实现的海尔文公式计算，避免了繁重的空间数据库索引扫描。 |

---

### **4. 安全审计与逻辑严谨性 (Security & Logic Audit)**

- **位置隐私保护**：本模块为只读查询，不主动持久化用户的实时坐标轨迹，符合基础隐私规范。
- **算法精度与性能平衡**：
    - `matchTenant` 使用 `GeoService`（底层 PostGIS），保证了复杂多边形围栏判定的**拓扑严谨性**。
    - `getNearbyTenants` 采用应用内数学计算，在大规模租户环境下响应速度远快于实时 GIS 函数调用。
- **地理边界容错**：当坐标位于所有服务围栏之外时，通过 `BusinessException` 返回明确的“未开通服务”提示，作为业务流程的**终结卫语句**。
- **逻辑严谨性分析**：
    - *风险点*：若租户状态为 `DISABLED` 仍有地理数据，`getNearbyTenants` 已通过卫语句过滤，但 `matchTenant` 需确保同步校验 `SysTenant.status`。
    - *精度丢失*：Haversine 公式在超短距离或极区存在极小误差，但对于商用 O2O 场景（KM 级）完全满足精度要求。
    - *空值处理*：严格校验经纬度非空，防止因脏数据导致的计算崩溃。
