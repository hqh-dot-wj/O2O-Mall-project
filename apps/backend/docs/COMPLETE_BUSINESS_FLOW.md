# 完整业务流程文档

## 📋 目录
1. [系统架构概览](#系统架构概览)
2. [订单到分佣完整流程](#订单到分佣完整流程)
3. [财务模块详解](#财务模块详解)
4. [数据流转图](#数据流转图)
5. [关键时间节点](#关键时间节点)
6. [异常处理](#异常处理)

---

## 🏗️ 系统架构概览

### 核心模块

```
apps/backend/src/module/
├── client/              # C端用户模块
│   ├── order/          # 订单管理
│   ├── payment/        # 支付处理
│   ├── cart/           # 购物车
│   └── user/           # 用户管理
│
├── finance/            # 财务模块 ⭐
│   ├── commission/     # 分佣计算
│   ├── settlement/     # 结算处理
│   ├── wallet/         # 钱包管理
│   └── withdrawal/     # 提现处理
│
├── marketing/          # 营销模块
│   ├── config/         # 营销配置
│   ├── instance/       # 营销实例
│   └── template/       # 营销模板
│
└── pms/                # 商品模块
    ├── product/        # 商品管理
    └── category/       # 分类管理
```

---

## 🔄 订单到分佣完整流程

### 阶段1：下单（Order Creation）

```typescript
// 文件：apps/backend/src/module/client/order/order.service.ts

用户下单
    ↓
1. 风控检测 (RiskService)
    ↓
2. 结算预览 (CheckoutService)
   - 校验商品
   - 校验库存
   - 计算价格
   - LBS距离校验
    ↓
3. 确定归因
   - shareUserId (临时分享)
   - referrerId (绑定关系)
    ↓
4. 创建订单 (OmsOrder)
   - 生成订单号
   - 保存订单信息
   - 创建订单明细
    ↓
5. 扣减库存 (PmsTenantSku)
    ↓
6. 清空购物车
    ↓
7. 发送通知队列
    ↓
8. 添加超时关闭任务 (30分钟)
```

**关键代码：**
```typescript
const order = await this.prisma.omsOrder.create({
  data: {
    orderSn,
    memberId,
    tenantId,
    orderType,
    totalAmount,
    payAmount,
    shareUserId,    // 分享归因
    referrerId,     // 推荐关系
    items: { create: [...] }
  }
});
```

---

### 阶段2：支付（Payment）

```typescript
// 文件：apps/backend/src/module/client/payment/payment.service.ts

用户支付
    ↓
1. 预下单 (prepay)
   - 校验订单状态
   - 调用微信支付API
   - 返回支付参数
    ↓
2. 用户完成支付
    ↓
3. 微信支付回调
    ↓
4. 处理支付成功 (processPaymentSuccess)
   - 幂等性检查
   - 更新订单状态 → PAID
   - 更新支付状态 → PAID
   - 记录支付时间
    ↓
5. 触发分佣计算 (异步)
```

**关键代码：**
```typescript
// 支付成功后
await this.orderRepo.update(orderId, {
  status: 'PAID',
  payStatus: 'PAID',
  payTime: new Date(),
});

// 触发分佣计算（异步队列）
await this.commissionService.triggerCalculation(orderId, tenantId);
```

---

### 阶段3：分佣计算（Commission Calculation）

```typescript
// 文件：apps/backend/src/module/finance/commission/commission.service.ts

支付成功 → 触发分佣队列
    ↓
1. 获取订单信息
    ↓
2. 获取用户推荐关系链
   - parentId (直接上级)
   - indirectParentId (间接上级)
    ↓
3. 自购检测
   - 订单会员 === 分享人？
   - 订单会员 === 上级？
   → 是：不返佣，结束
    ↓
4. 计算佣金基数
   - 从 SKU 的分佣配置获取
   - distMode: RATIO (比例) / FIXED (固定)
    ↓
5. 获取分销配置 (SysDistConfig)
   - level1Rate: 一级分佣比例
   - level2Rate: 二级分佣比例
   - enableCrossTenant: 是否允许跨店
    ↓
6. 计算 L1 佣金（一级/直推）
   - 受益人：shareUserId 或 parentId
   - 身份校验：必须是 C1 或 C2
   - 黑名单校验
   - 跨店校验
   - 限额校验
   - 特殊：C2无上级 → 全拿（L1+L2）
    ↓
7. 计算 L2 佣金（二级/间推）
   - 受益人：L1的上级
   - 身份校验：必须是 C2
   - 黑名单校验
   - 跨店校验
   - 限额校验
    ↓
8. 创建分佣记录 (FinCommission)
   - status: FROZEN (冻结)
   - planSettleTime: 计划结算时间
     * 实物：T+14天
     * 服务：T+1天
```

**关键代码：**
```typescript
// 计算 L1 佣金
const l1Amount = commissionBase.mul(config.level1Rate);

// 创建分佣记录
await this.commissionRepo.create({
  orderId,
  tenantId,
  beneficiaryId,
  level: 1,
  amount: l1Amount,
  rateSnapshot: config.level1Rate,
  status: 'FROZEN',
  planSettleTime: calculateSettleTime(order.orderType),
});
```

**分佣规则示例：**
```
订单金额：¥680
佣金基数：¥680 × 100% = ¥680

L1（直推）：
- 受益人：李四（C1）
- 比例：10%
- 金额：¥680 × 10% = ¥68
- 状态：FROZEN

L2（间推）：
- 受益人：张三（C2，李四的上级）
- 比例：5%
- 金额：¥680 × 5% = ¥34
- 状态：FROZEN
```

---

### 阶段4：订单完成（Order Completion）

```typescript
// 实物订单
用户确认收货
    ↓
更新订单状态 → COMPLETED
    ↓
更新分佣结算时间 → T+7天

// 服务订单
技师核销
    ↓
更新订单状态 → COMPLETED
    ↓
更新分佣结算时间 → T+1天
```

**关键代码：**
```typescript
// 确认收货
await this.orderRepo.updateStatus(orderId, 'COMPLETED');

// 更新分佣结算时间
await this.commissionService.updatePlanSettleTime(orderId, 'CONFIRM');
```

---

### 阶段5：分佣结算（Commission Settlement）

```typescript
// 文件：apps/backend/src/module/finance/settlement/settlement.scheduler.ts

定时任务（每小时执行）
    ↓
1. 扫描到期的冻结佣金
   - status = FROZEN
   - planSettleTime <= now
    ↓
2. 批量结算
   - 更新状态 → SETTLED
   - 记录结算时间
   - 增加钱包余额
   - 创建流水记录
    ↓
3. 发送结算通知
```

**关键代码：**
```typescript
// 定时扫描
const commissions = await this.commissionRepo.findMany({
  where: {
    status: 'FROZEN',
    planSettleTime: { lte: new Date() }
  }
});

// 批量结算
for (const comm of commissions) {
  await this.settleCommission(comm);
}

// 结算单条佣金
async settleCommission(commission) {
  // 1. 更新佣金状态
  await this.commissionRepo.update(commission.id, {
    status: 'SETTLED',
    settleTime: new Date()
  });
  
  // 2. 增加钱包余额
  await this.walletService.addBalance(
    commission.beneficiaryId,
    commission.amount,
    commission.orderId,
    '佣金结算',
    'COMMISSION_IN'
  );
}
```

---

### 阶段6：提现（Withdrawal）

```typescript
// 文件：apps/backend/src/module/finance/withdrawal/withdrawal.service.ts

用户申请提现
    ↓
1. 校验余额
   - 可用余额 >= 提现金额
   - 提现金额 >= 最低限额
    ↓
2. 冻结余额
   - balance -= amount
   - frozenBalance += amount
    ↓
3. 创建提现记录
   - status: PENDING
    ↓
4. 人工/自动审核
   - 审核通过 → APPROVED
   - 审核拒绝 → REJECTED (解冻余额)
    ↓
5. 调用支付渠道打款
   - 微信企业付款
   - 银行卡转账
    ↓
6. 更新提现状态
   - 成功 → SUCCESS (扣除冻结余额)
   - 失败 → FAILED (解冻余额)
```

**关键代码：**
```typescript
// 申请提现
async applyWithdrawal(memberId, amount) {
  // 1. 校验余额
  const wallet = await this.walletRepo.findByMember(memberId);
  if (wallet.balance.lt(amount)) {
    throw new BusinessException('余额不足');
  }
  
  // 2. 冻结余额（原子操作）
  await this.walletService.freezeBalance(memberId, amount);
  
  // 3. 创建提现记录
  const withdrawal = await this.withdrawalRepo.create({
    memberId,
    amount,
    status: 'PENDING'
  });
  
  return withdrawal;
}
```

---

## 💰 财务模块详解

### 模块组织架构

```
finance/
├── commission/     # 【产生层】分佣计算
│   ├── commission.service.ts       # 核心业务逻辑
│   ├── commission.processor.ts     # 异步队列处理
│   └── commission.repository.ts    # 数据访问
│
├── settlement/    # 【流转层】定时结算
│   └── settlement.scheduler.ts     # 定时任务
│
├── wallet/        # 【余额层】钱包管理
│   ├── wallet.service.ts           # 钱包操作
│   ├── wallet.repository.ts        # 钱包数据
│   └── transaction.repository.ts   # 流水记录
│
└── withdrawal/    # 【流出层】提现处理
    ├── withdrawal.service.ts       # 提现业务
    ├── withdrawal-audit.service.ts # 审核逻辑
    └── withdrawal-payment.service.ts # 支付对接
```

### 核心数据表

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| `fin_commission` | 分佣记录 | orderId, beneficiaryId, level, amount, status |
| `fin_wallet` | 用户钱包 | memberId, balance, frozenBalance, version |
| `fin_transaction` | 流水记录 | walletId, type, amount, balanceAfter |
| `fin_withdrawal` | 提现记录 | memberId, amount, status, paymentNo |
| `sys_dist_config` | 分销配置 | tenantId, level1Rate, level2Rate |

### 状态机

#### 分佣状态（CommissionStatus）
```
FROZEN (冻结)
    ↓
SETTLED (已结算)
    ↓
CANCELLED (已取消)
```

#### 提现状态（WithdrawalStatus）
```
PENDING (待审核)
    ↓
APPROVED (审核通过)
    ↓
SUCCESS (打款成功)

或

PENDING (待审核)
    ↓
REJECTED (审核拒绝)

或

APPROVED (审核通过)
    ↓
FAILED (打款失败)
```

---

## 📊 数据流转图

### 完整资金流向

```
┌─────────────────────────────────────────────────────────────┐
│                    用户支付 ¥680                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  订单创建 (OmsOrder)                         │
│  - orderSn: ORD20260208...                                   │
│  - status: PENDING_PAY                                       │
│  - payAmount: ¥680                                           │
│  - shareUserId: user-c1                                      │
│  - referrerId: user-c1                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  支付成功 (Payment)                          │
│  - status: PAID                                              │
│  - payStatus: PAID                                           │
│  - payTime: 2026-02-08 10:00:00                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              分佣计算 (Commission Calculation)               │
│                                                               │
│  L1（直推）：                                                │
│  - beneficiaryId: user-c1                                    │
│  - level: 1                                                  │
│  - amount: ¥68 (¥680 × 10%)                                 │
│  - status: FROZEN                                            │
│  - planSettleTime: 2026-02-09 10:00:00 (T+1)                │
│                                                               │
│  L2（间推）：                                                │
│  - beneficiaryId: user-c2                                    │
│  - level: 2                                                  │
│  - amount: ¥34 (¥680 × 5%)                                  │
│  - status: FROZEN                                            │
│  - planSettleTime: 2026-02-09 10:00:00 (T+1)                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                订单完成 (Order Completion)                   │
│  - status: COMPLETED                                         │
│  - 更新 planSettleTime: 2026-02-15 10:00:00 (T+7)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              分佣结算 (Commission Settlement)                │
│                                                               │
│  user-c1 钱包：                                              │
│  - balance: ¥0 → ¥68                                         │
│  - 流水：COMMISSION_IN, ¥68                                  │
│                                                               │
│  user-c2 钱包：                                              │
│  - balance: ¥0 → ¥34                                         │
│  - 流水：COMMISSION_IN, ¥34                                  │
│                                                               │
│  分佣记录：                                                  │
│  - status: FROZEN → SETTLED                                  │
│  - settleTime: 2026-02-15 10:00:00                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  用户提现 (Withdrawal)                       │
│                                                               │
│  user-c1 申请提现 ¥50：                                      │
│  - balance: ¥68 → ¥18                                        │
│  - frozenBalance: ¥0 → ¥50                                   │
│  - 提现记录：PENDING                                         │
│                                                               │
│  审核通过：                                                  │
│  - 提现记录：PENDING → APPROVED                              │
│                                                               │
│  打款成功：                                                  │
│  - frozenBalance: ¥50 → ¥0                                   │
│  - 提现记录：APPROVED → SUCCESS                              │
│  - 流水：WITHDRAW_OUT, -¥50                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## ⏰ 关键时间节点

### 订单流程时间线

| 时间点 | 事件 | 说明 |
|--------|------|------|
| T+0 | 下单 | 创建订单，状态 PENDING_PAY |
| T+0 + 30分钟 | 超时关闭 | 未支付订单自动取消 |
| T+0 | 支付成功 | 状态 → PAID，触发分佣计算 |
| T+0 + 2分钟 | 发送通知 | 延迟队列发送新订单通知 |
| T+1 (服务) | 初始结算时间 | 服务类订单分佣冻结期 |
| T+14 (实物) | 初始结算时间 | 实物订单分佣冻结期 |
| T+核销/确认收货 | 更新结算时间 | 服务核销后T+1，确认收货后T+7 |
| T+结算时间 | 分佣结算 | 定时任务扫描并结算 |

### 分佣结算时间规则

```typescript
// 服务类订单
if (orderType === 'SERVICE') {
  // 初始：支付后 T+1天
  planSettleTime = payTime + 1天;
  
  // 核销后：核销时间 T+1天
  if (verified) {
    planSettleTime = verifyTime + 1天;
  }
}

// 实物订单
if (orderType === 'PRODUCT') {
  // 初始：支付后 T+14天
  planSettleTime = payTime + 14天;
  
  // 确认收货后：确认时间 T+7天
  if (confirmed) {
    planSettleTime = confirmTime + 7天;
  }
}
```

---

## 🚨 异常处理

### 1. 支付异常

#### 场景：订单已取消但收到支付回调
```typescript
// 防御代码
if (order.status === 'CANCELLED') {
  logger.warn('Order was cancelled but payment received');
  // 触发自动退款
  await wechatPay.refund(order);
  return { status: 'REFUND_PENDING' };
}
```

#### 场景：重复支付回调
```typescript
// 幂等性检查
if (order.status !== 'PENDING_PAY') {
  return { status: order.status };
}
```

### 2. 分佣异常

#### 场景：自购检测
```typescript
// 不返佣情况
if (order.memberId === order.shareUserId) {
  logger.log('Self-purchase detected, skip commission');
  return;
}
```

#### 场景：循环推荐
```typescript
// 绑定推荐人时检查
const hasCircular = await checkCircularReferral(memberId, parentId);
if (hasCircular) {
  throw new BusinessException('检测到循环推荐关系');
}
```

#### 场景：黑名单用户
```typescript
// 分佣计算时检查
if (await isUserBlacklisted(tenantId, beneficiaryId)) {
  logger.log('User is blacklisted, skip commission');
  return null;
}
```

#### 场景：跨店限额
```typescript
// 使用行锁防止并发超限
const currentTotal = await queryDailyTotal(tenantId, beneficiaryId);
if (currentTotal.add(amount).gt(limit)) {
  logger.log('Daily limit exceeded');
  return null;
}
```

### 3. 退款异常

#### 场景：订单退款，佣金已结算
```typescript
// 回滚已结算佣金
async rollbackCommission(commission) {
  // 扣减余额（可能变负）
  await walletService.deductBalance(
    commission.beneficiaryId,
    commission.amount,
    commission.orderId,
    '订单退款，佣金回收',
    'REFUND_DEDUCT'
  );
  
  // 更新佣金状态
  await commissionRepo.update(commission.id, {
    status: 'CANCELLED'
  });
}
```

### 4. 提现异常

#### 场景：余额不足
```typescript
// 原子操作检查余额
const wallet = await walletRepo.findByMemberForUpdate(memberId);
if (wallet.balance.lt(amount)) {
  throw new BusinessException('余额不足');
}
```

#### 场景：打款失败
```typescript
// 打款失败，解冻余额
if (paymentFailed) {
  await walletService.unfreezeBalance(memberId, amount);
  await withdrawalRepo.update(withdrawalId, {
    status: 'FAILED',
    failReason: error.message
  });
}
```

---

## 🔐 安全机制

### 1. 并发控制

#### 乐观锁（Wallet）
```typescript
// 钱包使用 version 字段
await prisma.finWallet.update({
  where: {
    id: walletId,
    version: currentVersion  // 乐观锁
  },
  data: {
    balance: newBalance,
    version: { increment: 1 }
  }
});
```

#### 悲观锁（跨店限额）
```typescript
// 使用 FOR UPDATE 行锁
const result = await prisma.$queryRaw`
  SELECT SUM(amount) as total
  FROM fin_commission
  WHERE tenant_id = ${tenantId}
    AND beneficiary_id = ${beneficiaryId}
    AND DATE(create_time) = CURDATE()
  FOR UPDATE
`;
```

### 2. 事务保证

```typescript
// 使用 @Transactional 装饰器
@Transactional({ isolationLevel: IsolationLevel.RepeatableRead })
async calculateCommission(orderId: string) {
  // 所有操作在同一事务中
  // 要么全部成功，要么全部回滚
}
```

### 3. 幂等性

```typescript
// 使用唯一索引防止重复
@@unique([orderId, beneficiaryId, level])

// 使用 upsert 防止重复创建
await commissionRepo.upsert({
  where: { orderId_beneficiaryId_level: {...} },
  create: {...},
  update: {}  // 若存在则忽略
});
```

---

## 📈 性能优化

### 1. 异步处理

```typescript
// 分佣计算使用消息队列
await commissionQueue.add(
  { orderId, tenantId },
  {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 }
  }
);
```

### 2. 批量操作

```typescript
// 批量结算
const commissions = await findManyDue();
for (const comm of commissions) {
  await settleCommission(comm);
}
```

### 3. 索引优化

```prisma
// 关键索引
@@index([tenantId, status, planSettleTime])  // 结算扫描
@@index([beneficiaryId, status])             // 用户查询
@@index([orderId])                           // 订单关联
```

---

## 📚 相关文档

- [财务模块技术文档](./finance/finance.md)
- [分佣计算文档](./finance/commission/commission.md)
- [钱包管理文档](./finance/wallet/wallet.md)
- [提现处理文档](./finance/withdrawal/withdrawal.md)
- [平台抽成说明](./PLATFORM_COMMISSION_GUIDE.md)
- [端到端测试指南](./E2E_TEST_GUIDE.md)

---

## 🎯 总结

### 核心流程

1. **下单** → 创建订单，扣减库存
2. **支付** → 更新状态，触发分佣
3. **分佣** → 计算金额，创建冻结记录
4. **完成** → 确认收货/核销，更新结算时间
5. **结算** → 定时扫描，解冻入账
6. **提现** → 申请审核，打款到账

### 关键特性

✅ **异步处理** - 分佣计算不阻塞支付流程  
✅ **事务保证** - 关键操作使用事务确保一致性  
✅ **并发控制** - 乐观锁 + 悲观锁防止并发问题  
✅ **幂等性** - 防止重复计算和重复支付  
✅ **安全审计** - 完整的流水记录，可追溯  
✅ **异常处理** - 完善的异常处理和回滚机制  

### 数据完整性

- 所有金额变动都有流水记录
- 分佣记录与订单关联
- 钱包余额 = 流水总和
- 定期对账任务验证数据一致性
