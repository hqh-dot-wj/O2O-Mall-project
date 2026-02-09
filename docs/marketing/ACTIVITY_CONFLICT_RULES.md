# 营销活动互斥规则详解

## 📊 互斥矩阵可视化

```
                拼团    拼课    秒杀    会员升级  满减
              ┌──────┬──────┬──────┬────────┬──────┐
拼团          │  ❌  │  ❌  │  ❌  │   ✅   │  ✅  │
              ├──────┼──────┼──────┼────────┼──────┤
拼课          │  ❌  │  ❌  │  ❌  │   ✅   │  ✅  │
              ├──────┼──────┼──────┼────────┼──────┤
秒杀          │  ❌  │  ❌  │  ❌  │   🔺   │  ✅  │
              ├──────┼──────┼──────┼────────┼──────┤
会员升级      │  ✅  │  ✅  │  🔺  │   ❌   │  ✅  │
              ├──────┼──────┼──────┼────────┼──────┤
满减          │  ✅  │  ✅  │  ✅  │   ✅   │  ✅  │
              └──────┴──────┴──────┴────────┴──────┘

图例:
❌ = 完全互斥 (EXCLUSIVE) - 不能同时存在
✅ = 可叠加 (STACKABLE) - 可以同时存在
🔺 = 优先级 (PRIORITY) - 高优先级覆盖低优先级
```

---

## 🚫 完全互斥规则 (EXCLUSIVE)

### 1. 拼团 ↔ 拼课

**为什么互斥？**
- 两者都是"组团"逻辑，用户体验会混乱
- 用户不知道是"拼团买商品"还是"拼课买课程"

**场景示例：**
```
❌ 错误配置:
商品: 高端家政服务
活动1: 3人拼团 ¥199
活动2: 3人拼课 ¥179

用户困惑: "我是要拼团还是拼课？有什么区别？"
```

**正确做法：**
```
✅ 正确配置:
商品A: 高端家政服务
活动: 3人拼团 ¥199

商品B: 家政培训课程
活动: 3人拼课 ¥179
```

---

### 2. 拼团 ↔ 秒杀

**为什么互斥？**
- 价格策略冲突
- 秒杀强调"限时抢购"，拼团强调"组团优惠"
- 用户决策路径不同

**场景示例：**
```
❌ 错误配置:
商品: 美容套餐
活动1: 秒杀价 ¥99 (限时2小时)
活动2: 3人拼团 ¥149

用户困惑: "我是立即秒杀还是等人拼团？"
```

**正确做法：**
```
✅ 正确配置:
方案1: 先做秒杀活动，结束后再做拼团
方案2: 不同商品分别做秒杀和拼团
```

---

### 3. 拼课 ↔ 秒杀

**为什么互斥？**
- 同拼团 ↔ 秒杀的原因
- 逻辑冲突，用户体验差

---

### 4. 同类型活动

**为什么互斥？**
- 同一商品不能创建多个相同类型的活动
- 避免配置混乱和用户困惑

**场景示例：**
```
❌ 错误配置:
商品: 家政服务
活动1: 3人拼团 ¥199
活动2: 5人拼团 ¥179

用户困惑: "我应该选哪个拼团？"
```

**正确做法：**
```
✅ 正确配置:
商品: 家政服务
活动: 3人拼团 ¥199，5人拼团 ¥179 (在同一个活动配置中)
```

---

## ✅ 可叠加规则 (STACKABLE)

### 1. 拼团/拼课 + 满减

**为什么可叠加？**
- 满减是订单级优惠，拼团/拼课是商品级优惠
- 两者作用层级不同，可以叠加

**场景示例：**
```
✅ 正确配置:
商品: 家政服务
活动1: 3人拼团 ¥199
活动2: 满 ¥300 减 ¥50

用户购买流程:
1. 选择拼团价 ¥199
2. 购买2个服务 = ¥398
3. 满减优惠 -¥50
4. 实付 ¥348

用户感受: "拼团已经很优惠了，还能叠加满减，太划算了！"
```

**前端展示：**
```vue
<view class="activity-badges">
  <!-- 主标签 -->
  <view class="badge-primary">
    👥 3人拼团 ¥199
  </view>
  
  <!-- 副标签 -->
  <view class="badge-secondary">
    💰 可叠加满减
  </view>
</view>

<view class="price-hint">
  <text>💡 提示：满300可再减50</text>
</view>
```

---

### 2. 拼团/拼课 + 会员升级

**为什么可叠加？**
- 会员升级是身份优惠，拼团/拼课是活动优惠
- 两者不冲突，可以叠加

**场景示例：**
```
✅ 正确配置:
商品: 家政服务
活动1: 3人拼团 ¥199
活动2: 升级会员享9折

用户购买流程:
1. 选择拼团价 ¥199
2. 会员折扣 ¥199 × 0.9 = ¥179.1
3. 实付 ¥179.1

用户感受: "拼团价还能再打折，会员真值！"
```

**前端展示：**
```vue
<view class="activity-badges">
  <view class="badge-primary">
    👥 3人拼团 ¥199
  </view>
  
  <view class="badge-member">
    ⭐ 会员再享9折
  </view>
</view>

<view class="price">
  <text class="activity-price">¥179.1</text>
  <text class="original-price">¥299</text>
  <text class="save">已省 ¥119.9</text>
</view>
```

---

### 3. 满减 + 任何活动

**为什么可叠加？**
- 满减是订单级优惠，可以与任何商品级优惠叠加
- 满减通常是促进多买的手段

**场景示例：**
```
✅ 正确配置:
商品A: 家政服务 (秒杀价 ¥99)
商品B: 美容服务 (拼团价 ¥199)
活动: 满 ¥300 减 ¥50

用户购买流程:
1. 购买商品A (秒杀) ¥99
2. 购买商品B (拼团) ¥199
3. 小计 ¥298 (差2元满减)
4. 用户可能会再买一个商品凑满减

用户感受: "再买2元就能减50，划算！"
```

---

## 🔺 优先级规则 (PRIORITY)

### 秒杀 > 会员升级

**为什么有优先级？**
- 秒杀价格通常更低，更有吸引力
- 秒杀是限时限量，优先级更高

**场景示例：**
```
✅ 正确配置:
商品: 家政服务
活动1: 秒杀价 ¥99 (优先级1)
活动2: 会员升级价 ¥199 (优先级2)

前端展示逻辑:
if (有秒杀活动 && 秒杀进行中) {
  显示秒杀价 ¥99
  隐藏会员升级价
} else {
  显示会员升级价 ¥199
}

用户看到: "限时秒杀 ¥99" (不显示会员价)
```

**前端展示：**
```vue
<view class="activity-badges">
  <!-- 只显示优先级最高的活动 -->
  <view v-if="hasActiveSecKill" class="badge-seckill">
    ⚡ 限时秒杀 ¥99
  </view>
  
  <view v-else-if="isMember" class="badge-member">
    ⭐ 会员专享 ¥199
  </view>
</view>
```

---

## 🔧 技术实现

### 1. 后端验证

```typescript
// File: apps/backend/src/module/marketing/config/config.service.ts

private async checkActivityConflict(
  serviceId: string,
  newTemplateCode: string,
  tenantId: string,
): Promise<void> {
  // 1. 查询该商品已有的活动配置
  const existingConfigs = await this.prisma.storePlayConfig.findMany({
    where: {
      serviceId,
      tenantId,
      status: 'ENABLED',
      delFlag: 'NORMAL',
    },
  });

  // 2. 检查每个已存在的活动是否与新活动冲突
  for (const existing of existingConfigs) {
    const { conflict, rule } = checkConflict(
      existing.templateCode,
      newTemplateCode
    );

    if (conflict) {
      throw new BusinessException(
        409,
        `该商品已有【${existing.templateCode}】活动，` +
        `与【${newTemplateCode}】冲突。原因：${rule?.reason}`
      );
    }
  }
}
```

### 2. 前端展示

```typescript
// File: apps/miniapp-client/src/hooks/useMarketingDisplay.ts

export function useMarketingDisplay(product: Ref<any>) {
  // 获取所有活动
  const allActivities = computed(() => {
    return product.value?.marketingActivities?.filter(
      a => a.status === 'ACTIVE'
    ) || []
  });

  // 选择优先级最高的活动
  const activeActivity = computed(() => {
    if (allActivities.value.length === 0) return null;

    // 优先级排序
    const priority = {
      'SECKILL': 1,
      'GROUP_BUY': 2,
      'COURSE_GROUP_BUY': 3,
      'MEMBER_UPGRADE': 4,
      'FULL_REDUCTION': 5,
    };

    return allActivities.value.sort((a, b) => {
      return priority[a.templateCode] - priority[b.templateCode];
    })[0];
  });

  // 可叠加的活动
  const stackableActivities = computed(() => {
    if (!activeActivity.value) return [];

    return allActivities.value.filter(a => {
      if (a.id === activeActivity.value.id) return false;
      
      const { conflict } = checkConflict(
        activeActivity.value.templateCode,
        a.templateCode
      );
      
      return !conflict; // 不冲突的活动
    });
  });

  return {
    allActivities,
    activeActivity,
    stackableActivities,
  };
}
```

---

## 📝 配置修改指南

### 如何修改互斥规则？

编辑文件：`apps/backend/src/module/marketing/config/activity-conflict.matrix.ts`

**示例：允许拼团和秒杀叠加**

```typescript
// 修改前
SECKILL: {
  GROUP_BUY: {
    type: ConflictType.EXCLUSIVE,
    reason: '秒杀和拼团的价格策略冲突',
  },
}

// 修改后
SECKILL: {
  GROUP_BUY: {
    type: ConflictType.STACKABLE,
    reason: '秒杀和拼团可以叠加',
  },
}
```

### 如何新增营销玩法？

**Step 1: 在互斥矩阵中定义规则**

```typescript
// 新增"限时折扣"玩法
LIMIT_DISCOUNT: {
  GROUP_BUY: {
    type: ConflictType.STACKABLE,
    reason: '限时折扣可以叠加拼团',
  },
  SECKILL: {
    type: ConflictType.EXCLUSIVE,
    reason: '限时折扣和秒杀是互斥的',
  },
  // ... 其他规则
}
```

**Step 2: 在优先级中定义排序**

```typescript
export function getActivityPriority(templateCode: string): number {
  const priorities: Record<string, number> = {
    SECKILL: 1,
    LIMIT_DISCOUNT: 2,  // 新增
    GROUP_BUY: 3,
    // ...
  };
  return priorities[templateCode] || 999;
}
```

---

## 🧪 测试用例

### 测试1: 创建冲突活动应该失败

```typescript
// 商品已有拼团活动
const existingActivity = {
  templateCode: 'GROUP_BUY',
  serviceId: 'product_123',
};

// 尝试创建拼课活动
const newActivity = {
  templateCode: 'COURSE_GROUP_BUY',
  serviceId: 'product_123',
};

// 预期结果: 抛出异常
expect(() => configService.create(newActivity))
  .toThrow('该商品已有【GROUP_BUY】活动，与【COURSE_GROUP_BUY】冲突');
```

### 测试2: 创建可叠加活动应该成功

```typescript
// 商品已有拼团活动
const existingActivity = {
  templateCode: 'GROUP_BUY',
  serviceId: 'product_123',
};

// 尝试创建满减活动
const newActivity = {
  templateCode: 'FULL_REDUCTION',
  serviceId: 'product_123',
};

// 预期结果: 创建成功
const result = await configService.create(newActivity);
expect(result.success).toBe(true);
```

---

## 📊 决策树

```
创建营销活动
    ↓
查询商品已有活动
    ↓
是否有已存在的活动？
    ├─ 否 → 直接创建 ✅
    └─ 是 → 检查互斥规则
              ↓
        是否冲突？
            ├─ 是 → 拒绝创建 ❌
            │       提示冲突原因
            │
            └─ 否 → 检查类型
                      ↓
                是否可叠加？
                    ├─ 是 → 创建成功 ✅
                    │       标记为可叠加
                    │
                    └─ 否 → 检查优先级
                              ↓
                        优先级如何？
                            ├─ 新活动优先级高 → 创建成功 ✅
                            │                   提示会覆盖旧活动
                            │
                            └─ 新活动优先级低 → 创建成功 ✅
                                                提示会被旧活动覆盖
```

---

## 🎯 最佳实践

### 1. 活动规划建议

**时间维度：**
```
第1周: 秒杀活动 (引流)
第2-3周: 拼团活动 (转化)
第4周: 满减活动 (清仓)
```

**商品维度：**
```
爆款商品: 秒杀 (快速出货)
常规商品: 拼团 (稳定转化)
高价商品: 会员升级 (提升客单价)
```

### 2. 避免常见错误

❌ **错误1: 同时创建拼团和秒杀**
```
商品: 家政服务
活动1: 3人拼团 ¥199
活动2: 秒杀价 ¥99

问题: 用户不知道选哪个
```

✅ **正确做法: 分时段创建**
```
第1周: 秒杀价 ¥99 (限时2小时)
第2周: 3人拼团 ¥199 (持续1周)
```

❌ **错误2: 创建多个同类型活动**
```
商品: 家政服务
活动1: 3人拼团 ¥199
活动2: 5人拼团 ¥179

问题: 配置混乱，用户困惑
```

✅ **正确做法: 在同一活动中配置多档**
```
商品: 家政服务
活动: 拼团优惠
  - 3人成团 ¥199
  - 5人成团 ¥179
```

### 3. 用户体验优化

**清晰的活动标签：**
```vue
<!-- 主活动 -->
<view class="badge-primary">
  👥 3人拼团 ¥199
</view>

<!-- 可叠加活动 -->
<view class="badge-stackable">
  💰 可叠加满减
  ⭐ 会员再享9折
</view>
```

**明确的价格展示：**
```vue
<view class="price-breakdown">
  <text>拼团价: ¥199</text>
  <text>满减优惠: -¥50</text>
  <text>会员折扣: -¥13.41</text>
  <text class="final-price">实付: ¥135.59</text>
</view>
```

---

**文档版本:** 1.0  
**最后更新:** 2026-02-04  
**维护者:** 开发团队
