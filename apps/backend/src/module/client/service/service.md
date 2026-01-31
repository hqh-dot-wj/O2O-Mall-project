# Client Service Slot 模块文档

模型名称：Gemini 2.0 Flash、模型大小：未知、模型类型：对话模型及其修订版本：2026-05-14

### **1. 文件树与作用简述 (File Tree & Architecture)**

```text
service/
├── dto/
│   └── service-slot.dto.ts    # 输入校验：日期查询及槽位锁定入参 Dto
├── vo/
│   └── service-slot.vo.ts    # 输出渲染：日期列表、30分钟粒度时间段 Vo
├── service-slot.controller.ts # 路由控制：提供预约日期获取、时间片段查询及临时锁定
├── service-slot.module.ts     # 模块配置：关联 Redis 服务
└── service-slot.service.ts   # 业务逻辑：核心 Slot 计算算法、Redis 预占用锁管理
```

---

### **2. 数据库表与逻辑关联 (Database & Relationships)**

- **本模块目前以内存计算与缓存控制为主**：
- **逻辑关联**：
    - **Redis**：作为高性能锁引擎，处理时间片段的“预占用”，防止高并发下的预约冲突。
    - **Order (逻辑后续)**：生成的预约 Slot 最终会持久化到 `OmsOrder` 的 `bookingTime` 字段中。

---

### **3. 核心接口与业务闭环 (API & Business Closure)**

| 接口方法 | 技术关键词 | 业务闭环作用 |
| :--- | :--- | :--- |
| `getAvailableDates` | `Dayjs`, `Future 7 Days` | 预约入口。动态生成未来 7 天的日期矩阵，内置“今天、明天、后天”的语义化转换。 |
| `getTimeSlots` | `30-Min Granularity` | 槽位展示。按 30 分钟粒度全量生成 09:00-21:00 的时间片段，并**动态判定过期状态**。 |
| `lockSlot` | `Redis tryLock`, `SET NX PX` | 冲突控制。用户选择时间时执行 5 分钟的**临时锁定 (Dirty Read Prevention)**，为下单流程预留时间。 |

---

### **4. 安全审计与逻辑严谨性 (Security & Logic Audit)**

- **时间原子性防御**：在生成今日（Today）的时间片段时，严格对比当前系统毫秒，确保前端**无法选择已过去的时间点**。
- **并发锁竞争（Race Condition）**：`lockSlot` 采用 Redis 的原子锁指令，确保同一时间段在 5 分钟内仅能被单一会员预占用。
- **状态感知可靠性**：
    - *实时性*：时间槽状态为实时计算，不进行长期持久化，有效避免了因数据库状态不一致导致的预约坏账。
    - *风险点*：目前 `checkSlot` 中的复杂占用逻辑（如：已约满校验）标注为 TODO，当前仅实现了过期与简单锁校验。
    - *边界处理*：固定 09:00 - 21:00 营业时间硬编码，建议后续迁移至门店配置表实现灵活管理。
- **容量保护**：通过 30 分钟粒度切分，将全天服务压力均匀化，防止预约流量在单一时间点瞬间过载。
