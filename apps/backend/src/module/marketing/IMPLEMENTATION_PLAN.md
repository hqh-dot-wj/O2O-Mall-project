# 营销活动系统实施方案总结

## 一、核心业务规则调整

### 1.1 活动互斥规则强化

**修改文件：** `apps/backend/src/module/marketing/config/activity-conflict.matrix.ts`

**调整内容：**
```typescript
// 强制秒杀和拼班课程互斥
SECKILL: {
  COURSE_GROUP_BUY: {
    type: ConflictType.EXCLUSIVE,
    reason: '秒杀（立即购买）和拼班（等待成团）的业务逻辑冲突',
  },
}

COURSE_GROUP_BUY: {
  SECKILL: {
    type: ConflictType.EXCLUSIVE,
    reason: '拼班和秒杀的业务逻辑冲突',
  },
  GROUP_BUY: {
    type: ConflictType.EXCLUSIVE,
    reason: '拼班和拼团是同类型活动，不能共存',
  },
}
```

**影响：**
- 管理后台创建活动时会检查冲突
- 同一商品同一时间只能有一个主营销活动（秒杀/拼团/拼班）
- 满减可以与任何活动叠加

---

## 二、后台改造

### 2.1 数据库调整（基于现有 MaaS 平台）

#### 核心思路：利用现有的通用营销玩法平台，不新增独立表

你们已经有了：
- `PlayTemplate`：玩法模板（总部定义）
- `StorePlayConfig`：门店营销商品配置
- `PlayInstance`：营销玩法实例（用户参与记录）

**拼班课程只需要：**
1. 在 `PlayTemplate` 中新增一个模板记录（code: `COURSE_GROUP_BUY`）
2. 在 `StorePlayConfig.rules` 中存储拼班特有参数（JSON）
3. 在 `PlayInstance.instanceData` 中存储用户参与信息（JSON）

#### 新增玩法模板记录

```sql
-- 插入拼班课程模板
INSERT INTO mkt_play_template (id, code, name, rule_schema, unit_name, ui_component_id, status, del_flag)
VALUES (
  gen_random_uuid(),
  'COURSE_GROUP_BUY',
  '拼班课程',
  '{
    "fields": [
      {"name": "schedule", "label": "上课时间", "type": "string", "required": true},
      {"name": "locationName", "label": "上课地点", "type": "string", "required": true},
      {"name": "locationLat", "label": "纬度", "type": "number", "required": true},
      {"name": "locationLng", "label": "经度", "type": "number", "required": true},
      {"name": "maxDistance", "label": "最大距离(米)", "type": "number", "default": 5000},
      {"name": "minParticipants", "label": "最少成团人数", "type": "number", "required": true},
      {"name": "maxParticipants", "label": "最多人数", "type": "number"},
      {"name": "commissionAmount", "label": "发起人佣金", "type": "number"},
      {"name": "timeoutHours", "label": "成团超时(小时)", "type": "number", "default": 24}
    ]
  }',
  '节',
  'ClassGroupBuy',
  '0',
  '0'
);
```


#### StorePlayConfig.rules 示例（拼班课程）

```json
{
  "schedule": "周三 19:00-21:00",
  "locationName": "朝阳校区",
  "locationLat": 39.9042,
  "locationLng": 116.4074,
  "maxDistance": 5000,
  "minParticipants": 3,
  "maxParticipants": 10,
  "commissionAmount": 89.00,
  "timeoutHours": 24,
  "discountPrice": 199.00,
  "originalPrice": 599.00
}
```

#### PlayInstance.instanceData 示例（用户参与记录）

```json
{
  "role": "initiator",  // initiator | participant
  "joinedAt": "2024-02-05T10:30:00Z",
  "currentParticipants": 2,
  "participants": [
    {
      "memberId": "xxx",
      "joinedAt": "2024-02-05T10:30:00Z",
      "isInitiator": true
    },
    {
      "memberId": "yyy",
      "joinedAt": "2024-02-05T11:00:00Z",
      "isInitiator": false,
      "referrerId": "xxx"
    }
  ],
  "groupStatus": "active",  // active | completed | timeout
  "completedAt": null
}
```

#### 订单表关联调整

**OmsOrder 表已有字段可复用：**
- `shareUserId`：推荐人ID（用于分佣）
- `referrerId`：间接推荐人ID

**需要新增的字段：**
```sql
-- 关联营销玩法实例
ALTER TABLE oms_order ADD COLUMN play_instance_id VARCHAR(36) COMMENT '营销玩法实例ID';
ALTER TABLE oms_order ADD COLUMN play_config_id VARCHAR(36) COMMENT '营销配置ID';
ALTER TABLE oms_order ADD COLUMN play_template_code VARCHAR(50) COMMENT '玩法模板代码';

-- 添加索引
CREATE INDEX idx_play_instance ON oms_order(play_instance_id);
CREATE INDEX idx_play_config ON oms_order(play_config_id);
```

---

### 2.2 后台接口调整

#### 接口1：商品详情接口（核心）

**路径：** `GET /api/product/:id`

**返回数据结构调整：**
```typescript
interface ProductDetailResponse {
  // 基础信息
  id: string
  name: string
  description: string
  images: string[]
  originalPrice: number
  stock: number
  
  // 营销活动（按优先级排序，已过滤互斥）
  activities: {
    primary: Activity | null        // 主活动（秒杀/拼团/拼班）
    secondary: Activity | null      // 次要活动（通常为空）
    stackable: Activity[]           // 可叠加活动（满减）
  }
  
  // 拼班课程推荐（如果有）
  recommendedClassGroup?: {
    classGroup: ClassGroup
    score: number
    reason: {
      primary: string              // 主要推荐理由
      tags: string[]               // 推荐标签
    }
    otherClassGroupsCount: number  // 其他班次数量
  }
}

interface Activity {
  id: string
  type: 'SECKILL' | 'GROUP_BUY' | 'COURSE_GROUP_BUY' | 'FULL_REDUCTION' | 'MEMBER_UPGRADE'
  name: string
  price: number
  originalPrice: number
  
  // 分佣信息
  commission: {
    enabled: boolean
    amount?: number
    rate?: number
  }
  
  // 活动状态
  status: 'pending' | 'active' | 'ended'
  startTime: string
  endTime: string
  
  // 秒杀特有
  seckillInfo?: {
    stock: number
    soldCount: number
    timeLeft: number  // 剩余秒数
  }
  
  // 拼团特有
  groupBuyInfo?: {
    minParticipants: number
    currentParticipants: number
  }
  
  // 拼班特有
  classGroupInfo?: {
    schedule: string
    location: string
    distance: number  // 距离用户的距离（米）
    minParticipants: number
    currentParticipants: number
  }
}
```

**后端逻辑：**
```typescript
async getProductDetail(productId: string, userId: string, userLocation?: { lat: number, lng: number }) {
  // 1. 获取商品基础信息
  const product = await this.productService.findById(productId)
  
  // 2. 获取所有有效的营销活动
  const allActivities = await this.marketingService.getActiveActivities(productId)
  
  // 3. 过滤互斥活动，按优先级排序
  const filteredActivities = this.filterConflictActivities(allActivities)
  
  // 4. 如果有拼班课程，计算推荐
  let recommendedClassGroup = null
  if (filteredActivities.primary?.type === 'COURSE_GROUP_BUY' && userLocation) {
    recommendedClassGroup = await this.classGroupService.getRecommendation(
      productId,
      userId,
      userLocation
    )
  }
  
  return {
    ...product,
    activities: filteredActivities,
    recommendedClassGroup
  }
}
```


#### 接口2：拼班课程推荐接口

**路径：** `POST /api/class-group/recommend`

**请求参数：**
```typescript
{
  productId: string
  userLocation: {
    lat: number
    lng: number
  }
  userId: string
}
```

**返回数据：**
```typescript
{
  recommended: ClassGroup  // 最推荐的1个班次
  others: ClassGroup[]     // 其他班次（简化信息）
  total: number            // 总班次数
}
```

**推荐算法：**
```typescript
async getRecommendation(productId: string, userId: string, userLocation: Location) {
  // 1. 获取所有可用的拼班课程
  const allClassGroups = await this.classGroupRepository.find({
    where: {
      productId,
      status: 'active',
      endTime: MoreThan(new Date())
    }
  })
  
  // 2. 过滤距离超出范围的
  const nearbyClassGroups = allClassGroups.filter(cg => {
    const distance = this.calculateDistance(userLocation, {
      lat: cg.locationLat,
      lng: cg.locationLng
    })
    return distance <= cg.maxDistance
  })
  
  // 3. 计算推荐得分
  const scoredClassGroups = nearbyClassGroups.map(cg => ({
    classGroup: cg,
    score: this.calculateScore(cg, userLocation, userId),
    reason: this.generateReason(cg, userLocation)
  }))
  
  // 4. 排序并返回
  scoredClassGroups.sort((a, b) => b.score - a.score)
  
  return {
    recommended: scoredClassGroups[0],
    others: scoredClassGroups.slice(1, 6),  // 最多返回5个其他班次
    total: scoredClassGroups.length
  }
}

// 推荐得分计算
calculateScore(classGroup: ClassGroup, userLocation: Location, userId: string) {
  const weights = {
    distance: 0.4,
    time: 0.3,
    progress: 0.2,
    price: 0.1
  }
  
  // 距离得分（越近越高）
  const distance = this.calculateDistance(userLocation, {
    lat: classGroup.locationLat,
    lng: classGroup.locationLng
  })
  const distanceScore = Math.max(0, 100 - (distance / 100))
  
  // 时间匹配度（工作日晚上 > 周末 > 工作日白天）
  const timeScore = this.calculateTimePreference(classGroup.schedule)
  
  // 成团进度（差1人 > 差2人 > 新班）
  const progressScore = (classGroup.currentParticipants / classGroup.minParticipants) * 100
  
  // 价格优惠（折扣越大越高）
  const priceScore = ((classGroup.originalPrice - classGroup.price) / classGroup.originalPrice) * 100
  
  return (
    distanceScore * weights.distance +
    timeScore * weights.time +
    progressScore * weights.progress +
    priceScore * weights.price
  )
}
```

---

#### 接口3：创建订单接口调整

**路径：** `POST /api/order/create`

**请求参数调整：**
```typescript
{
  productId: string
  quantity: number
  
  // 新增：活动信息
  activityType?: 'SECKILL' | 'GROUP_BUY' | 'COURSE_GROUP_BUY' | 'NORMAL'
  activityId?: string
  
  // 拼班特有参数
  classGroupParams?: {
    classGroupId: string
    isInitiator: boolean      // 是否为发起人
    referrerId?: string        // 推荐人ID（如果是参与别人的拼班）
  }
}
```

**后端逻辑：**
```typescript
async createOrder(createOrderDto: CreateOrderDto, userId: string) {
  // 1. 验证活动有效性
  if (createOrderDto.activityId) {
    const activity = await this.marketingService.validateActivity(
      createOrderDto.activityId,
      createOrderDto.productId
    )
    
    if (!activity) {
      throw new BadRequestException('活动不存在或已结束')
    }
  }
  
  // 2. 计算价格和分佣
  const priceInfo = await this.calculatePrice(createOrderDto)
  
  // 3. 创建订单
  const order = await this.orderRepository.save({
    userId,
    productId: createOrderDto.productId,
    quantity: createOrderDto.quantity,
    
    // 活动信息
    activityType: createOrderDto.activityType || 'NORMAL',
    activityId: createOrderDto.activityId,
    
    // 价格信息
    originalPrice: priceInfo.originalPrice,
    actualPrice: priceInfo.actualPrice,
    
    // 分佣信息
    commissionEnabled: priceInfo.commission.enabled,
    commissionAmount: priceInfo.commission.amount,
    commissionRecipientId: priceInfo.commission.recipientId,
    
    // 拼班信息
    classGroupId: createOrderDto.classGroupParams?.classGroupId,
    
    status: 'pending'
  })
  
  // 4. 如果是拼班订单，创建参与记录
  if (createOrderDto.activityType === 'COURSE_GROUP_BUY') {
    await this.classGroupService.addParticipant({
      classGroupId: createOrderDto.classGroupParams.classGroupId,
      userId,
      orderId: order.id,
      isInitiator: createOrderDto.classGroupParams.isInitiator,
      referrerId: createOrderDto.classGroupParams.referrerId
    })
  }
  
  return order
}

// 价格和分佣计算
async calculatePrice(dto: CreateOrderDto) {
  const product = await this.productService.findById(dto.productId)
  
  let actualPrice = product.price
  let commission = {
    enabled: false,
    amount: 0,
    recipientId: null
  }
  
  // 如果有活动
  if (dto.activityId) {
    const activity = await this.marketingService.findById(dto.activityId)
    actualPrice = activity.price
    
    // 如果是拼班课程且用户是参与者（非发起人）
    if (dto.activityType === 'COURSE_GROUP_BUY' && !dto.classGroupParams.isInitiator) {
      const classGroup = await this.classGroupService.findById(dto.classGroupParams.classGroupId)
      
      // 找到发起人
      const initiator = await this.classGroupParticipantRepository.findOne({
        where: {
          classGroupId: classGroup.id,
          isInitiator: true
        }
      })
      
      if (initiator) {
        commission = {
          enabled: true,
          amount: classGroup.commissionAmount,
          recipientId: initiator.userId
        }
      }
    }
  }
  
  return {
    originalPrice: product.price,
    actualPrice,
    commission
  }
}
```


#### 接口4：管理后台 - 创建活动接口调整

**路径：** `POST /api/admin/marketing/activity`

**新增验证逻辑：**
```typescript
async createActivity(createActivityDto: CreateActivityDto) {
  // 1. 检查活动冲突
  const existingActivities = await this.marketingActivityRepository.find({
    where: {
      productId: createActivityDto.productId,
      status: In(['pending', 'active']),
      // 时间重叠检查
      startTime: LessThan(createActivityDto.endTime),
      endTime: MoreThan(createActivityDto.startTime)
    }
  })
  
  // 2. 使用冲突矩阵检查
  for (const existing of existingActivities) {
    const { conflict, rule } = checkConflict(
      existing.templateCode,
      createActivityDto.templateCode
    )
    
    if (conflict) {
      throw new BadRequestException({
        message: '活动冲突',
        reason: rule.reason,
        existingActivity: {
          id: existing.id,
          name: existing.name,
          type: existing.templateCode,
          startTime: existing.startTime,
          endTime: existing.endTime
        },
        suggestions: [
          '修改活动时间，避开冲突时段',
          '或者取消现有活动',
          '或者选择其他活动类型'
        ]
      })
    }
  }
  
  // 3. 创建活动
  const activity = await this.marketingActivityRepository.save(createActivityDto)
  
  // 4. 如果是拼班课程，创建班次
  if (createActivityDto.templateCode === 'COURSE_GROUP_BUY') {
    await this.classGroupService.createFromActivity(activity, createActivityDto.classGroupParams)
  }
  
  return activity
}
```

---

## 三、小程序前端改造

### 3.1 页面结构调整

#### 页面1：商品详情页 (pages/product/detail.vue)

**新增状态管理：**
```typescript
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { useLocationStore } from '@/store/location'

const userStore = useUserStore()
const locationStore = useLocationStore()

// 商品数据
const product = ref<ProductDetail | null>(null)

// 当前选中的活动
const selectedActivity = ref<Activity | null>(null)

// 底部按钮状态
const bottomBarConfig = computed(() => {
  if (!selectedActivity.value) {
    return {
      type: 'select',
      text: '请先选择购买方式',
      disabled: true
    }
  }
  
  switch (selectedActivity.value.type) {
    case 'SECKILL':
      return {
        type: 'seckill',
        text: '立即抢购',
        price: selectedActivity.value.price,
        disabled: false
      }
    
    case 'COURSE_GROUP_BUY':
      return {
        type: 'class-group',
        buttons: [
          { text: '参与拼班', action: 'join' },
          { text: '发起拼班 👑', action: 'initiate', visible: userStore.canInitiateClass }
        ],
        price: selectedActivity.value.price,
        commission: selectedActivity.value.commission
      }
    
    default:
      return {
        type: 'normal',
        text: '立即购买',
        price: selectedActivity.value.price
      }
  }
})

// 获取商品详情
onMounted(async () => {
  // 1. 获取用户位置
  await locationStore.getCurrentLocation()
  
  // 2. 获取商品详情
  product.value = await api.getProductDetail({
    productId: route.params.id,
    userLocation: locationStore.location
  })
  
  // 3. 自动选中主活动
  if (product.value.activities.primary) {
    selectedActivity.value = product.value.activities.primary
  }
})

// 选择活动
function selectActivity(activity: Activity) {
  selectedActivity.value = activity
}

// 处理购买
async function handlePurchase(action?: string) {
  if (!selectedActivity.value) {
    uni.showToast({ title: '请先选择购买方式', icon: 'none' })
    return
  }
  
  // 跳转到订单确认页
  uni.navigateTo({
    url: `/pages/order/confirm?productId=${product.value.id}&activityId=${selectedActivity.value.id}&activityType=${selectedActivity.value.type}&action=${action || 'buy'}`
  })
}
</script>
```


**模板结构：**
```vue
<template>
  <view class="product-detail">
    <!-- 商品图片轮播 -->
    <swiper class="product-images">
      <swiper-item v-for="img in product.images" :key="img">
        <image :src="img" mode="aspectFill" />
      </swiper-item>
    </swiper>
    
    <!-- 商品基础信息 -->
    <view class="product-info">
      <text class="product-name">{{ product.name }}</text>
      <text class="original-price">原价 ¥{{ product.originalPrice }}</text>
    </view>
    
    <!-- 主营销活动 -->
    <view 
      v-if="product.activities.primary"
      class="activity-card primary"
      :class="{ selected: selectedActivity?.id === product.activities.primary.id }"
      @click="selectActivity(product.activities.primary)"
    >
      <!-- 秒杀活动 -->
      <template v-if="product.activities.primary.type === 'SECKILL'">
        <view class="activity-header">
          <text class="activity-icon">🔥</text>
          <text class="activity-title">限时秒杀</text>
        </view>
        <view class="activity-price">
          <text class="price">¥{{ product.activities.primary.price }}</text>
          <text class="save">省 ¥{{ product.originalPrice - product.activities.primary.price }}</text>
        </view>
        <view class="activity-countdown">
          <text>⏰ 距结束 {{ formatCountdown(product.activities.primary.seckillInfo.timeLeft) }}</text>
        </view>
        <view class="activity-warning">
          <text>⚠️ 此活动不参与分佣</text>
        </view>
      </template>
      
      <!-- 拼班课程活动 -->
      <template v-if="product.activities.primary.type === 'COURSE_GROUP_BUY'">
        <view class="activity-header">
          <text class="activity-icon">🎯</text>
          <text class="activity-title">为你推荐的拼班课程</text>
        </view>
        
        <!-- 推荐标签 -->
        <view class="recommend-tags">
          <text 
            v-for="tag in product.recommendedClassGroup.reason.tags" 
            :key="tag"
            class="tag"
          >
            {{ tag }}
          </text>
        </view>
        
        <view class="class-info">
          <text class="schedule">{{ product.activities.primary.classGroupInfo.schedule }}</text>
          <text class="location">
            {{ product.activities.primary.classGroupInfo.location }} · 
            距你 {{ formatDistance(product.activities.primary.classGroupInfo.distance) }}
          </text>
        </view>
        
        <view class="activity-price">
          <text class="price">¥{{ product.activities.primary.price }}/人</text>
          <text class="save">省 ¥{{ product.originalPrice - product.activities.primary.price }}</text>
        </view>
        
        <view class="group-progress">
          <text>还差 {{ product.activities.primary.classGroupInfo.minParticipants - product.activities.primary.classGroupInfo.currentParticipants }} 人成团</text>
        </view>
        
        <view class="commission-info" v-if="product.activities.primary.commission.enabled">
          <text>💰 发起可得佣金 ¥{{ product.activities.primary.commission.amount }}</text>
        </view>
        
        <!-- 查看更多班次 -->
        <view 
          v-if="product.recommendedClassGroup.otherClassGroupsCount > 0"
          class="more-classes"
          @click.stop="showMoreClasses"
        >
          <text>还有 {{ product.recommendedClassGroup.otherClassGroupsCount }} 个其他班次</text>
          <text class="arrow">></text>
        </view>
      </template>
    </view>
    
    <!-- 可叠加优惠 -->
    <view v-if="product.activities.stackable.length > 0" class="stackable-activities">
      <text class="label">💰 可叠加优惠：</text>
      <text 
        v-for="activity in product.activities.stackable" 
        :key="activity.id"
        class="stackable-item"
      >
        {{ activity.name }}
      </text>
    </view>
    
    <!-- 商品详情 -->
    <view class="product-description">
      <rich-text :nodes="product.description" />
    </view>
    
    <!-- 底部固定栏 -->
    <view class="bottom-bar">
      <!-- 未选择活动 -->
      <template v-if="bottomBarConfig.type === 'select'">
        <view class="select-hint">
          <text>请先选择购买方式 ↑</text>
        </view>
        <button class="btn-primary" disabled>选择活动</button>
      </template>
      
      <!-- 秒杀活动 -->
      <template v-if="bottomBarConfig.type === 'seckill'">
        <view class="price-info">
          <text class="label">秒杀价</text>
          <text class="price">¥{{ bottomBarConfig.price }}</text>
        </view>
        <button class="btn-primary" @click="handlePurchase()">
          立即抢购
        </button>
      </template>
      
      <!-- 拼班课程 -->
      <template v-if="bottomBarConfig.type === 'class-group'">
        <view class="price-info">
          <text class="label">拼班价</text>
          <text class="price">¥{{ bottomBarConfig.price }}/人</text>
          <text v-if="bottomBarConfig.commission.enabled" class="commission">
            发起可得 ¥{{ bottomBarConfig.commission.amount }}
          </text>
        </view>
        <view class="btn-group">
          <button class="btn-secondary" @click="handlePurchase('join')">
            参与拼班
          </button>
          <button 
            v-if="userStore.canInitiateClass"
            class="btn-primary" 
            @click="handlePurchase('initiate')"
          >
            发起拼班 👑
          </button>
        </view>
      </template>
    </view>
  </view>
</template>
```

---

### 3.2 新增页面

#### 页面2：拼班课程列表页 (pages/class-group/list.vue)

**用途：** 点击"查看更多班次"时展示

```vue
<template>
  <view class="class-group-list">
    <view class="header">
      <text class="title">全部拼班课程 ({{ total }}个)</text>
    </view>
    
    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view class="filter-item">
        <text>时间：</text>
        <picker mode="selector" :range="timeFilters" @change="onTimeFilterChange">
          <text>{{ selectedTimeFilter }}</text>
        </picker>
      </view>
      
      <view class="filter-item">
        <text>排序：</text>
        <picker mode="selector" :range="sortOptions" @change="onSortChange">
          <text>{{ selectedSort }}</text>
        </picker>
      </view>
    </view>
    
    <!-- 班次列表 -->
    <view class="class-list">
      <view 
        v-for="item in classList" 
        :key="item.classGroup.id"
        class="class-card"
        @click="selectClass(item)"
      >
        <!-- 推荐标签 -->
        <view v-if="item.reason.tags.length > 0" class="tags">
          <text v-for="tag in item.reason.tags" :key="tag" class="tag">
            {{ tag }}
          </text>
        </view>
        
        <view class="class-info">
          <text class="schedule">{{ item.classGroup.schedule }}</text>
          <text class="location">
            {{ item.classGroup.location }} · 距你 {{ formatDistance(item.classGroup.distance) }}
          </text>
        </view>
        
        <view class="class-price">
          <text class="price">¥{{ item.classGroup.price }}/人</text>
          <text class="progress">
            {{ item.classGroup.currentParticipants }}/{{ item.classGroup.minParticipants }}人
          </text>
        </view>
        
        <view class="class-actions">
          <button class="btn-join" size="mini">参与</button>
          <button v-if="userStore.canInitiateClass" class="btn-initiate" size="mini">
            发起 👑
          </button>
        </view>
      </view>
    </view>
  </view>
</template>
```


#### 页面3：订单确认页调整 (pages/order/confirm.vue)

**新增逻辑：**
```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const route = useRoute()
const orderInfo = ref(null)

onMounted(async () => {
  // 获取订单预览信息
  orderInfo.value = await api.getOrderPreview({
    productId: route.query.productId,
    activityId: route.query.activityId,
    activityType: route.query.activityType,
    action: route.query.action  // 'join' 或 'initiate'
  })
})

// 提交订单
async function submitOrder() {
  const result = await api.createOrder({
    productId: route.query.productId,
    quantity: 1,
    activityType: route.query.activityType,
    activityId: route.query.activityId,
    classGroupParams: route.query.activityType === 'COURSE_GROUP_BUY' ? {
      classGroupId: orderInfo.value.classGroupId,
      isInitiator: route.query.action === 'initiate',
      referrerId: route.query.referrerId  // 如果是参与别人的拼班
    } : undefined
  })
  
  // 跳转到支付页
  uni.navigateTo({
    url: `/pages/payment/index?orderId=${result.orderId}`
  })
}
</script>

<template>
  <view class="order-confirm">
    <!-- 商品信息 -->
    <view class="product-section">
      <image :src="orderInfo.product.image" class="product-image" />
      <view class="product-info">
        <text class="product-name">{{ orderInfo.product.name }}</text>
        <text class="product-price">¥{{ orderInfo.actualPrice }}</text>
      </view>
    </view>
    
    <!-- 活动信息 -->
    <view class="activity-section">
      <text class="section-title">活动信息</text>
      
      <!-- 秒杀 -->
      <template v-if="orderInfo.activityType === 'SECKILL'">
        <view class="activity-info">
          <text>🔥 秒杀活动</text>
          <text>⚠️ 此活动不参与分佣</text>
        </view>
      </template>
      
      <!-- 拼班课程 -->
      <template v-if="orderInfo.activityType === 'COURSE_GROUP_BUY'">
        <view class="activity-info">
          <text class="activity-type">
            🎯 拼班课程 - {{ route.query.action === 'initiate' ? '发起' : '参与' }}
          </text>
          <text>时间：{{ orderInfo.classGroup.schedule }}</text>
          <text>地点：{{ orderInfo.classGroup.location }}</text>
          <text>距你：{{ formatDistance(orderInfo.classGroup.distance) }}</text>
        </view>
        
        <!-- 分佣信息 -->
        <view v-if="orderInfo.commission.enabled" class="commission-section">
          <text class="section-title">💰 佣金收益</text>
          <template v-if="route.query.action === 'initiate'">
            <text>成团后你将获得：¥{{ orderInfo.commission.amount }}</text>
            <text class="commission-rule">
              你发起的拼班，所有参与者的佣金归你
            </text>
          </template>
          <template v-else>
            <text>推荐人将获得佣金：¥{{ orderInfo.commission.amount }}</text>
          </template>
        </view>
      </template>
    </view>
    
    <!-- 价格明细 -->
    <view class="price-section">
      <view class="price-item">
        <text>商品原价</text>
        <text>¥{{ orderInfo.originalPrice }}</text>
      </view>
      <view class="price-item">
        <text>活动优惠</text>
        <text class="discount">-¥{{ orderInfo.originalPrice - orderInfo.actualPrice }}</text>
      </view>
      <view class="price-item total">
        <text>实付金额</text>
        <text class="total-price">¥{{ orderInfo.actualPrice }}</text>
      </view>
    </view>
    
    <!-- 提交按钮 -->
    <view class="submit-section">
      <button class="btn-submit" @click="submitOrder">
        确认支付 ¥{{ orderInfo.actualPrice }}
      </button>
    </view>
  </view>
</template>
```

---

### 3.3 状态管理调整

#### Store: 用户信息 (store/user.ts)

```typescript
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    userInfo: null as UserInfo | null,
    userLevel: 'C0' as 'C0' | 'C1' | 'C2'
  }),
  
  getters: {
    // 是否可以发起拼班
    canInitiateClass: (state) => {
      return state.userLevel === 'C1' || state.userLevel === 'C2'
    }
  },
  
  actions: {
    async fetchUserInfo() {
      const res = await api.getUserInfo()
      this.userInfo = res.data
      this.userLevel = res.data.level
    }
  }
})
```

#### Store: 地理位置 (store/location.ts)

```typescript
import { defineStore } from 'pinia'

export const useLocationStore = defineStore('location', {
  state: () => ({
    location: null as { lat: number, lng: number } | null,
    locationName: '',
    permissionGranted: false
  }),
  
  actions: {
    async getCurrentLocation() {
      try {
        // 1. 检查权限
        const authResult = await uni.authorize({
          scope: 'scope.userLocation'
        })
        
        if (!authResult[0]) {
          this.permissionGranted = false
          return null
        }
        
        // 2. 获取位置
        const locationResult = await uni.getLocation({
          type: 'gcj02'
        })
        
        this.location = {
          lat: locationResult[1].latitude,
          lng: locationResult[1].longitude
        }
        this.permissionGranted = true
        
        // 3. 逆地理编码获取地址名称
        const addressResult = await api.reverseGeocode(this.location)
        this.locationName = addressResult.address
        
        return this.location
      } catch (error) {
        console.error('获取位置失败', error)
        this.permissionGranted = false
        return null
      }
    },
    
    // 手动选择地址（降级方案）
    async selectAddress(address: string) {
      const result = await api.geocode(address)
      this.location = result.location
      this.locationName = address
    }
  }
})
```

---

## 四、完整用户流程

### 流程1：用户参与拼班课程

```
步骤1: 进入小程序
  ↓
自动获取用户位置（后台静默）
  ↓
步骤2: 浏览商品列表，点击课程商品
  ↓
进入商品详情页
  ↓
步骤3: 页面加载
  ├─ 调用 GET /api/product/:id（带用户位置）
  ├─ 后端计算推荐的拼班课程
  └─ 返回商品信息 + 推荐的1个班次
  ↓
步骤4: 页面展示
  ├─ 商品基础信息
  ├─ 推荐的拼班课程卡片（高亮）
  │   ├─ 推荐标签："📍 离你最近" "🔥 差1人成团"
  │   ├─ 时间地点：周三 19:00 · 朝阳校区 · 2.3km
  │   ├─ 价格：¥199/人（原价 ¥599）
  │   ├─ 成团进度：还差1人成团
  │   └─ 佣金提示：💰 发起可得 ¥89
  ├─ "查看更多班次 (5个)" 按钮
  └─ 底部固定栏：[参与拼班] [发起拼班 👑]
  ↓
步骤5: 用户点击"参与拼班"
  ↓
跳转到订单确认页
  ├─ URL: /pages/order/confirm?productId=xxx&activityId=xxx&activityType=COURSE_GROUP_BUY&action=join
  ├─ 调用 GET /api/order/preview
  └─ 展示订单详情
  ↓
步骤6: 订单确认页展示
  ├─ 商品信息
  ├─ 拼班信息（时间、地点、距离）
  ├─ 分佣提示："推荐人将获得佣金 ¥89"
  ├─ 价格明细
  │   ├─ 原价：¥599
  │   ├─ 优惠：-¥400
  │   └─ 实付：¥199
  └─ [确认支付 ¥199] 按钮
  ↓
步骤7: 用户点击"确认支付"
  ↓
调用 POST /api/order/create
  ├─ 请求参数：
  │   ├─ productId
  │   ├─ activityType: 'COURSE_GROUP_BUY'
  │   ├─ activityId
  │   └─ classGroupParams: {
  │         classGroupId,
  │         isInitiator: false,
  │         referrerId: '发起人ID'
  │       }
  ├─ 后端逻辑：
  │   ├─ 创建订单
  │   ├─ 记录分佣信息（佣金归发起人）
  │   ├─ 创建拼班参与记录
  │   └─ 更新拼班成团进度
  └─ 返回订单ID
  ↓
步骤8: 跳转到支付页
  ↓
支付成功
  ↓
步骤9: 检查是否成团
  ├─ 如果成团（3/3人）
  │   ├─ 更新拼班状态为 'completed'
  │   ├─ 结算佣金给发起人
  │   └─ 发送成团通知给所有参与者
  └─ 如果未成团
      └─ 等待其他人参与
  ↓
步骤10: 支付成功页
  ├─ 显示"支付成功"
  ├─ 显示成团进度："3/3人 ✓ 已成团"
  ├─ 显示课程信息
  └─ [查看我的课程] 按钮
```


### 流程2：C1/C2 用户发起拼班

```
步骤1-4: 同上（进入商品详情页）
  ↓
步骤5: C1/C2 用户点击"发起拼班 👑"
  ↓
跳转到发起拼班页面
  ├─ URL: /pages/class-group/initiate?productId=xxx
  └─ 展示发起表单
  ↓
步骤6: 发起拼班表单
  ├─ 选择课程参数
  │   ├─ 上课时间：[周一] [周三] [周五]
  │   └─ 上课地点：[朝阳校区] [海淀校区]
  ├─ 预估收益展示
  │   ├─ 成团人数：3人
  │   ├─ 单人佣金：¥29.7
  │   └─ 总收益：¥89
  └─ [确认发起] 按钮
  ↓
步骤7: 用户点击"确认发起"
  ↓
调用 POST /api/class-group/create
  ├─ 请求参数：
  │   ├─ productId
  │   ├─ schedule: '周三 19:00-21:00'
  │   ├─ locationId: '朝阳校区ID'
  │   └─ initiatorId: '当前用户ID'
  ├─ 后端逻辑：
  │   ├─ 创建新的拼班记录
  │   ├─ 创建订单（发起人自己的订单）
  │   ├─ 创建参与记录（isInitiator: true）
  │   └─ 设置分佣规则（所有参与者佣金归发起人）
  └─ 返回拼班ID和订单ID
  ↓
步骤8: 跳转到支付页
  ↓
支付成功
  ↓
步骤9: 拼班创建成功
  ├─ 显示"拼班发起成功"
  ├─ 显示当前进度："1/3人"
  ├─ 显示分享按钮："邀请好友参与"
  └─ 生成分享海报（带推荐码）
  ↓
步骤10: 发起人分享给好友
  ├─ 好友点击分享链接
  ├─ 进入商品详情页（带 referrerId 参数）
  ├─ 好友参与拼班
  └─ 佣金自动归发起人
```

---

### 流程3：秒杀活动购买

```
步骤1-4: 同上（进入商品详情页）
  ↓
步骤5: 页面展示秒杀活动
  ├─ 🔥 限时秒杀
  ├─ ¥299（原价 ¥599）
  ├─ ⏰ 距结束 02:34:12
  ├─ ⚠️ 此活动不参与分佣
  └─ 底部：[立即抢购]
  ↓
步骤6: 用户点击"立即抢购"
  ↓
跳转到订单确认页
  ├─ URL: /pages/order/confirm?productId=xxx&activityId=xxx&activityType=SECKILL
  └─ 展示订单详情
  ↓
步骤7: 订单确认页
  ├─ 商品信息
  ├─ 秒杀活动信息
  ├─ ⚠️ 此活动不参与分佣
  ├─ 价格：¥299
  └─ [确认支付 ¥299]
  ↓
步骤8: 调用 POST /api/order/create
  ├─ 请求参数：
  │   ├─ productId
  │   ├─ activityType: 'SECKILL'
  │   └─ activityId
  ├─ 后端逻辑：
  │   ├─ 检查秒杀库存
  │   ├─ 创建订单（commissionEnabled: false）
  │   └─ 扣减秒杀库存
  └─ 返回订单ID
  ↓
步骤9: 支付成功
  └─ 显示"支付成功"
```

---

## 五、关键技术点

### 5.1 活动冲突检测

**时机：** 管理后台创建活动时

**逻辑：**
```typescript
// 检查时间重叠 + 活动类型冲突
const hasConflict = await this.checkActivityConflict({
  productId,
  templateCode,
  startTime,
  endTime
})

if (hasConflict) {
  throw new BadRequestException('活动冲突')
}
```

---

### 5.2 推荐算法

**时机：** 用户进入商品详情页时

**输入：**
- 商品ID
- 用户位置
- 用户偏好（可选）

**输出：**
- 最推荐的1个班次
- 推荐理由和标签
- 其他班次数量

**权重：**
- 距离：40%
- 时间匹配度：30%
- 成团进度：20%
- 价格优惠：10%

---

### 5.3 分佣计算

**规则：**
1. **秒杀活动**：不参与分佣
2. **拼班课程**：
   - 发起人：获得所有参与者的佣金
   - 参与者：推荐人（发起人）获得佣金
3. **拼团活动**：按配置的分佣规则

**计算时机：**
- 订单创建时：记录分佣信息
- 成团时：结算佣金

---

### 5.4 实时更新

**使用 WebSocket 推送：**
- 拼班成团进度更新
- 秒杀库存更新
- 活动状态变化

```typescript
// 前端监听
socket.on('class-group-update', (data) => {
  if (data.classGroupId === currentClassGroup.id) {
    // 更新成团进度
    currentParticipants.value = data.currentParticipants
    
    // 如果成团，显示庆祝动画
    if (data.status === 'completed') {
      showSuccessAnimation()
    }
  }
})
```

---

## 六、开发优先级

### Phase 1: 核心功能（2周）
- [ ] 数据库表结构调整
- [ ] 活动冲突检测逻辑
- [ ] 商品详情接口调整
- [ ] 小程序商品详情页改造
- [ ] 订单创建接口调整
- [ ] 基础的拼班课程功能

### Phase 2: 推荐算法（1周）
- [ ] 拼班课程推荐算法
- [ ] 地理位置服务集成
- [ ] 推荐标签生成
- [ ] 拼班课程列表页

### Phase 3: 分佣系统（1周）
- [ ] 分佣计算逻辑
- [ ] 分佣结算流程
- [ ] 佣金明细展示
- [ ] 发起人收益统计

### Phase 4: 体验优化（1周）
- [ ] 实时成团进度推送
- [ ] 分享海报生成
- [ ] 动画效果优化
- [ ] 降级方案（定位失败）

### Phase 5: 管理后台（1周）
- [ ] 拼班课程管理
- [ ] 活动冲突提示优化
- [ ] 分佣数据统计
- [ ] 活动效果分析

---

## 七、测试要点

### 7.1 功能测试
- [ ] 活动冲突检测是否生效
- [ ] 推荐算法是否准确
- [ ] 分佣计算是否正确
- [ ] 成团逻辑是否正常
- [ ] 订单状态流转是否正确

### 7.2 边界测试
- [ ] 定位失败时的降级方案
- [ ] 活动过期时的处理
- [ ] 库存不足时的提示
- [ ] 并发购买时的库存扣减
- [ ] 拼班超时未成团的退款

### 7.3 性能测试
- [ ] 商品详情页加载速度
- [ ] 推荐算法响应时间
- [ ] 高并发秒杀场景
- [ ] WebSocket 连接稳定性

---

## 八、风险点和注意事项

### 8.1 业务风险
⚠️ **活动冲突规则变更**
- 如果后续业务要求秒杀和拼班共存，需要重新设计 UI
- 建议：在管理后台提供"强制创建"选项，但前端仍按互斥展示

⚠️ **分佣规则复杂化**
- 当前只支持"发起人获得全部佣金"
- 如果后续需要多级分佣，需要重构分佣表结构

### 8.2 技术风险
⚠️ **地理位置精度**
- 用户拒绝定位权限时，推荐算法失效
- 解决：提供手动选择地址的降级方案

⚠️ **并发问题**
- 拼班成团时的并发控制
- 秒杀库存的并发扣减
- 解决：使用 Redis 分布式锁

⚠️ **数据一致性**
- 订单、拼班记录、分佣记录的事务一致性
- 解决：使用数据库事务 + 补偿机制

---

## 九、总结

### 核心改动点

**后端：**
1. 强化活动互斥规则（秒杀和拼班互斥）
2. 新增拼班课程相关表和接口
3. 商品详情接口返回推荐的拼班课程
4. 订单创建接口支持活动类型和分佣

**前端：**
1. 商品详情页动态展示活动（最多1个主活动）
2. 底部按钮根据活动类型动态变化
3. 新增拼班课程列表页
4. 订单确认页展示分佣信息

**用户体验：**
1. 自动定位 + 智能推荐（无需筛选）
2. 一次只展示1个主活动（避免混乱）
3. 分佣信息透明（明确标注）
4. C1/C2 特权明确（发起拼班按钮）

### 预期效果

✅ 用户决策简单（不会困惑选哪个活动）
✅ 价格清晰（一次只显示一个价格）
✅ 分佣透明（用户知道能赚多少）
✅ 推荐精准（基于位置和偏好）
✅ 转化率提升（减少决策疲劳）
