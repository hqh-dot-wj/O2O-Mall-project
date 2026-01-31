# Client Address 模块文档

模型名称：Gemini 2.0 Flash、模型大小：未知、模型类型：对话模型及其修订版本：2026-05-14

### **1. 文件树与作用简述 (File Tree & Architecture)**

```text
address/
├── dto/
│   └── address.dto.ts      # 输入校验：创建/更新地址的 Dto 定义
├── vo/
│   └── address.vo.ts       # 输出渲染：地址列表及详情的 Vo 定义
├── address.controller.ts   # 路由控制：对外暴露 RESTful 接口
├── address.module.ts       # 模块配置：依赖注入与对外导出
├── address.repository.ts   # 数据仓储：底层 SQL 封装（Prisma）
└── address.service.ts      # 业务逻辑：核心业务处理（限额、默认逻辑等）
```

---

### **2. 数据库表与逻辑关联 (Database & Relationships)**

- **核心表**：`UmsAddress` (用户收货地址表)
- **逻辑关联**：
    - **Member (用户)**：通过 `memberId` 关联 C 端用户，实现用户维度的地址隔离。
    - **Order (订单)**：业务上通常在下单时快照或关联该表的 ID。

---

### **3. 核心接口与业务闭环 (API & Business Closure)**

| 接口方法 | 技术关键词 | 业务闭环作用 |
| :--- | :--- | :--- |
| `getAddressList` | `OrderBy` | 获取当前用户所有地址，**默认地址优先排序**展示。 |
| `createAddress` | `Count Check`, `clearDefault` | 创建新地址。强制**限额校验（Max 20）**；若设为默认，则**原子性**清除旧默认地址。 |
| `updateAddress` | `Ownership Check` | 更新地址详情。包含严格的**归属权校验**，防止越权修改。 |
| `deleteAddress` | `Auto-Default Fallback` | 删除地址。若删除的是默认地址，系统自动**回退补位**，将最近使用的地址设为默认。 |
| `setDefaultAddress` | `UpdateMany` | 手动切换默认地址，触发全量地址的状态重置。 |

---

### **4. 安全审计与逻辑严谨性 (Security & Logic Audit)**

- **越权风险防范**：所有操作（CRUD）强制通过 `memberId` 进行数据隔离校验，确保用户无法操作他人地址。
- **并发默认冲突**：使用 `clearDefault` (updateMany) + `update` 的两步操作虽未直接使用显式数据库锁，但依靠 Prisma 的 `updateMany` 原子性，在单用户低频场景下能保持逻辑一致。
- **配置幂等性**：`setDefaultAddress` 操作重复调用时不会产生副作用，仅会覆盖 `isDefault` 状态。
- **边界限额**：通过 `MAX_ADDRESS_COUNT` 预制硬限额，防止恶意脚本通过海量地址填充撑爆数据库索引空间。
- **逻辑缺陷分析**：
    - *风险点*：在 `deleteAddress` 逻辑中，如果高并发删除并设置新默认，可能存在竞态条件。
    - *建议*：后续可考虑在极端高并发场景下引入 `@Transactional` 保证删除与补位逻辑的强一致性。
