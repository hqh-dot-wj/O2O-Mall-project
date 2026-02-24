# 优惠券和积分分佣计算 - 测试指南

## 📋 测试概述

本文档提供优惠券和积分分佣计算系统的完整测试指南，包括单元测试、集成测试和手动测试。

---

## 🧪 测试文件

### 1. 单元测试

**文件**: `src/module/finance/commission/commission-coupon-points.spec.ts`

**测试场景**：

- ✅ 场景1: 基于原价分佣（ORIGINAL_PRICE）
- ✅ 场景2: 基于实付分佣（ACTUAL_PAID）
- ✅ 场景3: 兑换商品不分佣（ZERO）
- ✅ 场景4: 混合订单处理
- ✅ 场景5: 边界情况测试
- ✅ 配置获取测试

**测试用例数**: 12个

### 2. 集成测试（E2E）

**文件**: `test/commission-coupon-points.e2e-spec.ts`

**测试场景**：

- ✅ 场景1: 正常商品 + 优惠券（基于原价）
- ✅ 场景2: 大额优惠触发熔断
- ✅ 场景3: 兑换商品不分佣
- ✅ 场景4: 混合订单
- ✅ 场景5: 基于实付金额分佣

**测试用例数**: 5个

---

## 🚀 运行测试

### 单元测试

```bash
# 运行所有单元测试
npm run test

# 运行特定测试文件
npm run test -- commission-coupon-points.spec.ts

# 运行测试并生成覆盖率报告
npm run test:cov

# 监听模式（开发时使用）
npm run test:watch -- commission-coupon-points.spec.ts
```

### 集成测试

```bash
# 运行所有 E2E 测试
npm run test:e2e

# 运行特定测试文件
npm run test:e2e -- commission-coupon-points.e2e-spec.ts

# 调试模式
npm run test:e2e:debug -- commission-coupon-points.e2e-spec.ts
```

---

## 📊 测试覆盖率目标

| 模块                    | 目标覆盖率 | 当前覆盖率 |
| ----------------------- | ---------- | ---------- |
| CommissionService       | 90%        | -          |
| calculateCommissionBase | 100%       | -          |
| calculateCommission     | 95%        | -          |
| getDistConfig           | 100%       | -          |

---

## 🔍 测试场景详解

### 场景1: 基于原价分佣

**测试目的**: 验证基于商品原价计算佣金，不受优惠券影响

**测试数据**:

```typescript
{
  商品原价: 100元,
  优惠券: -20元,
  积分抵扣: -10元,
  实付: 70元,

  分销配置: {
    commissionBaseType: 'ORIGINAL_PRICE',
    level1Rate: 0.10,
    level2Rate: 0.05,
    maxCommissionRate: 0.50
  }
}
```

**预期结果**:

```typescript
{
  分佣基数: 100元,
  L1佣金: 10元,
  L2佣金: 5元,
  总佣金: 15元,
  isCapped: false
}
```

**验证点**:

- ✅ 分佣基数等于商品原价
- ✅ 佣金计算不受优惠影响
- ✅ 审计字段正确记录
- ✅ 未触发熔断

---

### 场景2: 大额优惠触发熔断

**测试目的**: 验证熔断保护机制

**测试数据**:

```typescript
{
  商品原价: 100元,
  优惠券: -90元,
  实付: 10元,

  分销配置: {
    commissionBaseType: 'ORIGINAL_PRICE',
    maxCommissionRate: 0.50
  }
}
```

**预期结果**:

```typescript
{
  原始佣金: 15元,
  最大允许: 5元 (10 × 50%),
  缩减比例: 0.333,
  实际L1: 3.33元,
  实际L2: 1.67元,
  isCapped: true
}
```

**验证点**:

- ✅ 触发熔断保护
- ✅ 按比例缩减佣金
- ✅ 标记 isCapped = true
- ✅ 总佣金不超过限制

---

### 场景3: 兑换商品不分佣

**测试目的**: 验证兑换商品识别和跳过逻辑

**测试数据**:

```typescript
{
  商品: 兑换商品 (isExchangeProduct = true),
  原价: 50元,
  实付: 0元,
  优惠券: -50元 (兑换券)
}
```

**预期结果**:

```typescript
{
  分佣基数: 0元,
  佣金记录: 0条
}
```

**验证点**:

- ✅ 识别兑换商品
- ✅ 不产生佣金记录
- ✅ 日志记录跳过原因

---

### 场景4: 混合订单

**测试目的**: 验证混合订单的分佣计算

**测试数据**:

```typescript
{
  商品A: 正常商品, 100元,
  商品B: 兑换商品, 50元,
  优惠券: -20元,
  实付: 80元
}
```

**预期结果**:

```typescript
{
  分佣基数: 100元 (仅商品A),
  L1佣金: 10元,
  L2佣金: 5元
}
```

**验证点**:

- ✅ 仅对正常商品计算
- ✅ 兑换商品不参与
- ✅ 分佣基数正确

---

### 场景5: 基于实付分佣

**测试目的**: 验证基于实付金额的分佣计算

**测试数据**:

```typescript
{
  商品原价: 100元,
  实付: 70元,

  分销配置: {
    commissionBaseType: 'ACTUAL_PAID'
  }
}
```

**预期结果**:

```typescript
{
  分佣基数: 70元,
  L1佣金: 7元,
  L2佣金: 3.5元
}
```

**验证点**:

- ✅ 分佣基数等于实付金额
- ✅ 佣金按实付计算
- ✅ 基数类型正确记录

---

## 🐛 边界情况测试

### 1. 自购订单

```typescript
{
  下单人: member_001,
  推荐人: member_001, // 自己推荐自己

  预期: 不产生佣金
}
```

### 2. 分佣基数为0

```typescript
{
  商品: distMode = 'NONE',

  预期: 不产生佣金
}
```

### 3. 熔断比例100%

```typescript
{
  maxCommissionRate: 1.0,
  原始佣金: 15元,
  实付: 10元,

  预期: 总佣金 = 10元
}
```

### 4. 无推荐人

```typescript
{
  下单人: member_001,
  parentId: null,

  预期: 不产生佣金
}
```

### 5. 推荐人等级不符

```typescript
{
  推荐人: levelId = 0, // 普通会员

  预期: 不产生佣金
}
```

---

## 🔧 Mock 数据准备

### 订单数据

```typescript
const mockOrder = {
  id: 'order_001',
  tenantId: 'tenant_001',
  memberId: 'member_001',
  orderType: OrderType.PRODUCT,
  totalAmount: new Decimal(100),
  payAmount: new Decimal(70),
  couponDiscount: new Decimal(20),
  pointsDiscount: new Decimal(10),
  shareUserId: 'member_002',
  items: [
    {
      skuId: 'sku_001',
      totalAmount: new Decimal(100),
      quantity: 1,
    },
  ],
};
```

### 会员数据

```typescript
const mockMember = {
  memberId: 'member_001',
  parentId: 'member_002',
  indirectParentId: 'member_003',
  levelId: 0,
};

const mockL1Beneficiary = {
  memberId: 'member_002',
  tenantId: 'tenant_001',
  levelId: 1, // C1
  parentId: 'member_003',
};

const mockL2Beneficiary = {
  memberId: 'member_003',
  tenantId: 'tenant_001',
  levelId: 2, // C2
};
```

### 分销配置

```typescript
const mockDistConfig = {
  level1Rate: new Decimal(0.1),
  level2Rate: new Decimal(0.05),
  commissionBaseType: 'ORIGINAL_PRICE',
  maxCommissionRate: new Decimal(0.5),
  enableCrossTenant: false,
};
```

### SKU 配置

```typescript
// 正常商品
const mockNormalSku = {
  id: 'sku_001',
  distMode: 'RATIO',
  distRate: new Decimal(1.0),
  isExchangeProduct: false,
};

// 兑换商品
const mockExchangeSku = {
  id: 'sku_exchange',
  distMode: 'NONE',
  distRate: new Decimal(0),
  isExchangeProduct: true,
};
```

---

## 📝 测试检查清单

### 单元测试

- [ ] 所有测试用例通过
- [ ] 代码覆盖率 >= 90%
- [ ] 无 console.error 或 console.warn
- [ ] Mock 数据完整且合理
- [ ] 断言清晰且准确

### 集成测试

- [ ] 测试数据准备完整
- [ ] 测试数据清理正确
- [ ] 异步操作等待充分
- [ ] 数据库事务正确处理
- [ ] 测试环境隔离

### 性能测试

- [ ] 单次佣金计算 < 500ms
- [ ] 批量计算（100条）< 10s
- [ ] 数据库查询优化
- [ ] 无 N+1 查询问题

---

## 🚨 常见问题

### Q1: 测试失败：找不到订单

**原因**: Mock 数据未正确设置

**解决**:

```typescript
mockPrismaService.omsOrder.findUnique.mockResolvedValue(mockOrder);
```

### Q2: 测试失败：佣金金额不匹配

**原因**: Decimal 精度问题

**解决**:

```typescript
// 使用 toBeCloseTo 而不是 toBe
expect(amount.toNumber()).toBeCloseTo(10, 2);
```

### Q3: E2E 测试超时

**原因**: 异步佣金计算未完成

**解决**:

```typescript
// 增加等待时间
await new Promise((resolve) => setTimeout(resolve, 3000));
```

### Q4: 测试数据污染

**原因**: 测试数据未清理

**解决**:

```typescript
afterEach(async () => {
  await cleanupTestData();
});
```

---

## 📊 测试报告

### 运行测试并生成报告

```bash
# 生成覆盖率报告
npm run test:cov

# 查看报告
open coverage/lcov-report/index.html
```

### 报告内容

- 代码覆盖率统计
- 未覆盖的代码行
- 分支覆盖率
- 函数覆盖率

---

## 🎯 持续集成

### GitHub Actions 配置

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:cov

      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

---

## 📚 相关文档

- [数据库迁移文档](./COMMISSION_WITH_COUPON_POINTS_MIGRATION.md)
- [使用示例文档](./COMMISSION_CALCULATION_EXAMPLES.md)
- [快速参考卡片](./COMMISSION_QUICK_REFERENCE.md)
- [实施清单](./COMMISSION_IMPLEMENTATION_CHECKLIST.md)

---

**最后更新**: 2025-02-08  
**版本**: v1.0.0
