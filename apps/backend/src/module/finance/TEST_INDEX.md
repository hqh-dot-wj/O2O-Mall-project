# Finance 模块测试用例索引

> 快速查找和导航所有测试相关文件

## 📚 文档导航

| 文档 | 描述 | 路径 |
|------|------|------|
| 📖 [测试用例说明](./README.TEST.md) | 详细的测试用例说明和使用指南 | `README.TEST.md` |
| 🔧 [测试脚本配置](./TEST_SCRIPTS.md) | Jest 配置和 npm 脚本说明 | `TEST_SCRIPTS.md` |
| 📊 [测试总结](./TEST_SUMMARY.md) | 测试覆盖范围和统计信息 | `TEST_SUMMARY.md` |
| 📑 [测试索引](./TEST_INDEX.md) | 本文档 - 快速导航 | `TEST_INDEX.md` |

## 🧪 测试文件目录

### Commission (佣金模块)

```
commission/
├── commission.service.spec.ts           # 佣金服务单元测试
├── commission.processor.spec.ts         # 佣金处理器单元测试
└── commission.service.advanced.spec.ts  # 佣金服务高级测试
```

**测试内容**:
- 佣金计算核心逻辑
- 分销配置管理
- 自购检测
- 循环推荐检测
- 跨店佣金处理
- C2全拿场景
- 黑名单校验
- 佣金取消和回滚

**快速跳转**:
- [commission.service.spec.ts](./commission/commission.service.spec.ts)
- [commission.processor.spec.ts](./commission/commission.processor.spec.ts)
- [commission.service.advanced.spec.ts](./commission/commission.service.advanced.spec.ts)

---

### Wallet (钱包模块)

```
wallet/
└── wallet.service.spec.ts  # 钱包服务单元测试
```

**测试内容**:
- 钱包创建和查询
- 余额增加和扣减
- 余额冻结和解冻
- 流水记录管理

**快速跳转**:
- [wallet.service.spec.ts](./wallet/wallet.service.spec.ts)

---

### Withdrawal (提现模块)

```
withdrawal/
├── withdrawal.service.spec.ts       # 提现服务单元测试
└── withdrawal-audit.service.spec.ts # 提现审核服务单元测试
```

**测试内容**:
- 提现申请流程
- 提现审核 (通过/驳回)
- 打款处理
- 余额冻结和退回
- 提现列表查询

**快速跳转**:
- [withdrawal.service.spec.ts](./withdrawal/withdrawal.service.spec.ts)
- [withdrawal-audit.service.spec.ts](./withdrawal/withdrawal-audit.service.spec.ts)

---

### Settlement (结算模块)

```
settlement/
└── settlement.scheduler.spec.ts  # 结算调度器单元测试
```

**测试内容**:
- 定时结算任务
- 分布式锁机制
- 批量结算处理
- 钱包自动创建
- 异常处理

**快速跳转**:
- [settlement.scheduler.spec.ts](./settlement/settlement.scheduler.spec.ts)

---

### Integration (集成测试)

```
finance.integration.spec.ts  # Finance 模块集成测试
```

**测试内容**:
- 完整业务流程测试
- 并发场景测试
- 性能测试

**快速跳转**:
- [finance.integration.spec.ts](./finance.integration.spec.ts)

---

### Test Utils (测试工具)

```
test/
└── test-data.factory.ts  # 测试数据工厂
```

**提供的工具**:
- 测试数据生成器
- 场景数据构造器
- 批量数据创建器

**快速跳转**:
- [test-data.factory.ts](./test/test-data.factory.ts)

## 🎯 按功能查找测试

### 佣金相关

| 功能 | 测试文件 | 测试用例 |
|------|---------|---------|
| 触发佣金计算 | `commission.service.spec.ts` | `triggerCalculation` |
| 获取分销配置 | `commission.service.spec.ts` | `getDistConfig` |
| 自购检测 | `commission.service.spec.ts` | `checkSelfPurchase` |
| 计算佣金 | `commission.service.spec.ts` | `calculateCommission` |
| 取消佣金 | `commission.service.spec.ts` | `cancelCommissions` |
| 更新结算时间 | `commission.service.spec.ts` | `updatePlanSettleTime` |
| 循环推荐检测 | `commission.service.spec.ts` | `checkCircularReferral` |
| 队列处理 | `commission.processor.spec.ts` | `handleCalcCommission` |
| 推荐关系链 | `commission.service.advanced.spec.ts` | 推荐关系链测试 |
| 跨店佣金 | `commission.service.advanced.spec.ts` | 跨店佣金测试 |
| C2全拿 | `commission.service.advanced.spec.ts` | C2全拿场景测试 |

### 钱包相关

| 功能 | 测试文件 | 测试用例 |
|------|---------|---------|
| 获取或创建钱包 | `wallet.service.spec.ts` | `getOrCreateWallet` |
| 获取钱包信息 | `wallet.service.spec.ts` | `getWallet` |
| 增加余额 | `wallet.service.spec.ts` | `addBalance` |
| 扣减余额 | `wallet.service.spec.ts` | `deductBalance` |
| 冻结余额 | `wallet.service.spec.ts` | `freezeBalance` |
| 解冻余额 | `wallet.service.spec.ts` | `unfreezeBalance` |
| 扣减冻结余额 | `wallet.service.spec.ts` | `deductFrozen` |
| 获取流水列表 | `wallet.service.spec.ts` | `getTransactions` |

### 提现相关

| 功能 | 测试文件 | 测试用例 |
|------|---------|---------|
| 申请提现 | `withdrawal.service.spec.ts` | `apply` |
| 审核提现 | `withdrawal.service.spec.ts` | `audit` |
| 获取提现列表 | `withdrawal.service.spec.ts` | `getList` |
| 获取用户提现记录 | `withdrawal.service.spec.ts` | `getMemberWithdrawals` |
| 审核通过 | `withdrawal-audit.service.spec.ts` | `approve` |
| 审核驳回 | `withdrawal-audit.service.spec.ts` | `reject` |

### 结算相关

| 功能 | 测试文件 | 测试用例 |
|------|---------|---------|
| 定时结算任务 | `settlement.scheduler.spec.ts` | `settleJob` |
| 分布式锁 | `settlement.scheduler.spec.ts` | 获取锁/释放锁 |
| 批量结算 | `settlement.scheduler.spec.ts` | 批量处理 |

## 🔍 按场景查找测试

### 正常场景

| 场景 | 测试文件 | 位置 |
|------|---------|------|
| 标准佣金计算 | `commission.service.spec.ts` | `calculateCommission` |
| C1直推获得L1佣金 | `commission.service.spec.ts` | 应该成功计算L1佣金 |
| C1+C2获得L1+L2佣金 | `commission.service.advanced.spec.ts` | 三级推荐关系链 |
| 钱包余额操作 | `wallet.service.spec.ts` | 各个方法测试 |
| 提现申请 | `withdrawal.service.spec.ts` | apply |
| 提现审核通过 | `withdrawal-audit.service.spec.ts` | approve |
| 定时结算 | `settlement.scheduler.spec.ts` | settleJob |

### 异常场景

| 场景 | 测试文件 | 位置 |
|------|---------|------|
| 订单不存在 | `commission.service.spec.ts` | 应该跳过计算 |
| 会员不存在 | `commission.service.spec.ts` | 应该跳过计算 |
| 自购订单 | `commission.service.spec.ts` | 应该跳过计算 |
| 余额不足 | `withdrawal.service.spec.ts` | 应该抛出异常 |
| 提现金额过低 | `withdrawal.service.spec.ts` | 应该抛出异常 |
| 打款失败 | `withdrawal-audit.service.spec.ts` | 应该处理打款失败 |
| 获取锁失败 | `settlement.scheduler.spec.ts` | 应该跳过执行 |

### 边界场景

| 场景 | 测试文件 | 位置 |
|------|---------|------|
| 佣金基数为0 | `commission.service.spec.ts` | 应该跳过计算 |
| 黑名单用户 | `commission.service.spec.ts` | 应该跳过L1 |
| 非C1/C2用户 | `commission.service.spec.ts` | 应该跳过L1 |
| 循环推荐 | `commission.service.spec.ts` | checkCircularReferral |
| 跨店限额 | `commission.service.advanced.spec.ts` | 应该检查跨店日限额 |

### 复杂场景

| 场景 | 测试文件 | 位置 |
|------|---------|------|
| C2全拿 | `commission.service.spec.ts` | L1+L2佣金计算 |
| 跨店佣金 | `commission.service.advanced.spec.ts` | 跨店佣金测试 |
| 佣金回滚 | `commission.service.spec.ts` | cancelCommissions |
| 并发提现 | `finance.integration.spec.ts` | 并发场景测试 |

## 🚀 快速命令

### 运行测试

```bash
# 运行所有 Finance 测试
npm run test:finance

# 运行特定模块测试
npm run test:commission   # 佣金
npm run test:wallet       # 钱包
npm run test:withdrawal   # 提现
npm run test:settlement   # 结算

# 运行特定文件
npm test -- commission.service.spec.ts
npm test -- wallet.service.spec.ts

# 监听模式
npm run test:finance:watch

# 生成覆盖率
npm run test:finance:cov
```

### 调试测试

```bash
# 调试模式
npm run test:debug

# VSCode 调试
# 使用 F5 或点击调试按钮
```

## 📊 测试覆盖率查看

```bash
# 生成覆盖率报告
npm run test:finance:cov

# 打开 HTML 报告
# coverage/lcov-report/index.html
```

## 🔗 相关链接

### 内部文档
- [Finance 模块架构](./README.md)
- [佣金计算规则](./commission/README.md)
- [提现流程说明](./withdrawal/README.md)

### 外部资源
- [Jest 官方文档](https://jestjs.io/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [测试驱动开发](https://en.wikipedia.org/wiki/Test-driven_development)

## 💡 使用建议

### 新手入门
1. 先阅读 [README.TEST.md](./README.TEST.md)
2. 查看 [TEST_SUMMARY.md](./TEST_SUMMARY.md) 了解覆盖范围
3. 运行 `npm run test:finance` 体验测试
4. 查看具体的测试文件学习写法

### 添加新测试
1. 确定测试类型 (单元/集成)
2. 使用 `TestDataFactory` 创建测试数据
3. 参考现有测试用例的写法
4. 运行测试确保通过
5. 更新相关文档

### 维护测试
1. 代码变更时同步更新测试
2. 定期检查测试覆盖率
3. 清理过时的测试用例
4. 优化测试性能

## 📞 获取帮助

如有问题:
1. 查看本索引文档
2. 阅读详细的测试文档
3. 查看测试用例示例
4. 联系开发团队

---

**最后更新**: 2026-01-28  
**维护者**: Backend Team  
**版本**: v1.0.0
