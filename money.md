# 财务与分销核算结算系统 PRD

## 文档信息

| 项目       | 内容                           |
| -------- | ---------------------------- |
| **文档版本** | v1.0                         |
| **创建日期** | 2026-01-20                   |
| **系统定位** | SaaS + O2O + 多级分销平台的财务结算核心模块 |
| **核心价值** | 实现"钱怎么分、什么时候分、退款怎么扣"的完整闭环    |

## 一、系统概述

### 1.1 业务背景

在完成"浏览 → 下单 → 支付"的交易前半场后，系统需要解决资金流向的核心问题：

- **多方利益分配**：门店、平台、分销员（C端）、代理商（B端）、技师
- **时间延迟结算**：防止退款/售后导致的资金损失
- **合规性要求**：税务申报、资金存管、反洗钱
- **数据隔离**：多租户模式下的财务数据安全

### 1.2 核心概念定义

| 概念                     | 定义       | 时机         | 状态      |
| ---------------------- | -------- | ---------- | ------- |
| **核算(Accounting)**     | 计算各方应得金额 | 支付成功瞬间     | 冻结/预计收益 |
| **结算(Settlement)**     | 资金解冻可提现  | 服务完成+保护期后  | 可用余额    |
| **分账(Profit Sharing)** | 底层资金流转   | 内部记账或微信侧分账 | 实际到账    |

## 二、前端设计方案

### 2.1 菜单结构

```
租户后台 (/store)
├── 订单中心
│   ├── 订单列表 (/order/list)
│   ├── 订单详情 (/order/detail/:id) [隐藏路由]
│   └── 派单工作台 (/order/dispatch) [服务类专用]
└── 财务中心
    ├── 资金看板 (/finance/dashboard)
    ├── 佣金明细 (/finance/commission)
    ├── 提现审核 (/finance/withdrawal)
    └── 门店流水 (/finance/ledger)
```

---

### 2.2 核心页面设计

#### 页面A：订单详情页 (`/order/detail/:id`)

**页面目标**：让店长/客服清晰了解"这单钱怎么分、活谁干"

**布局结构**（5卡片分区）：

```
┌─────────────────────────────────────────────────┐
│ 卡片1：订单状态与客户信息                              │
│ - 订单号、下单时间、支付流水号                          │
│ - 客户头像、昵称、手机号                              │
│ - ⭐归因信息：分享人D(ID:888) | 永久上级C2(ID:666)    │
│ - 流量来源标签：微信卡片分享/自然流量                    │
├─────────────────────────────────────────────────┤
│ 卡片2：商品/服务明细                                 │
│ - 表格：图片 | 名称 | 规格 | 数量 | 单价 | 小计        │
│ - 费用汇总：商品总价 ¥100 + 运费 ¥10 - 优惠 ¥5 = ¥105│
├─────────────────────────────────────────────────┤
│ 卡片3：💰资金分配明细 [权限控制：仅财务/店长可见]        │
│ ┌───────────────────────────────────────────┐  │
│ │ 角色      用户      分润依据    金额    状态    │  │
│ │ 一级分销  张三(C1)  60%      +¥6.00  🕒冻结中 │  │
│ │ 二级分销  李四(C2)  40%      +¥4.00  🕒冻结中 │  │
│ │ 技师工资  王师傅    固定      +¥50.00 ⏳待核销 │  │
│ │ 门店/平台 天心店    剩余毛利   +¥44.00 ✅已入账 │  │
│ └───────────────────────────────────────────┘  │
│ - 解冻时间提示：预计2026-01-27解冻（确认收货+7天）      │
├─────────────────────────────────────────────────┤
│ 卡片4：履约与派单信息 [仅服务类订单显示]                │
│ - 状态机：待派单 → 已接单 → 服务中 → 已核销             │
│ - 技师信息：头像 | 姓名 | 电话 | 评分                 │
│ - 轨迹记录：                                        │
│   14:00 派单给王阿姨                                 │
│   14:30 王阿姨接单                                  │
│   15:00 到达打卡 (位置:xx小区,距离1.2km)              │
│   17:00 完成打卡 (上传照片x3)                        │
│ - 操作按钮：[改派技师] [强制核销] [查看凭证]            │
├─────────────────────────────────────────────────┤
│ 卡片5：操作日志                                     │
│ - 时间轴：谁/何时/做了什么（下单/支付/发货/退款/核销）   │
└─────────────────────────────────────────────────┘
```

**交互逻辑**：

1. **权限遮罩**：普通客服调用接口时，后端不返回`commissionDetail`字段
2. **动态渲染**：根据`orderType`决定是否显示卡片4
3. **操作确认**：点击[强制核销]弹窗二次确认，防误操作

**调用接口**：

typescript

```typescript
// 主接口：聚合查询
GET /store/order/detail/:orderId
Response: {
  basic: {...},        // 订单基础信息
  customer: {...},     // 客户+归因
  items: [...],        // 商品列表
  commission: {...},   // 佣金分配(需权限)
  fulfillment: {...},  // 履约信息(服务类)
  logs: [...]          // 操作日志
}

// 辅助接口：改派技师
POST /store/order/reassign
Body: { orderId, newWorkerId }
```

---

#### 页面B：佣金明细列表 (`/finance/commission`)

**页面目标**：查看每一笔分出去的钱的流水

**布局结构**：

```
┌─────────────────────────────────────────────────┐
│ 筛选区                                           │
│ [订单号____] [用户手机____] [状态:全部▼] [时间范围] │
│ [搜索] [重置] [导出Excel]                         │
├─────────────────────────────────────────────────┤
│ 统计卡片                                         │
│ ┌─────────┬─────────┬─────────┐                │
│ │今日佣金   │本月累计   │待结算     │                │
│ │ ¥120.00 │ ¥3,580 │ ¥1,200  │                │
│ └─────────┴─────────┴─────────┘                │
├─────────────────────────────────────────────────┤
│ 数据表格                                         │
│ ┌────┬──────┬──────┬──────┬──────┬──────┐   │
│ │序号│用户    │关联订单│佣金类型│金额   │状态   │   │
│ ├────┼──────┼──────┼──────┼──────┼──────┤   │
│ │1   │张三    │ORD123 │一级分销│+6.00 │冻结中 │   │
│ │2   │李四    │ORD123 │二级分销│+4.00 │冻结中 │   │
│ │3   │王五    │ORD122 │一级分销│+8.00 │已结算 │   │
│ └────┴──────┴──────┴──────┴──────┴──────┘   │
│ [分页器 1/20]                                   │
└─────────────────────────────────────────────────┘
```

**交互逻辑**：

1. **点击订单号**：跳转到订单详情页
2. **点击用户**：跳转到用户管理页查看该用户详情
3. **导出限制**：单次最多导出5000条，超过需分批

**调用接口**：

typescript

```typescript
GET /store/finance/commission/list
Query: {
  page: 1,
  size: 20,
  orderNo?: string,
  phone?: string,
  status?: 'FROZEN' | 'SETTLED' | 'CANCELLED',
  startDate?: Date,
  endDate?: Date
}

GET /store/finance/commission/stats  // 统计数据
```

---

#### 页面C：提现审核页 (`/finance/withdrawal`)

**页面目标**：处理分销员的提现申请

**布局结构**：

```
┌─────────────────────────────────────────────────┐
│ Tab切换： [待审核(5)] [已打款] [已驳回]              │
├─────────────────────────────────────────────────┤
│ 待审核列表                                        │
│ ┌───────────────────────────────────────────┐  │
│ │ 申请人：张三  手机:138****8888               │  │
│ │ 提现金额：¥100.00  提现方式：微信零钱          │  │
│ │ 当前余额：¥500.00  申请时间：2026-01-20 14:00│  │
│ │ 收益来源：共5笔订单 [查看明细▼]               │  │
│ │   - ORD001: ¥20.00 (一级分销)               │  │
│ │   - ORD002: ¥30.00 (二级分销)               │  │
│ │ 操作：[✅通过] [❌驳回] [💬备注]              │  │
│ └───────────────────────────────────────────┘  │
│ ┌───────────────────────────────────────────┐  │
│ │ 申请人：李四  ...                            │  │
│ └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**交互逻辑**：

1. **通过审核**：
   - 弹窗确认："确认打款¥100.00至张三(138****8888)？"
   - 点击确认 → 调用接口 → 显示Loading → 成功提示"打款成功，流水号：xxx"
2. **驳回审核**：
   - 弹窗输入驳回理由（必填）
   - 确认后钱退回用户余额
3. **查看明细**：
   - 展开折叠面板，显示该用户所有佣金来源订单

**调用接口**：

typescript

```typescript
GET /store/finance/withdrawal/list
Query: { status: 'PENDING' | 'APPROVED' | 'REJECTED' }

POST /store/finance/withdrawal/audit
Body: {
  withdrawalId: string,
  action: 'APPROVE' | 'REJECT',
  remark?: string
}
Response: {
  success: boolean,
  paymentNo?: string,  // 微信流水号
  message: string
}
```

---

#### 页面D：资金看板 (`/finance/dashboard`)

**页面目标**：老板/财务查看经营数据

**布局结构**：

```
┌─────────────────────────────────────────────────┐
│ 核心指标卡片(4列)                                  │
│ ┌──────┬──────┬──────┬──────┐                  │
│ │今日GMV │实际营收│佣金支出│待结算  │                  │
│ │¥5,000 │¥4,200│¥600  │¥1,200│                  │
│ └──────┴──────┴──────┴──────┘                  │
├─────────────────────────────────────────────────┤
│ 趋势图表                                         │
│ [折线图] 近30天营收与佣金趋势                       │
├─────────────────────────────────────────────────┤
│ 资金池状态                                       │
│ - 冻结资金：¥1,200 (7天后解冻¥800)                │
│ - 可用余额：¥3,500                               │
│ - 已提现：¥2,800                                 │
├─────────────────────────────────────────────────┤
│ 风险预警                                         │
│ ⚠️ 用户"王五"余额为负(-¥50)，请关注后续订单        │
└─────────────────────────────────────────────────┘
```

**调用接口**：

typescript

```typescript
GET /store/finance/dashboard
Response: {
  metrics: { todayGMV, revenue, commission, pending },
  trends: [...],      // 图表数据
  fundPool: {...},    // 资金池
  alerts: [...]       // 风险预警
}
```

---

## 三、后端设计方案

### 3.1 数据库设计

#### 核心表结构

prisma

```prisma
// ============ 财务中心 ============

// 1. 钱包表
model FinWallet {
  id            String   @id @default(uuid())
  memberId      String   @unique @map("member_id")
  tenantId      String   @map("tenant_id") // 租户隔离

  // 三资产
  balance       Decimal  @default(0) @db.Decimal(12,2)  // 可用
  frozen        Decimal  @default(0) @db.Decimal(12,2)  // 冻结
  totalIncome   Decimal  @default(0) @db.Decimal(12,2)  // 累计

  // 安全
  payPassword   String?  @map("pay_password")
  version       Int      @default(0)  // 乐观锁

  updatedAt     DateTime @updatedAt

  @@index([tenantId, memberId])
  @@map("fin_wallet")
}

// 2. 流水表（不可篡改的账本）
model FinTransaction {
  id            BigInt   @id @default(autoincrement())
  walletId      String   @map("wallet_id")
  tenantId      String   @map("tenant_id")

  type          TransType
  amount        Decimal  @db.Decimal(12,2)  // 可正可负
  balanceAfter  Decimal  @db.Decimal(12,2)  // 快照

  relatedId     String   @map("related_id") // 关联业务ID
  remark        String?  @db.VarChar(200)

  createTime    DateTime @default(now()) @map("create_time")

  @@index([walletId, createTime])
  @@index([tenantId, type])
  @@map("fin_transaction")
}

// 3. 佣金记录表（在途资金）
model FinCommission {
  id            BigInt   @id @default(autoincrement())
  orderId       String   @map("order_id")
  tenantId      String   @map("tenant_id")

  beneficiaryId String   @map("beneficiary_id") // 受益人
  level         Int      // 1=一级, 2=二级
  amount        Decimal  @db.Decimal(10,2)

  status        CommissionStatus @default(FROZEN)

  createTime    DateTime @default(now()) @map("create_time")
  planSettleTime DateTime @map("plan_settle_time")  // 计划解冻
  settleTime    DateTime? @map("settle_time")       // 实际解冻

  @@index([orderId])
  @@index([tenantId, status, planSettleTime]) // 定时任务索引
  @@unique([orderId, beneficiaryId, level])    // 防重复
  @@map("fin_commission")
}

// 4. 提现记录表
model FinWithdrawal {
  id            String   @id @default(uuid())
  tenantId      String   @map("tenant_id")
  memberId      String   @map("member_id")

  amount        Decimal  @db.Decimal(10,2)
  method        String   // WECHAT_WALLET, BANK_CARD

  // 账号快照
  accountNo     String?
  realName      String?

  status        WithdrawalStatus @default(PENDING)

  auditTime     DateTime?
  auditBy       String?  @map("audit_by")
  auditRemark   String?

  // 打款凭证
  paymentNo     String?  @map("payment_no") // 微信流水号
  failReason    String?

  createTime    DateTime @default(now())

  @@index([tenantId, status])
  @@map("fin_withdrawal")
}

// 枚举
enum TransType {
  COMMISSION_IN    // 佣金入账
  WITHDRAW_OUT     // 提现扣款
  REFUND_DEDUCT    // 退款倒扣
  CONSUME_PAY      // 余额支付
  RECHARGE_IN      // 充值(预留)
}

enum CommissionStatus {
  FROZEN      // 冻结中
  SETTLED     // 已结算
  CANCELLED   // 已取消
}

enum WithdrawalStatus {
  PENDING     // 待审核
  APPROVED    // 已通过
  REJECTED    // 已驳回
  FAILED      // 打款失败
}
```

---

### 3.2 核心接口设计

#### 接口1：订单详情聚合查询

**接口定义**：

typescript

```typescript
GET /store/order/detail/:orderId
```

**方案A：串行查询（不推荐）**

typescript

```typescript
async getOrderDetail(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  const items = await prisma.orderItem.findMany({ where: { orderId } });
  const commissions = await prisma.finCommission.findMany({ where: { orderId } });
  const worker = await prisma.workerOrder.findFirst({ where: { orderId } });

  return { order, items, commissions, worker };
}
```

**问题**：

- 4次数据库往返，RT高（假设每次10ms，总计40ms+）
- 并发量大时数据库连接池容易打满

**方案B：并行查询（推荐）**

typescript

```typescript
async getOrderDetail(orderId: string, currentUser: User) {
  const tenantId = currentUser.tenantId;

  // 1. 并行查询
  const [order, items, commissions, worker, logs] = await Promise.all([
    prisma.order.findFirst({ 
      where: { id: orderId, tenantId },  // ⚠️ 租户隔离
      include: { member: { select: { nickname: true, avatar: true, phone: true } } }
    }),
    prisma.orderItem.findMany({ where: { orderId } }),

    // ⚠️ 权限控制：普通客服看不到佣金明细
    currentUser.hasPermission('order:finance:view') 
      ? prisma.finCommission.findMany({ 
          where: { orderId, tenantId },
          include: { beneficiary: { select: { nickname: true } } }
        })
      : null,

    prisma.workerOrder.findFirst({ 
      where: { orderId },
      include: { worker: true }
    }),

    prisma.orderLog.findMany({ 
      where: { orderId },
      orderBy: { createTime: 'desc' },
      take: 20
    })
  ]);

  if (!order) throw new NotFoundException('订单不存在或无权访问');

  return {
    basic: { ...order },
    items,
    commission: commissions,
    fulfillment: worker,
    logs
  };
}
```

**性能优化**：

- RT降低到单次查询时间（~15ms）
- 使用`include`替代多次查询
- 建立复合索引：`@@index([tenantId, id])`

**风险防控**：

1. **横向越权**：必须校验`tenantId`，防止查到其他租户订单
2. **慢查询**：
   - `orderLog`限制`take: 20`，避免查询数万条日志
   - 对`createTime`建索引
3. **数据库崩溃**：
   - 使用连接池（Prisma默认unlimited，建议设置`connection_limit=10`）
   - 添加超时控制：`prisma.$queryRaw`设置`timeout: 5000`

---

#### 接口2：佣金核算（内部服务）

**触发时机**：订单支付成功回调

**方案A：同步计算（不推荐）**

typescript

```typescript
async handlePaymentSuccess(order: Order) {
  // ... 其他业务逻辑

  await this.calculateCommission(order);  // ❌阻塞主流程

  // ... 发送通知
}
```

**问题**：

- 如果佣金计算失败（如查询会员关系时数据库崩溃），整个支付流程失败
- 用户等待时间变长

**方案B：异步任务（推荐）**

typescript

```typescript
// 1. 支付成功时立即返回
async handlePaymentSuccess(order: Order) {
  // 更新订单状态
  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'PAID' }
  });

  // 投递异步任务
  await this.taskQueue.add('CALC_COMMISSION', { orderId: order.id });

  return { success: true };
}

// 2. 消费者处理任务
@Processor('CALC_COMMISSION')
async calculateCommission(job: Job) {
  const { orderId } = job.data;
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  try {
    // 查询商品佣金配置
    const sku = await prisma.productSku.findUnique({
      where: { id: order.skuId },
      include: { commissionConfig: true }
    });

    const baseAmount = sku.commissionConfig.amount; // 假设10元

    // 查询购买人的上级关系链
    const buyer = await prisma.member.findUnique({
      where: { id: order.memberId },
      include: {
        referrer: true,          // L1 直推
        referrer: { referrer: true }  // L2 间推
      }
    });

    const records = [];

    // L1 佣金
    if (buyer.referrer) {
      records.push({
        orderId: order.id,
        tenantId: order.tenantId,
        beneficiaryId: buyer.referrer.id,
        level: 1,
        amount: baseAmount * 0.6,  // 60%
        planSettleTime: this.getSettleTime(order)
      });
    }

    // L2 佣金
    if (buyer.referrer?.referrer) {
      records.push({
        orderId: order.id,
        tenantId: order.tenantId,
        beneficiaryId: buyer.referrer.referrer.id,
        level: 2,
        amount: baseAmount * 0.4,  // 40%
        planSettleTime: this.getSettleTime(order)
      });
    }

    // 批量插入（使用upsert防止重复）
    await prisma.$transaction(
      records.map(r => 
        prisma.finCommission.upsert({
          where: { 
            orderId_beneficiaryId_level: {
              orderId: r.orderId,
              beneficiaryId: r.beneficiaryId,
              level: r.level
            }
          },
          create: r,
          update: {}  // 已存在则跳过
        })
      )
    );

  } catch (error) {
    // 失败重试（BullMQ支持自动重试）
    throw error;
  }
}

// 辅助函数：计算结算时间
getSettleTime(order: Order): Date {
  const now = new Date();

  if (order.type === 'REAL') {
    // 实物：发货期7天 + 收货确认后7天
    return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  } else {
    // 服务：核销后24小时
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}
```

**风险防控**：

1. **重复计算**：使用`upsert` + unique索引防止
2. **任务丢失**：使用Redis持久化队列（BullMQ/Kue）
3. **死循环推荐**：

typescript

```typescript
   // 在绑定推荐人时检查
   async bindReferrer(memberId: string, referrerId: string) {
     // 检查是否形成环路
     let current = await prisma.member.findUnique({ where: { id: referrerId } });
     let depth = 0;

     while (current?.referrerId && depth < 10) {
       if (current.referrerId === memberId) {
         throw new Error('不能绑定自己的下级为上级');
       }
       current = await prisma.member.findUnique({ where: { id: current.referrerId } });
       depth++;
     }

     // 通过检查，允许绑定
     await prisma.member.update({
       where: { id: memberId },
       data: { referrerId }
     });
   }
```

---

#### 接口3：自动结算定时任务

**方案A：扫全表（不推荐）**

typescript

```typescript
@Cron('0 */10 * * * *')  // 每10分钟
async settleJob() {
  const records = await prisma.finCommission.findMany({
    where: { status: 'FROZEN' }  // ❌ 全表扫描
  });

  for (const record of records) {
    if (record.planSettleTime <= new Date()) {
      await this.settle(record);
    }
  }
}
```

**问题**：

- 数据量大时（10万+记录）查询超时
- 浪费资源处理未到期的记录

**方案B：索引优化 + 分页处理（推荐）**

typescript

```typescript
@Cron('0 */5 * * * *')  // 每5分钟
async settleJob() {
  const batchSize = 100;
  let cursor = null;

  while (true) {
    // 只查询到期的记录
    const records = await prisma.finCommission.findMany({
      where: {
        status: 'FROZEN',
        planSettleTime: { lte: new Date() }  // ⚠️ 关键过滤
      },
      orderBy: { id: 'asc' },
      take: batchSize,
      ...(cursor && { cursor: { id: cursor }, skip: 1 })
    });

    if (records.length === 0) break;

    // 批量处理
    await this.settleBatch(records);

    cursor = records[records.length - 1].id;
  }
}

async settleBatch(records: FinCommission[]) {
  for (const record of records) {
    try {
      await prisma.$transaction(async (tx) => {
        // 1. 更新佣金状态
        await tx.finCommission.update({
          where: { id: record.id },
          data: { 
            status: 'SETTLED',
            settleTime: new Date()
          }
        });

        // 2. 增加钱包余额（使用increment避免并发问题）
        const wallet = await tx.finWallet.update({
          where: { memberId: record.beneficiaryId },
          data: {
            balance: { increment: record.amount },
            totalIncome: { increment: record.amount }
          }
        });

        // 3. 写入流
```

Continue

09:18

水 await tx.finTransaction.create({ data: { walletId: wallet.id, tenantId: record.tenantId, type: 'COMMISSION_IN', amount: record.amount, balanceAfter: wallet.balance, relatedId: record.orderId, remark: `订单${record.orderId}佣金结算` } }); });

```
} catch (error) {
  // 单条失败不影响其他记录
  console.error(`结算失败 ID:${record.id}`, error);
  // 写入错误日志表
  await prisma.systemLog.create({
    data: {
      type: 'SETTLE_ERROR',
      content: JSON.stringify({ recordId: record.id, error: error.message })
    }
  });
}
```

}
}

```
**性能优化**：

1. **索引**：`@@index([status, planSettleTime])`
2. **分批处理**：避免长事务锁表
3. **游标分页**：比offset高效

**风险防控**：

1. **任务重复执行**：使用分布式锁
```typescript
   const lock = await redis.set('lock:settle', '1', 'EX', 300, 'NX');
   if (!lock) return; // 其他实例正在执行
```

2. **事务超时**：单批次不超过100条

3. **数据不一致**：每日凌晨跑对账脚本
   
   ```typescript
   @Cron('0 0 2 * * *')  // 凌晨2点
   async reconciliation() {
     // 对账：Order.payAmount * rate 应该等于 Sum(FinCommission.amount)
     const orders = await prisma.order.findMany({
       where: { 
         status: 'COMPLETED',
         createTime: { gte: yesterday }
       }
     });
   
     for (const order of orders) {
       const expected = order.commissionBase;
       const actual = await prisma.finCommission.aggregate({
         where: { orderId: order.id },
         _sum: { amount: true }
       });
   
       if (expected !== actual._sum.amount) {
         // 发送告警
         await this.alertService.send({
           type: 'RECONCILE_FAIL',
           orderId: order.id,
           expected,
           actual: actual._sum.amount
         });
       }
     }
   }
   ```

---

#### 接口4：提现审核

**接口定义**：

```typescript
POST /store/finance/withdrawal/audit
Body: {
  withdrawalId: string,
  action: 'APPROVE' | 'REJECT',
  remark?: string
}
```

**实现方案**：

```typescript
async auditWithdrawal(dto: AuditDto, auditor: User) {
  const withdrawal = await prisma.finWithdrawal.findFirst({
    where: {
      id: dto.withdrawalId,
      tenantId: auditor.tenantId,  // ⚠️ 租户隔离
      status: 'PENDING'
    },
    include: { member: true }
  });

  if (!withdrawal) {
    throw new NotFoundException('提现申请不存在或已处理');
  }

  if (dto.action === 'REJECT') {
    // 驳回：钱退回余额
    await prisma.$transaction([
      prisma.finWithdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: 'REJECTED',
          auditTime: new Date(),
          auditBy: auditor.id,
          auditRemark: dto.remark
        }
      }),
      prisma.finWallet.update({
        where: { memberId: withdrawal.memberId },
        data: {
          balance: { increment: withdrawal.amount },
          frozen: { decrement: withdrawal.amount }
        }
      })
    ]);

    return { success: true, message: '已驳回' };
  }

  // 通过：调用微信打款
  try {
    const result = await this.wechatPayService.transferToWallet({
      openid: withdrawal.member.openid,
      amount: withdrawal.amount,
      desc: '分销佣金提现',
      outBizNo: withdrawal.id  // ⚠️ 幂等性保证
    });

    await prisma.$transaction([
      prisma.finWithdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: 'APPROVED',
          auditTime: new Date(),
          auditBy: auditor.id,
          paymentNo: result.payment_no
        }
      }),
      prisma.finWallet.update({
        where: { memberId: withdrawal.memberId },
        data: {
          frozen: { decrement: withdrawal.amount }
        }
      }),
      prisma.finTransaction.create({
        data: {
          walletId: withdrawal.member.wallet.id,
          tenantId: withdrawal.tenantId,
          type: 'WITHDRAW_OUT',
          amount: -withdrawal.amount,
          balanceAfter: withdrawal.member.wallet.balance,
          relatedId: withdrawal.id,
          remark: '提现支出'
        }
      })
    ]);

    return { 
      success: true, 
      message: '打款成功',
      paymentNo: result.payment_no
    };

  } catch (error) {
    // 微信打款失败
    await prisma.finWithdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: 'FAILED',
        failReason: error.message
      }
    });

    throw new Error(`打款失败: ${error.message}`);
  }
}
```

**风险防控**：

1. **并发审核**：
   
   ```typescript
   // 使用数据库行锁
   const withdrawal = await prisma.finWithdrawal.findFirst({
     where: { id, status: 'PENDING' },
     lock: 'FOR UPDATE'  // Prisma 5.0+
   });
   ```

2. **余额不足**：
   
   ```typescript
   // 在申请提现时就扣减冻结余额
   await prisma.$transaction([
     prisma.finWallet.update({
       where: { 
         memberId,
         balance: { gte: amount }  // ⚠️ 条件更新
       },
       data: {
         balance: { decrement: amount },
         frozen: { increment: amount }
       }
     }),
     prisma.finWithdrawal.create({...})
   ]);
   ```

3. **重复打款**：
   
   - 微信接口支持`out_biz_no`幂等
   - 本地也需要检查`status`状态

4. **税务风险**：
   
   ```typescript
   // 大额提现接入灵活用工平台
   if (withdrawal.amount > 5000) {
     // 调用第三方API（如云账户）
     const result = await this.flexWorkService.transfer({
       userId: withdrawal.member.idCard,
       amount: withdrawal.amount
     });
     // 第三方会代扣个税
   } else {
     // 小额直接微信打款
   }
   ```

---

#### 接口5：退款佣金回滚

**触发时机**：用户申请退款成功

**方案设计**：

```typescript
async handleRefund(order: Order, refundAmount: Decimal) {
  // 1. 查询该订单的佣金记录
  const commissions = await prisma.finCommission.findMany({
    where: { orderId: order.id }
  });

  for (const comm of commissions) {
    if (comm.status === 'FROZEN') {
      // 场景A：还在冻结期，直接取消
      await prisma.finCommission.update({
        where: { id: comm.id },
        data: { status: 'CANCELLED' }
      });

    } else if (comm.status === 'SETTLED') {
      // 场景B：已经结算，需要倒扣
      await prisma.$transaction(async (tx) => {
        // 扣减余额（可能为负）
        const wallet = await tx.finWallet.update({
          where: { memberId: comm.beneficiaryId },
          data: {
            balance: { decrement: comm.amount }
          }
        });

        // 写入负向流水
        await tx.finTransaction.create({
          data: {
            walletId: wallet.id,
            tenantId: order.tenantId,
            type: 'REFUND_DEDUCT',
            amount: -comm.amount,
            balanceAfter: wallet.balance,
            relatedId: order.id,
            remark: `订单${order.orderNo}退款，佣金回收`
          }
        });

        // 标记佣金为已取消
        await tx.finCommission.update({
          where: { id: comm.id },
          data: { status: 'CANCELLED' }
        });
      });

      // 如果余额变负，发送通知
      const currentBalance = await prisma.finWallet.findUnique({
        where: { memberId: comm.beneficiaryId },
        select: { balance: true }
      });

      if (currentBalance.balance < 0) {
        await this.notificationService.send({
          userId: comm.beneficiaryId,
          type: 'BALANCE_NEGATIVE',
          content: `您的余额因订单退款变为${currentBalance.balance}元，下次获得佣金将优先抵扣`
        });
      }
    }
  }
}
```

**边界处理**：

| 场景         | 处理方式     | 用户体验         |
|:---------- |:-------- |:------------ |
| 冻结期内退款     | 直接取消佣金记录 | 用户看不到预估收益了   |
| 结算后退款，余额充足 | 扣减余额     | 余额减少，收到通知    |
| 结算后退款，余额不足 | 余额变负数    | 下次赚佣金先填坑     |
| 已提现后退款     | 余额变负数    | 需人工催收或从后续订单扣 |

---

### 3.3 防攻击与风控方案

#### 1. 刷单套利

**攻击手法**：

- 分销员用小号买自己推荐的高佣金商品
- 佣金 > 商品成本，薅羊毛

**检测规则**：

```typescript
// 风控服务
async detectFraud(order: Order) {
  const risks = [];

  // 规则1：同设备下单
  const sameDevice = await prisma.order.count({
    where: {
      deviceId: order.deviceId,
      createTime: { gte: subDays(new Date(), 7) }
    }
  });
  if (sameDevice > 5) risks.push('同设备频繁下单');

  // 规则2：同收货地址
  const sameAddress = await prisma.order.count({
    where: {
      shippingAddress: order.shippingAddress,
      createTime: { gte: subDays(new Date(), 30) }
    }
  });
  if (sameAddress > 10) risks.push('同地址异常');

  // 规则3：自购返利（如果配置关闭）
  if (!order.tenant.allowSelfRebate && order.memberId === order.referrerId) {
    risks.push('自购不返佣');
    // 不计算佣金
    return { allow: false, reason: '自购不返佣' };
  }

  // 规则4：关联账号
  const relation = await this.detectRelatedAccounts(order.memberId, order.buyerId);
  if (relation.isRelated) risks.push('关联账号');

  if (risks.length > 0) {
    // 标记订单，人工审核
    await prisma.order.update({
      where: { id: order.id },
      data: { 
        riskLevel: 'HIGH',
        riskReasons: risks.join(',')
      }
    });

    return { allow: false, reason: risks.join(';') };
  }

  return { allow: true };
}

// 关联账号检测
async detectRelatedAccounts(userA: string, userB: string) {
  // 检查是否共享：IP、设备、支付账号
  const [ipMatch, deviceMatch, payMatch] = await Promise.all([
    prisma.memberLoginLog.findFirst({
      where: {
        memberId: userA,
        ip: { in: await this.getUserIps(userB) }
      }
    }),
    prisma.memberDevice.findFirst({
      where: {
        memberId: userA,
        deviceId: { in: await this.getUserDevices(userB) }
      }
    }),
    prisma.memberPayAccount.findFirst({
      where: {
        memberId: userA,
        accountNo: { in: await this.getPayAccounts(userB) }
      }
    })
  ]);

  return {
    isRelated: !!(ipMatch || deviceMatch || payMatch),
    reason: [ipMatch && 'IP', deviceMatch && '设备', payMatch && '支付账号'].filter(Boolean).join(',')
  };
}
```

---

#### 2. SQL注入防御

**错误示例**：

```typescript
// ❌ 危险！拼接SQL
async getOrders(keyword: string) {
  const sql = `SELECT * FROM orders WHERE order_no LIKE '%${keyword}%'`;
  return prisma.$queryRawUnsafe(sql);
}
```

**正确示例**：

```typescript
// ✅ 使用参数化查询
async getOrders(keyword: string) {
  return prisma.order.findMany({
    where: {
      orderNo: { contains: keyword }
    }
  });
}

// 或使用Prisma的$queryRaw（自动转义）
return prisma.$queryRaw`
  SELECT * FROM orders 
  WHERE order_no LIKE ${'%' + keyword + '%'}
`;
```

---

#### 3. 接口限流

**实现方案**：

```typescript
// 使用Redis + 滑动窗口
import { Throttle } from '@nestjs/throttler';

@Controller('finance')
export class FinanceController {

  @Post('withdrawal/apply')
  @Throttle(3, 60)  // 1分钟最多3次
  async applyWithdraw(@Body() dto: WithdrawDto, @User() user) {
    // ...
  }

  // 自定义限流器（按用户维度）
  @Post('withdrawal/audit')
  async auditWithdraw(@Body() dto, @User() user) {
    const key = `rate:audit:${user.id}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, 60);  // 1分钟过期
    }

    if (count > 10) {
      throw new TooManyRequestsException('操作过于频繁');
    }

    // 正常业务逻辑
  }
}
```

---

#### 4. 数据库查询超时

**配置方案**：

```typescript
// prisma/schema.prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")

  // 连接池配置
  connection_limit = 20
  pool_timeout = 10  // 获取连接超时10秒
}

// 代码中设置查询超时
const orders = await prisma.$queryRaw`
  SELECT * FROM orders 
  WHERE create_time > ${yesterday}
`.timeout(5000);  // 5秒超时

// 或使用事务超时
await prisma.$transaction(
  async (tx) => {
    // ...业务逻辑
  },
  {
    maxWait: 5000,    // 等待获取事务的最大时间
    timeout: 10000    // 事务执行的最大时间
  }
);
```

---

#### 5. 敏感数据脱敏

**实现方案**：

```typescript
// DTO层自动脱敏
class MemberResponseDto {
  @Expose()
  id: string;

  @Expose()
  nickname: string;

  @Expose()
  @Transform(({ value }) => value?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'))
  phone: string;  // 138****8888

  @Exclude()
  password: string;  // 永不返回

  @Exclude()
  payPassword: string;
}

// 日志脱敏
const logger = new Logger();
logger.log({
  action: 'WITHDRAW',
  userId: user.id,
  amount: withdrawal.amount,
  phone: maskPhone(user.phone),  // 脱敏函数
  bankCard: maskBankCard(withdrawal.accountNo)
});

function maskPhone(phone: string) {
  return phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

function maskBankCard(card: string) {
  return card?.replace(/^(\d{4})\d+(\d{4})$/, '$1 **** **** $2');
}
```

---

## 四、风险与边界情况汇总

### 4.1 业务风险矩阵

| 风险类型      | 场景描述      | 影响程度  | 防控方案           | 修复方案        |
|:--------- |:--------- |:----- |:-------------- |:----------- |
| **资金损失**  | 退款后佣金已提现  | ⭐⭐⭐⭐⭐ | T+7冻结期         | 负余额追偿       |
| **并发攻击**  | 重复提现      | ⭐⭐⭐⭐⭐ | 数据库行锁 + Redis锁 | 对账脚本发现后人工退款 |
| **刷单套利**  | 小号自购      | ⭐⭐⭐⭐  | 风控规则引擎         | 封号 + 追回佣金   |
| **税务合规**  | 大额打款未报税   | ⭐⭐⭐⭐  | 接入灵活用工平台       | 补缴税款 + 罚金   |
| **数据不一致** | 佣金算错      | ⭐⭐⭐   | 每日对账脚本         | 补发/扣回差额     |
| **服务未履约** | 技师跳单      | ⭐⭐⭐   | 核销码验证 + GPS打卡  | 冻结佣金 + 罚款   |
| **循环推荐**  | A推B，B推A   | ⭐⭐    | 绑定时检测环路        | 清理环路关系      |
| **慢查询**   | 订单详情3秒未返回 | ⭐⭐    | 索引优化 + 缓存      | 数据库扩容       |

---

### 4.2 边界情况处理表

| 边界情况      | 当前状态           | 预期行为         | 实现逻辑                  |
|:--------- |:-------------- |:------------ |:--------------------- |
| 用户余额为负    | balance = -50  | 允许存在，下次赚钱先还债 | 不限制负数，展示提示            |
| 佣金小于0.01元 | amount = 0.006 | 不发放          | 计算时向下取整到分             |
| 订单改价      | 100元改成15元      | 拦截（佣金>售价）    | 改价接口校验                |
| 部分退款      | 退50元，佣金10元     | 按比例扣减佣金      | `扣减金额 = 佣金 * (退款/实付)` |
| 技师未接单     | 派单后24小时无响应     | 自动改派         | 定时任务扫描                |
| 提现失败      | 微信返回"商户余额不足"   | 钱退回用户        | catch异常，回滚事务          |
| 租户欠费      | 平台账户余额不足       | 暂停提现功能       | 每日检查，发送告警             |
| 跨租户查询     | 天心店查雨花店订单      | 返回404        | WHERE条件强制加tenantId    |

---

### 4.3 系统崩溃恢复方案

#### 场景1：数据库宕机

**检测**：

```typescript
// 健康检查端点
@Get('health')
async health() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  } catch (error) {
    throw new ServiceUnavailableException('数据库不可用');
  }
}
```

**恢复**：

1. 主从切换（自动故障转移）
2. 消息队列保证任务不丢失
3. 重启后重新消费队列任务

---

#### 场景2：Redis宕机

**影响**：

- 限流失效（可能被攻击）
- 分布式锁失效（可能重复执行任务）

**降级方案**：

```typescript
// Redis降级到本地锁
let redisAvailable = true;

async function acquireLock(key: string) {
  if (redisAvailable) {
    try {
      return await redis.set(key, '1', 'EX', 300, 'NX');
    } catch (error) {
      redisAvailable = false;
      console.error('Redis不可用，降级到本地锁');
    }
  }

  // 降级：使用本地Map（仅单机有效）
  return localLock.tryLock(key);
}
```

---

#### 场景3：微信支付接口超时

**处理逻辑**：

```typescript
async transferToWallet(params) {
  try {
    const result = await axios.post(wechatUrl, params, {
      timeout: 10000  // 10秒超时
    });
    return result.data;

  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      // 超时情况：查询订单状态
      const status = await this.queryTransferStatus(params.outBizNo);

      if (status === 'SUCCESS') {
        return { payment_no: status.paymentNo };
      } else if (status === 'PROCESSING') {
        // 处理中，等待异步回调
        throw new Error('打款处理中，请稍后查询');
      } else {
        throw new Error('打款失败');
      }
    }
    throw error;
  }
}
```

---

## 五、开发排期建议

| 阶段      | 任务              | 工期  | 产出           |
|:------- |:--------------- |:--- |:------------ |
| **第1周** | 数据库表设计 + 基础CRUD | 5天  | 钱包/流水/佣金表完成  |
| **第2周** | 订单详情页 + 佣金核算逻辑  | 5天  | 支付成功后能看到预估佣金 |
| **第3周** | 定时结算任务 + 提现申请   | 5天  | 佣金能自动解冻      |
| **第4周** | 提现审核 + 微信打款对接   | 5天  | 完整提现流程       |
| **第5周** | 退款回滚 + 风控规则     | 5天  | 防刷单、防重复提现    |
| **第6周** | 前端页面 + 联调测试     | 5天  | 完整功能可用       |
| **第7周** | 压力测试 + 优化       | 3天  | 性能达标         |
| **第8周** | 灰度发布 + 监控告警     | 2天  | 上线           |

---

## 六、监控与告警

### 6.1 关键指标

```typescript
// Prometheus指标
const metrics = {
  // 业务指标
  commission_total: new Counter({ name: 'commission_total', help: '佣金总额' }),
  withdrawal_total: new Counter({ name: 'withdrawal_total', help: '提现总额' }),

  // 性能指标
  order_detail_duration: new Histogram({ name: 'order_detail_rt', help: '订单详情RT' }),
  settle_job_duration: new Histogram({ name: 'settle_job_rt', help: '结算任务RT' }),

  // 异常指标
  withdrawal_fail_count: new Counter({ name: 'withdrawal_fail', help: '提现失败次数' }),
  negative_balance_count: new Gauge({ name: 'negative_balance', help: '负余额用户数' })
};
```

### 6.2 告警规则

| 告警项         | 阈值   | 级别  | 通知方式    |
|:----------- |:---- |:--- |:------- |
| 提现失败率 > 5%  | 1小时内 | P1  | 电话 + 短信 |
| 订单详情RT > 3s | 5分钟内 | P2  | 企业微信    |
| 负余额用户数 > 10 | 实时   | P3  | 邮件      |
| 对账不平        | 每日   | P2  | 企业微信    |
| Redis宕机     | 实时   | P1  | 电话      |

---

## 七、总结

本PRD覆盖了财务结算系统的完整设计：

1. **前端**：5个核心页面，清晰的资金流向展示
2. **后端**：7个关键接口，3层防护（冻结期/行锁/对账）
3. **风控**：5种攻击防御，8种边界处理
4. **运维**：监控告警 + 灾备恢复

**核心原则**：

- 账目透明：每一分钱都有记录
- 资金安全：冻结期 + 事务保证
- 性能优先：异步任务 + 索引优化
- 合规第一：税务申报 + 数据脱敏

建议分阶段开发，先上线核心流程（核算→结算→提现），再逐步完善风控和监控。

```

```
