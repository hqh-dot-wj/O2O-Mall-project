# 优惠券和积分分佣计算 - 使用示例

## 📋 快速开始

本文档提供优惠券和积分分佣计算的实际使用示例和配置指南。

---

## 🎯 场景1：平台补贴型营销（推荐）

### 业务目标
- 激励推广者积极性
- 优惠由平台承担
- 推广者收益稳定

### 配置方式

```typescript
// 1. 设置分销配置
await prisma.sysDistConfig.upsert({
  where: { tenantId: 'tenant_001' },
  update: {
    level1Rate: new Decimal(0.10), // L1: 10%
    level2Rate: new Decimal(0.05), // L2: 5%
    commissionBaseType: 'ORIGINAL_PRICE', // 基于原价
    maxCommissionRate: new Decimal(0.50), // 最大50%熔断
  },
  create: {
    tenantId: 'tenant_001',
    level1Rate: new Decimal(0.10),
    level2Rate: new Decimal(0.05),
    commissionBaseType: 'ORIGINAL_PRICE',
    maxCommissionRate: new Decimal(0.50),
  }
});

// 2. 创建优惠券模板（设置最低实付）
await prisma.mktCouponTemplate.create({
  data: {
    tenantId: 'tenant_001',
    name: '新用户专享券',
    type: 'DISCOUNT',
    discountAmount: new Decimal(20),
    minOrderAmount: new Decimal(50), // 最低消费50元
    minActualPayAmount: new Decimal(10), // 最低实付10元
    totalStock: 1000,
    limitPerUser: 1,
    validityType: 'RELATIVE',
    validDays: 30,
    status: 'ACTIVE',
    createBy: 'admin',
  }
});

// 3. 配置商品 SKU（正常商品）
await prisma.pmsTenantSku.update({
  where: { id: 'sku_001' },
  data: {
    distMode: 'RATIO',
    distRate: new Decimal(1.0), // 100%参与分佣
    isExchangeProduct: false, // 非兑换商品
  }
});
```

### 计算示例

```
订单信息：
- 商品原价：100元
- 优惠券：-20元
- 积分抵扣：-10元
- 实付金额：70元

分佣计算：
1. 分佣基数 = 100元（原价）
2. L1佣金 = 100 × 10% = 10元
3. L2佣金 = 100 × 5% = 5元
4. 总佣金 = 15元

熔断检查：
- 最大允许 = 70 × 50% = 35元
- 15元 < 35元 ✅ 通过

最终发放：
- L1: 10元
- L2: 5元
- 平台成本：20（优惠券）+ 10（积分）+ 15（佣金）= 45元
- 平台收入：70 - 15 = 55元
```

---

## 🎯 场景2：成本可控型营销

### 业务目标
- 控制平台成本
- 优惠由推广者承担
- 适合低利润商品

### 配置方式

```typescript
// 设置分销配置（基于实付）
await prisma.sysDistConfig.update({
  where: { tenantId: 'tenant_001' },
  data: {
    commissionBaseType: 'ACTUAL_PAID', // 基于实付
    maxCommissionRate: new Decimal(0.30), // 最大30%
  }
});
```

### 计算示例

```
订单信息：
- 商品原价：100元
- 优惠券：-30元
- 实付金额：70元

分佣计算：
1. 分佣基数 = 70元（实付）
2. L1佣金 = 70 × 10% = 7元
3. L2佣金 = 70 × 5% = 3.5元
4. 总佣金 = 10.5元

熔断检查：
- 最大允许 = 70 × 30% = 21元
- 10.5元 < 21元 ✅ 通过

最终发放：
- L1: 7元
- L2: 3.5元
- 平台成本：30（优惠券）+ 10.5（佣金）= 40.5元
- 平台收入：70 - 10.5 = 59.5元
```

---

## 🎯 场景3：兑换商品（不分佣）

### 业务目标
- 优惠券/积分兑换商品
- 不产生佣金
- 用于营销引流

### 配置方式

```typescript
// 1. 创建兑换商品 SKU
await prisma.pmsTenantSku.create({
  data: {
    tenantId: 'tenant_001',
    tenantProductId: 'prod_001',
    globalSkuId: 'global_sku_001',
    price: new Decimal(50), // 标价50元
    stock: 100,
    isActive: true,
    distMode: 'NONE', // 不参与分销
    distRate: new Decimal(0),
    isExchangeProduct: true, // 标识为兑换商品
  }
});

// 2. 创建兑换券模板
await prisma.mktCouponTemplate.create({
  data: {
    tenantId: 'tenant_001',
    name: '商品兑换券',
    type: 'EXCHANGE',
    minOrderAmount: new Decimal(0),
    minActualPayAmount: new Decimal(0), // 允许0元购
    exchangeProductId: 'prod_001',
    exchangeSkuId: 'sku_exchange_001',
    totalStock: 500,
    limitPerUser: 1,
    validityType: 'FIXED',
    startTime: new Date(),
    endTime: new Date('2025-12-31'),
    status: 'ACTIVE',
    createBy: 'admin',
  }
});
```

### 计算示例

```
订单信息：
- 商品：兑换商品（is_exchange_product = true）
- 商品原价：50元
- 兑换券：-50元
- 实付金额：0元

分佣计算：
1. 检测到兑换商品，分佣基数 = 0元
2. 不产生佣金记录

结果：
- 不发放佣金
- 平台成本：50元（商品成本）
- 用于营销引流
```

---

## 🎯 场景4：混合订单

### 业务目标
- 订单包含正常商品和兑换商品
- 仅对正常商品分佣

### 配置方式

```typescript
// 商品A：正常商品
await prisma.pmsTenantSku.update({
  where: { id: 'sku_normal' },
  data: {
    distMode: 'RATIO',
    distRate: new Decimal(1.0),
    isExchangeProduct: false,
  }
});

// 商品B：兑换商品
await prisma.pmsTenantSku.update({
  where: { id: 'sku_exchange' },
  data: {
    distMode: 'NONE',
    distRate: new Decimal(0),
    isExchangeProduct: true,
  }
});
```

### 计算示例

```
订单信息：
- 商品A（正常）：100元
- 商品B（兑换）：50元
- 优惠券：-20元
- 实付金额：80元

分佣计算：
1. 商品A参与分佣：100元
2. 商品B不参与分佣：0元
3. 分佣基数 = 100元
4. L1佣金 = 100 × 10% = 10元
5. L2佣金 = 100 × 5% = 5元
6. 总佣金 = 15元

熔断检查：
- 最大允许 = 80 × 50% = 40元
- 15元 < 40元 ✅ 通过

最终发放：
- L1: 10元
- L2: 5元
```

---

## 🎯 场景5：大额优惠触发熔断

### 业务目标
- 防止平台亏损
- 自动限制佣金上限

### 计算示例

```
订单信息：
- 商品原价：100元
- 优惠券：-90元（大额优惠）
- 实付金额：10元

分佣计算：
1. 分佣基数 = 100元（原价）
2. 原始L1佣金 = 100 × 10% = 10元
3. 原始L2佣金 = 100 × 5% = 5元
4. 原始总佣金 = 15元

熔断检查：
- 最大允许 = 10 × 50% = 5元
- 15元 > 5元 ❌ 超限，触发熔断

缩减计算：
- 缩减比例 = 5 / 15 = 0.333
- 实际L1佣金 = 10 × 0.333 = 3.33元
- 实际L2佣金 = 5 × 0.333 = 1.67元
- 实际总佣金 = 5元

最终发放：
- L1: 3.33元（标记 is_capped = true）
- L2: 1.67元（标记 is_capped = true）
- 平台成本：90（优惠券）+ 5（佣金）= 95元
- 平台收入：10 - 5 = 5元
```

---

## 🔧 管理后台配置界面

### 1. 分销配置页面

```typescript
// GET /admin/distribution/config
interface DistributionConfigVO {
  tenantId: string;
  level1Rate: number; // 10%
  level2Rate: number; // 5%
  commissionBaseType: 'ORIGINAL_PRICE' | 'ACTUAL_PAID' | 'ZERO';
  maxCommissionRate: number; // 50%
  enableCrossTenant: boolean;
  crossTenantRate: number;
  crossMaxDaily: number;
}

// PUT /admin/distribution/config
async updateConfig(dto: UpdateDistConfigDto) {
  // 验证：L1 + L2 不能超过 100%
  if (dto.level1Rate + dto.level2Rate > 1.0) {
    throw new BusinessException('分佣比例总和不能超过100%');
  }

  // 验证：熔断比例不能超过 100%
  if (dto.maxCommissionRate > 1.0) {
    throw new BusinessException('熔断比例不能超过100%');
  }

  return await this.prisma.sysDistConfig.update({
    where: { tenantId: dto.tenantId },
    data: dto,
  });
}
```

### 2. 优惠券模板配置

```typescript
// POST /admin/marketing/coupon/templates
interface CreateCouponTemplateDto {
  name: string;
  type: 'DISCOUNT' | 'PERCENTAGE' | 'EXCHANGE';
  discountAmount?: number;
  minOrderAmount: number;
  minActualPayAmount?: number; // 新增：最低实付
  totalStock: number;
  limitPerUser: number;
  validityType: 'FIXED' | 'RELATIVE';
  validDays?: number;
}

// 前端表单验证
function validateCouponTemplate(form) {
  // 验证：最低实付不能大于最低消费
  if (form.minActualPayAmount > form.minOrderAmount) {
    return '最低实付金额不能大于最低消费金额';
  }

  // 验证：折扣后必须有实付
  const maxDiscount = form.minOrderAmount - (form.minActualPayAmount || 0);
  if (form.discountAmount > maxDiscount) {
    return `优惠金额不能超过${maxDiscount}元`;
  }

  return null;
}
```

### 3. 商品 SKU 配置

```typescript
// PUT /admin/product/sku/:id
interface UpdateSkuDto {
  price: number;
  stock: number;
  distMode: 'RATIO' | 'FIXED' | 'NONE';
  distRate: number;
  isExchangeProduct: boolean; // 新增：兑换商品标识
}

// 前端表单
<Form>
  <FormItem label="分佣模式">
    <Select v-model="form.distMode">
      <Option value="RATIO">按比例</Option>
      <Option value="FIXED">固定金额</Option>
      <Option value="NONE">不参与分销</Option>
    </Select>
  </FormItem>

  <FormItem label="分佣比例/金额">
    <InputNumber v-model="form.distRate" />
  </FormItem>

  <FormItem label="商品类型">
    <Checkbox v-model="form.isExchangeProduct">
      兑换商品（不参与分佣）
    </Checkbox>
    <div class="tip">
      勾选后，即使设置了分佣比例，也不会产生佣金
    </div>
  </FormItem>
</Form>
```

---

## 📊 数据查询和统计

### 1. 查询佣金明细

```typescript
// GET /admin/finance/commission/list
async getCommissionList(query: CommissionQueryDto) {
  return await this.prisma.finCommission.findMany({
    where: {
      tenantId: query.tenantId,
      createTime: {
        gte: query.startDate,
        lte: query.endDate,
      },
    },
    include: {
      beneficiary: {
        select: {
          nickname: true,
          mobile: true,
        }
      },
      order: {
        select: {
          orderSn: true,
          totalAmount: true,
          payAmount: true,
          couponDiscount: true,
          pointsDiscount: true,
        }
      }
    },
    orderBy: { createTime: 'desc' },
  });
}
```

### 2. 统计优惠券对佣金的影响

```sql
-- 查询优惠券使用对佣金的影响
SELECT 
  DATE(create_time) as date,
  COUNT(*) as order_count,
  SUM(order_original_price) as total_original,
  SUM(order_actual_paid) as total_paid,
  SUM(coupon_discount) as total_coupon_discount,
  SUM(points_discount) as total_points_discount,
  SUM(commission_base) as total_commission_base,
  SUM(amount) as total_commission,
  SUM(CASE WHEN is_capped THEN 1 ELSE 0 END) as capped_count
FROM fin_commission
WHERE tenant_id = 'tenant_001'
  AND create_time >= '2025-01-01'
GROUP BY DATE(create_time)
ORDER BY date DESC;
```

### 3. 查询触发熔断的订单

```typescript
// GET /admin/finance/commission/capped
async getCappedCommissions() {
  return await this.prisma.finCommission.findMany({
    where: {
      isCapped: true,
    },
    include: {
      order: {
        select: {
          orderSn: true,
          totalAmount: true,
          payAmount: true,
          couponDiscount: true,
        }
      }
    },
    orderBy: { createTime: 'desc' },
    take: 100,
  });
}
```

---

## ⚠️ 常见问题

### Q1: 为什么设置了分佣比例，但没有产生佣金？

**可能原因**：
1. 商品标记为兑换商品（`is_exchange_product = true`）
2. 商品分佣模式设置为 `NONE`
3. 订单是自购（下单人 = 推荐人）
4. 推荐人在黑名单中
5. 推荐人等级不符合要求（必须是C1或C2）

**排查方法**：
```typescript
// 查看佣金计算日志
// 日志会显示跳过原因
[Commission] Order xxx is self-purchase, skip
[Commission] Order xxx commission base is 0, skip (type: ZERO)
[Commission] L1 user xxx is not C1/C2, skip
```

### Q2: 熔断比例应该设置多少？

**建议**：
- 高利润商品：50%（默认）
- 中利润商品：30-40%
- 低利润商品：20-30%
- 引流商品：10-20%

**计算公式**：
```
熔断比例 = (商品利润率 - 平台运营成本率) × 安全系数
安全系数建议：0.8-1.0
```

### Q3: 优惠券最低实付金额怎么设置？

**建议**：
- 满减券：最低实付 = 最低消费 × 20-30%
- 折扣券：最低实付 = 商品成本价 × 1.1
- 兑换券：最低实付 = 0（允许0元购）

**示例**：
```
商品售价：100元
商品成本：60元
满减券：满100减30
建议最低实付：20-30元（确保不亏本）
```

### Q4: 如何处理部分退款的佣金回收？

**当前限制**：
- 系统暂不支持按商品维度回收佣金
- 退款时会回收整个订单的佣金

**未来优化**：
- 在 `fin_commission` 表中关联 `order_item_id`
- 支持按商品比例精准回收佣金

---

## 🎉 总结

本文档提供了5个典型场景的配置和计算示例：

1. ✅ 平台补贴型营销（基于原价）
2. ✅ 成本可控型营销（基于实付）
3. ✅ 兑换商品不分佣
4. ✅ 混合订单处理
5. ✅ 熔断保护机制

**关键配置项**：
- `commission_base_type`: 分佣基数类型
- `max_commission_rate`: 熔断保护比例
- `min_actual_pay_amount`: 最低实付金额
- `is_exchange_product`: 兑换商品标识

**最佳实践**：
- 根据商品利润率选择分佣策略
- 设置合理的熔断比例防止亏损
- 定期审计佣金数据
- 监控熔断触发频率
