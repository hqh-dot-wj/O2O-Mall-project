# 营销活动系统实施方案 V2（基于现有 MaaS 平台）

## 核心设计思路

### 为什么不新增独立表？

你们已经有了一个**通用的营销玩法平台（MaaS）**：
- `PlayTemplate`：玩法模板（总部定义）
- `StorePlayConfig`：门店营销商品配置
- `PlayInstance`：营销玩法实例（用户参与记录）

**优势：**
1. ✅ **扩展性强**：新增营销玩法只需添加模板记录，不需要改表结构
2. ✅ **数据统一**：所有营销活动数据在同一套表中，便于统计和查询
3. ✅ **代码复用**：通用的创建、查询、结算逻辑
4. ✅ **灵活配置**：通过 JSON 字段存储不同玩法的特有参数

**拼班课程只需要：**
- 在 `PlayTemplate` 中新增一条记录（code: `COURSE_GROUP_BUY`）
- 在 `StorePlayConfig.rules` 中存储拼班特有参数（JSON）
- 在 `PlayInstance.instanceData` 中存储用户参与信息（JSON）

---

## 一、数据库设计

### 1.1 新增玩法模板（SQL）

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
      {"name": "timeoutHours", "label": "成团超时(小时)", "type": "number", "default": 24},
      {"name": "discountPrice", "label": "拼班价格", "type": "number", "required": true},
      {"name": "originalPrice", "label": "原价", "type": "number", "required": true}
    ]
  }',
  '节',
  'ClassGroupBuy',
  '0',
  '0'
);
```

### 1.2 StorePlayConfig.rules 数据结构

```typescript
interface ClassGroupRules {
  // 课程信息
  schedule: string              // "周三 19:00-21:00"
  locationName: string          // "朝阳校区"
  locationLat: number           // 39.9042
  locationLng: number           // 116.4074
  maxDistance: number           // 5000 (米)
  
  // 成团规则
  minParticipants: number       // 3
  maxParticipants?: number      // 10 (可选)
  timeoutHours: number          // 24
  
  // 价格
  discountPrice: number         // 199.00
  originalPrice: number         // 599.00
  
  // 分佣
  commissionAmount: number      // 89.00
}
```

**示例数据：**
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

### 1.3 PlayInstance.instanceData 数据结构

```typescript
interface ClassGroupInstanceData {
  role: 'initiator' | 'participant'
  joinedAt: string
  currentParticipants: number
  participants: Array<{
    memberId: string
    joinedAt: string
    isInitiator: boolean
    referrerId?: string
  }>
  groupStatus: 'active' | 'completed' | 'timeout'
  completedAt?: string
}
```

**示例数据：**
```json
{
  "role": "initiator",
  "joinedAt": "2024-02-05T10:30:00Z",
  "currentParticipants": 2,
  "participants": [
    {
      "memberId": "user-001",
      "joinedAt": "2024-02-05T10:30:00Z",
      "isInitiator": true
    },
    {
      "memberId": "user-002",
      "joinedAt": "2024-02-05T11:00:00Z",
      "isInitiator": false,
      "referrerId": "user-001"
    }
  ],
  "groupStatus": "active",
  "completedAt": null
}
```

### 1.4 订单表关联调整

**OmsOrder 表新增字段：**
```sql
ALTER TABLE oms_order ADD COLUMN play_instance_id VARCHAR(36) COMMENT '营销玩法实例ID';
ALTER TABLE oms_order ADD COLUMN play_config_id VARCHAR(36) COMMENT '营销配置ID';
ALTER TABLE oms_order ADD COLUMN play_template_code VARCHAR(50) COMMENT '玩法模板代码';

CREATE INDEX idx_play_instance ON oms_order(play_instance_id);
CREATE INDEX idx_play_config ON oms_order(play_config_id);
```

---

## 二、后端接口设计

### 2.1 商品详情接口（核心）

**路径：** `GET /api/product/:id`

**返回数据结构：**
```typescript
interface ProductDetailResponse {
  // 基础信息
  id: string
  name: string
  originalPrice: number
  
  // 营销活动（按优先级排序，已过滤互斥）
  activities: {
    primary: MarketingActivity | null
    stackable: MarketingActivity[]
  }
  
  // 拼班课程推荐（如果有）
  recommendedClassGroup?: {
    config: StorePlayConfig
    score: number
    reason: {
      primary: string
      tags: string[]
    }
    otherCount: number
  }
}

interface MarketingActivity {
  id: string
  type: 'SECKILL' | 'GROUP_BUY' | 'COURSE_GROUP_BUY' | 'FULL_REDUCTION'
  templateCode: string
  price: number
  
  // 通用字段
  status: 'pending' | 'active' | 'ended'
  startTime: string
  endTime: string
  
  // 拼班特有（从 rules 解析）
  classGroupInfo?: {
    schedule: string
    location: string
    distance: number
    minParticipants: number
    currentParticipants: number
    commissionAmount: number
  }
}
```

**后端逻辑：**
```typescript
async getProductDetail(productId: string, userId: string, userLocation?: Location) {
  // 1. 获取商品基础信息
  const product = await this.productService.findById(productId)
  
  // 2. 获取该商品的所有营销配置
  const allConfigs = await this.prisma.storePlayConfig.findMany({
    where: {
      serviceId: productId,
      status: 'ON_SHELF',
      delFlag: 'NORMAL'
    },
    include: {
      playInstances: {
        where: { status: 'ACTIVE' }
      }
    }
  })
  
  // 3. 过滤互斥活动，按优先级排序
  const filteredActivities = this.filterConflictActivities(allConfigs)
  
  // 4. 如果有拼班课程，计算推荐
  let recommendedClassGroup = null
  if (filteredActivities.primary?.templateCode === 'COURSE_GROUP_BUY' && userLocation) {
    recommendedClassGroup = await this.calculateRecommendation(
      allConfigs.filter(c => c.templateCode === 'COURSE_GROUP_BUY'),
      userLocation,
      userId
    )
  }
  
  return {
    ...product,
    activities: filteredActivities,
    recommendedClassGroup
  }
}
```

### 2.2 拼班课程推荐接口

**路径：** `POST /api/class-group/recommend`

**请求参数：**
```typescript
{
  productId: string
  userLocation: { lat: number, lng: number }
  userId: string
}
```

**返回数据：**
```typescript
{
  recommended: StorePlayConfig  // 最推荐的1个
  others: StorePlayConfig[]     // 其他班次
  total: number
}
```

**推荐算法：**
```typescript
async calculateRecommendation(
  configs: StorePlayConfig[],
  userLocation: Location,
  userId: string
) {
  // 1. 过滤距离超出范围的
  const nearbyConfigs = configs.filter(config => {
    const rules = config.rules as ClassGroupRules
    const distance = this.calculateDistance(userLocation, {
      lat: rules.locationLat,
      lng: rules.locationLng
    })
    return distance <= rules.maxDistance
  })
  
  // 2. 计算推荐得分
  const scoredConfigs = nearbyConfigs.map(config => {
    const rules = config.rules as ClassGroupRules
    const distance = this.calculateDistance(userLocation, {
      lat: rules.locationLat,
      lng: rules.locationLng
    })
    
    // 获取当前参与人数
    const currentParticipants = config.playInstances.filter(
      i => i.status === 'ACTIVE'
    ).length
    
    // 计算得分
    const score = this.calculateScore({
      distance,
      currentParticipants,
      minParticipants: rules.minParticipants,
      discountRate: (rules.originalPrice - rules.discountPrice) / rules.originalPrice
    })
    
    return {
      config,
      score,
      reason: this.generateReason(distance, currentParticipants, rules)
    }
  })
  
  // 3. 排序
  scoredConfigs.sort((a, b) => b.score - a.score)
  
  return {
    recommended: scoredConfigs[0],
    others: scoredConfigs.slice(1, 6),
    total: scoredConfigs.length
  }
}
```

### 2.3 创建订单接口调整

**路径：** `POST /api/order/create`

**请求参数：**
```typescript
{
  productId: string
  quantity: number
  
  // 营销活动参数
  playConfigId?: string
  playTemplateCode?: string
  
  // 拼班特有参数
  classGroupParams?: {
    isInitiator: boolean
    referrerId?: string
  }
}
```

**后端逻辑：**
```typescript
async createOrder(dto: CreateOrderDto, userId: string) {
  // 1. 获取营销配置
  const config = await this.prisma.storePlayConfig.findUnique({
    where: { id: dto.playConfigId }
  })
  
  // 2. 创建或加入 PlayInstance
  let instance: PlayInstance
  
  if (dto.classGroupParams?.isInitiator) {
    // 发起新拼班
    instance = await this.prisma.playInstance.create({
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
    // 参与现有拼班（需要找到对应的 instance）
    instance = await this.findOrCreateInstance(config, userId, dto.classGroupParams.referrerId)
  }
  
  // 3. 创建订单
  const order = await this.prisma.omsOrder.create({
    data: {
      orderSn: this.generateOrderSn(),
      memberId: userId,
      tenantId: config.tenantId,
      orderType: 'SERVICE',
      totalAmount: (config.rules as ClassGroupRules).originalPrice,
      payAmount: (config.rules as ClassGroupRules).discountPrice,
      
      // 关联营销玩法
      playInstanceId: instance.id,
      playConfigId: config.id,
      playTemplateCode: config.templateCode,
      
      // 分佣信息
      shareUserId: dto.classGroupParams?.referrerId,
      
      status: 'PENDING_PAY'
    }
  })
  
  // 4. 更新 instance 的 orderSn
  await this.prisma.playInstance.update({
    where: { id: instance.id },
    data: { orderSn: order.orderSn }
  })
  
  return order
}
```

---

## 三、活动冲突检测逻辑

### 3.1 检测时机

管理后台创建 `StorePlayConfig` 时检查冲突

### 3.2 检测逻辑

```typescript
async checkConflict(dto: CreateStorePlayConfigDto) {
  // 1. 获取同商品的其他活动
  const existingConfigs = await this.prisma.storePlayConfig.findMany({
    where: {
      serviceId: dto.serviceId,
      status: 'ON_SHELF',
      delFlag: 'NORMAL'
    }
  })
  
  // 2. 使用冲突矩阵检查
  for (const existing of existingConfigs) {
    const { conflict, rule } = checkConflict(
      existing.templateCode,
      dto.templateCode
    )
    
    if (conflict) {
      throw new BadRequestException({
        message: '活动冲突',
        reason: rule.reason,
        existingActivity: {
          id: existing.id,
          name: existing.templateCode,
          type: existing.templateCode
        }
      })
    }
  }
}
```

---

## 四、优势总结

### 对比独立表方案

| 维度 | 独立表方案 | 通用平台方案 |
|-----|----------|------------|
| 扩展性 | ❌ 每个玩法需要新表 | ✅ 只需添加模板记录 |
| 数据统一性 | ❌ 数据分散在多个表 | ✅ 统一在 3 张表 |
| 查询复杂度 | ❌ 需要 JOIN 多个表 | ✅ 单表查询 + JSON 解析 |
| 代码复用 | ❌ 每个玩法独立逻辑 | ✅ 通用逻辑 + 策略模式 |
| 维护成本 | ❌ 高 | ✅ 低 |

### 实际案例

**新增"砍价"玩法：**
- 独立表方案：需要创建 `bargain_activity`、`bargain_participant` 等表
- 通用平台方案：只需在 `PlayTemplate` 中插入一条记录

**统计所有营销活动数据：**
- 独立表方案：需要 UNION 多个表
- 通用平台方案：直接查询 `PlayInstance` 表

---

## 五、迁移建议

如果你们之前已经有独立的营销活动表，建议：

1. **保留现有表**：作为历史数据
2. **新活动使用新方案**：基于 MaaS 平台
3. **逐步迁移**：将历史数据迁移到新表结构

这样既能保证数据完整性，又能享受新架构的优势。
