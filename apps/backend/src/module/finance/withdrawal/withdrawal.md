# 提现模块 (Withdrawal Module) 技术文档

---

### 📂 1. 文件树与作用简述 (File Tree & Architecture)

```text
withdrawal/
├── withdrawal.controller.ts       # 控制层 (Controller)：暴露申请、审核、列表查询接口
├── withdrawal.service.ts          # 核心服务层 (Service)：处理提现申请链路与审核入口
├── withdrawal-audit.service.ts    # 审核逻辑层 (Sub-Service)：负责提现状态流转与资金解冻/扣减核心
├── withdrawal-payment.service.ts  # 打款通道层 (Sub-Service)：对接三方支付渠道（如微信分账/企付零）
├── withdrawal.repository.ts       # 仓储层 (Repository)：封装 fin_withdrawal 表查询
├── dto/                           # 数据传输对象 (DTO)
└── vo/                            # 视图对象 (VO)
```

---

### 🗄️ 2. 数据库表与逻辑关联 (Database & Relationships)

| 表名 | 作用 | 逻辑关联 |
| :--- | :--- | :--- |
| `fin_withdrawal` | **提现记录表** | 存储提现单据状态 (`PENDING` ➔ `APPROVED` / `REJECTED` / `FAILED`) 及三方流水。 |
| `fin_wallet` | **资产联动表** | 提现申请时扣减 `balance` 并增加 `frozen`；审核通过后扣减 `frozen`。 |
| `fin_transaction` | **财务账本** | 提现成功时生成 `WITHDRAW_OUT` 类型的支出流水。 |
| `ums_member` | **会员信息** | 关联提现人的身份信息及收款账号快照。 |

**核心状态机：**
`申请 (PENDING)` ➔ `系统风控/人工审核` ➔ `外部打款 (API)` ➔ `记账成功 (APPROVED)`。

---

### 🔌 3. 核心接口与业务闭环 (API & Business Closure)

#### **3.1 提现申请链路**
*   **`apply(memberId, amount, ...)`**
    *   **关键词**：`@Transactional`, `Balance Check`, `Pre-Freeze`
    *   **业务闭环**：申请即冻结。校验余额后，通过 `WalletService` 将资金锁定。此时用户可用余额减少，防止重入申请导致的超提。

#### **3.2 审核与打款逻辑 (关键风险区)**
*   **`approve(withdrawalId, ...)`**
    *   **关键词**：`External Side-Effect`, `Audit Trail`
    *   **业务闭环**：审核通过首先调用 `WithdrawalPaymentService` 进行真实打款（外部 API）。若打款成功，则进入内账核销事务；若失败，单据标记为 `FAILED` 并保留冻结。
*   **`reject(withdrawalId, ...)`**
    *   **关键词**：`Refund To Balance`
    *   **业务闭环**：退回逻辑。将冻结金额原路解冻回 `balance`。

---

### 🛡️ 4. 安全审计与逻辑严谨性 (Security & Logic Audit)

#### **4.1 典型“双花”与 Race Condition**
*   **风险描述**：在高并发下，若申请接口未加锁，连续点击可能导致多次余额检查通过。
*   **现状分析**：代码使用了 `@Transactional`。数据库事务内执行余额检查及冻结，Prisma 会在 `update` 时加行锁。
*   **防御强化**：建议在 Controller 层增加防重缓存（如 Redis setnx 1s），防止恶意连击。

#### **4.2 分布式事务失衡 (External Call Risk)**
*   **审计点**：`approve` 方法故意将 `paymentService.transfer` 置于数据库事务外。
*   **结论**：这是**正确做法**。遵循“事务不包裹 RPC/外部 API”原则。若外部打款超时或状态未知，事务回滚将产生“钱已出但状态没变”的灾难。
*   **改进**：应引入“对账补偿”机制。针对 `FAILED` 或处理中的单据，通过定时任务轮询支付平台终态。

#### **4.3 状态机跳变风险**
*   **审计点**：`audit` 方法未在 `findUnique` 时加入状态限定。
*   **改进建议**：查询提现记录时必须携带 `where: { status: 'PENDING' }`，防止已处理的订单被并发审核。

#### **4.4 外部打款幂等性**
*   **安全风险**：如果 `paymentService` 报错，重试时是否会产生二次打款？
*   **结论**：`paymentNo` 生成必须具有业务唯一性。实际对接微信支付时，应传入系统 `withdrawal.id` 作为 `partner_trade_no`，利用支付平台自身的幂等性防止超发。

#### **4.5 余额不足时的驳回策略**
*   **极端边界**：如果驳回时，解冻后的总额超出了某些业务限制或用户钱包被标记为异常？
*   **建议**：解冻操作应作为原子性修正，无需额外校验。
