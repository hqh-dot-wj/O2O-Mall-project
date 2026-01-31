# 会员管理模块 (Member Module) 技术文档

### **1. 文件树与作用简述 (File Tree & Architecture)**

```text
member/
├── dto/                        # 数据传输对象 (输入校验)
│   ├── list-member.dto.ts      # 分页查询参数
│   └── update-member.dto.ts    # 等级/状态/推荐人更新参数
├── services/                   # 子服务层 (逻辑拆解)
│   ├── member-referral.service.ts # 推荐关系合法性校验与树形查询
│   └── member-stats.service.ts # 性能聚合统计 (消费额/佣金收益)
├── vo/                         # 视图对象 (聚合输出)
│   └── member.vo.ts            # 会员详情展示模型
├── member.controller.ts        # 控制层：定义 Admin 管理接口
├── member.service.ts           # 门面层 (Facade)：核心业务编排
├── member.repository.ts        # 仓储层：基础会员数据访问 (ums_member)
├── referral-code.repository.ts # 仓储层：推荐码与会员绑定关系 (ums_referral_code)
├── member.constant.ts          # 常量定义：会员等级 (普通/C1/C2)、状态
└── member.module.ts            # 模块配置：依赖注入与组件声明
```

---

### **2. 数据库表与逻辑关联 (Database & Relationships)**

- **核心表**：
  - `ums_member` (会员表)：存储基础信息、钱包余额、所属等级 (`levelId`) 及上级 ID (`parentId`, `indirectParentId`)。
  - `ums_referral_code` (推荐码表)：存储会员对应的唯一推荐码，用于分销溯源。
- **关联表**：
  - `oms_order` (订单表)：通过 `memberId` 关联，统计 **PAID** 状态订单的 `payAmount` 总和。
  - `fin_commission` (佣金表)：通过 `beneficiaryId` 关联，统计会员累计获得的佣金收益。
  - `sys_tenant` (租户表)：标记会员归属的门店/机构，支持跨店推荐校验。
- **逻辑关联**：
  - 会员间通过 `parentId` 形成 **C1 (团长) / C2 (股东)** 的二级分销链条。
  - 等级调整会触发推荐关系的重置逻辑（如升级为 C2 股东后，其上级关系自动切断，成为顶级节点）。

---

### **3. 核心接口与业务闭环 (API & Business Closure)**

| 接口功能 | 技术方案 | 业务闭环作用 |
| :--- | :--- | :--- |
| **会员列表查询** | `Promise.all` 批量并行查询 | 聚合会员基础信息、分销上级名、消费统计、租户名，形成全量视图。 |
| **手动调整等级** | `@Transactional` + 策略重置 | 修改 `levelId`。升级至 C2 或跨店升级 C1 时，**原子化**重置推荐关系。 |
| **建立推荐关系** | `validateAndGetIndirectParent` | 输入推荐人 ID，校验合法性并自动计算间接上级，更新分销链条。 |
| **租户/归属变更** | `memberRepo.update` | 调整会员所属的门店 ID，影响该会员产生的业绩资产归属。 |

---

### **4. 安全审计与逻辑严谨性 (Security & Logic Audit)**

- **并发安全**：
  - 使用 `@Transactional` 确保等级变更与推荐关系重置在同一事务内。
  - 核心写操作依赖 **Prisma 事务控制**，防止关系链数据产生坏账。
- **关系健壮性**：
  - **自指校验**：在 `updateParent` 时强制校验 `memberId !== referrerId`，防止形成单节点环路。
  - **层级限制**：通过 `levelId` (1: C1, 2: C2) 锁定分销层级，防止普通会员误操作成为推荐人。
- **租户隔离**：
  - `list` 接口严格执行 `TenantContext` 过滤，确保不同门店管理员只能看到所属会员。
- **业务陷阱处理**：
  - **精度安全**：消费额与佣金统计使用 `Prisma.Decimal` 处理，避免 `Number` 浮点数在金额计算时的精度丢失。
  - **空值容错**：统计子服务对无订单/无佣金的会员提供默认值填充，防止前端展示异常。
