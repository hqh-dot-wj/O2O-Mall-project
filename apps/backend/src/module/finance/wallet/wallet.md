# 钱包模块 (Wallet Module) 技术文档

---

### 📂 1. 文件树与作用简述 (File Tree & Architecture)

```text
wallet/
├── wallet.service.ts          # 核心业务层 (Service)：处理余额变动、冻结逻辑及缓存管理
├── wallet.repository.ts       # 仓储层 (Repository)：封装 fin_wallet 表的基础 CRUD
├── transaction.repository.ts  # 仓储层 (Repository)：记录 fin_transaction 不可篡改流水
├── dto/                       # 数据传输对象 (DTO)
└── vo/                        # 视图对象 (VO)
```

---

### 🗄️ 2. 数据库表与逻辑关联 (Database & Relationships)

| 表名 | 作用 | 逻辑关联 |
| :--- | :--- | :--- |
| `fin_wallet` | **资产主表** | 存储用户可用余额 (`balance`)、冻结金额 (`frozen`) 及乐观锁版本号 (`version`)。 |
| `fin_transaction` | **财务账本** | 存储所有余额变动的原始流水。通过 `walletId` 关联钱包，保证账实相符。 |
| `ums_member` | **会员中心** | 钱包通过 `memberId` 逻辑绑定会员，一个会员在同一租户下仅能拥有一个钱包。 |

**核心逻辑链：**
`业务触发` ➔ `WalletService 校验` ➔ `原子更新 fin_wallet` ➔ `同步记录 fin_transaction` ➔ `更新 Redis 缓存`。

---

### 🔌 3. 核心接口与业务闭环 (API & Business Closure)

#### **3.1 资产变动接口 (关键)**
*   **`addBalance(memberId, amount, ...)`**
    *   **关键词**：`@Transactional`, `Optimistic Locking`, `@CachePut`
    *   **业务作用**：入账闭环。同时更新余额与流水，成功后强制刷新 Redis 缓存。使用 `increment` 原生指令确保在高并发佣金结算时数据不被覆盖。
*   **`deductBalance(memberId, amount, ...)`**
    *   **关键词**：`@Transactional`, `Negtive Offset`
    *   **业务作用**：回滚/消费闭环。用于订单退款时的佣金倒扣或余额支付。

#### **3.2 资金状态机管控**
*   **`freezeBalance` / `unfreezeBalance`**
    *   **关键词**：`State Transition`
    *   **业务作用**：提现生命周期。申请提现时将 `balance` 转入 `frozen`；审核驳回时原路退回。
*   **`deductFrozen`**
    *   **关键词**：`Final Discharge`
    *   **业务作用**：提现完成。真实扣除冻结资金，不影响可用余额。

---

### 🛡️ 4. 安全审计与逻辑严谨性 (Security & Logic Audit)

#### **4.1 并发安全与“超减”风险**
*   **审计**：代码采用 Prisma 的 `decrement` 指令。虽然这是原子的，但若数据库层未配置 `CHECK (balance >= 0)`，高并发下可能导致“可用余额”变负。
*   **逻辑漏洞**：`deductBalance` 缺乏前置余额校验或原子性余额判断。
*   **建议**：在更新语句中增加 `where: { balance: { gte: amount } }` 条件，确保资金安全。

#### **4.2 缓存与数据库的双写一致性**
*   **审计**：使用 `@CachePut` 装饰器。
*   **风险**：在高并发场景下，若 DB 事务已提交但缓存更新因网络波动失败，或多个写请求导致缓存顺序错乱，会读取到旧余额。
*   **结论**：目前的实现适合非极其严格的实时展示，核心账务逻辑仍依赖数据库。

#### **4.3 精度丢失 (Floating Point Error)**
*   **审计**：代码全程使用 `Decimal` 类型处理所有金额运算。
*   **结论**：非常专业，规避了由于 JS `Number` 精度导致的分厘误差。

#### **4.4 流水审计追溯性**
*   **审计**：每一笔余额扣减都必传 `type` (TransType) 和 `relatedId`。
*   **结论**：实现了财务上的可对账闭环，极大降低了查找“无名账”的审计成本。

#### **4.5 乐观锁冗余性**
*   **审计**：字段中存在 `version` 且每次自增。
*   **结论**：在已有 Prisma 原子指令 (`increment`) 的情况下，`version` 实际作为后续可能存在的复杂业务校验（如防重放）的预留字段。
