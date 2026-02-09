# MaaS 平台局限性分析与优化方案

## 一、现有 MaaS 平台的局限性

### 1.1 核心局限

#### 问题1：JSON 字段查询性能差

**现状：**
```typescript
// StorePlayConfig.rules 是 JSON 字段
{
  "schedule": "周三 19:00",
  "locationLat": 39.9042,
  "locationLng": 116.4074,
  "minParticipants": 3
}
```

**局限：**
- ❌ 无法对 JSON 字段建立索引
- ❌ 无法高效查询"附近5km的拼班课程"
- ❌ 无法按时间、地点、成团进度排序
- ❌ 数据库层面无法做聚合统计

**影响：**
```sql
-- 这种查询会全表扫描
SELECT * FROM store_play_config 
WHERE rules->>'locationLat' BETWEEN 39.8 AND 40.0;

-- 无法使用空间索引
-- 无法使用 PostGIS 的地理位置查询
```

---

#### 问题2：PlayInstance 无法表达复杂的多人关系

**现状：**
```typescript
// PlayInstance.instanceData 是 JSON
{
  "participants": [
    {"memberId": "user-001", "isInitiator": true},
    {"memberId": "user-002", "isInitiator": false}
  ]
}
```

**局限：**
- ❌ 无法查询"用户参与了哪些拼班"（需要扫描所有 JSON）
- ❌ 无法查询"某个拼班还差几个人"（需要解析 JSON）
- ❌ 无法做并发控制（多人同时参与可能超员）
- ❌ 无法建立外键约束（数据完整性风险）

**影响：**
```sql
-- 这种查询无法高效执行
SELECT * FROM play_instance 
WHERE instance_data::jsonb @> '{"participants": [{"memberId": "user-001"}]}';

-- 无法做原子性的人数增减
UPDATE play_instance 
SET instance_data = jsonb_set(instance_data, '{currentParticipants}', '3')
WHERE id = 'xxx' AND instance_data->>'currentParticipants' < '10';
```

---

#### 问题3：缺少中间关联表

**现状：**
- `PlayInstance` 记录了整个拼班
- 但没有单独的"参与记录表"

**局限：**
- ❌ 无法记录每个参与者的详细信息（支付时间、退款状态）
- ❌ 无法单独查询某个用户的参与历史
- ❌ 无法处理部分退款（比如1个人退出，其他人继续）
- ❌ 无法记录参与者的行为轨迹（浏览→加入→支付→退出）

---

#### 问题4：扩展性陷阱

**现状：**
- 所有玩法都用同一套表结构
- 通过 JSON 字段存储差异化数据

**局限：**
- ❌ 新玩法的特殊需求可能无法满足
- ❌ JSON 字段越来越臃肿，难以维护
- ❌ 代码中充斥着 `if (templateCode === 'XXX')` 的判断
- ❌ 测试复杂度指数级增长

**例子：**
```typescript
// 代码会变成这样
if (config.templateCode === 'COURSE_GROUP_BUY') {
  const rules = config.rules as ClassGroupRules
  // 处理拼班逻辑
} else if (config.templateCode === 'BARGAIN') {
  const rules = config.rules as BargainRules
  // 处理砍价逻辑
} else if (config.templateCode === 'LOTTERY') {
  const rules = config.rules as LotteryRules
  // 处理抽奖逻辑
}
// ... 10种玩法就有10个分支
```

---

### 1.2 性能问题

#### 查询性能

| 场景 | MaaS 方案 | 独立表方案 |
|-----|----------|-----------|
| 查询附近5km的拼班 | 全表扫描 JSON | 空间索引查询 |
| 查询用户参与的拼班 | 扫描所有 PlayInstance | 直接查关联表 |
| 统计成团率 | 解析所有 JSON | 直接聚合查询 |
| 并发参与控制 | 乐观锁 + JSON 解析 | 数据库行锁 |

#### 存储成本

```
假设有 10000 个拼班活动，每个平均 5 个参与者

MaaS 方案：
- PlayInstance: 10000 条记录
- 每条记录的 instanceData 约 2KB
- 总存储：10000 × 2KB = 20MB

独立表方案：
- ClassGroup: 10000 条记录（每条约 200 字节）
- ClassGroupParticipant: 50000 条记录（每条约 100 字节）
- 总存储：10000 × 200B + 50000 × 100B = 7MB

结论：MaaS 方案存储成本高 3 倍
```

---

## 二、混合方案：MaaS + 扩展表

### 2.1 设计思路

**核心原则：**
- ✅ 保留 MaaS 平台的通用性
- ✅ 为特殊玩法增加扩展表
- ✅ 扩展表只存储高频查询字段
- ✅ MaaS 表作为主表，扩展表作为索引表

**架构：**
```
PlayTemplate (玩法模板)
    ↓
StorePlayConfig (营销配置) ← 主表
    ↓                        ↓
PlayInstance (参与记录)    ClassGroupExtension (扩展表，仅拼班)
    ↓                        ↓
OmsOrder (订单)           ClassGroupParticipant (参与记录)
```

---

### 2.2 扩展表设计

#### 表1：ClassGroupExtension（拼班扩展表）

**作用：** 存储需要高频查询的字段

```sql
CREATE TABLE mkt_class_group_extension (
  id VARCHAR(36) PRIMARY KEY,
  config_id VARCHAR(36) NOT NULL COMMENT '关联 StorePlayConfig.id',
  
  -- 地理位置（可建空间索引）
  location_name VARCHAR(100) NOT NULL,
  location GEOMETRY(Point, 4326) NOT NULL COMMENT 'PostGIS 空间字段',
  max_distance INT DEFAULT 5000,
  
  -- 时间（可建索引）
  schedule VARCHAR(50) NOT NULL,
  schedule_day_of_week INT COMMENT '1-7 表示周一到周日',
  schedule_hour INT COMMENT '0-23',
  
  -- 成团规则（可建索引）
  min_participants INT NOT NULL,
  max_participants INT,
  current_participants INT DEFAULT 0,
  
  -- 价格和分佣（可建索引）
  price DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2),
  
  -- 状态（可建索引）
  status ENUM('active', 'completed', 'cancelled', 'timeout') DEFAULT 'active',
  
  -- 时间
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- 索引
  INDEX idx_config_id (config_id),
  SPATIAL INDEX idx_location (location),
  INDEX idx_schedule (schedule_day_of_week, schedule_hour),
  INDEX idx_status (status),
  INDEX idx_participants (current_participants, min_participants),
  
  FOREIGN KEY (config_id) REFERENCES store_play_config(id) ON DELETE CASCADE
);
```

**关键优势：**
- ✅ 可以使用 PostGIS 空间索引查询附近的拼班
- ✅ 可以按时间、成团进度排序
- ✅ 可以高效统计成团率

---

#### 表2：ClassGroupParticipant（参与记录表）

**作用：** 记录每个用户的参与详情

```sql
CREATE TABLE mkt_class_group_participant (
  id VARCHAR(36) PRIMARY KEY,
  extension_id VARCHAR(36) NOT NULL COMMENT '关联 ClassGroupExtension.id',
  instance_id VARCHAR(36) NOT NULL COMMENT '关联 PlayInstance.id',
  member_id VARCHAR(36) NOT NULL,
  order_id VARCHAR(36) NOT NULL,
  
  -- 角色
  is_initiator BOOLEAN DEFAULT false,
  referrer_id VARCHAR(36) COMMENT '推荐人ID',
  
  -- 状态
  status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
  
  -- 时间
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME,
  
  -- 索引
  INDEX idx_extension_id (extension_id),
  INDEX idx_member_id (member_id),
  INDEX idx_order_id (order_id),
  UNIQUE KEY uk_extension_member (extension_id, member_id),
  
  FOREIGN KEY (extension_id) REFERENCES mkt_class_group_extension(id) ON DELETE CASCADE,
  FOREIGN KEY (instance_id) REFERENCES play_instance(id) ON DELETE CASCADE
);
```

**关键优势：**
- ✅ 可以快速查询用户参与的所有拼班
- ✅ 可以做并发控制（数据库行锁）
- ✅ 可以单独处理退款
- ✅ 可以记录详细的参与轨迹

---

### 2.3 数据同步策略

**原则：** 扩展表是 MaaS 表的"影子"，数据保持同步

```typescript
// 创建拼班配置时
async createClassGroupConfig(dto: CreateClassGroupDto) {
  return await this.prisma.$transaction(async (tx) => {
    // 1. 创建 StorePlayConfig（主表）
    const config = await tx.storePlayConfig.create({
      data: {
        tenantId: dto.tenantId,
        serviceId: dto.productId,
        templateCode: 'COURSE_GROUP_BUY',
        rules: {
          schedule: dto.schedule,
          locationName: dto.locationName,
          locationLat: dto.locationLat,
          locationLng: dto.locationLng,
          // ... 其他字段
        },
        status: 'ON_SHELF'
      }
    })
    
    // 2. 创建 ClassGroupExtension（扩展表）
    await tx.$executeRaw`
      INSERT INTO mkt_class_group_extension (
        id, config_id, location_name, location, schedule, 
        min_participants, price, commission_amount
      ) VALUES (
        ${uuid()}, ${config.id}, ${dto.locationName},
        ST_SetSRID(ST_MakePoint(${dto.locationLng}, ${dto.locationLat}), 4326),
        ${dto.schedule}, ${dto.minParticipants}, ${dto.price}, ${dto.commissionAmount}
      )
    `
    
    return config
  })
}
```

---

## 三、小程序无侵略性设计

### 3.1 设计原则

**核心思想：** 营销活动是"可选增强"，不影响基础购物流程

```
基础流程（无营销活动）：
商品列表 → 商品详情 → 加入购物车 → 结算 → 支付

增强流程（有营销活动）：
商品列表 → 商品详情 → [营销活动卡片] → 结算 → 支付
                      ↓
                   可选择参与或忽略
```

---

### 3.2 商品详情页设计（无侵略性）

#### 方案A：折叠式设计（推荐）

```vue
<template>
  <view class="product-detail">
    <!-- 商品基础信息（始终可见） -->
    <view class="product-info">
      <text class="product-name">{{ product.name }}</text>
      <view class="price-section">
        <text class="current-price">¥{{ product.price }}</text>
        <text class="original-price">¥{{ product.originalPrice }}</text>
      </view>
    </view>
    
    <!-- 营销活动区域（可折叠） -->
    <view 
      v-if="hasMarketingActivities"
      class="marketing-section"
      :class="{ collapsed: !showMarketing }"
    >
      <view class="marketing-header" @click="toggleMarketing">
        <text class="title">🎁 优惠活动</text>
        <text class="subtitle">
          {{ showMarketing ? '收起' : `${activityCount}个活动可选` }}
        </text>
        <text class="arrow">{{ showMarketing ? '▲' : '▼' }}</text>
      </view>
      
      <!-- 展开后显示活动列表 -->
      <view v-show="showMarketing" class="marketing-content">
        <view 
          v-for="activity in activities" 
          :key="activity.id"
          class="activity-card"
          @click="selectActivity(activity)"
        >
          <text class="activity-name">{{ activity.name }}</text>
          <text class="activity-price">¥{{ activity.price }}</text>
        </view>
      </view>
    </view>
    
    <!-- 商品详情（始终可见） -->
    <view class="product-description">
      <rich-text :nodes="product.detailHtml" />
    </view>
    
    <!-- 底部按钮（根据是否选择活动动态变化） -->
    <view class="bottom-bar">
      <button 
        v-if="!selectedActivity"
        class="btn-primary"
        @click="addToCart"
      >
        加入购物车
      </button>
      
      <button 
        v-else
        class="btn-primary"
        @click="buyWithActivity"
      >
        {{ selectedActivity.buttonText }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
const showMarketing = ref(false)  // 默认折叠
const selectedActivity = ref(null)

function toggleMarketing() {
  showMarketing.value = !showMarketing.value
}

function addToCart() {
  // 普通购物流程
  api.post('/api/cart/add', {
    productId: product.value.id,
    quantity: 1
  })
}

function buyWithActivity() {
  // 营销活动购买流程
  uni.navigateTo({
    url: `/pages/order/confirm?activityId=${selectedActivity.value.id}`
  })
}
</script>
```

**优势：**
- ✅ 默认折叠，不干扰用户浏览商品
- ✅ 用户可以选择忽略营销活动
- ✅ 保留传统的"加入购物车"流程
- ✅ 视觉上不突兀

---

#### 方案B：浮动标签设计

```vue
<template>
  <view class="product-detail">
    <!-- 商品信息 -->
    <view class="product-info">
      <text class="product-name">{{ product.name }}</text>
      
      <!-- 价格区域 -->
      <view class="price-section">
        <text class="current-price">¥{{ product.price }}</text>
        
        <!-- 营销活动标签（小巧，不侵略） -->
        <view 
          v-if="hasMarketingActivities"
          class="activity-tags"
        >
          <text 
            v-for="activity in activities.slice(0, 2)" 
            :key="activity.id"
            class="activity-tag"
            @click="showActivityDetail(activity)"
          >
            {{ activity.tagText }}
          </text>
          <text 
            v-if="activities.length > 2"
            class="more-tag"
            @click="showAllActivities"
          >
            +{{ activities.length - 2 }}
          </text>
        </view>
      </view>
    </view>
    
    <!-- 其他内容 -->
  </view>
</template>

<style scoped>
.activity-tags {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.activity-tag {
  padding: 2px 8px;
  background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
  color: white;
  font-size: 11px;
  border-radius: 4px;
}
</style>
```

**优势：**
- ✅ 更加轻量，只显示标签
- ✅ 不占用大块空间
- ✅ 用户可以选择点击或忽略

---

### 3.3 购物车兼容性设计

**问题：** 营销活动商品能否加入购物车？

**方案：** 分类处理

```typescript
interface CartItem {
  id: string
  productId: string
  quantity: number
  
  // 营销活动信息（可选）
  marketingActivity?: {
    activityId: string
    activityType: string
    expiresAt: string  // 活动过期时间
  }
}
```

**规则：**
1. **普通商品**：可以加入购物车，正常结算
2. **秒杀商品**：不能加入购物车，必须立即购买
3. **拼团/拼班**：不能加入购物车，必须立即参与
4. **满减活动**：可以加入购物车，结算时自动应用

**UI 展示：**
```vue
<template>
  <view class="bottom-bar">
    <!-- 根据活动类型显示不同按钮 -->
    <template v-if="!selectedActivity">
      <button class="btn-cart" @click="addToCart">加入购物车</button>
      <button class="btn-buy" @click="buyNow">立即购买</button>
    </template>
    
    <template v-else-if="selectedActivity.type === 'SECKILL'">
      <button class="btn-primary" @click="buyNow">
        立即抢购
      </button>
      <text class="tip">秒杀商品不支持加入购物车</text>
    </template>
    
    <template v-else-if="selectedActivity.type === 'COURSE_GROUP_BUY'">
      <button class="btn-join" @click="joinGroup">参与拼班</button>
      <button class="btn-initiate" @click="initiateGroup">发起拼班</button>
      <text class="tip">拼班商品不支持加入购物车</text>
    </template>
  </view>
</template>
```

---

## 四、最终推荐方案

### 4.1 数据库设计

**采用混合方案：**
- ✅ 保留 MaaS 平台（PlayTemplate、StorePlayConfig、PlayInstance）
- ✅ 为拼班课程增加扩展表（ClassGroupExtension、ClassGroupParticipant）
- ✅ 扩展表只存储高频查询字段
- ✅ 数据保持同步

### 4.2 小程序设计

**采用折叠式设计：**
- ✅ 营销活动默认折叠，不干扰用户
- ✅ 保留传统购物流程（加入购物车）
- ✅ 用户可以选择参与或忽略营销活动
- ✅ 不同活动类型有不同的交互方式

### 4.3 优势总结

| 维度 | 纯 MaaS 方案 | 混合方案 |
|-----|------------|---------|
| 查询性能 | ❌ 差 | ✅ 好 |
| 扩展性 | ✅ 好 | ✅ 好 |
| 维护成本 | ✅ 低 | ⚠️ 中 |
| 数据完整性 | ❌ 弱 | ✅ 强 |
| 并发控制 | ❌ 难 | ✅ 易 |
| 用户体验 | - | ✅ 无侵略性 |

**结论：** 混合方案在保留 MaaS 平台优势的同时，解决了性能和查询问题，是最佳选择。
