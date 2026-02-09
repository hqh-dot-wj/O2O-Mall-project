# 营销活动完整业务流程

## 📋 目录
1. [后台创建活动](#1-后台创建活动)
2. [后端处理与验证](#2-后端处理与验证)
3. [小程序展示](#3-小程序展示)
4. [用户参与流程](#4-用户参与流程)
5. [活动互斥规则](#5-活动互斥规则)

---

## 1. 后台创建活动

### 1.1 操作路径
```
管理后台 (apps/admin-web)
  → 营销管理
    → 营销配置
      → 新增配置
```

### 1.2 创建步骤

#### Step 1: 选择营销玩法模板
```typescript
// 可选的玩法模板
const templates = [
  { code: 'GROUP_BUY', name: '拼团', icon: '👥' },
  { code: 'COURSE_GROUP_BUY', name: '拼课', icon: '🎓' },
  { code: 'SECKILL', name: '秒杀', icon: '⚡' },
  { code: 'MEMBER_UPGRADE', name: '会员升级', icon: '⭐' },
  { code: 'FULL_REDUCTION', name: '满减', icon: '💰' },
]
```

#### Step 2: 选择商品/服务
- 支持选择 SPU（商品）或 SKU（规格）
- 系统会自动判断商品类型：
  - 实物商品 (REAL) → 强互斥库存策略
  - 服务商品 (SERVICE) → 弱互斥库存策略

#### Step 3: 配置活动参数

**通用参数：**
```typescript
{
  price: 199,              // 活动价格
  stock: 100,              // 活动库存
  startTime: '2026-02-05', // 开始时间
  endTime: '2026-02-28',   // 结束时间
  status: 'ENABLED',       // 状态
}
```

**玩法特定参数（ruleConfig）：**

**拼团 (GROUP_BUY):**
```json
{
  "minMembers": 3,
  "maxMembers": 10,
  "timeLimit": 24,
  "allowAlone": false
}
```

**拼课 (COURSE_GROUP_BUY):**
```json
{
  "minMembers": 3,
  "courseId": "course_123",
  "validDays": 365
}
```

**秒杀 (SECKILL):**
```json
{
  "limitPerUser": 1,
  "showCountdown": true
}
```

#### Step 4: 提交创建
```
POST /admin/marketing/config
Body: {
  templateCode: 'GROUP_BUY',
  serviceId: 'product_123',
  price: 199,
  stock: 100,
  ruleConfig: { minMembers: 3 }
}
```

---

## 2. 后端处理与验证

### 2.1 处理流程

```typescript
// File: apps/backend/src/module/marketing/config/config.service.ts

async create(dto: CreateStorePlayConfigDto, tenantId: string) {
  // ✅ 1. 验证模板存在
  const template = await this.templateRepo.findByCode(dto.templateCode);
  if (!template) {
    throw new BusinessException('营销玩法模板不存在');
  }

  // ✅ 2. 策略级参数校验
  const strategy = this.strategyFactory.getStrategy(dto.templateCode);
  await strategy.validateConfig(dto);

  // ✅ 3. 验证商品存在
  const productData = await this.findProduct(dto.serviceId);
  if (!productData) {
    throw new BusinessException('商品不存在');
  }

  // ✅ 4. 检查活动互斥规则 (重要！)
  await this.checkActivityConflict(
    dto.serviceId,
    dto.templateCode,
    tenantId
  );

  // ✅ 5. 自动判定库存策略
  const stockMode = productData.type === 'REAL'
    ? MarketingStockMode.STRONG_LOCK    // 实物：强互斥
    : MarketingStockMode.LAZY_CHECK;    // 服务：弱互斥

  // ✅ 6. 创建配置记录
  const config = await this.repo.create({
    ...dto,
    tenantId,
    stockMode,
  });

  return Result.ok(config);
}
```

### 2.2 活动互斥检查逻辑

```typescript
/**
 * 检查活动互斥规则
 * 防止同一商品创建冲突的营销活动
 */
private async checkActivityConflict(
  serviceId: string,
  newTemplateCode: string,
  tenantId: string,
): Promise<void> {
  // 1. 查询该商品已有的活动配置（仅查询启用状态）
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

### 2.3 数据库表结构

```prisma
model StorePlayConfig {
  id           String   @id @default(cuid())
  tenantId     String   // 租户ID
  templateCode String   // 玩法模板代码
  serviceId    String   // 商品/服务ID
  price        Decimal  // 活动价格
  stock        Int      // 活动库存
  stockMode    MarketingStockMode  // 库存策略
  startTime    DateTime
  endTime      DateTime
  status       String   // ENABLED/DISABLED
  ruleConfig   Json     // 玩法特定配置
  delFlag      String   @default("NORMAL")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

---

## 3. 小程序展示

### 3.1 商品详情页展示

```vue
<!-- File: apps/miniapp-client/src/pages/product/detail.vue -->

<template>
  <view class="product-detail">
    <!-- 商品图片 -->
    <image :src="product.mainImages[0]" />

    <!-- ✅ 营销标签区（轻量展示） -->
    <view v-if="activeActivity" class="activity-badge">
      <text class="badge-icon">{{ activityIcon }}</text>
      <text class="badge-text">{{ activityLabel }}</text>
      <text class="countdown">{{ countdown }}</text>
    </view>

    <!-- ✅ 价格区 -->
    <view class="price-section">
      <text class="activity-price">¥{{ displayPrice }}</text>
      <text class="original-price">¥{{ originalPrice }}</text>
    </view>

    <!-- ✅ 活动快速入口 -->
    <view 
      v-if="allActivities.length > 0" 
      class="activity-entry"
      @click="goToActivityDetail"
    >
      <text>🎁 查看全部活动 ({{ allActivities.length }})</text>
      <text>→</text>
    </view>

    <!-- 商品详情... -->

    <!-- ✅ 底部按钮（动态） -->
    <view class="bottom-bar">
      <button @click="handleBuyAction">
        {{ bottomButtonText }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useMarketingDisplay } from '@/hooks/useMarketingDisplay'

const product = ref(null)

// 使用营销展示 Hook
const {
  allActivities,      // 所有活动
  activeActivity,     // 当前最优活动
  displayPrice,       // 展示价格（活动价）
  originalPrice,      // 原价
  activityLabel,      // 活动标签
} = useMarketingDisplay(product, selectedSku)

// 底部按钮文案
const bottomButtonText = computed(() => {
  if (!activeActivity.value) return '立即购买'
  
  const labels = {
    'GROUP_BUY': `发起拼团 ¥${displayPrice.value}`,
    'COURSE_GROUP_BUY': `拼课优惠 ¥${displayPrice.value}`,
    'SECKILL': '立即秒杀',
    'MEMBER_UPGRADE': '升级会员',
  }
  
  return labels[activeActivity.value.templateCode] || '立即购买'
})

// 跳转到活动详情
function goToActivityDetail() {
  uni.navigateTo({
    url: `/pages/marketing/detail?id=${activeActivity.value.configId}`
  })
}
</script>
```

### 3.2 营销展示 Hook

```typescript
// File: apps/miniapp-client/src/hooks/useMarketingDisplay.ts

export function useMarketingDisplay(
  product: Ref<any>,
  selectedSku: Ref<any>
) {
  // 获取所有活动
  const allActivities = computed(() => {
    return product.value?.marketingActivities?.filter(
      a => a.status === 'ACTIVE'
    ) || []
  })

  // 选择优先级最高的活动
  const activeActivity = computed(() => {
    if (allActivities.value.length === 0) return null

    // 优先级：秒杀 > 拼团 > 拼课 > 会员升级 > 满减
    const priority = [
      'SECKILL',
      'GROUP_BUY',
      'COURSE_GROUP_BUY',
      'MEMBER_UPGRADE',
      'FULL_REDUCTION'
    ]

    return allActivities.value.sort((a, b) => {
      return priority.indexOf(a.templateCode) - 
             priority.indexOf(b.templateCode)
    })[0]
  })

  // 展示价格（活动价）
  const displayPrice = computed(() => {
    return activeActivity.value?.price || 
           product.value?.price || 
           0
  })

  // 原价
  const originalPrice = computed(() => {
    return product.value?.price || 0
  })

  // 活动标签
  const activityLabel = computed(() => {
    if (!activeActivity.value) return ''

    const labels = {
      'SECKILL': '限时秒杀',
      'GROUP_BUY': '拼团优惠',
      'COURSE_GROUP_BUY': '拼课立减',
      'MEMBER_UPGRADE': '会员专享',
      'FULL_REDUCTION': '满减活动',
    }

    return labels[activeActivity.value.templateCode] || ''
  })

  return {
    allActivities,
    activeActivity,
    displayPrice,
    originalPrice,
    activityLabel,
  }
}
```

### 3.3 API 数据结构

```typescript
// GET /client/product/:id 返回数据

{
  productId: "product_123",
  name: "高端家政服务",
  price: 299,
  mainImages: ["https://..."],
  
  // ✅ 关联的营销活动
  marketingActivities: [
    {
      configId: "config_1",
      templateCode: "GROUP_BUY",
      price: 199,              // 活动价
      stock: 100,
      remainingStock: 85,
      status: "ACTIVE",
      startTime: "2026-02-05",
      endTime: "2026-02-28",
      ruleConfig: {
        minMembers: 3,
        maxMembers: 10
      }
    }
  ]
}
```

---

## 4. 用户参与流程

### 4.1 创建营销实例

```typescript
// 用户点击"发起拼团"按钮

// 1. 创建实例
POST /client/marketing/instance
Body: {
  configId: "config_1",
  quantity: 1
}

// 2. 后端处理
// File: apps/backend/src/module/marketing/instance/instance.service.ts

async create(dto: CreateInstanceDto, memberId: string) {
  // ✅ 1. 获取配置
  const config = await this.configRepo.findById(dto.configId);
  
  // ✅ 2. 策略级资格校验
  const strategy = this.strategyFactory.getStrategy(config.templateCode);
  await strategy.validateJoin(memberId, config);
  
  // ✅ 3. 扣减库存（如果是强互斥模式）
  if (config.stockMode === 'STRONG_LOCK') {
    await this.stockService.decrementStock(config.id, dto.quantity);
  }
  
  // ✅ 4. 创建实例记录
  const instance = await this.repo.create({
    configId: dto.configId,
    memberId,
    status: 'PENDING_PAY',  // 待支付
    quantity: dto.quantity,
  });
  
  return Result.ok(instance);
}
```

### 4.2 状态流转

```
PENDING_PAY (待支付)
    ↓ 用户支付成功
PAID (已支付)
    ↓ 触发 onPaymentSuccess
IN_PROGRESS (进行中)
    ↓ 满足条件（如拼团成功）
SUCCESS (成功)
    ↓ 自动触发
1. 分账到门店钱包
2. 发放权益（核销券/次卡）
```

### 4.3 支付成功处理

```typescript
// File: apps/backend/src/module/marketing/instance/instance.service.ts

async handlePaymentSuccess(instanceId: string) {
  const instance = await this.repo.findById(instanceId);
  
  // ✅ 1. 更新状态为已支付
  await this.repo.update(instanceId, { status: 'PAID' });
  
  // ✅ 2. 调用策略的支付成功钩子
  const strategy = this.strategyFactory.getStrategy(instance.templateCode);
  await strategy.onPaymentSuccess(instance);
  
  // ✅ 3. 检查是否满足成功条件
  const shouldComplete = await strategy.checkCompletion(instance);
  
  if (shouldComplete) {
    await this.completeInstance(instanceId);
  }
}

// 完成实例
async completeInstance(instanceId: string) {
  const instance = await this.repo.findById(instanceId);
  
  // ✅ 1. 更新状态为成功
  await this.repo.update(instanceId, { status: 'SUCCESS' });
  
  // ✅ 2. 自动分账到门店钱包
  await this.walletService.settleToStore(instance);
  
  // ✅ 3. 发放权益（核销券/次卡）
  await this.assetService.issueAsset(instance);
}
```

---

## 5. 活动互斥规则

### 5.1 互斥矩阵

| 活动类型 | 拼团 | 拼课 | 秒杀 | 会员升级 | 满减 |
|---------|------|------|------|---------|------|
| **拼团** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **拼课** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **秒杀** | ❌ | ❌ | ❌ | 🔺 | ✅ |
| **会员升级** | ✅ | ✅ | 🔺 | ❌ | ✅ |
| **满减** | ✅ | ✅ | ✅ | ✅ | ✅ |

**图例：**
- ❌ 完全互斥，不能同时存在
- ✅ 可叠加，可以同时存在
- 🔺 有优先级，秒杀优先于会员升级

### 5.2 互斥规则说明

#### 完全互斥（EXCLUSIVE）

**拼团 ↔ 拼课**
- 原因：两者都是"组团"逻辑，用户体验会混乱
- 示例：用户不知道是"拼团买商品"还是"拼课买课程"

**拼团 ↔ 秒杀**
- 原因：价格策略冲突，秒杀强调"限时抢购"，拼团强调"组团优惠"
- 示例：用户不知道是"立即秒杀"还是"等人拼团"

**拼课 ↔ 秒杀**
- 原因：同上，逻辑冲突

**同类型活动**
- 原因：同一商品不能创建多个相同类型的活动
- 示例：不能同时有两个"3人拼团"活动

#### 可叠加（STACKABLE）

**拼团/拼课 + 满减**
- 原因：满减是订单级优惠，可以叠加商品级优惠
- 示例：拼团价 ¥199，满 ¥300 减 ¥50

**拼团/拼课 + 会员升级**
- 原因：会员升级是身份优惠，可以叠加活动优惠
- 示例：拼团价 ¥199，会员再享 9折

#### 优先级覆盖（PRIORITY）

**秒杀 > 会员升级**
- 原因：秒杀价格通常更低，优先展示秒杀
- 示例：秒杀价 ¥99，会员价 ¥199，展示秒杀价

### 5.3 前端展示策略

```typescript
// 当商品有多个可叠加活动时，如何展示？

// 示例：商品同时有"拼团"和"满减"
{
  activities: [
    { templateCode: 'GROUP_BUY', price: 199 },
    { templateCode: 'FULL_REDUCTION', discount: 50 }
  ]
}

// 展示策略：
// 1. 主标签：显示优先级最高的活动（拼团）
// 2. 副标签：显示可叠加的活动（满减）
// 3. 价格：显示主活动价格
// 4. 提示：显示叠加优惠信息

<view class="activity-badges">
  <!-- 主标签 -->
  <view class="badge-primary">
    👥 拼团优惠 ¥199
  </view>
  
  <!-- 副标签 -->
  <view class="badge-secondary">
    💰 可叠加满减
  </view>
</view>

<view class="price">
  <text class="activity-price">¥199</text>
  <text class="hint">满300可再减50</text>
</view>
```

### 5.4 后台提示

当管理员尝试创建冲突的活动时，系统会提示：

```
❌ 创建失败

该商品已有【3人拼团】活动，与【拼课优惠】冲突。

原因：拼团和拼课是互斥的玩法，用户体验会混乱。

建议：
1. 停用现有的【3人拼团】活动
2. 或选择其他商品创建【拼课优惠】
```

---

## 6. 完整流程图

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 管理员在后台创建营销配置                                │
│    - 选择玩法模板                                           │
│    - 选择商品                                               │
│    - 配置参数                                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. 后端验证与处理                                           │
│    ✅ 验证模板存在                                          │
│    ✅ 验证商品存在                                          │
│    ✅ 检查活动互斥规则 ← 重要！                             │
│    ✅ 判定库存策略                                          │
│    ✅ 创建配置记录                                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. C端小程序展示                                            │
│    - 商品详情页显示活动标签                                 │
│    - 显示活动价格                                           │
│    - 提供"查看全部活动"入口                                 │
│    - 底部按钮根据活动类型变化                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. 用户参与活动                                             │
│    - 点击"发起拼团"按钮                                     │
│    - 创建营销实例（PENDING_PAY）                            │
│    - 支付成功（PAID）                                       │
│    - 等待拼团成功（IN_PROGRESS）                            │
│    - 拼团成功（SUCCESS）                                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. 自动履约                                                 │
│    ✅ 分账到门店钱包                                        │
│    ✅ 发放权益（核销券/次卡）                               │
│    ✅ 通知用户                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. 常见问题

### Q1: 如果商品已有拼团活动，还能创建秒杀吗？
**A:** 不能。拼团和秒杀是互斥的，系统会提示冲突并拒绝创建。

### Q2: 如果商品有拼团活动，还能创建满减吗？
**A:** 可以。拼团和满减可以叠加，用户可以享受"拼团价 + 满减优惠"。

### Q3: 如果商品同时有多个可叠加活动，前端如何展示？
**A:** 按优先级展示主活动，副活动以"可叠加"标签形式提示。

### Q4: 如何修改已有活动的互斥规则？
**A:** 修改 `activity-conflict.matrix.ts` 文件中的 `CONFLICT_MATRIX` 配置。

### Q5: 如果要新增一个营销玩法，需要做什么？
**A:** 
1. 在 `play/` 目录下实现策略类
2. 在 `template/` 中注册模板
3. 在 `activity-conflict.matrix.ts` 中定义互斥规则
4. 在小程序中添加对应的展示组件

---

## 8. 相关文件

### 后端
- `apps/backend/src/module/marketing/config/config.service.ts` - 配置服务
- `apps/backend/src/module/marketing/config/activity-conflict.matrix.ts` - 互斥规则
- `apps/backend/src/module/marketing/instance/instance.service.ts` - 实例服务
- `apps/backend/src/module/marketing/play/` - 玩法策略

### 前端
- `apps/miniapp-client/src/pages/product/detail.vue` - 商品详情页
- `apps/miniapp-client/src/pages/marketing/detail.vue` - 营销详情页
- `apps/miniapp-client/src/hooks/useMarketingDisplay.ts` - 营销展示 Hook
- `apps/miniapp-client/src/components/activity-widgets/` - 活动组件

---

**文档版本:** 1.0  
**最后更新:** 2026-02-04  
**维护者:** 开发团队
