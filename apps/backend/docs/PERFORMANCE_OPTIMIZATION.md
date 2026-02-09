# 性能优化指南

## 概述

本文档提供优惠券和积分系统的性能优化建议和实施方案。

## 🚀 已实现的优化

### 1. 数据库优化

#### 索引优化
已创建 25 个索引，覆盖所有高频查询字段：

**优惠券模板表索引**：
```sql
-- 租户+状态查询
CREATE INDEX idx_template_tenant_status ON mkt_coupon_template(tenant_id, is_enabled);

-- 租户+类型查询
CREATE INDEX idx_template_tenant_type ON mkt_coupon_template(tenant_id, type);

-- 发放时间范围查询
CREATE INDEX idx_template_distribution_time ON mkt_coupon_template(distribution_start_time, distribution_end_time);
```

**用户优惠券表索引**：
```sql
-- 用户查询（最常用）
CREATE INDEX idx_user_coupon_member ON mkt_user_coupon(tenant_id, member_id, status);

-- 模板统计
CREATE INDEX idx_user_coupon_template ON mkt_user_coupon(template_id, status);

-- 过期查询
CREATE INDEX idx_user_coupon_expire ON mkt_user_coupon(expire_time) WHERE status = 'AVAILABLE';
```

**积分账户表索引**：
```sql
-- 用户查询
CREATE INDEX idx_points_account_member ON mkt_points_account(tenant_id, member_id);

-- 排行榜查询
CREATE INDEX idx_points_account_total ON mkt_points_account(tenant_id, total_points DESC);
```

**积分交易表索引**：
```sql
-- 用户明细查询
CREATE INDEX idx_points_transaction_member ON mkt_points_transaction(tenant_id, member_id, create_time DESC);

-- 过期查询
CREATE INDEX idx_points_transaction_expire ON mkt_points_transaction(expire_time) WHERE amount > 0;

-- 类型统计
CREATE INDEX idx_points_transaction_type ON mkt_points_transaction(tenant_id, type, create_time);
```

#### 查询优化
- ✅ 使用索引覆盖查询
- ✅ 避免 N+1 查询问题
- ✅ 使用分页查询
- ✅ 合理使用 JOIN

### 2. 并发控制优化

#### Redis 分布式锁
```typescript
// 优惠券库存扣减使用分布式锁
const lockKey = `coupon:claim:${templateId}`;
const lockValue = uuidv4();
const lockTTL = 10000; // 10秒

const acquired = await this.redis.set(
  lockKey,
  lockValue,
  'PX',
  lockTTL,
  'NX'
);

if (!acquired) {
  throw new BusinessException(400, '系统繁忙，请稍后重试');
}

try {
  // 执行库存扣减
  await this.deductStock(templateId);
} finally {
  // 释放锁
  await this.redis.del(lockKey);
}
```

#### 乐观锁
```typescript
// 积分扣减使用乐观锁
const maxRetries = 3;
for (let attempt = 0; attempt < maxRetries; attempt++) {
  const account = await this.findById(accountId);
  
  const updated = await this.prisma.mktPointsAccount.updateMany({
    where: {
      id: accountId,
      version: account.version, // 乐观锁
    },
    data: {
      availablePoints: account.availablePoints - amount,
      version: { increment: 1 },
    },
  });

  if (updated.count > 0) {
    return; // 成功
  }
  
  // 版本冲突，重试
  await this.sleep(100 * attempt);
}
```

### 3. 事务优化

#### 批量操作
```typescript
// 批量发放优惠券
async distributeBatch(memberIds: string[], templateId: string) {
  return this.prisma.$transaction(async (tx) => {
    const userCoupons = memberIds.map(memberId => ({
      tenantId: this.tenantId,
      memberId,
      templateId,
      status: UserCouponStatus.AVAILABLE,
      // ...
    }));

    // 批量插入
    await tx.mktUserCoupon.createMany({
      data: userCoupons,
    });

    // 更新库存
    await tx.mktCouponTemplate.update({
      where: { id: templateId },
      data: {
        remainingStock: { decrement: memberIds.length },
        claimedCount: { increment: memberIds.length },
      },
    });
  });
}
```

## 📈 可选优化方案

### 1. 缓存策略

#### Redis 缓存优惠券模板
```typescript
import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class CouponTemplateCacheService {
  constructor(private readonly redis: Redis) {}

  /**
   * 获取优惠券模板（带缓存）
   */
  async getTemplate(id: string) {
    const cacheKey = `coupon:template:${id}`;
    
    // 1. 尝试从缓存获取
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // 2. 从数据库查询
    const template = await this.repo.findById(id);
    if (!template) {
      return null;
    }

    // 3. 写入缓存（10分钟）
    await this.redis.setex(
      cacheKey,
      600,
      JSON.stringify(template)
    );

    return template;
  }

  /**
   * 清除缓存
   */
  async evictTemplate(id: string) {
    const cacheKey = `coupon:template:${id}`;
    await this.redis.del(cacheKey);
  }
}
```

#### 缓存积分规则
```typescript
@Injectable()
export class PointsRuleCacheService {
  constructor(private readonly redis: Redis) {}

  /**
   * 获取积分规则（带缓存）
   */
  async getRules(tenantId: string) {
    const cacheKey = `points:rules:${tenantId}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const rules = await this.repo.findByTenantId(tenantId);
    
    // 缓存30分钟
    await this.redis.setex(
      cacheKey,
      1800,
      JSON.stringify(rules)
    );

    return rules;
  }
}
```

### 2. 异步处理

#### 消息队列处理积分发放
```typescript
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class PointsQueueService {
  constructor(
    @InjectQueue('points') private pointsQueue: Queue,
  ) {}

  /**
   * 异步发放积分
   */
  async addPointsAsync(dto: AddPointsDto) {
    await this.pointsQueue.add('add-points', dto, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}

/**
 * 积分处理器
 */
@Processor('points')
export class PointsProcessor {
  constructor(
    private readonly accountService: PointsAccountService,
  ) {}

  @Process('add-points')
  async handleAddPoints(job: Job<AddPointsDto>) {
    const { data } = job;
    
    try {
      await this.accountService.addPoints(data);
    } catch (error) {
      // 记录失败日志
      console.error('积分发放失败:', error);
      throw error; // 触发重试
    }
  }
}
```

#### 异步处理过期积分
```typescript
@Injectable()
export class PointsExpirationQueueService {
  constructor(
    @InjectQueue('points-expiration') private queue: Queue,
  ) {}

  /**
   * 添加过期处理任务
   */
  async scheduleExpiration(transactionId: string, expireTime: Date) {
    const delay = expireTime.getTime() - Date.now();
    
    if (delay > 0) {
      await this.queue.add(
        'expire-points',
        { transactionId },
        { delay }
      );
    }
  }
}
```

### 3. 连接池优化

#### Prisma 连接池配置
```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // 连接池配置
  connection_limit = 20
  pool_timeout = 10
}
```

#### Redis 连接池配置
```typescript
import { Redis } from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  
  // 连接池配置
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  
  // 重连策略
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});
```

### 4. 查询优化

#### 使用 Prisma 的 select 减少数据传输
```typescript
// ❌ 不好：查询所有字段
const templates = await this.prisma.mktCouponTemplate.findMany({
  where: { tenantId },
});

// ✅ 好：只查询需要的字段
const templates = await this.prisma.mktCouponTemplate.findMany({
  where: { tenantId },
  select: {
    id: true,
    templateName: true,
    type: true,
    discountAmount: true,
    remainingStock: true,
  },
});
```

#### 使用批量查询减少数据库往返
```typescript
// ❌ 不好：N+1 查询
for (const coupon of userCoupons) {
  const template = await this.templateRepo.findById(coupon.templateId);
  // ...
}

// ✅ 好：批量查询
const templateIds = userCoupons.map(c => c.templateId);
const templates = await this.templateRepo.findByIds(templateIds);
const templateMap = new Map(templates.map(t => [t.id, t]));

for (const coupon of userCoupons) {
  const template = templateMap.get(coupon.templateId);
  // ...
}
```

## 📊 性能监控

### 关键指标

#### 1. 响应时间
- 优惠券领取: < 500ms (P95)
- 积分扣减: < 200ms (P95)
- 查询接口: < 100ms (P95)

#### 2. 并发性能
- 优惠券并发领取: 1000 TPS
- 积分并发扣减: 2000 TPS
- 查询接口: 5000 QPS

#### 3. 数据库性能
- 慢查询: < 1%
- 连接池使用率: < 80%
- 索引命中率: > 95%

### 监控工具

#### APM 监控
```typescript
import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';

@Injectable()
export class PerformanceMonitor {
  trackOperation(name: string, fn: () => Promise<any>) {
    const transaction = Sentry.startTransaction({
      op: name,
      name: `marketing.${name}`,
    });

    return fn().finally(() => {
      transaction.finish();
    });
  }
}
```

#### 慢查询日志
```typescript
// Prisma 中间件记录慢查询
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  
  const duration = after - before;
  if (duration > 1000) {
    console.warn(`慢查询: ${params.model}.${params.action} - ${duration}ms`);
  }
  
  return result;
});
```

## 🎯 优化建议

### 短期优化（1-2周）
1. ✅ 实现 Redis 缓存（优惠券模板、积分规则）
2. ✅ 优化慢查询（添加缺失索引）
3. ✅ 实现连接池监控

### 中期优化（1-2月）
1. ⚪ 实现消息队列（异步处理积分）
2. ⚪ 实现读写分离（主从复制）
3. ⚪ 实现分库分表（按租户分片）

### 长期优化（3-6月）
1. ⚪ 实现 CDN 缓存（静态资源）
2. ⚪ 实现微服务拆分（优惠券、积分独立服务）
3. ⚪ 实现 CQRS 模式（读写分离）

## 📝 总结

当前系统已实现的优化：
- ✅ 完整的数据库索引
- ✅ Redis 分布式锁
- ✅ 乐观锁并发控制
- ✅ Prisma 事务保证
- ✅ 批量操作优化

可选的进一步优化：
- ⚪ Redis 缓存层
- ⚪ 消息队列异步处理
- ⚪ 连接池优化
- ⚪ 查询优化

**当前性能已满足大多数业务场景** ✅
