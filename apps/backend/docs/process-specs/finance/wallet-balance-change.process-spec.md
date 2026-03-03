# Process Spec: 钱包余额变动

> 模板级别：**Full**（核心业务流程）
> 涉及金额计算（Decimal）、并发控制、事务保障

---

## 0. Meta

| 项目         | 值                                  |
| ------------ | ----------------------------------- |
| 流程名称     | 钱包余额变动（入账/扣减/冻结/解冻） |
| 流程编号     | WALLET_BALANCE_CHANGE_V1            |
| 负责人       | Finance Team                        |
| 最后修改     | 2026-03-03                          |
| 影响系统     | Backend / Admin / Client            |
| 是否核心链路 | 是                                  |
| Spec 级别    | Full                                |

---

## 1. Why（流程目标）

**目标**：

- 在保证并发安全的前提下完成钱包余额变动
- 防止余额变负，确保资金安全
- 所有余额变动记录交易流水，支持审计追溯

**必须回答**：

- 不做这一步会发生什么？→ 余额可能变负，产生坏账
- 哪些错误是不可接受的？→ 余额变负、重复扣减、流水丢失

---

## 2. Input Contract

```typescript
interface AddBalanceInput {
  userId: string; // 用户 ID
  amount: Decimal; // 金额，精度 2 位，> 0
  type: TransactionType; // 流水类型
  relatedId?: string; // 关联业务 ID
  remark?: string; // 备注
}

interface DeductBalanceInput {
  userId: string; // 用户 ID
  amount: Decimal; // 金额，精度 2 位，> 0
  type: TransactionType; // 流水类型
  relatedId?: string; // 关联业务 ID
  remark?: string; // 备注
}

interface FreezeBalanceInput {
  userId: string; // 用户 ID
  amount: Decimal; // 金额，精度 2 位，> 0
  relatedId: string; // 关联提现申请 ID
}

interface UnfreezeBalanceInput {
  userId: string; // 用户 ID
  amount: Decimal; // 金额，精度 2 位，> 0
  relatedId: string; // 关联提现申请 ID
}
```

### 输入规则（必须枚举）

| 字段      | 规则                          | Rule ID        |
| --------- | ----------------------------- | -------------- |
| userId    | 必填，有效的用户 ID           | R-IN-WALLET-01 |
| amount    | 必填，Decimal，精度 2 位，> 0 | R-IN-WALLET-02 |
| type      | 必填，有效的 TransactionType  | R-IN-WALLET-03 |
| relatedId | 冻结/解冻时必填               | R-IN-WALLET-04 |

---

## 3. PreConditions

> 前置条件失败 **不得产生任何副作用**。

| 编号 | 前置条件                           | 失败响应 | Rule ID         |
| ---- | ---------------------------------- | -------- | --------------- |
| P1   | 用户钱包必须存在（扣减/冻结/解冻） | 404      | R-PRE-WALLET-01 |
| P2   | 扣减时：balance >= amount          | 409      | R-PRE-WALLET-02 |
| P3   | 冻结时：balance >= amount          | 409      | R-PRE-WALLET-03 |
| P4   | 解冻时：frozen >= amount           | 409      | R-PRE-WALLET-04 |
| P5   | 单笔金额不超过上限（配置化）       | 400      | R-PRE-WALLET-05 |

---

## 4. Happy Path（主干流程）

### 4.1 余额增加（addBalance）

| 步骤 | 操作            | 产出                  | Rule ID          |
| ---- | --------------- | --------------------- | ---------------- |
| S1   | 查询或创建钱包  | 钱包记录              | R-FLOW-WALLET-01 |
| S2   | 原子增加余额    | balance += amount     | R-FLOW-WALLET-02 |
| S3   | 更新累计收益    | totalIncome += amount | R-FLOW-WALLET-03 |
| S4   | 创建交易流水    | 流水记录              | R-FLOW-WALLET-04 |
| S5   | 更新 Redis 缓存 | 缓存刷新              | R-FLOW-WALLET-05 |

### 4.2 余额扣减（deductBalance）

| 步骤 | 操作                       | 产出              | Rule ID          |
| ---- | -------------------------- | ----------------- | ---------------- |
| S1   | 查询钱包                   | 钱包记录          | R-FLOW-WALLET-06 |
| S2   | 原子扣减余额（带条件校验） | balance -= amount | R-FLOW-WALLET-07 |
| S3   | 创建交易流水               | 流水记录          | R-FLOW-WALLET-08 |
| S4   | 更新 Redis 缓存            | 缓存刷新          | R-FLOW-WALLET-09 |

### 4.3 余额冻结（freezeBalance）

| 步骤 | 操作                     | 产出                                | Rule ID          |
| ---- | ------------------------ | ----------------------------------- | ---------------- |
| S1   | 查询钱包                 | 钱包记录                            | R-FLOW-WALLET-10 |
| S2   | 原子操作：balance→frozen | balance -= amount, frozen += amount | R-FLOW-WALLET-11 |
| S3   | 创建交易流水             | 流水记录（type=FREEZE）             | R-FLOW-WALLET-12 |
| S4   | 更新 Redis 缓存          | 缓存刷新                            | R-FLOW-WALLET-13 |

### 4.4 余额解冻（unfreezeBalance）

| 步骤 | 操作                     | 产出                                | Rule ID          |
| ---- | ------------------------ | ----------------------------------- | ---------------- |
| S1   | 查询钱包                 | 钱包记录                            | R-FLOW-WALLET-14 |
| S2   | 原子操作：frozen→balance | frozen -= amount, balance += amount | R-FLOW-WALLET-15 |
| S3   | 创建交易流水             | 流水记录（type=UNFREEZE）           | R-FLOW-WALLET-16 |
| S4   | 更新 Redis 缓存          | 缓存刷新                            | R-FLOW-WALLET-17 |

---

## 5. Branch Rules（分支规则）

| 编号 | 触发条件             | 跳转         | 最终状态 | Rule ID            |
| ---- | -------------------- | ------------ | -------- | ------------------ |
| B1   | 入账时钱包不存在     | 自动创建钱包 | 入账成功 | R-BRANCH-WALLET-01 |
| B2   | 扣减时余额不足       | 抛出异常     | 操作失败 | R-BRANCH-WALLET-02 |
| B3   | 支持负余额（待回收） | 允许扣减为负 | 扣减成功 | R-BRANCH-WALLET-03 |

---

## 6. State Machine（状态机定义）

钱包模块不涉及复杂状态机，主要管理三个余额字段的变动。

### 余额字段状态

| 字段        | 说明                         | 变动场景                    |
| ----------- | ---------------------------- | --------------------------- |
| balance     | 可用余额，可提现可消费       | 入账增加，消费/冻结扣减     |
| frozen      | 冻结金额，提现申请中不可使用 | 提现申请增加，驳回/完成扣减 |
| totalIncome | 累计收益，只增不减           | 佣金入账时增加              |

---

## 7. Exception Strategy（异常与补偿策略）

| 场景           | 策略 | 补偿操作      | Rule ID         |
| -------------- | ---- | ------------- | --------------- |
| 余额不足       | 终止 | 无副作用      | R-TXN-WALLET-01 |
| 冻结金额不足   | 终止 | 无副作用      | R-TXN-WALLET-02 |
| 数据库事务失败 | 回滚 | 自动回滚      | R-TXN-WALLET-03 |
| 缓存更新失败   | 重试 | 最多 3 次重试 | R-TXN-WALLET-04 |
| 单笔金额超限   | 终止 | 无副作用      | R-TXN-WALLET-05 |

---

## 8. Idempotency（幂等与并发规则）

| 项目         | 规则                                       | Rule ID            |
| ------------ | ------------------------------------------ | ------------------ |
| 幂等键       | relatedId + type（同一业务不重复操作）     | R-PRE-WALLET-06    |
| 重复请求行为 | 返回已存在的流水记录，不重复执行           | —                  |
| 并发控制     | Prisma 原子指令 + where 条件校验           | R-CONCUR-WALLET-01 |
| 扣减原子性   | update where: { balance: { gte: amount } } | R-CONCUR-WALLET-02 |

---

## 9. Observability（可观测性要求）

| 要求     | 说明                                 | Rule ID         |
| -------- | ------------------------------------ | --------------- |
| 步骤追踪 | 每个步骤记录 step + userId + amount  | R-LOG-WALLET-01 |
| 金额日志 | 金额相关必须记录原始入参和变动后余额 | R-LOG-WALLET-02 |
| 异常标识 | 所有异常必须带 errorCode             | R-LOG-WALLET-03 |
| 流水记录 | 所有余额变动必须有对应的交易流水     | R-LOG-WALLET-04 |

---

## 10. Test Mapping（测试用例映射表）

### 输入校验（R-IN-\*）

| Rule ID        | 测试 ID | Given              | When          | Then              |
| -------------- | ------- | ------------------ | ------------- | ----------------- |
| R-IN-WALLET-01 | TC-01   | userId 为空        | addBalance    | 400 参数错误      |
| R-IN-WALLET-02 | TC-02   | amount = 0         | addBalance    | 400 金额必须大于0 |
| R-IN-WALLET-02 | TC-03   | amount = -100      | deductBalance | 400 金额必须大于0 |
| R-IN-WALLET-02 | TC-04   | amount 精度超过2位 | addBalance    | 400 精度错误      |

### 前置条件（R-PRE-\*）

| Rule ID         | 测试 ID | Given               | When            | Then             |
| --------------- | ------- | ------------------- | --------------- | ---------------- |
| R-PRE-WALLET-01 | TC-10   | 钱包不存在          | deductBalance   | 404 钱包不存在   |
| R-PRE-WALLET-02 | TC-11   | balance=50, amt=100 | deductBalance   | 409 余额不足     |
| R-PRE-WALLET-03 | TC-12   | balance=50, amt=100 | freezeBalance   | 409 余额不足     |
| R-PRE-WALLET-04 | TC-13   | frozen=50, amt=100  | unfreezeBalance | 409 冻结金额不足 |
| R-PRE-WALLET-05 | TC-14   | amount > 单笔上限   | addBalance      | 400 超过单笔限额 |

### 主干流程（R-FLOW-\*）

| Rule ID          | 测试 ID | Given                | When                | Then                    |
| ---------------- | ------- | -------------------- | ------------------- | ----------------------- |
| R-FLOW-WALLET-01 | TC-20   | 钱包不存在           | addBalance          | 自动创建钱包并入账      |
| R-FLOW-WALLET-02 | TC-21   | balance=100          | addBalance(50)      | balance=150             |
| R-FLOW-WALLET-03 | TC-22   | totalIncome=100      | addBalance(50)      | totalIncome=150         |
| R-FLOW-WALLET-04 | TC-23   | 入账成功             | addBalance          | 创建 COMMISSION_IN 流水 |
| R-FLOW-WALLET-07 | TC-24   | balance=100          | deductBalance(50)   | balance=50              |
| R-FLOW-WALLET-11 | TC-25   | balance=100,frozen=0 | freezeBalance(50)   | balance=50,frozen=50    |
| R-FLOW-WALLET-15 | TC-26   | balance=50,frozen=50 | unfreezeBalance(50) | balance=100,frozen=0    |

### 分支规则（R-BRANCH-\*）

| Rule ID            | 测试 ID | Given          | When          | Then           |
| ------------------ | ------- | -------------- | ------------- | -------------- |
| R-BRANCH-WALLET-01 | TC-30   | 钱包不存在     | addBalance    | 自动创建并入账 |
| R-BRANCH-WALLET-02 | TC-31   | balance=0      | deductBalance | 409 余额不足   |
| R-BRANCH-WALLET-03 | TC-32   | 启用负余额模式 | deductBalance | 允许扣减为负   |

### 并发与事务（R-CONCUR-_ / R-TXN-_）

| Rule ID            | 测试 ID | Given        | When                       | Then         |
| ------------------ | ------- | ------------ | -------------------------- | ------------ |
| R-CONCUR-WALLET-01 | TC-40   | balance=100  | 并发 deductBalance(100) x2 | 仅 1 成功    |
| R-CONCUR-WALLET-02 | TC-41   | balance=50   | deductBalance(100)         | 409 余额不足 |
| R-TXN-WALLET-03    | TC-42   | DB 事务失败  | addBalance                 | 自动回滚     |
| R-TXN-WALLET-04    | TC-43   | 缓存更新失败 | addBalance                 | 重试后成功   |

### 可观测性（R-LOG-\*）

| Rule ID         | 测试 ID | Given    | When       | Then               |
| --------------- | ------- | -------- | ---------- | ------------------ |
| R-LOG-WALLET-01 | TC-50   | 正常入账 | addBalance | 日志包含 step 信息 |
| R-LOG-WALLET-02 | TC-51   | 正常入账 | addBalance | 日志包含金额信息   |
| R-LOG-WALLET-04 | TC-52   | 正常入账 | addBalance | 创建交易流水       |
