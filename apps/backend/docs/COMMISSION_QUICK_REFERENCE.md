# 优惠券和积分分佣计算 - 快速参考

## 🎯 核心原则

```
谁出钱，谁决定是否分佣
```

---

## 📊 三种分佣策略对比

| 策略 | 基数 | 优点 | 缺点 | 适用场景 |
|------|------|------|------|----------|
| **ORIGINAL_PRICE**<br/>基于原价 | 商品原价 | 推广者收益稳定<br/>激励性强 | 平台成本高<br/>可能亏损 | 平台补贴型营销<br/>高利润商品 |
| **ACTUAL_PAID**<br/>基于实付 | 实付金额 | 平台成本可控<br/>风险共担 | 推广者收益不稳定<br/>积极性降低 | 低利润商品<br/>成本敏感业务 |
| **ZERO**<br/>不分佣 | 0 | 无佣金成本 | 无推广激励 | 兑换商品<br/>引流商品 |

---

## 🔢 计算公式

### 基于原价（ORIGINAL_PRICE）
```
分佣基数 = 商品原价总额
L1佣金 = 分佣基数 × L1比例
L2佣金 = 分佣基数 × L2比例
总佣金 = L1佣金 + L2佣金

熔断检查：
if (总佣金 > 实付金额 × 熔断比例) {
  缩减比例 = (实付金额 × 熔断比例) / 总佣金
  L1佣金 = L1佣金 × 缩减比例
  L2佣金 = L2佣金 × 缩减比例
}
```

### 基于实付（ACTUAL_PAID）
```
分佣基数 = 商品原价 × (实付金额 / 商品原价)
L1佣金 = 分佣基数 × L1比例
L2佣金 = 分佣基数 × L2比例
```

---

## 🛡️ 熔断保护

### 触发条件
```
总佣金 > 实付金额 × maxCommissionRate
```

### 处理方式
```typescript
缩减比例 = (实付金额 × maxCommissionRate) / 总佣金
L1佣金 = L1佣金 × 缩减比例
L2佣金 = L2佣金 × 缩减比例
标记 is_capped = true
```

### 推荐配置
- 高利润商品：50%
- 中利润商品：30-40%
- 低利润商品：20-30%

---

## 🏷️ 商品类型标识

### 正常商品
```typescript
{
  distMode: 'RATIO' | 'FIXED',
  distRate: 0.10, // 10%
  isExchangeProduct: false
}
```

### 兑换商品
```typescript
{
  distMode: 'NONE',
  distRate: 0,
  isExchangeProduct: true // 关键标识
}
```

---

## 🎫 优惠券配置

### 普通优惠券
```typescript
{
  type: 'DISCOUNT',
  discountAmount: 20,
  minOrderAmount: 50,
  minActualPayAmount: 10 // 最低实付
}
```

### 兑换券
```typescript
{
  type: 'EXCHANGE',
  minOrderAmount: 0,
  minActualPayAmount: 0, // 允许0元购
  exchangeProductId: 'prod_xxx',
  exchangeSkuId: 'sku_xxx'
}
```

---

## 📝 数据库字段速查

### sys_dist_config（分销配置）
```sql
commission_base_type VARCHAR(20) DEFAULT 'ORIGINAL_PRICE'
  -- ORIGINAL_PRICE: 基于原价
  -- ACTUAL_PAID: 基于实付
  -- ZERO: 不分佣

max_commission_rate DECIMAL(5,2) DEFAULT 0.50
  -- 熔断保护比例（0.50 = 50%）
```

### pms_tenant_sku（商品SKU）
```sql
is_exchange_product BOOLEAN DEFAULT FALSE
  -- TRUE: 兑换商品，不参与分佣
  -- FALSE: 正常商品，参与分佣
```

### mkt_coupon_template（优惠券模板）
```sql
min_actual_pay_amount DECIMAL(10,2) NULL
  -- 最低实付金额限制
  -- NULL: 不限制
```

### fin_commission（佣金记录）
```sql
commission_base DECIMAL(10,2) -- 分佣基数
commission_base_type VARCHAR(20) -- 基数类型快照
order_original_price DECIMAL(10,2) -- 订单原价
order_actual_paid DECIMAL(10,2) -- 订单实付
coupon_discount DECIMAL(10,2) -- 优惠券抵扣
points_discount DECIMAL(10,2) -- 积分抵扣
is_capped BOOLEAN -- 是否触发熔断
```

---

## 🔍 常用查询

### 查询触发熔断的订单
```sql
SELECT * FROM fin_commission 
WHERE is_capped = TRUE 
ORDER BY create_time DESC;
```

### 统计优惠券对佣金的影响
```sql
SELECT 
  DATE(create_time) as date,
  COUNT(*) as count,
  SUM(coupon_discount) as total_coupon,
  SUM(amount) as total_commission
FROM fin_commission
WHERE coupon_discount > 0
GROUP BY DATE(create_time);
```

### 查询兑换商品订单
```sql
SELECT o.* 
FROM oms_order o
JOIN oms_order_item oi ON o.id = oi.order_id
JOIN pms_tenant_sku s ON oi.sku_id = s.id
WHERE s.is_exchange_product = TRUE;
```

---

## ⚡ 快速决策树

```
订单包含商品？
├─ 全部是兑换商品 → 不分佣（ZERO）
├─ 包含正常商品
│  ├─ 配置：ORIGINAL_PRICE
│  │  ├─ 计算基数 = 商品原价
│  │  ├─ 计算佣金
│  │  └─ 熔断检查
│  │
│  └─ 配置：ACTUAL_PAID
│     ├─ 计算基数 = 原价 × (实付/原价)
│     ├─ 计算佣金
│     └─ 熔断检查
│
└─ 混合订单
   ├─ 仅对正常商品计算基数
   ├─ 兑换商品不参与
   └─ 熔断检查
```

---

## 🚨 注意事项

### ❌ 常见错误

1. **忘记设置 isExchangeProduct**
   ```typescript
   // 错误：兑换商品未标识
   { distMode: 'NONE', isExchangeProduct: false }
   
   // 正确：明确标识
   { distMode: 'NONE', isExchangeProduct: true }
   ```

2. **最低实付设置不合理**
   ```typescript
   // 错误：最低实付大于最低消费
   { minOrderAmount: 50, minActualPayAmount: 60 }
   
   // 正确：最低实付 <= 最低消费
   { minOrderAmount: 50, minActualPayAmount: 10 }
   ```

3. **熔断比例过高**
   ```typescript
   // 风险：可能导致平台亏损
   { maxCommissionRate: 0.80 } // 80%
   
   // 建议：根据利润率设置
   { maxCommissionRate: 0.50 } // 50%
   ```

### ✅ 最佳实践

1. **分佣策略选择**
   - 高利润商品 → ORIGINAL_PRICE
   - 低利润商品 → ACTUAL_PAID
   - 兑换商品 → ZERO

2. **熔断比例设置**
   ```
   熔断比例 = (商品利润率 - 运营成本率) × 0.8
   ```

3. **最低实付设置**
   ```
   最低实付 = MAX(商品成本 × 1.1, 最低消费 × 0.2)
   ```

4. **定期审计**
   - 每周检查熔断触发频率
   - 每月对账佣金数据
   - 每季度优化分佣策略

---

## 📞 技术支持

### 日志关键字
```
[Commission] Order xxx commission base is 0, skip (type: ZERO)
[Commission] Order xxx commission capped
[Commission] L1 user xxx is not C1/C2, skip
[CommissionBase] Adjusted by actual paid
```

### 调试命令
```bash
# 查看佣金计算日志
tail -f logs/commission.log | grep "Commission"

# 查询特定订单的佣金
psql -c "SELECT * FROM fin_commission WHERE order_id = 'xxx'"

# 统计熔断触发率
psql -c "SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN is_capped THEN 1 ELSE 0 END) as capped,
  ROUND(SUM(CASE WHEN is_capped THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as rate
FROM fin_commission"
```

---

## 📚 相关文档

- [数据库迁移文档](./COMMISSION_WITH_COUPON_POINTS_MIGRATION.md)
- [使用示例文档](./COMMISSION_CALCULATION_EXAMPLES.md)
- [佣金模块技术文档](../src/module/finance/commission/commission.md)
- [优惠券系统实现总结](./COUPON_AND_POINTS_IMPLEMENTATION.md)
