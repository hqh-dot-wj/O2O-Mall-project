# 积分防套利功能快速使用指南

## 功能概述

本次更新实现了两个核心功能：

1. **防止积分套利**：积分计算不再基于实付金额，而是基于"原价 - 优惠券抵扣"
2. **营销活动商品积分控制**：支持为每个商品单独设置积分获得比例（0-100%）

## 快速开始

### 1. 生成Prisma客户端

```bash
cd apps/backend
npx prisma generate
```

### 2. 运行测试验证功能

```bash
npm test -- rule.service.anti-arbitrage
```

预期输出：

```
PASS  src/module/marketing/points/rule/rule.service.anti-arbitrage.spec.ts
  PointsRuleService - Anti-Arbitrage
    calculateOrderPointsByItems - 防止积分套利
      ✓ 应该基于"原价 - 优惠券抵扣"计算积分，不包括积分抵扣
      ✓ 应该支持商品级别的积分比例配置
      ✓ 营销活动商品应该不产生积分
      ✓ 当积分计算基数为0时，不应产生积分

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

## 使用示例

### 场景1：设置秒杀商品不产生积分

**方式1：通过API（推荐）**

```http
PUT /store/product/price
Content-Type: application/json

{
  "tenantSkuId": "sku_123",
  "price": 50,
  "stock": 100,
  "distRate": 0,
  "pointsRatio": 0,
  "isPromotionProduct": true
}
```

**方式2：直接修改数据库**

```sql
UPDATE pms_tenant_sku
SET points_ratio = 0,
    is_promotion_product = true
WHERE id = 'sku_123';
```

### 场景2：设置新品推广双倍积分

```http
PUT /store/product/price
Content-Type: application/json

{
  "tenantSkuId": "sku_456",
  "price": 100,
  "stock": 50,
  "distRate": 0.1,
  "pointsRatio": 200
}
```

### 场景3：设置清仓商品半价积分

```http
PUT /store/product/price
Content-Type: application/json

{
  "tenantSkuId": "sku_789",
  "price": 30,
  "stock": 10,
  "distRate": 0,
  "pointsRatio": 50,
  "isPromotionProduct": true
}
```

## 积分计算示例

### 示例1：防止积分套利

**订单信息：**

- 商品原价：1000元
- 使用优惠券：100元
- 使用积分抵扣：100积分（抵扣1元）
- 实付金额：899元

**旧逻辑（有套利风险）：**

```
积分 = floor(实付金额 / 基数) × 比例
     = floor(899 / 1) × 1
     = 899积分
```

用户消耗100积分，获得899积分，净赚799积分 ❌

**新逻辑（防套利）：**

```
积分计算基数 = 原价 - 优惠券抵扣
             = 1000 - 100
             = 900元

积分 = floor(900 / 1) × 1
     = 900积分
```

用户消耗100积分，获得900积分，净赚800积分（合理） ✅

### 示例2：混合商品订单

**订单信息：**

- 商品A：600元，正常积分（100%）
- 商品B：400元，半价积分（50%）
- 订单原价：1000元
- 使用优惠券：100元
- 积分计算基数：900元

**计算过程：**

```
商品A积分：
  金额占比 = 600 / 1000 = 60%
  分摊基数 = 900 × 60% = 540元
  基础积分 = floor(540 / 1) × 1 = 540积分
  最终积分 = 540 × 100% = 540积分

商品B积分：
  金额占比 = 400 / 1000 = 40%
  分摊基数 = 900 × 40% = 360元
  基础积分 = floor(360 / 1) × 1 = 360积分
  最终积分 = 360 × 50% = 180积分

订单总积分 = 540 + 180 = 720积分
```

## 数据库字段说明

### pms_tenant_sku 表

| 字段                 | 类型    | 默认值 | 说明                                   |
| -------------------- | ------- | ------ | -------------------------------------- |
| points_ratio         | Int     | 100    | 积分获得比例（0-100），0表示不产生积分 |
| is_promotion_product | Boolean | false  | 是否营销活动商品                       |

### oms_order_item 表

| 字段          | 类型 | 默认值 | 说明                     |
| ------------- | ---- | ------ | ------------------------ |
| points_ratio  | Int  | 100    | 下单时的积分比例（快照） |
| earned_points | Int  | 0      | 该商品产生的积分         |

## 常见问题

### Q1：现有商品的积分比例是多少？

A：默认为100%，表示正常产生积分。

### Q2：如何批量设置营销活动商品？

A：可以使用SQL批量更新：

```sql
UPDATE pms_tenant_sku
SET points_ratio = 0,
    is_promotion_product = true
WHERE id IN ('sku1', 'sku2', 'sku3');
```

### Q3：修改商品的积分比例会影响已下单的订单吗？

A：不会。订单明细中保存了下单时的积分比例快照。

### Q4：积分比例可以超过100%吗？

A：可以，比如设置为200%表示双倍积分。但建议不要超过200%。

### Q5：前端需要改动吗？

A：阶段1不需要。可以先用数据库或API直接配置。阶段2可以开发前端配置界面。

## 注意事项

1. **积分计算基数**：始终基于"原价 - 优惠券抵扣"，不包括积分抵扣
2. **商品积分比例**：保存在订单明细中作为快照，防止后续修改影响已下单商品
3. **积分比例范围**：建议0-200，0表示不产生积分，100表示正常积分，200表示双倍积分
4. **乐观锁**：商品价格更新使用乐观锁，防止并发冲突

## 相关文档

- [详细实现文档](./POINTS_ANTI_ARBITRAGE_IMPLEMENTATION.md)
- [测试用例](../src/module/marketing/points/rule/rule.service.anti-arbitrage.spec.ts)
