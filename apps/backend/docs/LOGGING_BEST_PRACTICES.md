# 日志记录最佳实践

## 概述

本文档总结优惠券和积分系统的日志记录实践，确保关键操作可追溯、可审计。

## 日志级别使用

### Logger 实例化
```typescript
@Injectable()
export class CouponTemplateService {
  private readonly logger = new Logger(CouponTemplateService.name);
  // 使用类名作为 logger 名称，便于定位
}
```

### 日志级别规范

| 级别 | 使用场景 | 示例 |
|------|---------|------|
| `log` | 正常业务操作 | 创建模板、发放优惠券、使用积分 |
| `warn` | 警告但不影响业务 | 乐观锁冲突重试、库存不足 |
| `error` | 错误需要关注 | 事务失败、外部服务调用失败 |
| `debug` | 调试信息 | 详细的计算过程、中间状态 |

## 已实现的日志记录

### 1. 优惠券模板管理

```typescript
// template.service.ts
async createTemplate(dto: CreateCouponTemplateDto) {
  const template = await this.repo.create(data);
  
  this.logger.log(
    `创建优惠券模板: templateId=${template.id}, ` +
    `type=${dto.type}, name=${dto.templateName}`
  );
  // ✅ 记录关键ID和参数
  
  return Result.ok(template);
}

async updateTemplate(id: string, dto: UpdateCouponTemplateDto) {
  const updated = await this.repo.update(id, data);
  
  this.logger.log(`更新优惠券模板: templateId=${id}`);
  // ✅ 记录操作对象
  
  return Result.ok(updated);
}
```

### 2. 优惠券发放

```typescript
// distribution.service.ts
async claimCoupon(memberId: string, templateId: string) {
  // 获取分布式锁
  const lockKey = `coupon:claim:${templateId}`;
  const acquired = await this.redisLock.acquire(lockKey);
  
  if (!acquired) {
    this.logger.warn(
      `获取优惠券锁失败: memberId=${memberId}, templateId=${templateId}`
    );
    // ✅ 记录并发冲突
  }
  
  const userCoupon = await this.claimCouponInternal(memberId, template);
  
  this.logger.log(
    `用户领取优惠券: memberId=${memberId}, ` +
    `templateId=${templateId}, userCouponId=${userCoupon.id}`
  );
  // ✅ 记录完整的关联关系
  
  return Result.ok(userCoupon);
}
```

### 3. 优惠券使用

```typescript
// usage.service.ts
async useCoupon(userCouponId: string, orderId: string) {
  const updated = await this.userCouponRepo.update(userCouponId, {
    status: UserCouponStatus.USED,
    usedTime: new Date(),
  });
  
  this.logger.log(
    `使用优惠券: userCouponId=${userCouponId}, ` +
    `orderId=${orderId}, discount=${discount}`
  );
  // ✅ 记录业务关键数据
  
  return Result.ok(updated);
}

async refundCoupon(userCouponId: string, orderId: string) {
  const updated = await this.userCouponRepo.update(userCouponId, {
    status: UserCouponStatus.AVAILABLE,
    usedTime: null,
  });
  
  this.logger.log(
    `退还优惠券: userCouponId=${userCouponId}, orderId=${orderId}`
  );
  // ✅ 记录退款操作
  
  return Result.ok(updated);
}
```

### 4. 积分账户操作

```typescript
// account.service.ts
async addPoints(dto: AddPointsDto) {
  const transaction = await this.transactionRepo.create(data);
  
  this.logger.log(
    `增加积分: memberId=${dto.memberId}, ` +
    `amount=${dto.amount}, type=${dto.type}, ` +
    `transactionId=${transaction.id}`
  );
  // ✅ 记录积分变动详情
  
  return Result.ok(transaction);
}

async deductPoints(dto: DeductPointsDto) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // 使用乐观锁更新
      const updated = await this.accountRepo.updateWithOptimisticLock(
        account.id,
        account.version,
        data
      );
      
      if (!updated) {
        this.logger.warn(
          `积分扣减乐观锁冲突，重试 ${attempt + 1}/${maxRetries}: ` +
          `memberId=${dto.memberId}, amount=${dto.amount}`
        );
        // ✅ 记录并发冲突和重试
        continue;
      }
      
      this.logger.log(
        `扣减积分: memberId=${dto.memberId}, ` +
        `amount=${dto.amount}, type=${dto.type}`
      );
      // ✅ 记录成功操作
      
      return Result.ok(transaction);
    } catch (error) {
      this.logger.error(
        `积分扣减失败: memberId=${dto.memberId}, ` +
        `error=${error.message}`,
        error.stack
      );
      // ✅ 记录错误详情和堆栈
    }
  }
}
```

### 5. 积分签到

```typescript
// signin.service.ts
async signin(memberId: string) {
  const result = await this.accountService.addPoints({
    memberId,
    amount: rules.signinPointsAmount,
    type: PointsTransactionType.EARN_SIGNIN,
    remark: '每日签到',
  });
  
  this.logger.log(
    `用户签到成功: memberId=${memberId}, ` +
    `points=${rules.signinPointsAmount}`
  );
  // ✅ 记录签到操作
  
  return Result.ok(result);
}
```

### 6. 积分任务

```typescript
// task.service.ts
async createTask(dto: CreatePointsTaskDto) {
  const task = await this.taskRepo.create(data);
  
  this.logger.log(
    `创建积分任务: taskKey=${dto.taskKey}, ` +
    `reward=${dto.pointsReward}`
  );
  // ✅ 记录任务创建
  
  return Result.ok(task);
}

async completeTask(memberId: string, taskKey: string) {
  const result = await this.prisma.$transaction(async (tx) => {
    // 发放积分和记录完成
  });
  
  this.logger.log(
    `完成任务: memberId=${memberId}, ` +
    `taskKey=${taskKey}, points=${task.pointsReward}`
  );
  // ✅ 记录任务完成
  
  return Result.ok(result);
}
```

### 7. 定时任务

```typescript
// coupon/scheduler.service.ts
@Cron(CronExpression.EVERY_DAY_AT_2AM)
async cleanExpiredCoupons() {
  this.logger.log('开始清理过期优惠券...');
  // ✅ 记录定时任务开始
  
  try {
    const expiredCoupons = await this.findExpiredCoupons();
    this.logger.log(`找到 ${expiredCoupons.length} 张过期优惠券`);
    // ✅ 记录处理数量
    
    for (const coupon of expiredCoupons) {
      await this.markAsExpired(coupon.id);
      processedCount++;
    }
    
    this.logger.log(
      `过期优惠券清理完成: 成功=${processedCount}, 失败=${errorCount}`
    );
    // ✅ 记录处理结果
  } catch (error) {
    this.logger.error(
      `清理过期优惠券异常: ${error.message}`,
      error.stack
    );
    // ✅ 记录异常
  }
}

// points/scheduler.service.ts
@Cron(CronExpression.EVERY_DAY_AT_2AM)
async processExpiredPoints() {
  this.logger.log('开始处理过期积分...');
  
  try {
    const expiredTransactions = await this.findExpiredTransactions();
    this.logger.log(`找到 ${expiredTransactions.length} 条过期积分记录`);
    
    for (const transaction of expiredTransactions) {
      try {
        await this.expirePoints(transaction);
        processedCount++;
        
        this.logger.log(
          `处理过期积分成功: transactionId=${transaction.id}, ` +
          `memberId=${transaction.memberId}, amount=${transaction.amount}`
        );
        // ✅ 记录每条处理结果
      } catch (error) {
        errorCount++;
        this.logger.error(
          `处理过期积分失败: transactionId=${transaction.id}, ` +
          `error=${error.message}`
        );
        // ✅ 记录失败详情
      }
    }
    
    this.logger.log(
      `过期积分处理完成: 成功=${processedCount}, ` +
      `失败=${errorCount}, 跳过=${skipCount}`
    );
    // ✅ 记录汇总统计
  } catch (error) {
    this.logger.error(
      `处理过期积分异常: ${error.message}`,
      error.stack
    );
  }
}
```

### 8. 订单集成

```typescript
// integration.service.ts
async handleOrderCreated(orderId: string, data: OrderData) {
  this.logger.log(
    `处理订单创建: orderId=${orderId}, ` +
    `couponId=${data.userCouponId}, points=${data.pointsUsed}`
  );
  // ✅ 记录订单关联的优惠信息
  
  // 锁定优惠券和冻结积分
  
  return Result.ok();
}

async handleOrderPaid(orderId: string) {
  this.logger.log(`处理订单支付: orderId=${orderId}`);
  
  // 使用优惠券、扣减积分、发放消费积分
  
  this.logger.log(
    `订单支付处理完成: orderId=${orderId}, ` +
    `earnedPoints=${earnedPoints}`
  );
  // ✅ 记录处理结果
  
  return Result.ok();
}
```

## 日志记录原则

### 1. 关键信息必须记录
- ✅ 用户ID (memberId)
- ✅ 业务对象ID (templateId, userCouponId, orderId)
- ✅ 金额/数量 (amount, discount, points)
- ✅ 操作类型 (type, action)
- ✅ 时间戳（Logger自动添加）

### 2. 日志格式规范
```typescript
// ✅ 好的日志格式
this.logger.log(
  `操作描述: key1=value1, key2=value2, key3=value3`
);

// ❌ 不好的日志格式
this.logger.log('操作成功');
this.logger.log(`操作: ${JSON.stringify(data)}`);
```

### 3. 错误日志包含堆栈
```typescript
// ✅ 包含错误堆栈
this.logger.error(
  `操作失败: key=value, error=${error.message}`,
  error.stack
);

// ❌ 缺少堆栈信息
this.logger.error(`操作失败: ${error.message}`);
```

### 4. 并发操作记录重试
```typescript
// ✅ 记录重试次数
this.logger.warn(
  `乐观锁冲突，重试 ${attempt + 1}/${maxRetries}: key=value`
);
```

### 5. 定时任务记录统计
```typescript
// ✅ 记录开始、进度、结果
this.logger.log('开始处理...');
this.logger.log(`找到 ${count} 条记录`);
this.logger.log(`处理完成: 成功=${success}, 失败=${failed}`);
```

## 日志查询示例

### 查询用户的优惠券操作
```bash
# 查询用户领取优惠券
grep "用户领取优惠券" app.log | grep "memberId=user-123"

# 查询优惠券使用
grep "使用优惠券" app.log | grep "orderId=order-456"
```

### 查询积分变动
```bash
# 查询用户积分增加
grep "增加积分" app.log | grep "memberId=user-123"

# 查询积分扣减冲突
grep "积分扣减乐观锁冲突" app.log
```

### 查询定时任务执行
```bash
# 查询过期优惠券清理
grep "过期优惠券清理完成" app.log

# 查询过期积分处理
grep "过期积分处理完成" app.log
```

## 总结

✅ **日志记录完整且规范**

1. 所有关键操作都有日志记录
2. 日志包含必要的业务信息（ID、金额、类型）
3. 并发冲突和重试都有记录
4. 错误日志包含堆栈信息
5. 定时任务有完整的执行记录
6. 日志格式统一，便于查询和分析

**系统具备完整的操作审计能力** 📝
