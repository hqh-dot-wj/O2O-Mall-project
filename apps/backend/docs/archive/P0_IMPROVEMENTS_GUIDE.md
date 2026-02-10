# P0 优先级改进使用指南

## 📋 改进概览

本次改进实现了营销引擎的三大核心功能，确保系统的稳定性和可靠性：

| 功能 | 文件 | 作用 |
|------|------|------|
| **状态机约束** | `state-machine.config.ts` | 防止非法状态跃迁 |
| **幂等性保障** | `idempotency.service.ts` | 防止重复操作 |
| **生命周期管理** | `lifecycle.scheduler.ts` | 自动化处理超时/过期 |

---

## 1️⃣ 状态机约束系统

### 功能说明

防止非法的状态跃迁，确保实例生命周期的严格管理。

### 核心文件

```
apps/backend/src/module/marketing/instance/state-machine.config.ts
```

### 状态跃迁规则

```
PENDING_PAY (待支付)
  ├─ PAID (已支付) ✅
  ├─ TIMEOUT (超时) ✅
  └─ FAILED (失败) ✅

PAID (已支付)
  ├─ ACTIVE (活动中) ✅
  ├─ SUCCESS (成功) ✅
  └─ REFUNDED (已退款) ✅

ACTIVE (活动中)
  ├─ SUCCESS (成功) ✅
  ├─ FAILED (失败) ✅
  ├─ TIMEOUT (超时) ✅
  └─ REFUNDED (已退款) ✅

SUCCESS (成功) - 终态
  └─ REFUNDED (已退款) ✅ (售后)

TIMEOUT (超时) - 终态
  └─ 不允许任何跃迁 ❌

FAILED (失败) - 终态
  └─ REFUNDED (已退款) ✅

REFUNDED (已退款) - 终态
  └─ 不允许任何跃迁 ❌
```

### 使用示例

```typescript
// ✅ 合法跃迁
await instanceService.transitStatus(instanceId, PlayInstanceStatus.PAID);

// ❌ 非法跃迁（会抛出异常）
await instanceService.transitStatus(instanceId, PlayInstanceStatus.SUCCESS);
// 错误信息：非法的状态流转: PENDING_PAY -> SUCCESS。
// 当前状态 "待支付：用户已创建实例，等待支付完成" 只允许跃迁到: PAID, TIMEOUT, FAILED
```

### 辅助函数

```typescript
import {
  isValidTransition,
  getStatusDescription,
  getAllowedNextStatuses,
  isFinalStatus,
} from './state-machine.config';

// 检查状态跃迁是否合法
const valid = isValidTransition(PlayInstanceStatus.PENDING_PAY, PlayInstanceStatus.PAID);
// true

// 获取状态描述
const desc = getStatusDescription(PlayInstanceStatus.PENDING_PAY);
// "待支付：用户已创建实例，等待支付完成"

// 获取允许的下一状态
const allowed = getAllowedNextStatuses(PlayInstanceStatus.PENDING_PAY);
// [PlayInstanceStatus.PAID, PlayInstanceStatus.TIMEOUT, PlayInstanceStatus.FAILED]

// 检查是否为终态
const isFinal = isFinalStatus(PlayInstanceStatus.SUCCESS);
// true
```

---

## 2️⃣ 幂等性保障系统

### 功能说明

防止用户重复操作导致的业务问题：
- 重复参与活动
- 重复支付回调
- 并发状态变更

### 核心文件

```
apps/backend/src/module/marketing/instance/idempotency.service.ts
```

### 三大保障机制

#### A. 参与活动幂等性

**场景**: 用户多次点击"参与"按钮

**机制**: 
- 基于 Redis 缓存结果（5分钟）
- 幂等键：`idempotency:join:{configId}:{memberId}:{groupId?}`

**代码示例**:
```typescript
// instance.service.ts - create 方法
async create(dto: CreatePlayInstanceDto) {
  // 1. 检查是否已参与
  const cachedResult = await this.idempotencyService.checkJoinIdempotency(
    dto.configId,
    dto.memberId,
    dto.instanceData,
  );

  if (cachedResult) {
    return cachedResult; // 返回缓存结果
  }

  // 2. 创建实例
  const instance = await this.repo.create(dto);

  // 3. 缓存结果
  await this.idempotencyService.cacheJoinResult(
    dto.configId,
    dto.memberId,
    dto.instanceData,
    result,
  );

  return result;
}
```

#### B. 支付回调幂等性

**场景**: 支付平台重复回调

**机制**:
- 基于 Redis 标记（10分钟）
- 幂等键：`idempotency:payment:{orderSn}`

**代码示例**:
```typescript
// instance.service.ts - handlePaymentSuccess 方法
async handlePaymentSuccess(orderSn: string) {
  // 1. 检查是否已处理
  const processed = await this.idempotencyService.checkPaymentIdempotency(orderSn);
  if (processed) {
    return; // 已处理，直接返回
  }

  // 2. 标记为已处理
  await this.idempotencyService.markPaymentProcessed(orderSn);

  // 3. 执行业务逻辑
  await this.transitStatus(instance.id, PlayInstanceStatus.PAID);
}
```

#### C. 状态变更分布式锁

**场景**: 并发请求同时修改状态

**机制**:
- 基于 Redis 分布式锁（5秒超时）
- 锁键：`idempotency:state:{instanceId}`

**代码示例**:
```typescript
// instance.service.ts - transitStatus 方法
async transitStatus(id: string, nextStatus: PlayInstanceStatus) {
  // 使用分布式锁
  return await this.idempotencyService.withStateLock(id, async () => {
    // 执行状态变更逻辑
    const instance = await this.repo.findById(id);
    // ...
  });
}
```

### 手动使用幂等性服务

```typescript
// 在自定义业务逻辑中使用
import { IdempotencyService } from './idempotency.service';

@Injectable()
export class MyService {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async myBusinessLogic(instanceId: string) {
    // 使用分布式锁
    await this.idempotencyService.withStateLock(instanceId, async () => {
      // 你的业务逻辑
    });
  }
}
```

---

## 3️⃣ 活动生命周期管理

### 功能说明

自动化处理营销活动的生命周期，无需人工干预。

### 核心文件

```
apps/backend/src/module/marketing/scheduler/lifecycle.scheduler.ts
```

### 四大定时任务

#### A. 处理超时实例（每分钟）

**执行时间**: 每分钟的第 0 秒

**处理逻辑**:
1. **待支付超时**: PENDING_PAY 超过 30 分钟 -> TIMEOUT
2. **活动超时**: ACTIVE 超过有效期 -> FAILED
3. **库存释放**: 超时后释放占用的库存

**日志示例**:
```
[定时任务] 开始处理超时实例...
[待支付超时] 发现 5 个超时实例
[待支付超时] 实例 xxx 已超时关闭
[活动超时] 处理 2 个超时实例
[定时任务] 超时实例处理完成，耗时 150ms，共处理 7 个实例
```

#### B. 活动自动上下架（每小时）

**执行时间**: 每小时的第 0 分 0 秒

**处理逻辑**:
1. **自动上架**: 到达开始时间 -> ON_SHELF
2. **自动下架**: 到达结束时间 -> OFF_SHELF

**日志示例**:
```
[定时任务] 开始检查活动状态...
[自动上架] 上架 3 个活动
[自动下架] 下架 5 个活动
[定时任务] 活动状态检查完成，耗时 80ms
```

#### C. 清理过期数据（每天凌晨2点）

**执行时间**: 每天凌晨 2:00:00

**处理逻辑**:
1. **归档**: 30 天前的终态实例标记为已归档
2. **清理**: 可选择删除或迁移到冷存储

**日志示例**:
```
[定时任务] 开始清理过期数据...
[数据归档] 归档 150 个实例
[定时任务] 过期数据清理完成，耗时 500ms
```

#### D. 健康检查（每5分钟）

**执行时间**: 每 5 分钟

**处理逻辑**:
1. 统计各状态实例数量
2. 检查是否有异常堆积
3. 记录关键指标

**日志示例**:
```
[健康检查] 实例状态统计: {"PENDING_PAY":50,"PAID":20,"ACTIVE":30,"SUCCESS":1000}
[健康检查] 警告：待支付实例数量过多 (1200)，可能存在异常
```

### 手动触发定时任务（测试用）

```typescript
import { ActivityLifecycleScheduler } from './lifecycle.scheduler';

@Injectable()
export class TestService {
  constructor(private readonly scheduler: ActivityLifecycleScheduler) {}

  async testScheduler() {
    // 手动触发超时处理
    await this.scheduler.handleTimeoutInstances();

    // 手动触发活动状态检查
    await this.scheduler.handleActivityStatus();

    // 手动触发数据清理
    await this.scheduler.cleanupExpiredData();

    // 手动触发健康检查
    await this.scheduler.healthCheck();
  }
}
```

---

## 🧪 测试验证

### 1. 测试状态机约束

```typescript
// 测试非法状态跃迁
describe('状态机约束', () => {
  it('应该拒绝非法状态跃迁', async () => {
    // 创建实例（PENDING_PAY）
    const instance = await instanceService.create(dto);

    // 尝试直接跳到 SUCCESS（应该失败）
    await expect(
      instanceService.transitStatus(instance.id, PlayInstanceStatus.SUCCESS),
    ).rejects.toThrow('非法的状态流转');
  });

  it('应该允许合法状态跃迁', async () => {
    // 创建实例（PENDING_PAY）
    const instance = await instanceService.create(dto);

    // 跃迁到 PAID（应该成功）
    await expect(
      instanceService.transitStatus(instance.id, PlayInstanceStatus.PAID),
    ).resolves.toBeDefined();
  });
});
```

### 2. 测试幂等性保障

```typescript
// 测试重复参与
describe('幂等性保障', () => {
  it('应该防止重复参与', async () => {
    // 第一次参与
    const result1 = await instanceService.create(dto);

    // 第二次参与（应该返回缓存结果）
    const result2 = await instanceService.create(dto);

    // 应该返回相同的实例ID
    expect(result1.data.id).toBe(result2.data.id);
  });

  it('应该防止重复支付回调', async () => {
    // 第一次回调
    await instanceService.handlePaymentSuccess(orderSn);

    // 第二次回调（应该直接返回）
    await instanceService.handlePaymentSuccess(orderSn);

    // 验证只处理了一次
    const instance = await instanceService.findOne(instanceId);
    expect(instance.status).toBe(PlayInstanceStatus.PAID);
  });
});
```

### 3. 测试生命周期管理

```typescript
// 测试超时处理
describe('生命周期管理', () => {
  it('应该自动处理超时实例', async () => {
    // 创建实例
    const instance = await instanceService.create(dto);

    // 修改创建时间为 31 分钟前
    await prisma.playInstance.update({
      where: { id: instance.id },
      data: { createTime: new Date(Date.now() - 31 * 60 * 1000) },
    });

    // 手动触发定时任务
    await scheduler.handleTimeoutInstances();

    // 验证状态已变为 TIMEOUT
    const updated = await instanceService.findOne(instance.id);
    expect(updated.status).toBe(PlayInstanceStatus.TIMEOUT);
  });
});
```

---

## 📊 监控指标

### 关键指标

| 指标 | 说明 | 告警阈值 |
|------|------|---------|
| 待支付实例数量 | PENDING_PAY 状态的实例数 | > 1000 |
| 最老待支付实例 | 最早的 PENDING_PAY 实例年龄 | > 60 分钟 |
| 超时处理耗时 | 定时任务执行时间 | > 5 秒 |
| 状态跃迁失败率 | 非法跃迁次数 / 总跃迁次数 | > 1% |

### 日志查询

```bash
# 查看定时任务日志
grep "定时任务" logs/app.log

# 查看状态跃迁失败日志
grep "非法的状态流转" logs/app.log

# 查看幂等性拦截日志
grep "幂等性" logs/app.log
```

---

## 🔧 配置说明

### 超时时间配置

```typescript
// lifecycle.scheduler.ts
const paymentTimeout = 30 * 60 * 1000; // 30分钟（可配置）
```

### 幂等性缓存时间

```typescript
// idempotency.service.ts
private readonly DEFAULT_TTL = {
  JOIN: 300,    // 5分钟（可配置）
  PAYMENT: 600, // 10分钟（可配置）
  STATE: 60,    // 1分钟（可配置）
};
```

### 定时任务时间

```typescript
// lifecycle.scheduler.ts
@Cron(CronExpression.EVERY_MINUTE)        // 每分钟
@Cron(CronExpression.EVERY_HOUR)          // 每小时
@Cron('0 0 2 * * *')                      // 每天凌晨2点
@Cron('0 */5 * * * *')                    // 每5分钟
```

---

## 🎯 最佳实践

### 1. 状态机使用

✅ **推荐**:
```typescript
// 使用 transitStatus 方法，自动校验
await instanceService.transitStatus(id, nextStatus);
```

❌ **不推荐**:
```typescript
// 直接更新数据库，绕过状态机校验
await prisma.playInstance.update({ where: { id }, data: { status } });
```

### 2. 幂等性使用

✅ **推荐**:
```typescript
// 在业务逻辑开始前检查幂等性
const cached = await idempotencyService.checkJoinIdempotency(...);
if (cached) return cached;
```

❌ **不推荐**:
```typescript
// 不检查幂等性，直接执行
await this.repo.create(dto);
```

### 3. 定时任务监控

✅ **推荐**:
```typescript
// 记录详细日志
this.logger.log(`[定时任务] 处理 ${count} 个实例`);
```

✅ **推荐**:
```typescript
// 异常不中断整个任务
try {
  await this.processInstance(instance);
} catch (error) {
  this.logger.error(`处理失败: ${error.message}`);
  // 继续处理下一个
}
```

---

## 📚 相关文档

- [架构改进方案](./MAAS_ARCHITECTURE_IMPROVEMENT.md)
- [需求文档](../.kiro/specs/maas-architecture-improvement/requirements.md)
- [营销模块总览](./marketing.md)

---

**版本**: v1.0  
**更新时间**: 2024-02-06  
**负责人**: 开发团队
