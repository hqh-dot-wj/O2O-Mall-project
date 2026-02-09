# MAAS 营销引擎架构改进方案

## 📊 当前架构评估

### ✅ 已做对的部分（符合工业化标准）

| 标准 | 当前实现 | 评分 |
|------|---------|------|
| **玩法标准化** | ✅ PlayTemplate 模板系统 | 90% |
| **规则配置化** | ✅ StorePlayConfig + rules JSON | 85% |
| **运行实例化** | ✅ PlayInstance 实例系统 | 90% |
| **策略模式** | ✅ IMarketingStrategy 接口 | 95% |
| **状态机** | ✅ PlayInstanceStatus 枚举 + transitStatus | 80% |
| **库存原子化** | ✅ Redis Lua 脚本 | 95% |

**总体评分**: 87/100 - **架构基础扎实，已具备"营销引擎"雏形**

---

## ❌ 需要改进的 7 个关键点

### 1. 玩法注册机制不够标准化 ⚠️

**当前问题**:
```typescript
// play.factory.ts - 手动注册
onModuleInit() {
  this.register(GroupBuyService);
  this.register(CourseGroupBuyService);
  this.register(MemberUpgradeService);
  this.register(FlashSaleService);
  this.register(FullReductionService);
}
```

**问题**:
- 每次新增玩法需要手动修改工厂类
- 没有玩法元数据（hasInstance、ruleTable 等）
- 无法动态查询"系统支持哪些玩法"

**改进方案**:

```typescript
// 1. 创建玩法注册表
// src/module/marketing/play/play.registry.ts

export interface PlayMetadata {
  code: string;
  name: string;
  hasInstance: boolean;        // 是否有实例
  hasState: boolean;            // 是否有状态流转
  canFail: boolean;             // 是否可失败
  canParallel: boolean;         // 是否可并行
  ruleSchema: any;              // 规则 Schema
  defaultStockMode: MarketingStockMode;
}

export const PLAY_REGISTRY: Record<string, PlayMetadata> = {
  GROUP_BUY: {
    code: 'GROUP_BUY',
    name: '普通拼团',
    hasInstance: true,
    hasState: true,
    canFail: true,
    canParallel: true,
    ruleSchema: GroupBuyRulesDto,
    defaultStockMode: MarketingStockMode.STRONG_LOCK,
  },
  COURSE_GROUP_BUY: {
    code: 'COURSE_GROUP_BUY',
    name: '拼班课程',
    hasInstance: true,
    hasState: true,
    canFail: true,
    canParallel: true,
    ruleSchema: CourseGroupBuyRulesDto,
    defaultStockMode: MarketingStockMode.LAZY_CHECK,
  },
  FLASH_SALE: {
    code: 'FLASH_SALE',
    name: '限时秒杀',
    hasInstance: true,
    hasState: true,
    canFail: false,
    canParallel: false,
    ruleSchema: FlashSaleRulesDto,
    defaultStockMode: MarketingStockMode.STRONG_LOCK,
  },
  FULL_REDUCTION: {
    code: 'FULL_REDUCTION',
    name: '满减活动',
    hasInstance: false,          // 满减不需要实例
    hasState: false,
    canFail: false,
    canParallel: true,
    ruleSchema: FullReductionRulesDto,
    defaultStockMode: MarketingStockMode.LAZY_CHECK,
  },
};

// 2. 使用装饰器自动注册
@PlayStrategy('GROUP_BUY')
export class GroupBuyService implements IMarketingStrategy {
  readonly code = 'GROUP_BUY';
  // ...
}

// 3. 工厂类自动扫描
@Injectable()
export class PlayStrategyFactory implements OnModuleInit {
  private strategies = new Map<string, IMarketingStrategy>();

  onModuleInit() {
    // 自动扫描所有带 @PlayStrategy 装饰器的类
    this.autoRegisterStrategies();
  }

  getMetadata(code: string): PlayMetadata {
    return PLAY_REGISTRY[code];
  }

  getAllPlayTypes(): PlayMetadata[] {
    return Object.values(PLAY_REGISTRY);
  }
}
```

---

### 2. 规则校验分散，缺乏统一入口 ⚠️

**当前问题**:
- 每个 Strategy 自己实现 `validateConfig`
- 没有统一的规则校验器
- 运营配置时无法提前知道规则是否合法

**改进方案**:

```typescript
// src/module/marketing/rule/rule-validator.service.ts

@Injectable()
export class RuleValidatorService {
  /**
   * 统一规则校验入口
   */
  async validate(templateCode: string, rules: any): Promise<ValidationResult> {
    const metadata = PLAY_REGISTRY[templateCode];
    if (!metadata) {
      throw new BusinessException(ResponseCode.PARAM_INVALID, '未知的玩法类型');
    }

    // 1. DTO 校验
    const rulesDto = plainToInstance(metadata.ruleSchema, rules);
    const errors = await validate(rulesDto);

    if (errors.length > 0) {
      return {
        valid: false,
        errors: this.formatErrors(errors),
      };
    }

    // 2. 业务逻辑校验（调用 Strategy）
    const strategy = this.factory.getStrategy(templateCode);
    if (strategy.validateConfig) {
      await strategy.validateConfig({ rules });
    }

    return { valid: true };
  }

  /**
   * 获取规则表单 Schema（给前端用）
   */
  getRuleFormSchema(templateCode: string): any {
    const metadata = PLAY_REGISTRY[templateCode];
    return this.generateFormSchema(metadata.ruleSchema);
  }
}
```

---

### 3. 状态机缺乏约束，允许非法跃迁 ⚠️⚠️

**当前问题**:
```typescript
// 当前可以任意跃迁状态
await this.transitStatus(id, PlayInstanceStatus.SUCCESS);
```

**问题**:
- 没有状态跃迁规则
- 可能出现 `PENDING_PAY` 直接跳到 `SUCCESS`
- 缺少状态机可视化

**改进方案**:

```typescript
// src/module/marketing/instance/state-machine.ts

export const PLAY_INSTANCE_STATE_MACHINE = {
  PENDING_PAY: {
    allowedNext: [PlayInstanceStatus.PAID, PlayInstanceStatus.TIMEOUT, PlayInstanceStatus.FAILED],
  },
  PAID: {
    allowedNext: [PlayInstanceStatus.ACTIVE, PlayInstanceStatus.SUCCESS, PlayInstanceStatus.REFUNDED],
  },
  ACTIVE: {
    allowedNext: [PlayInstanceStatus.SUCCESS, PlayInstanceStatus.FAILED, PlayInstanceStatus.TIMEOUT],
  },
  SUCCESS: {
    allowedNext: [PlayInstanceStatus.REFUNDED], // 成功后只能退款
  },
  TIMEOUT: {
    allowedNext: [], // 终态
  },
  FAILED: {
    allowedNext: [], // 终态
  },
  REFUNDED: {
    allowedNext: [], // 终态
  },
};

// instance.service.ts
async transitStatus(id: string, nextStatus: PlayInstanceStatus) {
  const instance = await this.repo.findById(id);
  const currentStatus = instance.status;

  // 校验状态跃迁合法性
  const allowedNext = PLAY_INSTANCE_STATE_MACHINE[currentStatus]?.allowedNext || [];
  if (!allowedNext.includes(nextStatus)) {
    throw new BusinessException(
      ResponseCode.BUSINESS_ERROR,
      `非法状态跃迁: ${currentStatus} -> ${nextStatus}`,
    );
  }

  // 执行跃迁
  await this.repo.update(id, { status: nextStatus });

  // 触发状态变更事件
  await this.eventEmitter.emit('instance.status.changed', {
    instanceId: id,
    oldStatus: currentStatus,
    newStatus: nextStatus,
  });
}
```

---

### 4. 缺少事件驱动机制 ⚠️⚠️⚠️

**当前问题**:
- 状态变更后直接调用其他模块（强耦合）
- 无法追溯"谁触发了什么"
- 难以扩展（如加通知、加积分）

**改进方案**:

```typescript
// src/module/marketing/events/marketing.events.ts

export enum MarketingEventType {
  // 实例事件
  INSTANCE_CREATED = 'instance.created',
  INSTANCE_PAID = 'instance.paid',
  INSTANCE_SUCCESS = 'instance.success',
  INSTANCE_FAILED = 'instance.failed',
  
  // 玩法事件
  GROUP_FULL = 'group.full',
  FLASH_SALE_SOLD_OUT = 'flash_sale.sold_out',
  COURSE_OPEN = 'course.open',
}

export interface MarketingEvent {
  type: MarketingEventType;
  instanceId: string;
  configId: string;
  memberId: string;
  payload: any;
  timestamp: Date;
}

// 使用 NestJS EventEmitter
@Injectable()
export class PlayInstanceService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async transitStatus(id: string, nextStatus: PlayInstanceStatus) {
    // ... 状态跃迁逻辑

    // 发送事件
    if (nextStatus === PlayInstanceStatus.SUCCESS) {
      this.eventEmitter.emit(MarketingEventType.INSTANCE_SUCCESS, {
        type: MarketingEventType.INSTANCE_SUCCESS,
        instanceId: id,
        configId: instance.configId,
        memberId: instance.memberId,
        payload: instance.instanceData,
        timestamp: new Date(),
      });
    }
  }
}

// 事件监听器（解耦）
@Injectable()
export class MarketingEventListener {
  @OnEvent(MarketingEventType.INSTANCE_SUCCESS)
  async handleInstanceSuccess(event: MarketingEvent) {
    // 1. 发放权益
    await this.assetService.grantAsset(event);
    
    // 2. 结算资金
    await this.walletService.settle(event);
    
    // 3. 发送通知
    await this.notificationService.send(event);
    
    // 4. 记录日志
    await this.auditService.log(event);
  }
}
```

---

### 5. 缺少幂等性保障 ⚠️⚠️

**当前问题**:
- 用户可能重复参与同一活动
- 支付回调可能重复触发
- 状态变更可能并发冲突

**改进方案**:

```typescript
// 1. 参与幂等性
async join(configId: string, memberId: string, params: any) {
  // 生成幂等键
  const idempotencyKey = `join:${configId}:${memberId}`;
  
  // 检查是否已参与
  const existing = await this.redis.get(idempotencyKey);
  if (existing) {
    return JSON.parse(existing); // 返回已有结果
  }

  // 执行参与逻辑
  const result = await this.doJoin(configId, memberId, params);

  // 缓存结果（5分钟）
  await this.redis.setex(idempotencyKey, 300, JSON.stringify(result));

  return result;
}

// 2. 状态变更加锁
async transitStatus(id: string, nextStatus: PlayInstanceStatus) {
  const lockKey = `instance:lock:${id}`;
  const lock = await this.redis.lock(lockKey, 5000); // 5秒锁

  try {
    // 执行状态变更
    await this.doTransitStatus(id, nextStatus);
  } finally {
    await lock.unlock();
  }
}

// 3. 数据库乐观锁
model PlayInstance {
  id       String @id
  version  Int    @default(0) // 版本号
  // ...
}

// 更新时检查版本号
await prisma.playInstance.update({
  where: { id, version: currentVersion },
  data: { status: nextStatus, version: currentVersion + 1 },
});
```

---

### 6. 缺少活动生命周期管理 ⚠️

**当前问题**:
- 没有定时任务处理超时活动
- 没有活动预热/预告机制
- 没有活动结束后的清理逻辑

**改进方案**:

```typescript
// src/module/marketing/scheduler/activity-lifecycle.scheduler.ts

@Injectable()
export class ActivityLifecycleScheduler {
  /**
   * 每分钟检查超时实例
   */
  @Cron('0 * * * * *')
  async handleTimeoutInstances() {
    const timeoutInstances = await this.prisma.playInstance.findMany({
      where: {
        status: PlayInstanceStatus.PENDING_PAY,
        createTime: { lt: new Date(Date.now() - 30 * 60 * 1000) }, // 30分钟超时
      },
    });

    for (const instance of timeoutInstances) {
      await this.instanceService.transitStatus(instance.id, PlayInstanceStatus.TIMEOUT);
    }
  }

  /**
   * 每小时检查活动状态
   */
  @Cron('0 0 * * * *')
  async handleActivityStatus() {
    const now = new Date();

    // 1. 自动上架到期的活动
    await this.prisma.storePlayConfig.updateMany({
      where: {
        status: PublishStatus.OFF_SHELF,
        rules: { path: ['startTime'], lte: now },
      },
      data: { status: PublishStatus.ON_SHELF },
    });

    // 2. 自动下架过期的活动
    await this.prisma.storePlayConfig.updateMany({
      where: {
        status: PublishStatus.ON_SHELF,
        rules: { path: ['endTime'], lte: now },
      },
      data: { status: PublishStatus.OFF_SHELF },
    });
  }

  /**
   * 每天清理过期数据
   */
  @Cron('0 0 2 * * *') // 凌晨2点
  async cleanupExpiredData() {
    // 归档30天前的实例数据
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    await this.prisma.playInstance.updateMany({
      where: {
        updateTime: { lt: thirtyDaysAgo },
        status: { in: [PlayInstanceStatus.SUCCESS, PlayInstanceStatus.FAILED] },
      },
      data: { archived: true },
    });
  }
}
```

---

### 7. 缺少运营安全机制 ⚠️⚠️

**当前问题**:
- 运营可以随意修改活动规则
- 没有灰度发布机制
- 没有活动回滚能力

**改进方案**:

```typescript
// 1. 活动版本控制
model StorePlayConfig {
  id       String @id
  version  Int    @default(1)
  rules    Json
  rulesHistory Json[] // 历史版本
  // ...
}

// 2. 灰度发布
interface GrayReleaseConfig {
  enabled: boolean;
  whitelistUserIds: string[];  // 白名单用户
  whitelistStoreIds: string[]; // 白名单门店
  percentage: number;          // 灰度比例 0-100
}

// 3. 活动审批流
enum ActivityApprovalStatus {
  DRAFT = 'DRAFT',           // 草稿
  PENDING = 'PENDING',       // 待审批
  APPROVED = 'APPROVED',     // 已通过
  REJECTED = 'REJECTED',     // 已驳回
}

// 4. 风控规则
interface RiskControlRule {
  maxParticipantsPerDay: number;    // 每日最大参与人数
  maxAmountPerUser: number;         // 单用户最大金额
  suspiciousIpCheck: boolean;       // 可疑IP检查
  deviceFingerprintCheck: boolean;  // 设备指纹检查
}
```

---

## 🎯 改进优先级建议

### P0 - 必须立即做（影响稳定性）
1. ✅ **状态机约束** - 防止非法状态跃迁
2. ✅ **幂等性保障** - 防止重复参与/重复扣款
3. ✅ **活动生命周期** - 自动处理超时/过期

### P1 - 近期做（提升可维护性）
4. ✅ **事件驱动机制** - 解耦模块依赖
5. ✅ **玩法注册表** - 标准化玩法元数据

### P2 - 中期做（提升运营体验）
6. ✅ **规则校验统一** - 提前发现配置错误
7. ✅ **运营安全机制** - 灰度发布、审批流

---

## 📐 改进后的架构图

```
┌─────────────────────────────────────────────────────┐
│          运营配置层（Admin Console）                  │
│  - 玩法选择器（基于 PLAY_REGISTRY）                   │
│  - 动态表单（基于 RuleSchema）                        │
│  - 规则校验（RuleValidatorService）                   │
│  - 灰度发布 / 审批流                                  │
└──────────────────────▲──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│          营销引擎层（MAAS Core）                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ PlayStrategyFactory（策略工厂）              │   │
│  │  - 自动注册（装饰器扫描）                     │   │
│  │  - 元数据查询（PLAY_REGISTRY）               │   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │ StateMachine（状态机）                       │   │
│  │  - 状态跃迁约束                              │   │
│  │  - 事件发送                                  │   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │ EventBus（事件总线）                         │   │
│  │  - 实例事件                                  │   │
│  │  - 玩法事件                                  │   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │ LifecycleScheduler（生命周期调度）           │   │
│  │  - 超时处理                                  │   │
│  │  - 自动上下架                                │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────────▲──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│          业务实例层（Activity Runtime）               │
│  - 拼团 / 秒杀 / 满减（Strategy 实现）                │
│  - 用户参与（幂等性保障）                             │
│  - 订单联动（事件监听）                               │
└─────────────────────────────────────────────────────┘
```

---

## 📝 实施路线图

### 第一阶段（1-2周）- 稳定性加固
- [ ] 实现状态机约束
- [ ] 添加幂等性保障
- [ ] 实现活动生命周期调度器

### 第二阶段（2-3周）- 架构优化
- [ ] 引入事件驱动机制
- [ ] 创建玩法注册表
- [ ] 实现装饰器自动注册

### 第三阶段（3-4周）- 运营体验
- [ ] 统一规则校验服务
- [ ] 实现灰度发布
- [ ] 添加审批流

---

## 🎓 总结

当前架构**已经具备营销引擎的核心能力**，主要问题在于：
1. **缺少约束机制**（状态机、幂等性）
2. **缺少自动化**（生命周期、事件驱动）
3. **缺少运营保障**（灰度、审批）

按照上述改进方案，可以在**不推倒重来**的前提下，逐步演进为**工业级营销引擎**。

---

**关键原则**: 
- ✅ 新玩法 ≠ 改老代码
- ✅ 运营配置 ≠ 开发介入
- ✅ 实例可独立失败
- ✅ 活动可回放/回滚
