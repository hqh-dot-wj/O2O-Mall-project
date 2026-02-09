# 完整用户流程：从打开小程序到购买

## 流程概览

```
用户打开小程序
    ↓
自动获取位置（后台静默）
    ↓
浏览商品列表
    ↓
点击课程商品
    ↓
进入商品详情页（展示推荐的拼班）
    ↓
用户选择：参与拼班 or 发起拼班
    ↓
订单确认页
    ↓
支付
    ↓
支付成功 → 检查成团状态
    ↓
成团成功 / 等待成团
```

---

## 详细流程拆解

### 阶段1：用户进入小程序

#### 1.1 小程序启动（App.vue）

**触发时机：** 用户打开小程序

**前端逻辑：**
```typescript
// apps/miniapp-client/src/App.vue
<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useLocationStore } from '@/store/location'

const userStore = useUserStore()
const locationStore = useLocationStore()

onLaunch(async () => {
  console.log('小程序启动')
  
  // 1. 获取用户信息
  await userStore.fetchUserInfo()
  
  // 2. 静默获取位置（不阻塞启动）
  locationStore.getCurrentLocation().catch(err => {
    console.log('位置获取失败，将使用降级方案', err)
  })
})
</script>
```

**后端接口：** `GET /api/member/info`

**返回数据：**
```typescript
{
  memberId: "xxx",
  nickname: "张三",
  avatar: "https://...",
  levelId: 1,  // 0=C0, 1=C1, 2=C2
  balance: 100.00
}
```


#### 1.2 获取用户位置

**触发时机：** 小程序启动后自动执行

**前端逻辑：**
```typescript
// apps/miniapp-client/src/store/location.ts
import { defineStore } from 'pinia'

export const useLocationStore = defineStore('location', {
  state: () => ({
    location: null as { lat: number, lng: number } | null,
    locationName: '',
    permissionGranted: false,
    error: null as string | null
  }),
  
  actions: {
    async getCurrentLocation() {
      try {
        // 1. 请求位置权限
        const authResult = await uni.authorize({
          scope: 'scope.userLocation'
        })
        
        if (!authResult[0]) {
          this.permissionGranted = false
          this.error = 'permission_denied'
          return null
        }
        
        // 2. 获取位置
        const [err, res] = await uni.getLocation({
          type: 'gcj02'  // 国测局坐标
        })
        
        if (err) {
          this.error = 'location_failed'
          return null
        }
        
        this.location = {
          lat: res.latitude,
          lng: res.longitude
        }
        this.permissionGranted = true
        
        // 3. 逆地理编码（可选）
        const address = await this.reverseGeocode(this.location)
        this.locationName = address
        
        return this.location
      } catch (error) {
        console.error('获取位置失败', error)
        this.error = 'unknown_error'
        return null
      }
    },
    
    async reverseGeocode(location: { lat: number, lng: number }) {
      // 调用后端接口或第三方地图API
      const res = await api.post('/api/map/reverse-geocode', location)
      return res.data.address
    }
  }
})
```

**降级方案（位置获取失败）：**
```typescript
// 如果用户拒绝授权或获取失败
if (!locationStore.location) {
  // 方案1: 使用默认站点位置
  locationStore.location = {
    lat: 39.9042,  // 默认北京
    lng: 116.4074
  }
  
  // 方案2: 提示用户手动选择地址
  uni.showModal({
    title: '需要位置权限',
    content: '为了推荐附近的拼班课程，请允许获取位置',
    success: (res) => {
      if (res.confirm) {
        locationStore.getCurrentLocation()
      } else {
        // 跳转到手动选择地址页面
        uni.navigateTo({
          url: '/pages/address/select'
        })
      }
    }
  })
}
```

---

### 阶段2：浏览商品列表

#### 2.1 商品列表页

**页面路径：** `pages/product/list.vue`

**前端逻辑：**
```typescript
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const productList = ref([])

onMounted(async () => {
  // 获取商品列表
  const res = await api.get('/api/product/list', {
    params: {
      categoryId: route.query.categoryId,
      page: 1,
      pageSize: 20
    }
  })
  
  productList.value = res.data.list
})
</script>

<template>
  <view class="product-list">
    <view 
      v-for="product in productList" 
      :key="product.id"
      class="product-card"
      @click="goToDetail(product.id)"
    >
      <image :src="product.mainImages[0]" class="product-image" />
      <view class="product-info">
        <text class="product-name">{{ product.name }}</text>
        
        <!-- 显示最优价格 -->
        <view class="price-section">
          <text class="current-price">¥{{ product.minPrice }}</text>
          <text class="original-price">¥{{ product.originalPrice }}</text>
        </view>
        
        <!-- 营销标签 -->
        <view class="tags">
          <text v-if="product.hasFlashSale" class="tag flash-sale">🔥 秒杀</text>
          <text v-if="product.hasGroupBuy" class="tag group-buy">👥 拼团</text>
          <text v-if="product.hasClassGroup" class="tag class-group">🎓 拼班</text>
        </view>
      </view>
    </view>
  </view>
</template>
```

**后端接口：** `GET /api/product/list`

**返回数据：**
```typescript
{
  list: [
    {
      id: "prod-001",
      name: "Python 入门课程",
      mainImages: ["https://..."],
      originalPrice: 599.00,
      minPrice: 199.00,  // 所有营销活动中的最低价
      hasFlashSale: false,
      hasGroupBuy: false,
      hasClassGroup: true
    }
  ],
  total: 100
}
```


---

### 阶段3：进入商品详情页（核心）

#### 3.1 商品详情页加载

**页面路径：** `pages/product/detail.vue`

**触发时机：** 用户点击商品卡片

**前端逻辑：**
```typescript
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { useLocationStore } from '@/store/location'

const userStore = useUserStore()
const locationStore = useLocationStore()
const route = useRoute()

const product = ref(null)
const selectedActivity = ref(null)

onMounted(async () => {
  await loadProductDetail()
})

async function loadProductDetail() {
  // 调用商品详情接口
  const res = await api.get(`/api/product/${route.params.id}`, {
    params: {
      lat: locationStore.location?.lat,
      lng: locationStore.location?.lng,
      userId: userStore.userInfo?.memberId
    }
  })
  
  product.value = res.data
  
  // 自动选中主活动
  if (res.data.activities.primary) {
    selectedActivity.value = res.data.activities.primary
  }
}
</script>
```

**后端接口：** `GET /api/product/:id?lat=xxx&lng=xxx&userId=xxx`

**后端逻辑：**
```typescript
async getProductDetail(
  productId: string,
  userId: string,
  userLocation?: { lat: number, lng: number }
) {
  // 1. 获取商品基础信息
  const product = await this.prisma.pmsProduct.findUnique({
    where: { productId }
  })
  
  // 2. 获取该商品的所有营销配置
  const allConfigs = await this.prisma.storePlayConfig.findMany({
    where: {
      serviceId: productId,
      status: 'ON_SHELF',
      delFlag: 'NORMAL'
    }
  })
  
  // 3. 过滤互斥活动
  const filteredActivities = this.filterConflictActivities(allConfigs)
  
  // 4. 如果主活动是拼班课程，计算推荐
  let recommendedClassGroup = null
  if (filteredActivities.primary?.templateCode === 'COURSE_GROUP_BUY' && userLocation) {
    const classGroupConfigs = allConfigs.filter(c => c.templateCode === 'COURSE_GROUP_BUY')
    recommendedClassGroup = await this.calculateRecommendation(
      classGroupConfigs,
      userLocation,
      userId
    )
  }
  
  return {
    id: product.productId,
    name: product.name,
    mainImages: product.mainImages,
    originalPrice: product.price,
    detailHtml: product.detailHtml,
    
    activities: {
      primary: filteredActivities.primary,
      stackable: filteredActivities.stackable
    },
    
    recommendedClassGroup
  }
}
```

**返回数据示例（拼班课程）：**
```typescript
{
  id: "prod-001",
  name: "Python 入门课程",
  mainImages: ["https://..."],
  originalPrice: 599.00,
  
  activities: {
    primary: {
      id: "config-001",
      type: "COURSE_GROUP_BUY",
      templateCode: "COURSE_GROUP_BUY",
      price: 199.00,
      status: "active",
      
      classGroupInfo: {
        schedule: "周三 19:00-21:00",
        location: "朝阳校区",
        distance: 2300,  // 米
        minParticipants: 3,
        currentParticipants: 2,
        commissionAmount: 89.00
      }
    },
    stackable: [
      {
        id: "config-002",
        type: "FULL_REDUCTION",
        templateCode: "FULL_REDUCTION",
        rules: {
          threshold: 300,
          discount: 50
        }
      }
    ]
  },
  
  recommendedClassGroup: {
    config: { /* StorePlayConfig */ },
    score: 85.5,
    reason: {
      primary: "离你最近且即将成团",
      tags: ["📍 离你最近", "🔥 差1人成团"]
    },
    otherCount: 5
  }
}
```


#### 3.2 商品详情页展示

**页面模板：**
```vue
<template>
  <view class="product-detail">
    <!-- 商品图片轮播 -->
    <swiper class="product-swiper">
      <swiper-item v-for="img in product.mainImages" :key="img">
        <image :src="img" mode="aspectFill" />
      </swiper-item>
    </swiper>
    
    <!-- 商品基础信息 -->
    <view class="product-info">
      <text class="product-name">{{ product.name }}</text>
      <text class="original-price">原价 ¥{{ product.originalPrice }}</text>
    </view>
    
    <!-- 主营销活动卡片 -->
    <view 
      v-if="product.activities.primary"
      class="activity-card primary"
      :class="{ selected: selectedActivity?.id === product.activities.primary.id }"
      @click="selectActivity(product.activities.primary)"
    >
      <!-- 拼班课程 -->
      <template v-if="product.activities.primary.type === 'COURSE_GROUP_BUY'">
        <view class="activity-header">
          <text class="icon">🎯</text>
          <text class="title">为你推荐的拼班课程</text>
        </view>
        
        <!-- 推荐标签 -->
        <view class="tags">
          <text 
            v-for="tag in product.recommendedClassGroup.reason.tags" 
            :key="tag"
            class="tag"
          >
            {{ tag }}
          </text>
        </view>
        
        <!-- 课程信息 -->
        <view class="class-info">
          <text class="schedule">
            {{ product.activities.primary.classGroupInfo.schedule }}
          </text>
          <text class="location">
            {{ product.activities.primary.classGroupInfo.location }} · 
            距你 {{ formatDistance(product.activities.primary.classGroupInfo.distance) }}
          </text>
        </view>
        
        <!-- 价格 -->
        <view class="price-section">
          <text class="price">¥{{ product.activities.primary.price }}/人</text>
          <text class="save">省 ¥{{ product.originalPrice - product.activities.primary.price }}</text>
        </view>
        
        <!-- 成团进度 -->
        <view class="progress">
          <text>
            还差 {{ 
              product.activities.primary.classGroupInfo.minParticipants - 
              product.activities.primary.classGroupInfo.currentParticipants 
            }} 人成团
          </text>
        </view>
        
        <!-- 佣金提示 -->
        <view v-if="product.activities.primary.classGroupInfo.commissionAmount > 0" class="commission">
          <text>💰 发起可得佣金 ¥{{ product.activities.primary.classGroupInfo.commissionAmount }}</text>
        </view>
        
        <!-- 查看更多班次 -->
        <view 
          v-if="product.recommendedClassGroup.otherCount > 0"
          class="more-btn"
          @click.stop="showMoreClasses"
        >
          <text>还有 {{ product.recommendedClassGroup.otherCount }} 个其他班次</text>
          <text class="arrow">></text>
        </view>
      </template>
    </view>
    
    <!-- 可叠加优惠 -->
    <view v-if="product.activities.stackable.length > 0" class="stackable">
      <text class="label">💰 可叠加优惠：</text>
      <text 
        v-for="activity in product.activities.stackable" 
        :key="activity.id"
        class="item"
      >
        满{{ activity.rules.threshold }}减{{ activity.rules.discount }}
      </text>
    </view>
    
    <!-- 商品详情 -->
    <view class="product-detail-content">
      <rich-text :nodes="product.detailHtml" />
    </view>
    
    <!-- 底部固定栏 -->
    <view class="bottom-bar">
      <view class="price-info">
        <text class="label">拼班价</text>
        <text class="price">¥{{ selectedActivity?.price }}/人</text>
        <text v-if="userStore.canInitiateClass" class="commission">
          发起可得 ¥{{ selectedActivity?.classGroupInfo?.commissionAmount }}
        </text>
      </view>
      
      <view class="btn-group">
        <button class="btn-join" @click="handleJoin">
          参与拼班
        </button>
        <button 
          v-if="userStore.canInitiateClass"
          class="btn-initiate" 
          @click="handleInitiate"
        >
          发起拼班 👑
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
function formatDistance(meters: number) {
  if (meters < 1000) {
    return `${meters}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}

function selectActivity(activity) {
  selectedActivity.value = activity
}

function showMoreClasses() {
  uni.navigateTo({
    url: `/pages/class-group/list?productId=${product.value.id}`
  })
}

function handleJoin() {
  // 参与拼班
  uni.navigateTo({
    url: `/pages/order/confirm?productId=${product.value.id}&configId=${selectedActivity.value.id}&action=join`
  })
}

function handleInitiate() {
  // 发起拼班
  uni.navigateTo({
    url: `/pages/order/confirm?productId=${product.value.id}&configId=${selectedActivity.value.id}&action=initiate`
  })
}
</script>
```


---

### 阶段4：订单确认页

#### 4.1 订单确认页加载

**页面路径：** `pages/order/confirm.vue`

**触发时机：** 用户点击"参与拼班"或"发起拼班"

**前端逻辑：**
```typescript
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const route = useRoute()
const orderPreview = ref(null)

onMounted(async () => {
  await loadOrderPreview()
})

async function loadOrderPreview() {
  const res = await api.post('/api/order/preview', {
    productId: route.query.productId,
    configId: route.query.configId,
    action: route.query.action  // 'join' or 'initiate'
  })
  
  orderPreview.value = res.data
}
</script>
```

**后端接口：** `POST /api/order/preview`

**请求参数：**
```typescript
{
  productId: "prod-001",
  configId: "config-001",
  action: "join" | "initiate"
}
```

**后端逻辑：**
```typescript
async getOrderPreview(dto: OrderPreviewDto, userId: string) {
  // 1. 获取商品信息
  const product = await this.prisma.pmsProduct.findUnique({
    where: { productId: dto.productId }
  })
  
  // 2. 获取营销配置
  const config = await this.prisma.storePlayConfig.findUnique({
    where: { id: dto.configId }
  })
  
  const rules = config.rules as ClassGroupRules
  
  // 3. 如果是参与拼班，找到对应的活跃实例
  let existingInstance = null
  if (dto.action === 'join') {
    existingInstance = await this.prisma.playInstance.findFirst({
      where: {
        configId: dto.configId,
        status: 'ACTIVE'
      },
      orderBy: {
        createTime: 'asc'  // 最早创建的优先
      }
    })
  }
  
  // 4. 计算分佣
  let commission = {
    enabled: false,
    amount: 0,
    recipientId: null
  }
  
  if (dto.action === 'initiate') {
    // 发起人获得佣金
    commission = {
      enabled: true,
      amount: rules.commissionAmount,
      recipientId: userId
    }
  } else if (existingInstance) {
    // 参与者，佣金归发起人
    const instanceData = existingInstance.instanceData as ClassGroupInstanceData
    const initiator = instanceData.participants.find(p => p.isInitiator)
    
    commission = {
      enabled: true,
      amount: rules.commissionAmount,
      recipientId: initiator?.memberId
    }
  }
  
  return {
    product: {
      id: product.productId,
      name: product.name,
      image: product.mainImages[0]
    },
    config: {
      id: config.id,
      templateCode: config.templateCode
    },
    classGroup: {
      schedule: rules.schedule,
      location: rules.locationName,
      distance: this.calculateDistance(userLocation, {
        lat: rules.locationLat,
        lng: rules.locationLng
      }),
      currentParticipants: existingInstance ? 
        (existingInstance.instanceData as ClassGroupInstanceData).currentParticipants : 0,
      minParticipants: rules.minParticipants
    },
    price: {
      original: rules.originalPrice,
      discount: rules.discountPrice,
      save: rules.originalPrice - rules.discountPrice
    },
    commission,
    action: dto.action
  }
}
```

**返回数据示例：**
```typescript
{
  product: {
    id: "prod-001",
    name: "Python 入门课程",
    image: "https://..."
  },
  config: {
    id: "config-001",
    templateCode: "COURSE_GROUP_BUY"
  },
  classGroup: {
    schedule: "周三 19:00-21:00",
    location: "朝阳校区",
    distance: 2300,
    currentParticipants: 2,
    minParticipants: 3
  },
  price: {
    original: 599.00,
    discount: 199.00,
    save: 400.00
  },
  commission: {
    enabled: true,
    amount: 89.00,
    recipientId: "user-001"  // 发起人ID
  },
  action: "join"
}
```


#### 4.2 订单确认页展示

**页面模板：**
```vue
<template>
  <view class="order-confirm">
    <!-- 商品信息 -->
    <view class="product-section">
      <image :src="orderPreview.product.image" class="product-image" />
      <view class="product-info">
        <text class="product-name">{{ orderPreview.product.name }}</text>
        <text class="product-price">¥{{ orderPreview.price.discount }}</text>
      </view>
    </view>
    
    <!-- 活动信息 -->
    <view class="activity-section">
      <text class="section-title">活动信息</text>
      
      <view class="activity-info">
        <text class="activity-type">
          🎯 拼班课程 - {{ orderPreview.action === 'initiate' ? '发起' : '参与' }}
        </text>
        <text class="info-item">时间：{{ orderPreview.classGroup.schedule }}</text>
        <text class="info-item">地点：{{ orderPreview.classGroup.location }}</text>
        <text class="info-item">距你：{{ formatDistance(orderPreview.classGroup.distance) }}</text>
        <text class="info-item">
          成团进度：{{ orderPreview.classGroup.currentParticipants }}/{{ orderPreview.classGroup.minParticipants }}人
        </text>
      </view>
      
      <!-- 分佣信息 -->
      <view v-if="orderPreview.commission.enabled" class="commission-section">
        <text class="section-title">💰 佣金收益</text>
        
        <template v-if="orderPreview.action === 'initiate'">
          <text class="commission-text">成团后你将获得：¥{{ orderPreview.commission.amount }}</text>
          <text class="commission-rule">你发起的拼班，所有参与者的佣金归你</text>
        </template>
        
        <template v-else>
          <text class="commission-text">推荐人将获得佣金：¥{{ orderPreview.commission.amount }}</text>
        </template>
      </view>
    </view>
    
    <!-- 价格明细 -->
    <view class="price-section">
      <view class="price-item">
        <text>商品原价</text>
        <text>¥{{ orderPreview.price.original }}</text>
      </view>
      <view class="price-item">
        <text>活动优惠</text>
        <text class="discount">-¥{{ orderPreview.price.save }}</text>
      </view>
      <view class="price-item total">
        <text>实付金额</text>
        <text class="total-price">¥{{ orderPreview.price.discount }}</text>
      </view>
    </view>
    
    <!-- 提交按钮 -->
    <view class="submit-section">
      <button class="btn-submit" @click="submitOrder">
        确认支付 ¥{{ orderPreview.price.discount }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
async function submitOrder() {
  uni.showLoading({ title: '创建订单中...' })
  
  try {
    const res = await api.post('/api/order/create', {
      productId: orderPreview.value.product.id,
      configId: orderPreview.value.config.id,
      action: orderPreview.value.action
    })
    
    uni.hideLoading()
    
    // 跳转到支付页
    uni.navigateTo({
      url: `/pages/payment/index?orderId=${res.data.orderId}`
    })
  } catch (error) {
    uni.hideLoading()
    uni.showToast({
      title: error.message || '创建订单失败',
      icon: 'none'
    })
  }
}
</script>
```

---

### 阶段5：创建订单

#### 5.1 创建订单接口

**后端接口：** `POST /api/order/create`

**请求参数：**
```typescript
{
  productId: "prod-001",
  configId: "config-001",
  action: "join" | "initiate"
}
```

**后端逻辑：**
```typescript
async createOrder(dto: CreateOrderDto, userId: string) {
  return await this.prisma.$transaction(async (tx) => {
    // 1. 获取营销配置
    const config = await tx.storePlayConfig.findUnique({
      where: { id: dto.configId }
    })
    
    const rules = config.rules as ClassGroupRules
    
    // 2. 创建或加入 PlayInstance
    let instance: PlayInstance
    
    if (dto.action === 'initiate') {
      // 发起新拼班
      instance = await tx.playInstance.create({
        data: {
          tenantId: config.tenantId,
          memberId: userId,
          configId: config.id,
          templateCode: config.templateCode,
          instanceData: {
            role: 'initiator',
            joinedAt: new Date().toISOString(),
            currentParticipants: 1,
            participants: [{
              memberId: userId,
              joinedAt: new Date().toISOString(),
              isInitiator: true
            }],
            groupStatus: 'active'
          },
          status: 'PENDING_PAY'
        }
      })
    } else {
      // 参与现有拼班
      instance = await tx.playInstance.findFirst({
        where: {
          configId: dto.configId,
          status: 'ACTIVE'
        },
        orderBy: { createTime: 'asc' }
      })
      
      if (!instance) {
        throw new BadRequestException('没有可参与的拼班')
      }
      
      // 更新参与人数
      const instanceData = instance.instanceData as ClassGroupInstanceData
      instanceData.currentParticipants += 1
      instanceData.participants.push({
        memberId: userId,
        joinedAt: new Date().toISOString(),
        isInitiator: false,
        referrerId: instanceData.participants.find(p => p.isInitiator)?.memberId
      })
      
      await tx.playInstance.update({
        where: { id: instance.id },
        data: { instanceData }
      })
    }
    
    // 3. 创建订单
    const orderSn = this.generateOrderSn()
    const order = await tx.omsOrder.create({
      data: {
        orderSn,
        memberId: userId,
        tenantId: config.tenantId,
        orderType: 'SERVICE',
        
        totalAmount: rules.originalPrice,
        payAmount: rules.discountPrice,
        discountAmount: rules.originalPrice - rules.discountPrice,
        
        // 关联营销玩法
        playInstanceId: instance.id,
        playConfigId: config.id,
        playTemplateCode: config.templateCode,
        
        // 分佣信息
        shareUserId: dto.action === 'join' ? 
          (instance.instanceData as ClassGroupInstanceData).participants.find(p => p.isInitiator)?.memberId : 
          userId,
        
        status: 'PENDING_PAY'
      }
    })
    
    // 4. 更新 instance 的 orderSn
    await tx.playInstance.update({
      where: { id: instance.id },
      data: { orderSn: order.orderSn }
    })
    
    return {
      orderId: order.id,
      orderSn: order.orderSn,
      payAmount: order.payAmount
    }
  })
}
```


---

### 阶段6：支付

#### 6.1 支付页面

**页面路径：** `pages/payment/index.vue`

**前端逻辑：**
```typescript
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const route = useRoute()
const orderInfo = ref(null)

onMounted(async () => {
  await loadOrderInfo()
})

async function loadOrderInfo() {
  const res = await api.get(`/api/order/${route.query.orderId}`)
  orderInfo.value = res.data
}

async function handlePay() {
  uni.showLoading({ title: '调起支付中...' })
  
  try {
    // 1. 调用后端获取支付参数
    const res = await api.post('/api/payment/prepare', {
      orderId: orderInfo.value.id
    })
    
    // 2. 调起微信支付
    const [err, payRes] = await uni.requestPayment({
      provider: 'wxpay',
      timeStamp: res.data.timeStamp,
      nonceStr: res.data.nonceStr,
      package: res.data.package,
      signType: res.data.signType,
      paySign: res.data.paySign
    })
    
    uni.hideLoading()
    
    if (err) {
      uni.showToast({
        title: '支付取消',
        icon: 'none'
      })
      return
    }
    
    // 3. 支付成功，跳转到结果页
    uni.redirectTo({
      url: `/pages/payment/result?orderId=${orderInfo.value.id}`
    })
  } catch (error) {
    uni.hideLoading()
    uni.showToast({
      title: error.message || '支付失败',
      icon: 'none'
    })
  }
}
</script>

<template>
  <view class="payment-page">
    <view class="order-info">
      <text class="amount">¥{{ orderInfo.payAmount }}</text>
      <text class="desc">{{ orderInfo.productName }}</text>
    </view>
    
    <button class="btn-pay" @click="handlePay">
      立即支付
    </button>
  </view>
</template>
```

#### 6.2 支付回调处理

**后端接口：** `POST /api/payment/notify`（微信回调）

**后端逻辑：**
```typescript
async handlePaymentNotify(notifyData: WxPayNotifyData) {
  return await this.prisma.$transaction(async (tx) => {
    // 1. 验证签名
    const isValid = this.verifyWxPaySign(notifyData)
    if (!isValid) {
      throw new BadRequestException('签名验证失败')
    }
    
    // 2. 更新订单状态
    const order = await tx.omsOrder.update({
      where: { orderSn: notifyData.out_trade_no },
      data: {
        status: 'PAID',
        payStatus: 'PAID',
        payTime: new Date(),
        transactionId: notifyData.transaction_id
      }
    })
    
    // 3. 更新 PlayInstance 状态
    const instance = await tx.playInstance.update({
      where: { id: order.playInstanceId },
      data: {
        status: 'PAID',
        payTime: new Date()
      }
    })
    
    // 4. 检查是否成团
    const instanceData = instance.instanceData as ClassGroupInstanceData
    const config = await tx.storePlayConfig.findUnique({
      where: { id: order.playConfigId }
    })
    const rules = config.rules as ClassGroupRules
    
    if (instanceData.currentParticipants >= rules.minParticipants) {
      // 成团成功
      await this.handleGroupSuccess(tx, instance, order, rules)
    } else {
      // 未成团，设置超时检查
      await this.scheduleTimeoutCheck(instance.id, rules.timeoutHours)
    }
    
    return { success: true }
  })
}

async handleGroupSuccess(
  tx: PrismaTransaction,
  instance: PlayInstance,
  order: OmsOrder,
  rules: ClassGroupRules
) {
  // 1. 更新实例状态
  const instanceData = instance.instanceData as ClassGroupInstanceData
  instanceData.groupStatus = 'completed'
  instanceData.completedAt = new Date().toISOString()
  
  await tx.playInstance.update({
    where: { id: instance.id },
    data: {
      status: 'SUCCESS',
      endTime: new Date(),
      instanceData
    }
  })
  
  // 2. 创建佣金记录
  const initiator = instanceData.participants.find(p => p.isInitiator)
  if (initiator && rules.commissionAmount > 0) {
    await tx.finCommission.create({
      data: {
        orderId: order.id,
        tenantId: order.tenantId,
        beneficiaryId: initiator.memberId,
        level: 1,
        amount: rules.commissionAmount * instanceData.currentParticipants,
        rateSnapshot: 0,
        status: 'FROZEN',
        planSettleTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)  // 7天后结算
      }
    })
  }
  
  // 3. 发送成团通知
  for (const participant of instanceData.participants) {
    await this.notificationService.send({
      receiverId: participant.memberId,
      title: '拼班成功',
      content: `恭喜！您参与的拼班课程已成团`,
      type: 'ORDER'
    })
  }
}
```

---

### 阶段7：支付成功页

#### 7.1 支付结果页

**页面路径：** `pages/payment/result.vue`

**前端逻辑：**
```typescript
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const route = useRoute()
const orderInfo = ref(null)
const groupStatus = ref(null)

onMounted(async () => {
  await loadOrderInfo()
  await checkGroupStatus()
})

async function loadOrderInfo() {
  const res = await api.get(`/api/order/${route.query.orderId}`)
  orderInfo.value = res.data
}

async function checkGroupStatus() {
  const res = await api.get(`/api/play-instance/${orderInfo.value.playInstanceId}`)
  groupStatus.value = res.data
}
</script>

<template>
  <view class="payment-result">
    <!-- 成功图标 -->
    <view class="success-icon">✓</view>
    <text class="success-text">支付成功</text>
    
    <!-- 订单信息 -->
    <view class="order-info">
      <text class="product-name">{{ orderInfo.productName }}</text>
      <text class="amount">¥{{ orderInfo.payAmount }}</text>
    </view>
    
    <!-- 成团状态 -->
    <view class="group-status">
      <template v-if="groupStatus.status === 'SUCCESS'">
        <text class="status-text">🎉 拼班成功</text>
        <text class="status-desc">
          {{ groupStatus.instanceData.currentParticipants }}/{{ groupStatus.minParticipants }}人 已成团
        </text>
        
        <!-- 课程信息 -->
        <view class="class-info">
          <text>上课时间：{{ groupStatus.schedule }}</text>
          <text>上课地点：{{ groupStatus.location }}</text>
        </view>
        
        <!-- 佣金信息（发起人） -->
        <view v-if="groupStatus.instanceData.role === 'initiator'" class="commission-info">
          <text>💰 预计收益：¥{{ groupStatus.commissionAmount * groupStatus.instanceData.currentParticipants }}</text>
          <text class="commission-desc">7天后自动结算到账户</text>
        </view>
      </template>
      
      <template v-else>
        <text class="status-text">⏰ 等待成团</text>
        <text class="status-desc">
          当前 {{ groupStatus.instanceData.currentParticipants }}/{{ groupStatus.minParticipants }}人
          还差 {{ groupStatus.minParticipants - groupStatus.instanceData.currentParticipants }} 人成团
        </text>
        
        <!-- 分享按钮（发起人） -->
        <button 
          v-if="groupStatus.instanceData.role === 'initiator'"
          class="btn-share"
          @click="shareToFriends"
        >
          邀请好友参与
        </button>
      </template>
    </view>
    
    <!-- 操作按钮 -->
    <view class="actions">
      <button class="btn-primary" @click="goToMyOrders">
        查看我的订单
      </button>
      <button class="btn-secondary" @click="goToHome">
        返回首页
      </button>
    </view>
  </view>
</template>
```

---

## 总结：完整数据流

```
1. 用户打开小程序
   ↓ 调用 GET /api/member/info
   ↓ 调用 uni.getLocation()
   
2. 浏览商品列表
   ↓ 调用 GET /api/product/list
   
3. 进入商品详情
   ↓ 调用 GET /api/product/:id?lat=xxx&lng=xxx
   ↓ 后端计算推荐的拼班课程
   ↓ 返回商品信息 + 营销活动 + 推荐班次
   
4. 用户点击"参与拼班"或"发起拼班"
   ↓ 调用 POST /api/order/preview
   ↓ 返回订单预览信息
   
5. 用户确认订单
   ↓ 调用 POST /api/order/create
   ↓ 后端创建 PlayInstance + OmsOrder
   ↓ 返回订单ID
   
6. 用户支付
   ↓ 调用 POST /api/payment/prepare
   ↓ 调起微信支付
   ↓ 微信回调 POST /api/payment/notify
   ↓ 后端更新订单状态 + 检查成团
   
7. 支付成功
   ↓ 调用 GET /api/play-instance/:id
   ↓ 展示成团状态
   ↓ 如果成团：创建佣金记录 + 发送通知
   ↓ 如果未成团：等待其他人参与
```

这就是完整的用户流程！每个环节都有明确的接口调用和数据流转。