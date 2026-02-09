# 灰度发布服务 (Gray Release Service)

## 📋 概述

灰度发布服务提供营销活动的灰度发布功能，支持白名单控制和按比例灰度，确保新活动可以安全、渐进式地发布。

## 🎯 核心功能

### 1. 白名单用户控制
- 指定用户ID列表，这些用户始终可以参与活动
- 适用场景：内部员工测试、VIP用户优先体验

### 2. 白名单门店控制
- 指定门店ID列表，这些门店的所有用户都可以参与活动
- 适用场景：区域试点、特定门店测试

### 3. 按比例灰度
- 基于用户ID哈希的百分比控制（0-100%）
- 相同用户ID始终返回相同结果，确保灰度策略的稳定性
- 适用场景：逐步放量、A/B测试

## 🔧 使用方法

### 基本用法

```typescript
import { GrayReleaseService } from './gray/gray-release.service';

@Injectable()
export class YourService {
  constructor(private readonly grayReleaseService: GrayReleaseService) {}

  async checkUserAccess(config: StorePlayConfig, memberId: string, storeId: string) {
    // 检查用户是否在灰度范围内
    const canJoin = await this.grayReleaseService.isInGrayRelease(
      config,
      memberId,
      storeId
    );

    if (!canJoin) {
      throw new BusinessException('活动暂未对您开放，敬请期待');
    }

    // 继续业务逻辑...
  }
}
```

### 灰度配置示例

```typescript
// 场景1: 未启用灰度（全量放开）
const config = {
  id: 'config-1',
  grayRelease: {
    enabled: false,
    whitelistUserIds: [],
    whitelistStoreIds: [],
    percentage: 0
  }
};

// 场景2: 仅白名单用户可参与
const config = {
  id: 'config-1',
  grayRelease: {
    enabled: true,
    whitelistUserIds: ['user-1', 'user-2', 'user-3'],
    whitelistStoreIds: [],
    percentage: 0
  }
};

// 场景3: 白名单门店可参与
const config = {
  id: 'config-1',
  grayRelease: {
    enabled: true,
    whitelistUserIds: [],
    whitelistStoreIds: ['store-1', 'store-2'],
    percentage: 0
  }
};

// 场景4: 50%灰度（基于用户ID哈希）
const config = {
  id: 'config-1',
  grayRelease: {
    enabled: true,
    whitelistUserIds: [],
    whitelistStoreIds: [],
    percentage: 50
  }
};

// 场景5: 组合策略（白名单 + 灰度）
const config = {
  id: 'config-1',
  grayRelease: {
    enabled: true,
    whitelistUserIds: ['user-1'], // 内部员工
    whitelistStoreIds: ['store-1'], // 试点门店
    percentage: 10 // 其他用户10%灰度
  }
};
```

## 📊 判断优先级

灰度判断按照以下优先级进行：

1. **未启用灰度** → 返回 `true`（全量放开）
2. **白名单用户** → 返回 `true`
3. **白名单门店** → 返回 `true`
4. **按比例灰度** → 基于用户ID哈希判断

## 🔐 哈希算法说明

### 算法原理

```typescript
// 1. 对用户ID进行 MD5 哈希
const hash = crypto.createHash('md5').update(memberId).digest('hex');

// 2. 取哈希值的前8个字符
const hashValue = parseInt(hash.substring(0, 8), 16);

// 3. 对100取模，得到 0-99 的值
return hashValue % 100;
```

### 特性

- **稳定性**: 相同用户ID始终返回相同哈希值
- **均匀分布**: 用户ID均匀分布在 0-99 范围内
- **确定性**: 不依赖随机数，结果可预测和复现

### 示例

```typescript
// 用户 'user-123' 的哈希值假设为 42
// 灰度比例 50% 时：42 < 50，可以参与
// 灰度比例 30% 时：42 >= 30，不能参与
// 灰度比例 100% 时：42 < 100，可以参与
```

## 🧪 测试

### 运行单元测试

```bash
npm test -- gray-release.service.spec.ts
```

### 测试覆盖场景

- ✅ 未启用灰度
- ✅ 白名单用户
- ✅ 白名单门店
- ✅ 按比例灰度（0%, 50%, 100%）
- ✅ 哈希算法稳定性
- ✅ 优先级测试
- ✅ 配置验证

## 📝 数据库字段

### StorePlayConfig 表

需要在 `StorePlayConfig` 表中添加 `grayRelease` 字段：

```prisma
model StorePlayConfig {
  id              String              @id @default(cuid())
  // ... 其他字段
  grayRelease     Json?               // 灰度发布配置
  // ... 其他字段
}
```

### 字段结构

```typescript
interface GrayReleaseConfig {
  enabled: boolean;              // 是否启用灰度
  whitelistUserIds: string[];    // 白名单用户ID列表
  whitelistStoreIds: string[];   // 白名单门店ID列表
  percentage: number;            // 灰度比例 0-100
}
```

## 🚀 集成到实例服务

### 在 create() 方法中集成

```typescript
@Injectable()
export class PlayInstanceService {
  constructor(
    private readonly grayReleaseService: GrayReleaseService,
    // ... 其他依赖
  ) {}

  async create(dto: CreatePlayInstanceDto) {
    // 1. 获取活动配置
    const config = await this.prisma.storePlayConfig.findUnique({
      where: { id: dto.configId },
    });

    // 2. 灰度检查
    const canJoin = await this.grayReleaseService.isInGrayRelease(
      config,
      dto.memberId,
      config.storeId
    );

    if (!canJoin) {
      throw new BusinessException(
        ResponseCode.BUSINESS_ERROR,
        '活动暂未对您开放，敬请期待'
      );
    }

    // 3. 继续创建实例...
  }
}
```

## 📈 使用场景

### 场景1: 内部测试

```typescript
// 新活动先对内部员工开放
{
  enabled: true,
  whitelistUserIds: ['emp-001', 'emp-002', 'emp-003'],
  whitelistStoreIds: [],
  percentage: 0
}
```

### 场景2: 区域试点

```typescript
// 先在北京、上海两个城市试点
{
  enabled: true,
  whitelistUserIds: [],
  whitelistStoreIds: ['store-beijing-001', 'store-shanghai-001'],
  percentage: 0
}
```

### 场景3: 逐步放量

```typescript
// 第一天：10%灰度
{
  enabled: true,
  whitelistUserIds: [],
  whitelistStoreIds: [],
  percentage: 10
}

// 第二天：30%灰度
{
  enabled: true,
  whitelistUserIds: [],
  whitelistStoreIds: [],
  percentage: 30
}

// 第三天：100%全量
{
  enabled: false, // 或者 percentage: 100
  whitelistUserIds: [],
  whitelistStoreIds: [],
  percentage: 100
}
```

### 场景4: 紧急回滚

```typescript
// 发现问题，立即回滚到0%
{
  enabled: true,
  whitelistUserIds: [],
  whitelistStoreIds: [],
  percentage: 0
}
```

## 🔍 监控与日志

服务会自动记录灰度检查日志：

```typescript
// 日志示例
[灰度检查] 活动 config-123 未启用灰度，全量放开
[灰度检查] 用户 user-456 在白名单中，允许参与活动 config-123
[灰度检查] 门店 store-789 在白名单中，允许用户 user-456 参与活动 config-123
[灰度检查] 用户 user-456 哈希值 42，灰度比例 50%，在灰度范围内
```

## 📚 相关文档

- [需求文档](../../../../.kiro/specs/maas-architecture-improvement/requirements.md) - FR-7.2, US-6
- [设计文档](../../../../.kiro/specs/maas-architecture-improvement/design.md) - 运营安全机制
- [任务列表](../../../../.kiro/specs/maas-architecture-improvement/tasks.md) - Task 7.1

## ✅ 验收标准

- [x] 实现 `isInGrayRelease()` 方法
- [x] 支持白名单用户控制
- [x] 支持白名单门店控制
- [x] 支持按比例灰度（基于用户ID哈希）
- [x] 添加完整中文注释
- [x] 单元测试覆盖率 100%
- [x] 验证需求: FR-7.2, US-6

## 🎯 后续任务

- [ ] Task 7.2: 集成灰度判断到实例服务
- [ ] Task 7.3: 实现活动审批流
- [ ] Task 7.4: 实现活动版本控制
- [ ] 添加 Prisma schema 中的 `grayRelease` 字段
- [ ] 创建灰度配置管理 API
- [ ] 添加灰度效果监控面板
