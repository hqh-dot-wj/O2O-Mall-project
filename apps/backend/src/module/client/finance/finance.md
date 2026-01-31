# Client Finance 模块文档

模型名称：Gemini 2.0 Flash、模型大小：未知、模型类型：对话模型及其修订版本：2026-05-14

### **1. 文件树与作用简述 (File Tree & Architecture)**

```text
finance/
├── dto/
│   └── client-finance.dto.ts    # 输入校验：提现申请、佣金/流水查询 Dto 及 Vo
├── client-finance.controller.ts # 路由控制：C 端财务中心（钱包、提现、流水）
├── client-finance.module.ts     # 模块配置：关联 Wallet、Withdrawal、Commission 核心财务模块
└── client-finance.service.ts    # 业务逻辑：C 端财务聚合服务，负责数据查询与懒加载创建
```

---

### **2. 数据库表与逻辑关联 (Database & Relationships)**

- **FinWallet (钱包表)**：C 端会员资金底座，存储余额、冻结金额、累计收益。
- **FinWithdrawal (提现记录表)**：追踪用户提现申请状态（待审核、已到账、已驳回）。
- **FinCommission (佣金明细表)**：记录分销产生的佣金收益及其关联订单。
- **FinTransaction (资金流水表)**：全量记录钱包余额变动轨迹。

**逻辑关联**：
- `FinWallet.memberId` ➔ `UmsMember.memberId`：1:1 账户映射。
- `FinTransaction.walletId` ➔ `FinWallet.id`：流水归因。
- `FinCommission.beneficiaryId` ➔ `UmsMember.memberId`：佣金收益人关联。

---

### **3. 核心接口与业务闭环 (API & Business Closure)**

| 接口方法 | 技术关键词 | 业务闭环作用 |
| :--- | :--- | :--- |
| `getWallet` | `Lazy Load`, `Prisma` | 资金看板。获取资产概览，若用户无钱包则**静默创建**（懒加载模式）。 |
| `applyWithdrawal` | `WithdrawalService.apply` | 资金流出。调用核心提现服务，执行**余额冻结**并生成审核单。 |
| `getCommissionList` | `Include Order` | 收益溯源。分页查询分销佣金，支持关联**订单编号与支付金额**展示。 |
| `getTransactionList` | `Prisma.$transaction` | 审计追踪。按类型筛选并统计资金变动日志，确保财务对账透明。 |

---

### **4. 安全审计与逻辑严谨性 (Security & Logic Audit)**

- **懒加载竞态**：`getWallet` 中的“查询后创建”逻辑在极高并发下可能产生冲突，但依靠 `FinWallet.memberId` 的**唯一索引 (Unique Index)** 可在数据库层强制保证单会员单钱包且不产生逻辑坏账。
- **财务隔离**：所有查询强依赖 `MemberAuthGuard` 提供的 `memberId`，从底层防止遍历 ID 导致的资产泄露或提现冒领。
- **一致性保护**：
    - *内部闭环*：提现操作委托给 `WithdrawalService`，该服务内部使用**数据库事务**包裹（余额扣减 + 冻结增加 + 记录生成），确保零资金风险。
    - *风险点*：目前 `applyWithdrawal` 仅调用核心方法，C 端未做额外的图形验证码或二次确认，存在脚本暴力申请导致的审核压力风险。
- **多租户严谨性**：每个操作均带入 `tenantId`，确保分销收益与提现申请归属于正确的门店/租户体系。
