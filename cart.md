# 📊 C端小程序开发完整汇总文档

基于你提供的所有阶段文档，我为你整理了一份**去重、补全、结构化**的完整开发指南。

---

## 🎯 一、核心业务架构

### 1.1 系统定位

- **架构模式**: S2B2b2C (平台 + 代理 + 门店 + 用户)
- **业务类型**: O2O混合模式 (实物商品 + 上门服务)
- **多租户隔离**: 按门店(Tenant)严格隔离数据和业务
- **分销体系**: 支持推广分佣 + 上下级永久绑定

### 1.2 技术栈

- **前端**: Uni-app / Vue3 + Pinia
- **后端**: NestJS + Prisma
- **数据库**: PostgreSQL (主库) + Redis (缓存/归因)
- **支付**: 微信小程序支付
- **LBS**: PostGIS 地理围栏

---

## 🔐 二、登录与授权体系

### 2.1 微信新规适配 (2023+)

**核心变化**:

- ❌ 不再支持 `getUserProfile` 直接获取头像昵称
- ✅ 必须用户主动填写或选择

**登录策略**: **静默登录 + 懒授权 + 渐进式完善**

```
用户进入小程序
    ↓
后台调用 wx.login 获取 OpenID (静默)
    ↓
后端自动注册"临时会员" (昵称: "微信用户", 头像: 默认灰图)
    ↓
发放 JWT Token (游客态)
    ↓
当用户触发敏感操作时 (加购/下单/个人中心)
    ↓
弹出登录弹窗 (完善资料)
```

### 2.2 全局登录弹窗设计

**组件**: `<GlobalAuthModal />` (挂载在 App.vue)

**触发时机**:

- ✅ 点击"加入购物车"
- ✅ 点击"立即购买"
- ✅ 进入"我的"页面
- ✅ 领取优惠券
- ❌ 浏览首页/商品详情 (不触发)

**交互方案**:

vue

```vue
<!-- 弹窗内容 -->
<template>
  <view class="auth-modal">
    <!-- 头像选择 -->
    <button open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
      <image :src="avatar || randomAvatar" />
    </button>
    <button @click="generateRandomAvatar">🎲 随机头像</button>

    <!-- 昵称填写 -->
    <input 
      type="nickname" 
      v-model="nickname"
      placeholder="点击使用微信昵称"
      @blur="onNicknameBlur"
    />
    <button @click="generateRandomNickname">🎲 随机昵称</button>

    <!-- 提交 -->
    <button @click="submitProfile">完成</button>
  </view>
</template>
```

**随机头像/昵称库**:

javascript

```javascript
const avatarPool = [
  'https://cdn.example.com/avatar1.png',
  'https://cdn.example.com/avatar2.png',
  // ... 预置20个卡通头像
]

const nicknamePool = [
  '快乐的修勾', '奔跑的橘猫', '睡觉的熊猫', 
  '用户8859', '用户1024', // ...
]
```

### 2.3 购物车未登录展示

**❌ 错误做法**: 直接弹窗 **✅ 正确做法**: Empty State 引导

vue

```vue
<template>
  <view v-if="!isLogin" class="cart-empty">
    <image src="@/static/empty-cart.png" mode="widthFix" />
    <text>登录后可同步购物车商品</text>
    <button @click="showLoginModal">去登录</button>
  </view>
</template>
```

### 2.4 头像上传风险处理

**⚠️ 临时路径陷阱**:

javascript

```javascript
// ❌ 错误: 直接保存 tmp:// 路径
avatar: 'tmp://usr/2024/avatar.png' // 几天后失效!

// ✅ 正确: 立即上传到 OSS
async onChooseAvatar(e) {
  const tempPath = e.detail.avatarUrl

  // 上传到后端转存 OSS
  const { data } = await uni.uploadFile({
    url: '/api/upload/avatar',
    filePath: tempPath
  })

  this.avatar = data.ossUrl // 永久链接
}
```

---

## 🔗 三、分销归因系统 (核心)

### 3.1 归因场景全覆盖

| 场景 | 用户行为 | 归因结果 | 有效期 |
|------|---------|---------|--------|
| **A. 即时转化** | 点D的链接 → 立即购买 | 归D (分享人) | - |
| **B. 延迟转化** | 点D的链接 → 3天后自己进来买 | 归D (Redis未过期) | 7天 |
| **C. 过期转化** | 点D的链接 → 10天后自己进来买 | 归C2 (永久上级) 或 平台 | - |
| **D. 注册转化** | 点D的链接 → 注册 → 购买 | 归D (永久绑定) | 永久 |
| **E. 链接覆盖** | 点D的链接 → 又点B的链接 → 购买 | 归B (最后点击优先) | 7天 |
| **F. 已注册点击** | 老用户(上级C2) → 点D的链接 → 购买 | D拿销售佣金, C2拿管理佣金 | 混合 |

### 3.2 归因优先级
```
URL 参数 (实时) > Redis 缓存 (7天) > DB 永久绑定 > 自然流量
```

### 3.3 技术实现方案

#### 方案A: Redis 缓冲 + 异步落库 (⭐ 推荐)

**流程**:

javascript

```javascript
// 1. 前端捕获参数 (App.vue)
App.onLaunch(options) {
  let shareId = null

  // 卡片分享
  if (options.query.shareUserId) {
    shareId = options.query.shareUserId
  }

  // 扫码 (小程序码 scene 参数)
  if (options.query.scene) {
    const scene = decodeURIComponent(options.query.scene)
    shareId = parseScene(scene).u  // 假设 scene="u=888"
  }

  // 存储并上报
  if (shareId) {
    localStorage.setItem('share_trace_id', shareId)
    api.reportVisit(shareId)  // 静默接口
  }
}

// 2. 后端处理 (POST /share/trace)
async reportVisit(shareUserId: string, memberId: string) {
  // Redis 写入 (7天有效期)
  await redis.setex(
    `attr:member:${memberId}`, 
    7 * 24 * 60 * 60, 
    shareUserId
  )

  // 异步写 MySQL 日志表 (不阻塞主流程)
  this.eventBus.emit('share.visit', { memberId, shareUserId })
}

// 3. 下单时读取
async createOrder(dto: CreateOrderDto, memberId: string) {
  // 优先级查询
  let shareUserId = dto.shareUserId  // URL 参数

  if (!shareUserId) {
    shareUserId = await redis.get(`attr:member:${memberId}`)  // Redis
  }

  if (!shareUserId) {
    const member = await this.memberRepo.findOne(memberId)
    shareUserId = member.referrerId  // DB 永久绑定
  }

  // 写入订单快照
  order.shareUserId = shareUserId
  order.attributionType = shareUserId ? 1 : 0  // 1:有归因 0:自然流量
}
```

#### 方案B: 全局 TraceID (高级)

javascript

```javascript
// 生成会话级唯一ID
const traceId = uuid()

// 所有请求 Header 携带
axios.interceptors.request.use(config => {
  config.headers['X-Trace-ID'] = traceId
  return config
})

// 后端维护 TraceTable
model TraceContext {
  traceId     String   @id
  shareUserId String?
  memberId    String?
  createTime  DateTime @default(now())

  @@index([traceId])
}
```

### 3.4 注册流程携带参数

**关键点**: 注册接口必须接收 `inviteCode`

typescript

```typescript
// 前端
async handleRegister() {
  const inviteCode = localStorage.getItem('share_trace_id') 
                  || this.$route.query.shareUserId

  await api.register({
    code: this.wxCode,  // wx.login 的 code
    inviteCode: inviteCode  // ⚠️ 关键参数
  })
}

// 后端
async register(dto: RegisterDto) {
  const member = await this.memberRepo.create({
    wxOpenId: openid,
    nickname: '微信用户',
    referrerId: dto.inviteCode  // 永久绑定
  })

  return { token: this.jwtService.sign({ id: member.id }) }
}
```

---

## 🛒 四、购物车系统

### 4.1 存储方案

**推荐**: Redis Hash (多端同步 + 高性能)

redis

```redis
# Key 结构
cart:{memberId}:{tenantId}

# Field-Value
{
  "sku_1001": "2",     # skuId: quantity
  "sku_1002": "1"
}
```

**备选**: PostgreSQL 表 (数据持久化 + 分析友好)

prisma

```prisma
model OmsCartItem {
  id          String   @id @default(uuid())
  memberId    String   @map("member_id")
  tenantId    String   @map("tenant_id")  // 租户隔离

  productId   String   @map("product_id")
  skuId       String   @map("sku_id")
  quantity    Int      @default(1)

  // 快照信息 (防止商品下架后报错)
  productName String   @map("product_name")
  productImg  String   @map("product_img")
  price       Decimal  @db.Decimal(10, 2)  // 加购时价格

  // 规格快照
  specData    Json     @map("spec_data")  // {"颜色":"红色"}

  // 归因信息 (⚠️ 关键)
  shareUserId String?  @map("share_user_id")  // 加购时的分享人

  // 服务类扩展
  serviceDate DateTime?  // 预选服务时间

  createTime  DateTime @default(now()) @map("create_time")

  @@index([memberId, tenantId])
  @@map("oms_cart_item")
}
```

### 4.2 核心接口

#### 加购接口

typescript

```typescript
POST /api/cart/add

// 请求
{
  "tenantId": "tenant_001",
  "skuId": "sku_1001",
  "quantity": 2,
  "shareUserId": "888"  // 从 Pinia 传入
}

// 后端逻辑
async addCart(dto: AddCartDto, memberId: string) {
  // 1. 校验 SKU 归属
  const sku = await this.skuRepo.findOne({
    where: { id: dto.skuId, tenantId: dto.tenantId }
  })
  if (!sku) throw new Error('商品不属于该门店')

  // 2. 校验库存
  if (sku.stock < dto.quantity) throw new Error('库存不足')

  // 3. 写入 Redis
  await redis.hincrby(
    `cart:${memberId}:${dto.tenantId}`, 
    dto.skuId, 
    dto.quantity
  )

  // 4. (可选) 同步写 DB
  await this.cartRepo.upsert({
    where: { memberId_skuId: { memberId, skuId: dto.skuId } },
    create: { ...dto, memberId, shareUserId: dto.shareUserId },
    update: { quantity: { increment: dto.quantity } }
  })
}
```

#### 购物车列表

typescript

```typescript
GET /api/cart/list?tenantId=tenant_001

// 响应
{
  "items": [
    {
      "skuId": "sku_1001",
      "productName": "洗洁精",
      "quantity": 2,
      "addPrice": 19.9,      // 加购时价格
      "currentPrice": 24.9,  // ⚠️ 实时价格
      "priceChanged": true,  // 价格变动标识
      "stockStatus": "normal"  // normal | insufficient | soldOut
    }
  ],
  "invalidItems": [...]  // 已下架商品
}

// 后端逻辑
async getCartList(memberId: string, tenantId: string) {
  const cartData = await redis.hgetall(`cart:${memberId}:${tenantId}`)
  const skuIds = Object.keys(cartData)

  // 批量查询最新信息
  const skus = await this.skuRepo.findMany({
    where: { id: { in: skuIds }, tenantId }
  })

  return skus.map(sku => ({
    ...sku,
    quantity: parseInt(cartData[sku.id]),
    addPrice: cartSnapshot[sku.id].price,  // 从 DB 快照读
    currentPrice: sku.price,
    priceChanged: sku.price !== cartSnapshot[sku.id].price
  }))
}
```

### 4.3 购物车分组展示

**前端组件**:

vue

```vue
<template>
  <view class="cart-page">
    <!-- 按租户分组 -->
    <view v-for="tenant in groupedCart" :key="tenant.id" class="tenant-group">
      <view class="tenant-header">
        <text>{{ tenant.name }}</text>
      </view>

      <view v-for="item in tenant.items" :key="item.skuId" class="cart-item">
        <!-- 左滑删除 -->
        <uni-swipe-action>
          <template v-slot:right>
            <button @click="deleteItem(item)">删除</button>
          </template>

          <view class="item-content">
            <checkbox :checked="item.checked" @change="toggleCheck(item)" />
            <image :src="item.productImg" />
            <view class="info">
              <text>{{ item.productName }}</text>
              <text v-if="item.priceChanged" class="price-tip">
                价格已更新: ¥{{ item.currentPrice }}
              </text>
            </view>
            <uni-number-box :value="item.quantity" @change="updateQuantity" />
          </view>
        </uni-swipe-action>
      </view>
    </view>
  </view>
</template>
```

---

## 📝 五、订单系统 (最复杂)

### 5.1 订单表设计 (完整版)

prisma

```prisma
// ========== 主订单表 ==========
model OmsOrder {
  id            String   @id @default(cuid())  // 订单号
  orderSn       String   @unique @map("order_sn")  // 展示用订单号

  // ===== 归属关系 =====
  memberId      String   @map("member_id")
  tenantId      String   @map("tenant_id")  // 哪个门店的单

  // ===== 订单类型 =====
  orderType     Int      @map("order_type")  
  // 1:实物订单 2:服务订单 3:混合订单

  // ===== 金额信息 =====
  totalAmount   Decimal  @db.Decimal(10, 2) @map("total_amount")     // 商品总价
  freightAmount Decimal  @default(0) @db.Decimal(10, 2) @map("freight_amount")  // 运费/上门费
  discountAmount Decimal @default(0) @db.Decimal(10, 2) @map("discount_amount") // 优惠金额
  payAmount     Decimal  @db.Decimal(10, 2) @map("pay_amount")      // 实付金额

  // ===== 收货/服务信息 =====
  receiverName  String?  @map("receiver_name")
  receiverPhone String?  @map("receiver_phone")
  receiverProvince String? @map("receiver_province")
  receiverCity  String?  @map("receiver_city")
  receiverDistrict String? @map("receiver_district")
  receiverDetail String? @map("receiver_detail")
  receiverLat   Float?   @map("receiver_lat")    // ⚠️ LBS 校验用
  receiverLng   Float?   @map("receiver_lng")

  // ===== 服务类专属 =====
  bookingTime   DateTime? @map("booking_time")   // 预约时间
  workerId      String?   @map("worker_id")      // 指定技师
  serviceRemark String?   @map("service_remark") // 服务备注

  // ===== 分销归因 (快照) =====
  shareUserId   String?  @map("share_user_id")   // 分享人ID
  referrerId    String?  @map("referrer_id")     // 永久上级ID
  attributionType Int    @default(0) @map("attribution_type")
  // 0:自然流量 1:分享归因 2:永久绑定归因 3:混合归因

  // ===== 拆单支持 =====
  parentOrderId String?  @map("parent_order_id") // 父订单号
  isParent      Boolean  @default(false) @map("is_parent")  // 是否为父订单

  // ===== 状态流转 =====
  status        Int      @default(1)  
  // 1:待支付 2:已支付待发货/待服务 3:已发货/服务中 4:已完成 5:已取消 6:已退款
  payStatus     Int      @default(0) @map("pay_status")  
  // 0:未支付 1:已支付 2:已退款

  // ===== 支付信息 =====
  payType       String?  @map("pay_type")        // WECHAT_PAY
  transactionId String?  @map("transaction_id")  // 微信支付流水号
  payTime       DateTime? @map("pay_time")

  // ===== 时间戳 =====
  createTime    DateTime @default(now()) @map("create_time")
  updateTime    DateTime @updatedAt @map("update_time")
  deleteTime    DateTime? @map("delete_time")

  // ===== 关联关系 =====
  items         OmsOrderItem[]
  member        UmsMember @relation(fields: [memberId], references: [id])
  tenant        SysTenant @relation(fields: [tenantId], references: [id])

  @@index([memberId, status])
  @@index([tenantId, createTime])
  @@index([orderSn])
  @@map("oms_order")
}

// ========== 订单明细表 ==========
model OmsOrderItem {
  id            Int      @id @default(autoincrement())
  orderId       String   @map("order_id")

  // ===== 商品快照 =====
  productId     String   @map("product_id")
  productName   String   @map("product_name")
  productImg    String   @map("product_img")
  productSn     String?  @map("product_sn")

  skuId         String   @map("sku_id")
  skuName       String?  @map("sku_name")
  specData      Json?    @map("spec_data")  // {"颜色":"红色"}

  // ===== 价格快照 =====
  price         Decimal  @db.Decimal(10, 2)  // 下单时单价
  quantity      Int
  totalAmount   Decimal  @db.Decimal(10, 2) @map("total_amount")

  // ===== 服务类扩展 =====
  serviceType   Int?     @map("service_type")  
  // 1:保洁 2:维修 3:其他
  serviceDuration Int?   @map("service_duration")  // 预计时长(分钟)

  // ===== 关联 =====
  order         OmsOrder @relation(fields: [orderId], references: [id])

  @@index([orderId])
  @@map("oms_order_item")
}

// ========== 工单表 (服务订单专用) ==========
model OmsWorkerOrder {
  id            String   @id @default(cuid())
  orderId       String   @map("order_id")  // 关联主订单
  orderItemId   Int      @map("order_item_id")

  tenantId      String   @map("tenant_id")
  workerId      String   @map("worker_id")  // 指派技师

  // ===== 服务信息 =====
  serviceType   Int      @map("service_type")
  serviceAddress String  @map("service_address")
  serviceTime   DateTime @map("service_time")
  serviceDuration Int    @map("service_duration")

  // ===== 状态 =====
  status        Int      @default(1)
  // 1:待接单 2:已接单 3:服务中 4:已完成 5:已取消

  // ===== 完成信息 =====
  startTime     DateTime? @map("start_time")
  endTime       DateTime? @map("end_time")
  actualDuration Int?     @map("actual_duration")
  serviceRemark String?   @map("service_remark")

  createTime    DateTime @default(now()) @map("create_time")
  updateTime    DateTime @updatedAt @map("update_time")

  @@index([orderId])
  @@index([workerId, status])
  @@map("oms_worker_order")
}
```

### 5.2 订单流程

#### 流程图
```
商品详情页
    ↓
[加入购物车] / [立即购买]
    ↓
购物车页 (可选)
    ↓
[去结算] → 调用 POST /order/preview (预检)
    ↓
确认订单页
  ├─ 选择地址 (LBS 校验)
  ├─ 选择时间 (服务类)
  ├─ 选择优惠券
  └─ 填写备注
    ↓
[提交订单] → 调用 POST /order/create
    ↓
获取微信支付参数
    ↓
wx.requestPayment (唤起支付)
    ↓
支付成功回调
    ↓
订单状态更新 + 分销结算(Pending)
```

#### 结算预览接口 (核心)

typescript

```typescript
POST /api/order/preview

// 请求
{
  "items": [
    { "skuId": "sku_1001", "quantity": 2 }
  ],
  "addressId": "addr_001",  // 实物必填
  "bookingTime": "2024-01-20 14:00",  // 服务类必填
  "couponId": "coupon_555"
}

// 后端逻辑
async previewOrder(dto: PreviewOrderDto, memberId: string) {
  // 1. 查询商品最新信息
  const skus = await this.skuRepo.findMany({
    where: { id: { in: dto.items.map(i => i.skuId) } }
  })

  // 2. 计算商品总价
  let totalAmount = 0
  for (const item of dto.items) {
    const sku = skus.find(s => s.id === item.skuId)
    totalAmount += sku.price * item.quantity
  }

  // 3. LBS 校验 (服务类/O2O)
  if (dto.addressId) {
    const address = await this.addressRepo.findOne(dto.addressId)
    const tenant = await this.tenantRepo.findOne(skus[0].tenantId)

    const distance = this.lbsService.calcDistance(
      [tenant.lat, tenant.lng],
      [address.lat, address.lng]
    )

    if (distance > tenant.serviceRadius) {
      throw new Error('超出服务范围')
    }
  }

  // 4. 计算运费/上门费
  const freight = this.calcFreight(totalAmount, distance, tenant)

  // 5. 查询可用优惠券
  const availableCoupons = await this.couponService.getAvailable(
    memberId, 
    totalAmount
  )

  // 6. 计算优惠
  let discount = 0
  if (dto.couponId) {
    const coupon = availableCoupons.find(c => c.id === dto.couponId)
    discount = this.calcCouponDiscount(coupon, totalAmount)
  }

  // 7. 返回账单
  return {
    totalAmount,
    freight,
    discount,
    payAmount: totalAmount + freight - discount,
    availableCoupons,
    outOfRange: distance > tenant.serviceRadius
  }
}
```

#### 创建订单接口

typescript

```typescript
POST /api/order/create

// 请求
{
  "items": [...],
  "addressId": "addr_001",
  "bookingTime": "2024-01-20 14:00",
  "couponId": "coupon_555",
  "shareUserId": "888",  // ⚠️ 归因参数
  "remark": "请下午送"
}

// 后端逻辑 (事务)
async createOrder(dto: CreateOrderDto, memberId: string) {
  return await this.prisma.$transaction(async (tx) => {
    // 1. 查询归因信息 (优先级逻辑)
    let shareUserId = dto.shareUserId
    if (!shareUserId) {
      shareUserId = await redis.get(`attr:member:${memberId}`)
    }
    if (!shareUserId) {
      const member = await tx.umsMember.findUnique({ where: { id: memberId } })
      shareUserId = member.referrerId
    }

    // 2. 扣库存 (乐观锁)
    for (const item of dto.items) {
      const result = await tx.pmsTenantSku.updateMany({
        where: {
          id: item.skuId,
          stock: { gte: item.quantity }  // ⚠️ 关键条件
        },
        data: {
          stock: { decrement: item.quantity }
        }
      })

      if (result.count === 0) {
        throw new Error(`${item.skuId} 库存不足`)
      }
    }

    // 3. 锁服务时间 (如果是服务类)
    if (dto.bookingTime) {
      const locked = await this.scheduleService.lockTimeSlot(
        dto.workerId, 
        dto.bookingTime
      )
      if (!locked) throw new Error('该时间段已被预约')
    }

    // 4. 核销优惠券
    if (dto.couponId) {
      await tx.umsCoupon.update({
        where: { id: dto.couponId },
        data: { status: 2, useTime: new Date() }  // 已使用
      })
    }

    // 5. 创建订单主表
    const order = await tx.omsOrder.create({
      data: {
        orderSn: this.generateOrderSn(),
        memberId,
        tenantId: dto.items[0].tenantId,
        orderType: this.detectOrderType(dto.items),
        totalAmount,
        freightAmount,
        discountAmount,
        payAmount,
        receiverName: address.name,
        receiverPhone: address.phone,
        receiverLat: address.lat,
        receiverLng: address.lng,
        bookingTime: dto.bookingTime,
        shareUserId,  // ⚠️ 归因快照
        referrerId: member.referrerId,
        attributionType: shareUserId ? 1 : 0,
        status: 1  // 待支付
      }
    })

    // 6.创建订单明细
const items = dto.items.map(item => {
const sku = skus.find(s => s.id === item.skuId)
return {
orderId: order.id,
productId: sku.productId,
productName: sku.productName,
productImg: sku.productImg,
skuId: sku.id,
specData: sku.specData,
price: sku.price,  // ⚠️ 快照价格
quantity: item.quantity,
totalAmount: sku.price * item.quantity
}
})
await tx.omsOrderItem.createMany({ data: items })
// 7. 创建工单 (服务类)
if (order.orderType === 2) {
  await tx.omsWorkerOrder.create({
    data: {
      orderId: order.id,
      tenantId: order.tenantId,
      workerId: dto.workerId,
      serviceTime: dto.bookingTime,
      status: 1  // 待接单
    }
  })
}

// 8. 清空购物车
await redis.del(`cart:${memberId}:${order.tenantId}`)

// 9. 调用微信支付
const payParams = await this.wechatPayService.createOrder({
  orderId: order.id,
  amount: order.payAmount,
  openid: member.wxOpenId
})

return { order, payParams }
})
}

### 5.3 多服务同时下单 (拆单)

**场景**: 用户要买"擦窗 + 厨房保洁 + 空调维修"

**方案**: 一单支付,多单履约
```typescript
// 前端: 确认订单页
<view class="multi-service">
  <view v-for="item in serviceItems" class="service-item">
    <text>{{ item.name }}</text>
    <ServiceTimePicker 
      v-model="item.bookingTime"
      :workerId="item.workerId"
    />
  </view>
</view>

// 后端: 创建订单时判断
async createOrder(dto) {
  const hasMultipleServices = dto.items.filter(i => i.isService).length > 1
  
  if (hasMultipleServices) {
    // 创建父订单 (仅用于支付)
    const parentOrder = await tx.omsOrder.create({
      data: {
        ...baseData,
        isParent: true,
        payAmount: totalPayAmount
      }
    })
    
    // 拆分子订单
    for (const item of dto.items.filter(i => i.isService)) {
      await tx.omsOrder.create({
        data: {
          ...baseData,
          parentOrderId: parentOrder.id,
          bookingTime: item.bookingTime,  // 每个服务独立时间
          payAmount: item.totalAmount
        }
      })
      
      // 创建工单
      await tx.omsWorkerOrder.create({...})
    }
    
    return parentOrder
  }
}
```

---

## ⚠️ 六、风险与边界情况

### 6.1 LBS 漂移风险

**场景**: 用户在天心区加购,去望城区下单

**解决**:
```typescript
// 确认订单页: 选地址时实时校验
async onAddressChange(addressId) {
  const { outOfRange } = await api.checkAddress({
    addressId,
    tenantId: this.currentTenantId
  })
  
  if (outOfRange) {
    uni.showModal({
      title: '提示',
      content: '该地址超出服务范围,是否切换至望城店?',
      success: (res) => {
        if (res.confirm) {
          this.switchTenant('tenant_望城')
        }
      }
    })
  }
}

// 提交订单时: 二次校验
async createOrder(dto) {
  const address = await this.addressRepo.findOne(dto.addressId)
  const distance = this.lbsService.calcDistance(...)
  
  if (distance > tenant.serviceRadius) {
    throw new ForbiddenException('该地址超出服务范围')
  }
}
```

### 6.2 服务时间并发冲突

**场景**: 两个用户同时抢"明天14:00王阿姨"

**解决**: Redis 分布式锁
```typescript
async lockTimeSlot(workerId: string, time: Date) {
  const key = `lock:schedule:${workerId}:${time.getTime()}`
  
  // SETNX 原子操作
  const locked = await redis.set(key, '1', 'EX', 300, 'NX')  // 5分钟
  
  if (!locked) {
    throw new Error('该时间段刚刚被预约,请重新选择')
  }
  
  return true
}

// 支付成功后释放锁
async onPaySuccess(orderId) {
  const order = await this.orderRepo.findOne(orderId)
  const key = `lock:schedule:${order.workerId}:${order.bookingTime.getTime()}`
  await redis.del(key)
}
```

### 6.3 价格变动风险

**场景**: 加购时100元,下单时涨到120元

**解决**:
```typescript
// 购物车列表: 标记价格变动
{
  "items": [{
    "addPrice": 100,
    "currentPrice": 120,
    "priceChanged": true  // ⚠️ 前端高亮提示
  }]
}

// 提交订单: 强制使用最新价格
async createOrder(dto) {
  const skus = await this.skuRepo.findMany({
    where: { id: { in: dto.items.map(i => i.skuId) } }
  })
  
  // ❌ 不信任前端传的价格
  // const totalAmount = dto.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  
  // ✅ 重新计算
  const totalAmount = dto.items.reduce((sum, item) => {
    const sku = skus.find(s => s.id === item.skuId)
    return sum + sku.price * item.quantity  // 最新价格
  }, 0)
}
```

### 6.4 分销员自购

**场景**: 分销员自己点自己的链接买

**解决**:
```typescript
async calculateCommission(order: Order) {
  if (order.memberId === order.shareUserId) {
    // 策略A: 允许自购省钱 (一级分佣)
    return { level1: order.payAmount * 0.05, level2: 0 }
    
    // 策略B: 禁止自购拿佣金
    return { level1: 0, level2: 0 }
  }
  
  // 正常分佣逻辑...
}
```

### 6.5 跨租户结算

**场景**: 购物车有"天心店的吉他"和"雨花店的钢琴"

**解决**:
```vue
<!-- 购物车: 按租户分组 -->
<view v-for="tenant in groupedCart" class="tenant-group">
  <view class="tenant-header">{{ tenant.name }}</view>
  <view v-for="item in tenant.items" class="item">...</view>
  <button @click="checkout(tenant.id)">
    结算 {{ tenant.name }} 商品
  </button>
</view>

<!-- 禁止跨租户结算 -->
<script>
function checkout(tenantId) {
  const selectedItems = this.cart.filter(i => i.checked)
  const tenantIds = [...new Set(selectedItems.map(i => i.tenantId))]
  
  if (tenantIds.length > 1) {
    uni.showToast({
      title: '不能同时结算多个门店的商品',
      icon: 'none'
    })
    return
  }
  
  uni.navigateTo({ url: '/pages/order/create?tenantId=' + tenantId })
}
</script>
```

---

## 🎨 七、前端关键组件

### 7.1 服务时间选择器
```vue
<template>
  <uni-popup ref="popup" type="bottom">
    <view class="time-picker">
      <!-- 日期选择 -->
      <scroll-view scroll-x class="date-tabs">
        <view 
          v-for="date in availableDates" 
          :key="date"
          :class="['date-tab', { active: selectedDate === date }]"
          @click="selectDate(date)"
        >
          {{ formatDate(date) }}
        </view>
      </scroll-view>
      
      <!-- 时间段选择 -->
      <view class="time-slots">
        <view 
          v-for="slot in timeSlots" 
          :key="slot.time"
          :class="['slot', { disabled: !slot.available }]"
          @click="selectSlot(slot)"
        >
          <text>{{ slot.time }}</text>
          <text v-if="!slot.available" class="tip">已满</text>
        </view>
      </view>
    </view>
  </uni-popup>
</template>

<script setup>
import { ref, watch } from 'vue'
import { getAvailableSlots } from '@/api/service'

const props = defineProps({
  workerId: String,
  serviceType: Number
})

const selectedDate = ref('')
const timeSlots = ref([])

// 查询可用时间段
async function loadSlots(date) {
  const res = await getAvailableSlots({
    workerId: props.workerId,
    date: date
  })
  
  timeSlots.value = res.data.map(slot => ({
    time: slot.startTime,
    available: slot.status === 'IDLE',
    workerId: slot.workerId
  }))
}

watch(() => selectedDate.value, (date) => {
  if (date) loadSlots(date)
})
</script>
```

### 7.2 全局登录弹窗 (Pinia 控制)
```typescript
// stores/user.ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: uni.getStorageSync('token') || '',
    userInfo: null,
    showLoginModal: false  // 控制弹窗显示
  }),
  
  getters: {
    isLogin: (state) => !!state.token
  },
  
  actions: {
    // 唤起登录
    requireLogin() {
      if (!this.isLogin) {
        this.showLoginModal = true
        return false
      }
      return true
    },
    
    // 登录成功
    async afterLogin(token: string) {
      this.token = token
      uni.setStorageSync('token', token)
      this.showLoginModal = false
      
      // 获取用户信息
      await this.fetchUserInfo()
    }
  }
})
```
```vue
<!-- App.vue -->
<template>
  <view>
    <!-- 全局登录弹窗 -->
    <AuthModal v-model:show="userStore.showLoginModal" />
    
    <!-- 路由视图 -->
    <router-view />
  </view>
</template>

<script setup>
import { useUserStore } from '@/stores/user'
const userStore = useUserStore()
</script>
```

### 7.3 路由守卫 (拦截未登录)
```typescript
// utils/guard.ts
import { useUserStore } from '@/stores/user'

// 需要登录的页面
const authPages = [
  '/pages/cart/index',
  '/pages/user/index',
  '/pages/order/list'
]

uni.addInterceptor('navigateTo', {
  invoke(args) {
    const userStore = useUserStore()
    const path = args.url.split('?')[0]
    
    if (authPages.includes(path) && !userStore.isLogin) {
      userStore.showLoginModal = true
      return false  // 阻止跳转
    }
  }
})

uni.addInterceptor('switchTab', {
  invoke(args) {
    const userStore = useUserStore()
    const path = args.url
    
    if (['/pages/cart/index', '/pages/user/index'].includes(path)) {
      if (!userStore.isLogin) {
        userStore.showLoginModal = true
        return false
      }
    }
  }
})
```

---

## 📋 八、后端接口清单

| 模块 | 接口 | 说明 | 关键参数 |
|------|------|------|---------|
| **Auth** | `POST /auth/wechat/login` | 微信登录 | `code`, `inviteCode` |
| **Auth** | `POST /auth/profile/update` | 更新资料 | `nickname`, `avatar` |
| **Share** | `POST /share/trace` | 上报归因 | `shareUserId` |
| **Cart** | `POST /cart/add` | 加购 | `tenantId`, `skuId`, `shareUserId` |
| **Cart** | `GET /cart/list` | 购物车列表 | `tenantId` |
| **Cart** | `PUT /cart/quantity` | 修改数量 | `skuId`, `quantity` |
| **Cart** | `DELETE /cart/clear` | 清空购物车 | - |
| **Order** | `POST /order/preview` | 结算预览 | `items`, `addressId`, `couponId` |
| **Order** | `POST /order/create` | 创建订单 | `items`, `shareUserId`, `bookingTime` |
| **Order** | `GET /order/detail/:id` | 订单详情 | - |
| **Order** | `POST /order/cancel/:id` | 取消订单 | - |
| **Service** | `GET /service/slots` | 查询可用时间 | `workerId`, `date` |
| **LBS** | `POST /lbs/check-distance` | 校验服务范围 | `addressId`, `tenantId` |

---

## 🎯 九、开发优先级建议

### 第一阶段 (MVP)
1. ✅ 商品列表/详情 (已完成)
2. ⬜ 登录授权体系
3. ⬜ 购物车 (实物)
4. ⬜ 订单创建 (实物)
5. ⬜ 微信支付集成

### 第二阶段 (O2O)
6. ⬜ LBS 定位与围栏
7. ⬜ 服务类商品
8. ⬜ 时间段选择
9. ⬜ 工单系统

### 第三阶段 (分销)
10. ⬜ 分销归因 (Redis)
11. ⬜ 佣金计算
12. ⬜ 分销员后台

---

这份汇总文档整合了你所有阶段的需求,补全了细节(特别是订单表设计),并标注了关键风险点。可以直接作为开发手册使用。
```
