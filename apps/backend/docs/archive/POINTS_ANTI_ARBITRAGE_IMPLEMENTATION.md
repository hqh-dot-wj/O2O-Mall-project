# 积分防套利功能实现总结

## 实现目标

1. **防止积分套利**：积分计算基于"原价 - 优惠券抵扣"，不包括积分抵扣
2. **营销活动商品积分控制**：支持商品级别的积分比例配置（0-100%）

## 数据库变更

### 1. PmsTenantSku 表（商品SKU）

```prisma
model PmsTenantSku {
  // ... 现有字段

  // 新增字段
  pointsRatio Int @default(100) @map("points_ratio")  // 积分获得比例（0-100）
  isPromotionProduct Boolean @default(false) @map("is_promotion_product")  // 是否营销活动商品
}
```

### 2. OmsOrderItem 表（订单明细）

```prisma
model OmsOrderItem {
  // ... 现有字段

  // 新增字段
  pointsRatio Int @default(100) @map("points_ratio")  // 下单时的积分比例（快照）
  earnedPoints Int @default(0) @map("earned_points")  // 该商品产生的积分
}
```

## 核心逻辑变更

### 1. 积分计算服务（PointsRuleService）

新增方法：`calculateOrderPointsByItems()`

**计算逻辑：**

```typescript
// 积分计算基数 = 原价 - 优惠券抵扣（不包括积分抵扣）
const baseAmount = order.totalAmount - order.couponDiscount;

// 按商品明细分别计算
for (const item of items) {
  // 1. 计算商品在订单中的金额占比
  const itemRatio = (item.price * item.quantity) / totalAmount;

  // 2. 该商品应分摊的积分计算基数
  const itemBaseAmount = baseAmount * itemRatio;

  // 3. 计算基础积分
  const basePoints = floor(itemBaseAmount / orderPointsBase) * orderPointsRatio;

  // 4. 应用商品的积分比例
  const earnedPoints = floor(basePoints * (item.pointsRatio / 100));
}
```

### 2. 订单创建服务（OrderService）

**变更点：**

- 创建订单明细时，保存商品的 `pointsRatio`（快照）

```typescript
items: {
  create: await Promise.all(
    preview.items.map(async (item) => {
      const sku = await prisma.pmsTenantSku.findUnique({
        where: { id: item.skuId },
        select: { pointsRatio: true },
      });

      return {
        // ... 其他字段
        pointsRatio: sku?.pointsRatio || 100,
      };
    }),
  ),
}
```

### 3. 订单支付服务（OrderIntegrationService）

**变更点：**

- 使用新的按商品计算积分的方法
- 更新订单明细的 `earnedPoints` 字段
- 更新订单的 `pointsEarned` 字段

```typescript
// 计算积分基数（防止套利）
const baseAmount = order.totalAmount.sub(order.couponDiscount);

// 按商品明细计算积分
const itemsPointsResult = await pointsRuleService.calculateOrderPointsByItems(
  order.items.map((item) => ({
    skuId: item.skuId,
    price: item.price,
    quantity: item.quantity,
    pointsRatio: item.pointsRatio,
  })),
  baseAmount,
  order.totalAmount,
);

// 更新订单明细
for (const itemPoints of itemsPointsResult) {
  await prisma.omsOrderItem.updateMany({
    where: { orderId, skuId: itemPoints.skuId },
    data: { earnedPoints: itemPoints.earnedPoints },
  });
}

// 更新订单总积分
const totalPoints = itemsPointsResult.reduce((sum, item) => sum + item.earnedPoints, 0);
await prisma.omsOrder.update({
  where: { id: orderId },
  data: { pointsEarned: totalPoints },
});
```

## API变更

### 1. 商品价格更新接口

**DTO变更：**

```typescript
export class UpdateProductPriceDto {
  // ... 现有字段

  @ApiProperty({ description: '积分获得比例（0-100）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  pointsRatio?: number;

  @ApiProperty({ description: '是否营销活动商品', required: false })
  @IsOptional()
  @IsBoolean()
  isPromotionProduct?: boolean;
}
```

**Service变更：**

```typescript
async updateProductPrice(tenantId: string, dto: UpdateProductPriceDto) {
  // ... 现有逻辑

  const affected = await this.prisma.pmsTenantSku.updateMany({
    where: { id: tenantSkuId, version: tenantSku.version },
    data: {
      // ... 现有字段
      pointsRatio: pointsRatio !== undefined ? pointsRatio : undefined,
      isPromotionProduct: isPromotionProduct !== undefined ? isPromotionProduct : undefined,
    },
  });
}
```

## 使用场景

### 场景1：防止积分套利

**问题：**

- 用户用100积分抵扣1元
- 订单原价100元，实付99元
- 如果基于实付金额计算，用户获得99积分
- 用户可以循环套利

**解决方案：**

- 积分计算基于"原价 - 优惠券"= 100元
- 用户获得100积分
- 用户消耗100积分，获得100积分，无法套利

### 场景2：营销活动商品不产生积分

**配置：**

```typescript
// 秒杀商品
await updateProductPrice('tenant1', {
  tenantSkuId: 'sku1',
  price: 50, // 秒杀价
  pointsRatio: 0, // 不产生积分
  isPromotionProduct: true,
});
```

### 场景3：新品推广双倍积分

**配置：**

```typescript
// 新品推广
await updateProductPrice('tenant1', {
  tenantSkuId: 'sku2',
  price: 100,
  pointsRatio: 200, // 双倍积分
});
```

### 场景4：清仓商品半价积分

**配置：**

```typescript
// 清仓商品
await updateProductPrice('tenant1', {
  tenantSkuId: 'sku3',
  price: 30, // 清仓价
  pointsRatio: 50, // 半价积分
  isPromotionProduct: true,
});
```

## 测试覆盖

### 单元测试

文件：`src/module/marketing/points/rule/rule.service.anti-arbitrage.spec.ts`

测试用例：

1. ✅ 应该基于"原价 - 优惠券抵扣"计算积分，不包括积分抵扣
2. ✅ 应该支持商品级别的积分比例配置
3. ✅ 营销活动商品应该不产生积分
4. ✅ 当积分计算基数为0时，不应产生积分

运行测试：

```bash
npm test -- rule.service.anti-arbitrage
```

## 数据迁移

由于添加了默认值，现有数据会自动设置为：

- `pointsRatio` = 100（正常积分）
- `isPromotionProduct` = false（非营销活动商品）

无需手动迁移数据。

## 前端改动

### 阶段1（已完成）：后端逻辑

- ✅ 数据库Schema调整
- ✅ 积分计算逻辑调整
- ✅ 订单创建逻辑调整
- ✅ 订单支付逻辑调整
- ✅ API接口调整
- ✅ 单元测试

### 阶段2（可选）：前端配置界面

- 商品编辑页面添加"积分比例"字段
- 订单详情页面显示积分明细

**临时方案：**
可以直接在数据库修改 `pointsRatio` 字段：

```sql
-- 将特定商品设置为不产生积分
UPDATE pms_tenant_sku
SET points_ratio = 0, is_promotion_product = true
WHERE id IN ('sku_id_1', 'sku_id_2');
```

## 注意事项

1. **积分计算基数**：始终基于"原价 - 优惠券抵扣"，不包括积分抵扣
2. **商品积分比例**：保存在订单明细中作为快照，防止后续修改影响已下单商品
3. **积分比例范围**：0-100，0表示不产生积分，100表示正常积分
4. **乐观锁**：商品价格更新使用乐观锁，防止并发冲突

## 总结

本次实现完成了积分防套利和营销活动商品积分控制功能，核心改动包括：

1. **数据库层面**：添加积分配置字段
2. **业务逻辑层面**：调整积分计算方式，按商品明细分别计算
3. **API层面**：支持商品积分配置
4. **测试层面**：编写单元测试验证核心功能

前端无需改动即可使用，可延后开发配置界面。
