# Finance 模块测试用例

## 概述

本目录包含了 Finance 模块的完整测试用例,覆盖以下核心功能:

- **佣金服务 (CommissionService)**: 佣金计算、分销规则、跨店限额等
- **钱包服务 (WalletService)**: 余额管理、冻结/解冻、流水记录等
- **提现服务 (WithdrawalService)**: 提现申请、审核、打款等
- **提现审核服务 (WithdrawalAuditService)**: 审核流程、资金变动等
- **结算调度器 (SettlementScheduler)**: 定时结算、分布式锁等
- **佣金处理器 (CommissionProcessor)**: 队列任务处理

## 测试文件列表

```
finance/
├── commission/
│   ├── commission.service.spec.ts       # 佣金服务测试
│   └── commission.processor.spec.ts     # 佣金处理器测试
├── wallet/
│   └── wallet.service.spec.ts           # 钱包服务测试
├── withdrawal/
│   ├── withdrawal.service.spec.ts       # 提现服务测试
│   └── withdrawal-audit.service.spec.ts # 提现审核服务测试
└── settlement/
    └── settlement.scheduler.spec.ts     # 结算调度器测试
```

## 运行测试

### 运行所有 Finance 模块测试

```bash
npm test -- finance
```

### 运行特定服务的测试

```bash
# 佣金服务测试
npm test -- commission.service.spec.ts

# 钱包服务测试
npm test -- wallet.service.spec.ts

# 提现服务测试
npm test -- withdrawal.service.spec.ts

# 提现审核服务测试
npm test -- withdrawal-audit.service.spec.ts

# 结算调度器测试
npm test -- settlement.scheduler.spec.ts

# 佣金处理器测试
npm test -- commission.processor.spec.ts
```

### 运行测试并生成覆盖率报告

```bash
npm test -- finance --coverage
```

### 监听模式运行测试

```bash
npm test -- finance --watch
```

## 测试覆盖范围

### CommissionService (佣金服务)

- ✅ 触发佣金计算任务
- ✅ 获取分销配置 (租户配置/默认配置)
- ✅ 自购检测 (分享人自购/上级自购)
- ✅ 佣金计算核心逻辑
  - 订单不存在/会员不存在
  - 自购订单跳过
  - 佣金基数为0跳过
  - L1佣金计算 (C1直推)
  - L1+L2佣金计算 (C2全拿场景)
  - 黑名单校验
  - 身份校验 (C1/C2)
- ✅ 取消佣金 (冻结中/已结算)
- ✅ 更新结算时间 (服务核销/实物确认)
- ✅ 循环推荐检测
- ✅ 获取订单佣金列表

### WalletService (钱包服务)

- ✅ 获取或创建钱包
- ✅ 获取钱包信息
- ✅ 增加余额
- ✅ 扣减余额
- ✅ 冻结余额
- ✅ 解冻余额
- ✅ 扣减冻结余额
- ✅ 获取用户流水列表

### WithdrawalService (提现服务)

- ✅ 申请提现
  - 成功申请
  - 金额低于最小提现金额
  - 钱包不存在
  - 余额不足
- ✅ 审核提现
  - 审核通过
  - 审核驳回
  - 提现申请不存在
  - 不支持的审核操作
- ✅ 获取提现列表 (支持筛选和搜索)
- ✅ 获取用户提现记录

### WithdrawalAuditService (提现审核服务)

- ✅ 审核通过
  - 成功审核并打款
  - 处理打款失败
- ✅ 审核驳回
  - 成功驳回
  - 支持无备注驳回

### SettlementScheduler (结算调度器)

- ✅ 定时结算任务
  - 成功获取锁并执行
  - 无法获取锁时跳过
  - 批量处理到期佣金
  - 创建钱包 (钱包不存在)
  - 单条失败不影响其他记录
  - 异常时释放锁

### CommissionProcessor (佣金处理器)

- ✅ 处理佣金计算任务
  - 成功处理
  - 计算失败触发重试

## 测试技术栈

- **测试框架**: Jest
- **测试工具**: @nestjs/testing
- **Mock 策略**: 使用 Jest Mock 模拟依赖服务

## 测试最佳实践

### 1. Mock 策略

所有外部依赖都使用 Mock 对象:

```typescript
const mockPrismaService = {
  sysDistConfig: {
    findUnique: jest.fn(),
  },
};
```

### 2. 测试隔离

每个测试用例之间相互独立,使用 `afterEach` 清理 Mock:

```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```

### 3. 测试命名

使用清晰的中文描述测试场景:

```typescript
it('应该成功计算L1佣金 - C1直推', async () => {
  // ...
});
```

### 4. 边界条件测试

覆盖正常场景和异常场景:

- 成功场景
- 参数验证失败
- 业务规则校验失败
- 数据不存在
- 并发冲突

## 注意事项

1. **Decimal 类型**: 使用 `@prisma/client/runtime/library` 的 `Decimal` 类型处理金额
2. **事务测试**: 事务逻辑通过 Mock `$transaction` 方法测试
3. **异步任务**: 队列任务通过 Mock Bull Queue 测试
4. **分布式锁**: Redis 锁通过 Mock RedisService 测试

## 持续改进

测试用例会随着业务逻辑的变化持续更新,确保:

- 测试覆盖率 > 80%
- 关键业务逻辑 100% 覆盖
- 边界条件充分测试
- 异常场景妥善处理

## 相关文档

- [Finance 模块架构文档](./README.md)
- [佣金计算规则](./commission/README.md)
- [提现流程说明](./withdrawal/README.md)
