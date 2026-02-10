# 优惠券和积分分佣计算 - 测试用例总结

## 📊 测试覆盖概览

### 测试文件统计
- ✅ 单元测试文件：1个
- ✅ 集成测试文件：1个
- ✅ 测试指南文档：1个
- ✅ 总测试用例：17个

### 测试覆盖率目标
- 代码覆盖率：≥ 90%
- 分支覆盖率：≥ 85%
- 函数覆盖率：≥ 95%

---

## 🧪 单元测试用例（12个）

### 文件：`commission-coupon-points.spec.ts`

#### 场景1: 基于原价分佣（2个用例）

**用例1.1**: 应该基于商品原价计算佣金，不受优惠券影响
```typescript
输入：
- 商品原价：100元
- 优惠券：-20元
- 积分：-10元
- 实付：70元

预期输出：
- 分佣基数：100元
- L1佣金：10元
- L2佣金：5元
- isCapped：false
```

**用例1.2**: 应该在大额优惠时触发熔断保护
```typescript
输入：
- 商品原价：100元
- 优惠券：-90元
- 实付：10元

预期输出：
- 原始佣金：15元
- 实际佣金：5元（熔断至50%）
- isCapped：true
```

---

#### 场景2: 基于实付分佣（1个用例）

**用例2.1**: 应该基于实付金额计算佣金
```typescript
输入：
- 商品原价：100元
- 实付：70元
- 配置：ACTUAL_PAID

预期输出：
- 分佣基数：70元
- L1佣金：7元
- L2佣金：3.5元
```

---

#### 场景3: 兑换商品不分佣（1个用例）

**用例3.1**: 应该识别兑换商品并跳过分佣
```typescript
输入：
- 商品：兑换商品（isExchangeProduct = true）
- 原价：50元
- 实付：0元

预期输出：
- 分佣基数：0元
- 佣金记录：0条
```

---

#### 场景4: 混合订单处理（1个用例）

**用例4.1**: 应该仅对正常商品计算分佣，忽略兑换商品
```typescript
输入：
- 商品A：正常商品，100元
- 商品B：兑换商品，50元
- 优惠券：-70元
- 实付：80元

预期输出：
- 分佣基数：100元（仅商品A）
- L1佣金：10元
- L2佣金：5元
```

---

#### 场景5: 边界情况测试（5个用例）

**用例5.1**: 应该处理自购订单（不分佣）
```typescript
输入：
- 下单人：member_001
- 推荐人：member_001（自己）

预期输出：
- 佣金记录：0条
```

**用例5.2**: 应该处理分佣基数为0的情况
```typescript
输入：
- 商品：distMode = 'NONE'

预期输出：
- 佣金记录：0条
```

**用例5.3**: 应该处理熔断比例为100%的情况
```typescript
输入：
- maxCommissionRate：1.0
- 原始佣金：15元
- 实付：10元

预期输出：
- 总佣金：10元
- isCapped：true
```

**用例5.4**: 应该处理无推荐人的情况
```typescript
输入：
- parentId：null

预期输出：
- 佣金记录：0条
```

**用例5.5**: 应该处理推荐人等级不符的情况
```typescript
输入：
- 推荐人：levelId = 0（普通会员）

预期输出：
- 佣金记录：0条
```

---

#### 场景6: 配置获取测试（2个用例）

**用例6.1**: 应该返回数据库中的配置
```typescript
输入：
- tenantId：'tenant_001'
- 数据库有配置

预期输出：
- commissionBaseType：'ORIGINAL_PRICE'
- maxCommissionRate：0.50
```

**用例6.2**: 应该返回默认配置（当数据库无配置时）
```typescript
输入：
- tenantId：'tenant_new'
- 数据库无配置

预期输出：
- commissionBaseType：'ORIGINAL_PRICE'
- maxCommissionRate：0.5（默认值）
```

---

## 🌐 集成测试用例（5个）

### 文件：`commission-coupon-points.e2e-spec.ts`

#### 场景1: 正常商品 + 优惠券（基于原价）

**测试流程**：
1. 发放优惠券
2. 创建订单（使用优惠券）
3. 支付订单
4. 等待异步佣金计算
5. 验证佣金记录

**验证点**：
- ✅ L1佣金 = 10元
- ✅ L2佣金 = 5元
- ✅ 分佣基数 = 100元（原价）
- ✅ 审计字段完整

---

#### 场景2: 大额优惠触发熔断

**测试流程**：
1. 创建大额优惠券（90元）
2. 发放优惠券
3. 创建订单
4. 支付订单
5. 验证熔断

**验证点**：
- ✅ 总佣金 = 5元（熔断至50%）
- ✅ isCapped = true
- ✅ 按比例缩减

---

#### 场景3: 兑换商品不分佣

**测试流程**：
1. 创建兑换券
2. 发放兑换券
3. 创建订单（兑换商品）
4. 支付订单
5. 验证无佣金

**验证点**：
- ✅ 佣金记录 = 0条
- ✅ 订单状态正常

---

#### 场景4: 混合订单

**测试流程**：
1. 创建订单（正常商品 + 兑换商品）
2. 支付订单
3. 验证佣金

**验证点**：
- ✅ 分佣基数 = 100元（仅正常商品）
- ✅ L1佣金 = 10元
- ✅ L2佣金 = 5元

---

#### 场景5: 基于实付金额分佣

**测试流程**：
1. 修改配置为 ACTUAL_PAID
2. 发放优惠券
3. 创建订单
4. 支付订单
5. 验证佣金
6. 恢复配置

**验证点**：
- ✅ 分佣基数 = 80元（实付）
- ✅ L1佣金 = 8元
- ✅ L2佣金 = 4元
- ✅ commissionBaseType = 'ACTUAL_PAID'

---

## 📋 测试数据准备

### 租户配置
```typescript
{
  tenantId: 'test_tenant_001',
  level1Rate: 0.10,
  level2Rate: 0.05,
  commissionBaseType: 'ORIGINAL_PRICE',
  maxCommissionRate: 0.50
}
```

### 会员关系链
```
member_003 (C2)
    ↑
member_002 (C1)
    ↑
member_001 (普通会员)
```

### 商品配置
```typescript
// 正常商品
{
  id: 'test_sku_001',
  price: 100,
  distMode: 'RATIO',
  distRate: 1.0,
  isExchangeProduct: false
}

// 兑换商品
{
  id: 'test_sku_exchange',
  price: 50,
  distMode: 'NONE',
  distRate: 0,
  isExchangeProduct: true
}
```

### 优惠券配置
```typescript
// 普通优惠券
{
  id: 'test_coupon_template_001',
  type: 'DISCOUNT',
  discountAmount: 20,
  minOrderAmount: 50,
  minActualPayAmount: 10
}

// 大额优惠券
{
  discountAmount: 90,
  minActualPayAmount: 1
}

// 兑换券
{
  type: 'EXCHANGE',
  minActualPayAmount: 0,
  exchangeSkuId: 'test_sku_exchange'
}
```

---

## 🎯 测试执行命令

### 运行所有测试
```bash
# 单元测试
npm run test -- commission-coupon-points.spec.ts

# 集成测试
npm run test:e2e -- commission-coupon-points.e2e-spec.ts

# 所有测试 + 覆盖率
npm run test:cov
```

### 监听模式（开发时）
```bash
npm run test:watch -- commission-coupon-points.spec.ts
```

### 调试模式
```bash
npm run test:debug -- commission-coupon-points.spec.ts
```

---

## ✅ 测试检查清单

### 单元测试
- [x] 所有测试用例编写完成
- [x] Mock 数据准备完整
- [x] 断言清晰准确
- [x] 边界情况覆盖
- [ ] 测试执行通过
- [ ] 代码覆盖率 ≥ 90%

### 集成测试
- [x] 测试数据准备完整
- [x] 测试流程完整
- [x] 数据清理逻辑
- [x] 异步等待处理
- [ ] 测试执行通过
- [ ] 端到端流程验证

### 测试文档
- [x] 测试指南编写
- [x] Mock 数据说明
- [x] 常见问题解答
- [x] 测试命令说明

---

## 📊 预期测试结果

### 单元测试
```
Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
Snapshots:   0 total
Time:        3.5s
Coverage:    92.5%
```

### 集成测试
```
Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        25s
```

---

## 🐛 已知问题和限制

### 1. 异步佣金计算
- **问题**: E2E 测试需要等待异步计算完成
- **解决**: 使用 `setTimeout` 等待 2-3 秒
- **改进**: 可以使用轮询或事件监听

### 2. 测试数据隔离
- **问题**: 多个测试可能共享数据
- **解决**: 每个测试使用唯一 ID
- **改进**: 使用事务回滚

### 3. Mock 数据复杂度
- **问题**: 分佣逻辑涉及多表关联
- **解决**: 准备完整的 Mock 数据
- **改进**: 使用工厂模式生成测试数据

---

## 📚 相关文档

- [测试指南](./COMMISSION_TESTING_GUIDE.md)
- [数据库迁移文档](./COMMISSION_WITH_COUPON_POINTS_MIGRATION.md)
- [使用示例文档](./COMMISSION_CALCULATION_EXAMPLES.md)
- [实施清单](./COMMISSION_IMPLEMENTATION_CHECKLIST.md)

---

## 🎉 总结

### 已完成
- ✅ 12个单元测试用例
- ✅ 5个集成测试用例
- ✅ 完整的测试文档
- ✅ Mock 数据准备
- ✅ 测试检查清单

### 测试覆盖
- ✅ 基于原价分佣
- ✅ 基于实付分佣
- ✅ 兑换商品不分佣
- ✅ 混合订单处理
- ✅ 熔断保护机制
- ✅ 边界情况处理
- ✅ 配置获取逻辑

### 下一步
1. 执行单元测试
2. 执行集成测试
3. 验证覆盖率
4. 修复发现的问题
5. 补充遗漏的测试用例

---

**创建日期**: 2025-02-08  
**版本**: v1.0.0  
**状态**: ✅ 测试用例已完成
