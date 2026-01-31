# 结算模块 (Settlement Module) 技术文档

---

### 📂 1. 文件树与作用简述 (File Tree & Architecture)
该模块目前是一个纯后端任务调度模块，主要负责处理“在途资金”到“钱包余额”的最终状态跃迁。

```text
settlement/
├── settlement.scheduler.ts    # 架构层：Service/Scheduler (Job)
│                               # 作用：核心定时任务，负责扫描到期的冻结佣金并执行入账逻辑。
└── settlement.scheduler.spec.ts # 测试层：单元测试。
                                # 作用：验证结算逻辑的正确性、并发锁安全性及事务完整性。
```

---

### 🗄️ 2. 数据库表与逻辑关联 (Database & Relationships)
结算模块是财务链路的“收口”点，涉及以下核心表的逻辑串联：

| 表名 | 作用 | 逻辑关联 |
| :--- | :--- | :--- |
| `fin_commission` | **待结算源** | 扫描 `status='FROZEN'` 且 `planSettleTime <= NOW()` 的记录。通过 `beneficiaryId` 寻找受益人。 |
| `fin_wallet` | **资金终点** | 根据 `beneficiaryId` 增加 `balance` (可用余额) 和 `totalIncome` (累计收益)。 |
| `fin_transaction` | **审计流水** | 为每一笔结算操作生成不可篡改的 `COMMISSION_IN` 账务流水，确保每一分钱都有据可查。 |

**数据流转闭环：**
`订单支付` ➔ `佣金冻结 (FROZEN)` ➔ `定时任务扫描 (Settlement Job)` ➔ `钱包更新与流水记录` ➔ `佣金标记为已结算 (SETTLED)`。

---

### 🔌 3. 核心接口与业务闭环 (API & Business Closure)

#### **3.1 结算调度器 (Settlement Job)**
*   **方法**：`settleJob()`
*   **技术关键词**：`@Cron`, `Distributed Lock (Redis)`, `Batch Processing`
*   **业务闭环**：每 5 分钟自动运行一次。通过 Redis 分布式锁确保在多副本部署时仅有一个实例运行。采用分批（Batch Size: 100）扫描机制处理到期佣金，保障系统吞吐。

#### **3.2 原语结算操作 (Atomic Settlement)**
*   **方法**：`settleOne(commission)`
*   **技术关键词**：`@Transactional`, `Optimistic Lock (Version)`, `Idempotency`
*   **业务闭环**：在单一数据库事务内完成以下三步：
    1. **更新佣金状态**：将 `FROZEN` 改为 `SETTLED`。
    2. **更新钱包金额**：原子化增加 `balance`。
    3. **写入交易流水**：生成入账单据。
    通过 `Transaction` 保证该复合操作的原子性。

---

### 🛡️ 4. 安全审计与逻辑严谨性 (Security & Logic Audit)

#### **4.1 并发安全与锁严谨性**
*   **现状**：代码实现了 Redis 分布式锁（`lock:settle:commission`）。
*   **风险**：若任务执行时间超过 `LOCK_TTL` (5 分钟)，锁会自动释放导致第二个实例启动，产生重入风险。
*   **解决方案**：目前的 `settleOne` 带有事务保障，且 `increment` 是 SQL 级的原子操作，具备最终的一致性，但建议在 Redis 锁逻辑中加入“看门狗”或任务健康检查。

#### **4.2 资产“虚增”防御 (Double Entry Prevention)**
*   **逻辑自洽性**：`settleOne` 内部应先校验佣金状态。
*   **风险点**：现有代码使用的是传入的 `commission` 对象。如果两个线程同时处理同一记录，可能导致余额重复增加。
*   **改进策略**：在事务起始处执行 `SELECT ... FOR UPDATE` 或在扩展 `update` 时限定 `where: { status: 'FROZEN' }`。

#### **4.3 精度丢失风险 (Precision Check)**
*   **现状**：数据库使用 `Decimal(10, 2)`。
*   **审计**：代码中直接使用 Prisma 的 `Decimal` 类型进行 `increment`。
*   **结论**：符合财务系统对高精度的要求，避免了 JavaScript 浮点数计算误差。

#### **4.4 异常隔离与死锁 (Error Isolation)**
*   **风险点**：批量处理中单笔失败的处理逻辑。
*   **审计**：当前代码在 `for` 循环中包裹了 `try-catch`，单条记录结算失败（如钱包不存在或被锁定）不会导致整个批次任务中断，具备基础的健壮性。
*   **改进方向**：应针对结算失败的记录增加“重试指数退避”机制或标记为“异常单”，防止无效的定时任务反复扫描同一死单。

#### **4.5 跨租户及状态机跳变**
*   **业务漏洞**：若订单在结算前发生退款并由于异步延迟未及时标记 `CANCELLED`。
*   **防御**：结算逻辑中增加对关联订单状态的终态检查，确保处于“已支付/已完成”状态的订单才可入账。
