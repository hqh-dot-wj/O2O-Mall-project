# 任务幂等性指南

> 适用于 Bull 队列任务和关键业务操作

## 1. 什么是幂等性

同一操作执行多次，结果与执行一次相同。在分布式系统中，任务可能因网络抖动、Worker 重启等原因重试，必须保证重试不会产生副作用。

## 2. 需要幂等性的场景

| 场景     | 风险     | 示例                |
| -------- | -------- | ------------------- |
| 支付回调 | 重复入账 | 微信/支付宝回调重试 |
| 库存扣减 | 超卖     | 下单扣库存          |
| 积分发放 | 重复发放 | 签到奖励            |
| 消息推送 | 重复推送 | 订单状态通知        |
| 订单创建 | 重复订单 | 用户重复点击        |

## 3. 实现方案

### 3.1 数据库唯一约束（推荐）

```typescript
// 支付流水表添加唯一约束
// prisma schema
model PaymentRecord {
  id            Int    @id @default(autoincrement())
  outTradeNo    String @unique  // 外部交易号唯一
  // ...
}

// Service 中使用
async handlePaymentCallback(dto: PaymentCallbackDto) {
  try {
    await this.paymentRepository.create({
      outTradeNo: dto.outTradeNo,
      // ...
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      // 重复回调，忽略
      this.logger.warn(`重复支付回调: ${dto.outTradeNo}`);
      return;
    }
    throw error;
  }
}
```

### 3.2 状态机检查

```typescript
async completeOrder(orderId: string) {
  const order = await this.orderRepository.findById(orderId);

  // 状态检查：只有待支付状态才能完成
  if (order.status !== OrderStatus.PENDING_PAYMENT) {
    this.logger.warn(`订单状态不允许完成: ${orderId}, 当前状态: ${order.status}`);
    return; // 幂等返回
  }

  await this.orderRepository.update(orderId, {
    status: OrderStatus.PAID,
  });
}
```

### 3.3 Redis SetNX（短期去重）

```typescript
async processTask(taskId: string, data: TaskData) {
  const lockKey = `task:processing:${taskId}`;
  const token = await this.redis.tryLock(lockKey, 60000); // 1分钟

  if (!token) {
    this.logger.warn(`任务正在处理中: ${taskId}`);
    return; // 幂等返回
  }

  try {
    await this.doProcess(data);
  } finally {
    await this.redis.unlock(lockKey, token);
  }
}
```

### 3.4 幂等键（业务表记录）

```typescript
// 幂等键表
model IdempotencyKey {
  id        Int      @id @default(autoincrement())
  key       String   @unique
  result    Json?
  createdAt DateTime @default(now())
  expiresAt DateTime
}

async executeWithIdempotency<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  // 检查是否已执行
  const existing = await this.idempotencyRepository.findByKey(key);
  if (existing && existing.expiresAt > new Date()) {
    return existing.result as T;
  }

  // 执行业务逻辑
  const result = await fn();

  // 记录幂等键
  await this.idempotencyRepository.upsert({
    key,
    result,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000),
  });

  return result;
}
```

## 4. Bull 队列任务幂等性

```typescript
@Processor('order')
export class OrderProcessor {
  @Process('complete')
  async handleComplete(job: Job<{ orderId: string }>) {
    const { orderId } = job.data;

    // 方案1：状态检查
    const order = await this.orderService.findById(orderId);
    if (order.status === OrderStatus.COMPLETED) {
      this.logger.log(`订单已完成，跳过: ${orderId}`);
      return; // 幂等返回
    }

    // 方案2：分布式锁
    const token = await this.redis.tryLock(`order:complete:${orderId}`, 30000);
    if (!token) {
      throw new Error('任务正在处理中'); // 触发重试
    }

    try {
      await this.orderService.complete(orderId);
    } finally {
      await this.redis.unlock(`order:complete:${orderId}`, token);
    }
  }
}
```

## 5. 选型建议

| 方案        | 适用场景         | 优点         | 缺点           |
| ----------- | ---------------- | ------------ | -------------- |
| 唯一约束    | 有明确业务唯一键 | 强一致、简单 | 需要数据库支持 |
| 状态机      | 有状态流转的业务 | 业务语义清晰 | 需要设计状态机 |
| Redis SetNX | 短期去重         | 高性能       | 有过期风险     |
| 幂等键表    | 通用场景         | 灵活、可追溯 | 额外存储开销   |

## 6. 检查清单

- [ ] 支付回调是否幂等？
- [ ] 库存扣减是否幂等？
- [ ] 积分/余额变动是否幂等？
- [ ] 消息推送是否去重？
- [ ] Bull 任务是否考虑重试场景？
