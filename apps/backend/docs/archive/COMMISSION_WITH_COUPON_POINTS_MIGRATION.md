# 优惠券和积分分佣计算 - 数据库迁移文档

## 📋 概述

本文档描述了支持优惠券和积分的分佣计算系统的数据库变更和实施步骤。

**实施日期**: 2025-02-08  
**影响范围**: 
- 优惠券模板表（新增最低实付限制）
- SKU 表（新增兑换商品标识）
- 分销配置表（新增佣金计算策略）
- 佣金记录表（新增审计字段）

---

## 🎯 核心业务规则

### 1. 资金流向原则

```
┌─────────────────┬──────────────┬──────────────┬─────────────┐
│   商品类型      │  资金来源    │  是否分佣    │   分佣基数  │
├─────────────────┼──────────────┼──────────────┼─────────────┤
│ 正常销售商品    │  用户现金    │   ✅ 是      │  可配置     │
│ 优惠券兑换商品  │  平台补贴    │   ❌ 否      │  0          │
│ 积分兑换商品    │  用户积分    │   ❌ 否      │  0          │
└─────────────────┴──────────────┴──────────────┴─────────────┘
```

### 2. 分佣基数计算策略

#### 策略A：基于商品原价（ORIGINAL_PRICE）
```
分佣基数 = 商品原价总额
优惠由平台承担，不影响推广者收益

示例：
商品原价：100元
优惠券：-20元
积分抵扣：-10元
实付：70元

分佣基数 = 100元
L1佣金 = 100 × 10% = 10元
L2佣金 = 100 × 5% = 5元
总佣金 = 15元

熔断检查：15元 < 70元 × 50% = 35元 ✅ 通过
```

**优点**：激励推广者，收益稳定  
**缺点**：平台成本较高  
**适用**：平台补贴型营销

---

#### 策略B：基于实付金额（ACTUAL_PAID）
```
分佣基数 = 实付金额
优惠由平台和推广者共同承担

示例：
商品原价：100元
实付：70元

分佣基数 = 70元
L1佣金 = 70 × 10% = 7元
L2佣金 = 70 × 5% = 3.5元
总佣金 = 10.5元
```

**优点**：平台成本可控  
**缺点**：推广者收益不稳定  
**适用**：利润率较低的业务

---

#### 策略C：兑换商品不分佣（ZERO）
```
兑换商品（优惠券/积分全额兑换）
分佣基数 = 0元
不发放佣金
```

---

### 3. 熔断保护机制

```typescript
// 总佣金不能超过实付金额的配置比例（默认50%）
if (总佣金 > 实付金额 × maxCommissionRate) {
  // 按比例缩减所有佣金
  缩减比例 = (实付金额 × maxCommissionRate) / 总佣金
  L1佣金 = L1佣金 × 缩减比例
  L2佣金 = L2佣金 × 缩减比例
  标记为已熔断
}
```

**示例**：
```
商品原价：100元
实付：10元（使用了90元优惠券）
基于原价分佣：L1=10元, L2=5元, 总计=15元

熔断检查：15元 > 10元 × 50% = 5元 ❌ 超限
缩减比例：5 / 15 = 0.333
实际发放：L1=3.33元, L2=1.67元, 总计=5元
```

---

## 📊 数据库变更

### 1. 新增枚举类型

```prisma
/// 佣金计算基数类型
enum CommissionBaseType {
  ORIGINAL_PRICE // 基于商品原价（优惠由平台承担）
  ACTUAL_PAID    // 基于实付金额（优惠由推广者承担）
  ZERO           // 不分佣（兑换商品）
}
```

---

### 2. 优惠券模板表（mkt_coupon_template）

**新增字段**：
```sql
ALTER TABLE mkt_coupon_template 
ADD COLUMN min_actual_pay_amount DECIMAL(10,2) NULL 
COMMENT '最低实付金额（使用优惠券后）';
```

**业务规则**：
- 使用优惠券后，订单实付金额必须 >= `min_actual_pay_amount`
- 防止0元购或极低价购买
- 示例：商品100元，优惠券50元，设置最低实付20元，则实付必须>=20元

---

### 3. SKU 表（pms_tenant_sku）

**新增字段**：
```sql
ALTER TABLE pms_tenant_sku 
ADD COLUMN is_exchange_product BOOLEAN DEFAULT FALSE 
COMMENT '是否为兑换商品（优惠券/积分全额兑换，不参与分佣）';
```

**业务规则**：
- `is_exchange_product = true`：该商品为兑换商品，不参与分佣计算
- 用于标识优惠券兑换商品、积分兑换商品等
- 即使设置了 `distMode` 和 `distRate`，也不会产生佣金

---

### 4. 分销配置表（sys_dist_config）

**新增字段**：
```sql
ALTER TABLE sys_dist_config 
ADD COLUMN commission_base_type VARCHAR(20) DEFAULT 'ORIGINAL_PRICE' 
COMMENT '佣金计算基数类型',
ADD COLUMN max_commission_rate DECIMAL(5,2) DEFAULT 0.50 
COMMENT '最大佣金比例（熔断保护，如50%）';
```

**字段说明**：
- `commission_base_type`: 
  - `ORIGINAL_PRICE`: 基于商品原价（默认）
  - `ACTUAL_PAID`: 基于实付金额
  - `ZERO`: 不分佣
- `max_commission_rate`: 熔断保护比例，默认0.50（50%）

---

### 5. 佣金记录表（fin_commission）

**新增字段**：
```sql
ALTER TABLE fin_commission 
ADD COLUMN commission_base DECIMAL(10,2) NOT NULL COMMENT '分佣基数',
ADD COLUMN commission_base_type VARCHAR(20) NULL COMMENT '基数类型快照',
ADD COLUMN order_original_price DECIMAL(10,2) NULL COMMENT '订单原价',
ADD COLUMN order_actual_paid DECIMAL(10,2) NULL COMMENT '订单实付',
ADD COLUMN coupon_discount DECIMAL(10,2) DEFAULT 0 COMMENT '优惠券抵扣',
ADD COLUMN points_discount DECIMAL(10,2) DEFAULT 0 COMMENT '积分抵扣',
ADD COLUMN is_capped BOOLEAN DEFAULT FALSE COMMENT '是否触发熔断';
```

**字段说明**：
- `commission_base`: 实际用于计算佣金的基数
- `commission_base_type`: 基数类型快照（用于审计）
- `order_original_price`: 订单原价（用于对账）
- `order_actual_paid`: 订单实付（用于对账）
- `coupon_discount`: 优惠券抵扣金额
- `points_discount`: 积分抵扣金额
- `is_capped`: 是否触发熔断保护

---

## 🔧 实施步骤

### Step 1: 更新 Prisma Schema

```bash
# 已完成：修改 prisma/schema.prisma
# 新增枚举、字段定义
```

### Step 2: 同步数据库

```bash
cd apps/backend
npx prisma db push
```

### Step 3: 生成 Prisma Client

```bash
npx prisma generate
```

### Step 4: 数据迁移（可选）

如果已有数据，需要设置默认值：

```sql
-- 设置现有分销配置的默认值
UPDATE sys_dist_config 
SET commission_base_type = 'ORIGINAL_PRICE',
    max_commission_rate = 0.50
WHERE commission_base_type IS NULL;

-- 设置现有 SKU 的默认值
UPDATE pms_tenant_sku 
SET is_exchange_product = FALSE
WHERE is_exchange_product IS NULL;
```

### Step 5: 验证

```bash
# 检查表结构
npx prisma db pull

# 运行测试
npm run test:e2e -- commission
```

---

## 📝 代码变更说明

### 1. CommissionService 核心变更

#### 变更点 1：`getDistConfig()` 方法
```typescript
// 新增返回字段
return {
  ...config,
  commissionBaseType: config.commissionBaseType ?? 'ORIGINAL_PRICE',
  maxCommissionRate: config.maxCommissionRate ?? new Decimal(0.5),
};
```

#### 变更点 2：`calculateCommission()` 方法
```typescript
// 1. 计算佣金基数（支持多种策略）
const commissionBaseResult = await this.calculateCommissionBase(
  order, 
  distConfig.commissionBaseType
);

// 2. 熔断保护
const totalCommission = records.reduce((sum, r) => sum.add(r.amount), new Decimal(0));
const maxAllowed = order.payAmount.mul(distConfig.maxCommissionRate);

if (totalCommission.gt(maxAllowed)) {
  const ratio = maxAllowed.div(totalCommission);
  records.forEach(record => {
    record.amount = record.amount.mul(ratio).toDecimalPlaces(2);
    record.isCapped = true;
  });
}

// 3. 补充审计字段
const enrichedRecord = {
  ...record,
  commissionBase,
  commissionBaseType: baseType,
  orderOriginalPrice: order.totalAmount,
  orderActualPaid: order.payAmount,
  couponDiscount: order.couponDiscount,
  pointsDiscount: order.pointsDiscount,
};
```

#### 变更点 3：`calculateCommissionBase()` 方法重构
```typescript
// 返回值变更：Decimal → { base: Decimal, type: string }
private async calculateCommissionBase(
  order: any,
  baseType: string = 'ORIGINAL_PRICE'
): Promise<{ base: Decimal; type: string }> {
  // 1. 检查兑换商品
  if (tenantSku.isExchangeProduct) {
    hasExchangeProduct = true;
    continue; // 兑换商品不参与分佣
  }

  // 2. 根据策略调整基数
  if (baseType === 'ACTUAL_PAID') {
    const ratio = actualPaid.div(originalPrice);
    totalBase = totalBase.mul(ratio);
  }

  return { base: totalBase, type: baseType };
}
```

---

## 🧪 测试场景

### 场景1：正常商品 + 优惠券（基于原价）
```
配置：commission_base_type = ORIGINAL_PRICE
商品原价：100元
优惠券：-20元
实付：80元

预期结果：
- 分佣基数：100元
- L1佣金：10元
- L2佣金：5元
- 总佣金：15元
- 熔断检查：15 < 80×50% = 40 ✅
```

### 场景2：正常商品 + 大额优惠券（触发熔断）
```
配置：commission_base_type = ORIGINAL_PRICE, max_commission_rate = 0.50
商品原价：100元
优惠券：-90元
实付：10元

预期结果：
- 分佣基数：100元
- 原始佣金：L1=10元, L2=5元, 总计=15元
- 熔断检查：15 > 10×50% = 5 ❌
- 实际发放：L1=3.33元, L2=1.67元, 总计=5元
- is_capped = true
```

### 场景3：兑换商品（不分佣）
```
商品：优惠券兑换商品（is_exchange_product = true）
原价：50元
实付：0元（优惠券全额兑换）

预期结果：
- 分佣基数：0元
- 不产生佣金记录
```

### 场景4：混合订单（正常商品 + 兑换商品）
```
商品A：正常商品，100元
商品B：兑换商品，50元（is_exchange_product = true）
优惠券：-20元
实付：80元

预期结果：
- 分佣基数：仅计算商品A（100元）
- L1佣金：10元
- L2佣金：5元
```

### 场景5：基于实付金额分佣
```
配置：commission_base_type = ACTUAL_PAID
商品原价：100元
优惠券：-30元
实付：70元

预期结果：
- 分佣基数：70元（原价×实付比例）
- L1佣金：7元
- L2佣金：3.5元
```

---

## ⚠️ 注意事项

### 1. 最低实付金额验证

在优惠券使用时，需要验证：
```typescript
// 在 CouponUsageService 中
if (template.minActualPayAmount) {
  const actualPaid = orderAmount - discountAmount;
  if (actualPaid < template.minActualPayAmount) {
    throw new BusinessException(
      `使用优惠券后实付金额不能低于${template.minActualPayAmount}元`
    );
  }
}
```

### 2. 兑换商品标识

创建兑换商品时，必须设置：
```typescript
await prisma.pmsTenantSku.create({
  data: {
    ...skuData,
    isExchangeProduct: true, // 标识为兑换商品
    distMode: 'NONE', // 不参与分销
  }
});
```

### 3. 配置迁移

对于已有租户，建议：
```typescript
// 默认使用基于原价的策略（对推广者友好）
await prisma.sysDistConfig.updateMany({
  where: { commissionBaseType: null },
  data: {
    commissionBaseType: 'ORIGINAL_PRICE',
    maxCommissionRate: new Decimal(0.5),
  }
});
```

### 4. 审计和对账

新增的审计字段用于：
- 财务对账：验证佣金计算是否正确
- 问题排查：追溯佣金计算的依据
- 数据分析：统计优惠券和积分对佣金的影响

查询示例：
```sql
-- 查询触发熔断的订单
SELECT * FROM fin_commission WHERE is_capped = TRUE;

-- 查询优惠券对佣金的影响
SELECT 
  order_id,
  order_original_price,
  order_actual_paid,
  coupon_discount,
  commission_base,
  amount
FROM fin_commission
WHERE coupon_discount > 0;
```

---

## 📈 性能影响

### 1. 查询性能
- 新增字段不影响现有索引
- 审计字段仅用于查询，不影响写入性能

### 2. 计算性能
- `calculateCommissionBase()` 方法增加了 SKU 查询
- 建议：对 `pms_tenant_sku.is_exchange_product` 字段添加索引

```sql
CREATE INDEX idx_tenant_sku_exchange 
ON pms_tenant_sku(is_exchange_product) 
WHERE is_exchange_product = TRUE;
```

---

## 🎉 总结

本次变更实现了：

1. ✅ 支持优惠券和积分的分佣计算
2. ✅ 兑换商品不分佣机制
3. ✅ 熔断保护防止平台亏损
4. ✅ 完整的审计字段用于对账
5. ✅ 灵活的分佣策略配置

**向后兼容性**：
- 所有新增字段都有默认值
- 现有代码无需修改即可运行
- 新功能通过配置开关控制

**建议**：
- 生产环境部署前，先在测试环境验证
- 监控熔断触发频率，调整 `max_commission_rate`
- 定期审计佣金数据，确保计算正确
