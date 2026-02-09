# 积分发放降级策略文档

## 概述

积分发放降级策略是为了确保在积分系统出现故障时，不影响订单支付等核心业务流程。当积分发放失败时，系统会将失败记录保存到数据库，并加入重试队列进行异步重试。

## 架构设计

### 核心组件

1. **PointsGracefulDegradationService** - 降级服务
   - 记录积分发放失败
   - 管理失败记录状态
   - 提供手动重试接口
   - 清理已完成的记录

2. **PointsRetryProcessor** - 重试处理器
   - 处理重试队列中的任务
   - 自动重试失败的积分发放
   - 更新重试状态
   - 标记最终失败

3. **PointsDegradationModule** - 降级模块
   - 注册 Bull 队列
   - 导出降级服务供其他模块使用

### 数据模型

```prisma
model MktPointsGrantFailure {
  id               String   @id @default(uuid())
  memberId         String   @map("member_id")
  amount           Int
  type             PointsTransactionType
  relatedId        String?  @map("related_id")
  remark           String?
  expireTime       DateTime? @map("expire_time")
  failureReason    String   @map("failure_reason")
  failureTime      DateTime @map("failure_time")
  retryCount       Int      @default(0) @map("retry_count")
  lastRetryTime    DateTime? @map("last_retry_time")
  lastErrorMessage String?  @map("last_error_message")
  status           String   @default("PENDING") // PENDING, COMPLETED, FAILED
  
  @@index([memberId])
  @@index([status])
  @@index([relatedId])
  @@index([failureTime])
  @@map("mkt_points_grant_failure")
}
```

## 工作流程

### 1. 积分发放失败时

```typescript
try {
  await this.pointsAccountService.addPoints({
    memberId,
    amount: pointsToEarn,
    type: PointsTransactionType.EARN_ORDER,
    relatedId: orderId,
    remark: '消费获得',
  });
} catch (error) {
  // 记录失败并加入重试队列
  await this.degradationService.recordFailure({
    memberId,
    amount: pointsToEarn,
    type: PointsTransactionType.EARN_ORDER,
    relatedId: orderId,
    remark: '消费获得',
    failureReason: error.message,
  });
  
  // 不抛出错误，避免影响订单支付流程
}
```

### 2. 自动重试流程

1. **延迟重试**: 失败记录会在 1 分钟后加入重试队列
2. **指数退避**: 使用指数退避策略，每次重试间隔递增
3. **最多重试 3 次**: 如果 3 次重试都失败，标记为最终失败
4. **状态更新**: 每次重试后更新重试次数和状态

```typescript
@Process('retry-points-grant')
async handleRetry(job: Job<PointsGrantFailureRecord>) {
  try {
    // 尝试发放积分
    await this.pointsAccountService.addPoints({...});
    
    // 更新状态为成功
    await this.degradationService.updateRetryStatus(
      memberId,
      relatedId,
      retryCount + 1,
      true,
    );
  } catch (error) {
    // 更新重试状态
    await this.degradationService.updateRetryStatus(
      memberId,
      relatedId,
      retryCount + 1,
      false,
      error.message,
    );
    
    // 如果是最后一次重试，标记为最终失败
    if (job.attemptsMade >= job.opts.attempts) {
      await this.degradationService.markAsFinalFailure(
        memberId,
        relatedId,
        `重试${job.attemptsMade}次后仍然失败: ${error.message}`,
      );
    }
    
    throw error; // 让 Bull 知道任务失败
  }
}
```

### 3. 失败记录状态

- **PENDING**: 待重试
- **COMPLETED**: 重试成功
- **FAILED**: 最终失败，需要人工介入

## API 接口

### 查询失败记录

```typescript
// 查询待重试的记录
const pendingRecords = await degradationService.getFailureRecords('PENDING', 100);

// 查询最终失败的记录
const failedRecords = await degradationService.getFailureRecords('FAILED', 100);

// 查询所有记录
const allRecords = await degradationService.getFailureRecords(undefined, 100);
```

### 手动重试

```typescript
// 手动触发重试
await degradationService.manualRetry(failureRecordId);
```

### 清理已完成记录

```typescript
// 清理 30 天前已完成的记录
const deletedCount = await degradationService.cleanupCompletedRecords(30);
```

## 监控和告警

### 日志记录

系统会记录以下关键日志：

1. **积分发放失败**: 记录失败原因和相关信息
2. **重试开始**: 记录重试次数和任务信息
3. **重试成功**: 记录成功信息
4. **重试失败**: 记录失败原因
5. **最终失败**: 记录最终失败，需要人工介入

### 告警建议

建议对以下情况设置告警：

1. **最终失败记录数量**: 当 FAILED 状态的记录超过阈值时告警
2. **待重试记录积压**: 当 PENDING 状态的记录超过阈值时告警
3. **重试失败率**: 当重试失败率超过阈值时告警

## 运维操作

### 查询失败统计

```sql
-- 查询各状态的记录数量
SELECT status, COUNT(*) as count
FROM mkt_points_grant_failure
GROUP BY status;

-- 查询最近的失败记录
SELECT *
FROM mkt_points_grant_failure
WHERE status = 'FAILED'
ORDER BY failure_time DESC
LIMIT 10;

-- 查询重试次数最多的记录
SELECT *
FROM mkt_points_grant_failure
WHERE status = 'PENDING'
ORDER BY retry_count DESC
LIMIT 10;
```

### 批量重试

对于需要批量重试的场景，可以编写脚本：

```typescript
// 批量重试最终失败的记录
const failedRecords = await degradationService.getFailureRecords('FAILED', 1000);

for (const record of failedRecords) {
  try {
    await degradationService.manualRetry(record.id);
    console.log(`重试成功: ${record.id}`);
  } catch (error) {
    console.error(`重试失败: ${record.id}`, error);
  }
}
```

### 定期清理

建议设置定时任务定期清理已完成的记录：

```typescript
// 每周清理一次 30 天前的已完成记录
@Cron('0 0 * * 0') // 每周日凌晨执行
async cleanupOldRecords() {
  const deletedCount = await this.degradationService.cleanupCompletedRecords(30);
  this.logger.log(`清理了 ${deletedCount} 条已完成的失败记录`);
}
```

## 性能考虑

### 队列配置

- **延迟时间**: 1 分钟，避免立即重试导致系统压力
- **重试次数**: 3 次，平衡重试成功率和系统负载
- **指数退避**: 每次重试间隔递增，避免频繁重试

### 数据库索引

已创建以下索引优化查询性能：

- `memberId`: 按用户查询
- `status`: 按状态查询
- `relatedId`: 按关联订单查询
- `failureTime`: 按时间排序

### 清理策略

- 定期清理已完成的记录，避免表数据过大
- 建议保留 30 天内的记录用于审计
- 最终失败的记录建议人工处理后再删除

## 测试

### 单元测试

已编写完整的单元测试覆盖：

1. **degradation.service.spec.ts**: 测试降级服务的所有方法
2. **degradation.processor.spec.ts**: 测试重试处理器的各种场景

### 测试覆盖

- ✅ 记录失败并加入队列
- ✅ 重试成功更新状态
- ✅ 重试失败更新状态
- ✅ 最终失败标记
- ✅ 手动重试
- ✅ 查询失败记录
- ✅ 清理已完成记录

## 验证需求

本实现验证了以下需求：

- **需求 12.12**: 使用消息队列异步处理积分发放，避免阻塞订单支付流程
- **需求 12.13**: 使用消息队列处理积分过期任务，避免影响主业务

## 总结

积分发放降级策略通过以下机制确保系统的高可用性：

1. **失败隔离**: 积分发放失败不影响订单支付
2. **自动重试**: 自动重试失败的积分发放
3. **状态追踪**: 完整记录失败和重试状态
4. **人工介入**: 最终失败的记录可以人工处理
5. **监控告警**: 提供完整的日志和监控能力

这种设计确保了即使在积分系统出现故障时，核心业务流程仍然可以正常运行，同时保证积分最终会被正确发放。
