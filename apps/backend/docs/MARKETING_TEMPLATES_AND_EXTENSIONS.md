# MAAS 营销模板和扩展表分析

## 📋 当前营销模板概览

### 现有的 5 个营销模板

| 模板代码 | 模板名称 | 有实例 | 有状态 | 可失败 | 可并行 | 库存模式 |
|---------|---------|--------|--------|--------|--------|---------|
| `GROUP_BUY` | 普通拼团 | ✅ | ✅ | ✅ | ✅ | 强锁定 |
| `COURSE_GROUP_BUY` | 拼班课程 | ✅ | ✅ | ✅ | ✅ | 懒检查 |
| `FLASH_SALE` | 限时秒杀 | ✅ | ✅ | ❌ | ❌ | 强锁定 |
| `FULL_REDUCTION` | 满减活动 | ❌ | ❌ | ❌ | ✅ | 懒检查 |
| `MEMBER_UPGRADE` | 会员升级 | ✅ | ✅ | ❌ | ❌ | 懒检查 |

---

## 🗄️ 当前数据库表结构

### 核心表

#### 1. PlayTemplate（玩法模板表）
**用途**: 总部定义的玩法模板
```prisma
model PlayTemplate {
  id            String   @id @default(cuid())
  code          String   @unique  // GROUP_BUY, FLASH_SALE 等
  name          String
  ruleSchema    Json     // 动态表单配置
  unitName      String   // 单位: 节/小时/袋
  uiComponentId String?  // 前端组件映射
  status        Status
  delFlag       DelFlag
  createTime    DateTime
  updateTime    DateTime
}
```

#### 2. StorePlayConfig（门店营销配置表）
**用途**: 门店创建的具体营销活动配置
```prisma
model StorePlayConfig {
  id            String              @id @default(cuid())
  tenantId      String
  storeId       String
  serviceId     String              // 关联的服务/商品
  serviceType   ProductType
  templateCode  String              // 关联模板
  rules         Json                // 营销规则配置（核心字段）
  rulesHistory  Json[]              // 规则历史版本
  stockMode     MarketingStockMode
  status        PublishStatus
  delFlag       DelFlag
  createTime    DateTime
  updateTime    DateTime
}
```

#### 3. PlayInstance（营销实例表）
**用途**: 用户参与营销活动的记录
```prisma
model PlayInstance {
  id           String              @id @default(cuid())
  tenantId     String
  memberId     String
  configId     String              // 关联配置
  templateCode String
  orderSn      String?
  instanceData Json                // 实例特定数据（核心字段）
  status       PlayInstanceStatus
  createTime   DateTime
  payTime      DateTime?
  endTime      DateTime?
  updateTime   DateTime
}
```

---

## 🔍 各模板的规则配置（存储在 rules 字段）

### 1. GROUP_BUY（普通拼团）

**StorePlayConfig.rules 字段内容**:
```json
{
  "price": 99.00,           // 拼团价格
  "minCount": 3,            // 最小成团人数
  "maxCount": 10,           // 最大成团人数（可选）
  "validDays": 24,          // 拼团有效期（小时）
  "skus": [                 // SKU特定配置（可选）
    {
      "skuId": "sku-123",
      "price": 89.00
    }
  ]
}
```

**PlayInstance.instanceData 字段内容**:
```json
{
  "groupId": "group-xxx",        // 团ID（团长实例ID）
  "isLeader": true,              // 是否团长
  "currentCount": 2,             // 当前人数
  "targetCount": 3,              // 目标人数
  "participants": [              // 参与者列表
    {
      "memberId": "member-1",
      "joinTime": "2024-02-06T10:00:00Z"
    }
  ],
  "expireTime": "2024-02-07T10:00:00Z"  // 过期时间
}
```

**是否需要扩展表**: ❌ **不需要**
- 所有数据都可以存储在 JSON 字段中
- 查询需求不复杂，不需要单独建表

---

### 2. COURSE_GROUP_BUY（拼班课程）

**StorePlayConfig.rules 字段内容**:
```json
{
  "price": 199.00,                      // 拼团价格
  "minCount": 5,                        // 最小成团人数
  "maxCount": 20,                       // 最大成团人数
  "totalLessons": 12,                   // 总课时数
  "dayLessons": 2,                      // 每天课时数
  "validDays": 7,                       // 有效期（天）
  "joinDeadline": "2024-03-01T00:00:00Z",    // 报名截止时间
  "classStartTime": "2024-03-05T09:00:00Z",  // 上课开始时间
  "classEndTime": "2024-03-15T18:00:00Z",    // 上课结束时间
  "classAddress": "北京市朝阳区xxx",          // 上课地址
  "leaderDiscount": 50.00,              // 团长优惠金额
  "leaderFree": false,                  // 团长是否免单
  "leaderMustBeDistributor": false      // 团长必须是分销员
}
```

**PlayInstance.instanceData 字段内容**:
```json
{
  "groupId": "group-xxx",
  "isLeader": true,
  "currentCount": 5,
  "targetCount": 10,
  "participants": [...],
  "classSchedule": [                    // 课程安排
    {
      "date": "2024-03-05",
      "startTime": "09:00",
      "endTime": "11:00",
      "lessons": 2
    }
  ],
  "attendanceRecords": [                // 考勤记录
    {
      "memberId": "member-1",
      "date": "2024-03-05",
      "attended": true
    }
  ]
}
```

**是否需要扩展表**: ⚠️ **建议创建扩展表**

**原因**:
1. **课程排课需求**: 需要单独管理课程时间表
2. **考勤管理**: 需要记录每个学员的考勤情况
3. **查询需求**: 需要按日期、学员查询考勤记录

**建议的扩展表**:

```prisma
/// 课程拼团扩展表
model CourseGroupBuyExtension {
  id              String   @id @default(cuid())
  instanceId      String   @unique  // 关联 PlayInstance
  groupId         String              // 团ID
  
  // 课程信息
  totalLessons    Int                 // 总课时数
  completedLessons Int    @default(0) // 已完成课时数
  classAddress    String?             // 上课地址
  classStartTime  DateTime?           // 上课开始时间
  classEndTime    DateTime?           // 上课结束时间
  
  // 团长信息
  leaderId        String              // 团长ID
  leaderDiscount  Decimal  @default(0) @db.Decimal(10, 2)
  
  createTime      DateTime @default(now())
  updateTime      DateTime @updatedAt
  
  // 关联
  instance        PlayInstance @relation(fields: [instanceId], references: [id])
  schedules       CourseSchedule[]
  attendances     CourseAttendance[]
  
  @@index([groupId])
  @@index([leaderId])
  @@map("mkt_course_group_buy_ext")
}

/// 课程排课表
model CourseSchedule {
  id          String   @id @default(cuid())
  extensionId String
  
  date        DateTime             // 上课日期
  startTime   String               // 开始时间 "09:00"
  endTime     String               // 结束时间 "11:00"
  lessons     Int                  // 课时数
  status      String   @default("SCHEDULED")  // SCHEDULED, COMPLETED, CANCELLED
  
  createTime  DateTime @default(now())
  updateTime  DateTime @updatedAt
  
  extension   CourseGroupBuyExtension @relation(fields: [extensionId], references: [id])
  
  @@index([extensionId, date])
  @@map("mkt_course_schedule")
}

/// 课程考勤表
model CourseAttendance {
  id          String   @id @default(cuid())
  extensionId String
  scheduleId  String?              // 关联排课（可选）
  
  memberId    String               // 学员ID
  date        DateTime             // 考勤日期
  attended    Boolean  @default(false)  // 是否出勤
  remark      String?              // 备注
  
  createTime  DateTime @default(now())
  updateTime  DateTime @updatedAt
  
  extension   CourseGroupBuyExtension @relation(fields: [extensionId], references: [id])
  
  @@unique([extensionId, memberId, date])
  @@index([memberId])
  @@map("mkt_course_attendance")
}
```

---

### 3. FLASH_SALE（限时秒杀）

**StorePlayConfig.rules 字段内容**:
```json
{
  "flashPrice": 9.90,               // 秒杀价格
  "totalStock": 100,                // 总库存
  "limitPerUser": 1,                // 每人限购数量
  "startTime": "2024-02-06T10:00:00Z",  // 开始时间
  "endTime": "2024-02-06T12:00:00Z"     // 结束时间
}
```

**PlayInstance.instanceData 字段内容**:
```json
{
  "quantity": 1,                    // 购买数量
  "flashPrice": 9.90,               // 实际秒杀价
  "killTime": "2024-02-06T10:00:01Z"  // 秒杀时间
}
```

**是否需要扩展表**: ❌ **不需要**
- 数据结构简单
- 主要依赖库存服务管理库存
- JSON 字段足够

---

### 4. FULL_REDUCTION（满减活动）

**StorePlayConfig.rules 字段内容**:
```json
{
  "tiers": [                        // 满减档位
    {
      "threshold": 100.00,          // 满100
      "discount": 10.00             // 减10
    },
    {
      "threshold": 200.00,          // 满200
      "discount": 30.00             // 减30
    }
  ],
  "applicableScope": "ALL",         // 适用范围: ALL/CATEGORY/PRODUCT
  "categoryIds": [],                // 适用分类ID
  "productIds": [],                 // 适用商品ID
  "stackable": false,               // 是否可叠加
  "startTime": "2024-02-01T00:00:00Z",
  "endTime": "2024-02-29T23:59:59Z"
}
```

**是否需要扩展表**: ❌ **不需要**
- 无实例，直接应用规则
- 不需要存储实例数据

---

### 5. MEMBER_UPGRADE（会员升级）

**StorePlayConfig.rules 字段内容**:
```json
{
  "targetLevel": 2,                 // 目标等级
  "price": 299.00,                  // 升级价格
  "autoApprove": true               // 是否自动通过审批
}
```

**PlayInstance.instanceData 字段内容**:
```json
{
  "originalLevel": 1,               // 原等级
  "targetLevel": 2,                 // 目标等级
  "upgradeTime": "2024-02-06T10:00:00Z",  // 升级时间
  "approvalStatus": "APPROVED"      // 审批状态
}
```

**是否需要扩展表**: ❌ **不需要**
- 数据结构简单
- 会员等级信息存储在会员表中
- JSON 字段足够

---

## 📊 扩展表需求总结

### 需要扩展表的模板

| 模板 | 是否需要扩展表 | 原因 | 建议的扩展表 |
|------|--------------|------|------------|
| **COURSE_GROUP_BUY** | ✅ **需要** | 1. 课程排课管理<br>2. 考勤记录管理<br>3. 复杂查询需求 | 1. `CourseGroupBuyExtension`<br>2. `CourseSchedule`<br>3. `CourseAttendance` |

### 不需要扩展表的模板

| 模板 | 原因 |
|------|------|
| GROUP_BUY | 数据结构简单，JSON 字段足够 |
| FLASH_SALE | 主要依赖库存服务，JSON 字段足够 |
| FULL_REDUCTION | 无实例，直接应用规则 |
| MEMBER_UPGRADE | 数据结构简单，会员信息在会员表 |

---

## 🎯 设计原则

### 何时需要扩展表？

满足以下任一条件时，建议创建扩展表：

1. **复杂查询需求**
   - 需要按特定字段查询、排序、聚合
   - 例如：按日期查询课程安排、按学员查询考勤

2. **关联关系复杂**
   - 需要一对多或多对多关系
   - 例如：一个课程有多个排课记录

3. **数据量大**
   - 单个实例的子数据量很大
   - 例如：考勤记录可能有数百条

4. **独立业务逻辑**
   - 子数据有独立的业务逻辑和生命周期
   - 例如：排课可以单独创建、修改、取消

### 何时不需要扩展表？

满足以下条件时，使用 JSON 字段即可：

1. **数据结构简单**
   - 字段少，层级浅
   - 例如：拼团的参与者列表

2. **查询需求简单**
   - 主要通过主键查询
   - 不需要复杂的条件查询

3. **数据量小**
   - 单个实例的数据量不大
   - 例如：拼团最多几十个参与者

4. **灵活性要求高**
   - 不同玩法的数据结构差异大
   - 使用 JSON 更灵活

---

## 🚀 实施建议

### 短期（立即实施）

1. **创建 COURSE_GROUP_BUY 扩展表**
   ```sql
   -- 执行 Prisma migration
   npx prisma migrate dev --name add_course_group_buy_extension
   ```

2. **更新 CourseGroupBuyService**
   - 在创建实例时同时创建扩展表记录
   - 提供排课和考勤管理接口

### 中期（按需实施）

1. **监控其他模板的使用情况**
   - 如果 GROUP_BUY 的参与者数量经常超过 100 人，考虑扩展表
   - 如果需要复杂的拼团数据分析，考虑扩展表

2. **评估新增模板的扩展表需求**
   - 新增模板时，按照设计原则评估是否需要扩展表

### 长期（架构优化）

1. **考虑事件溯源模式**
   - 将所有状态变更记录为事件
   - 便于审计和回溯

2. **考虑读写分离**
   - 写入使用主表 + JSON
   - 读取使用物化视图或 CQRS 模式

---

## 📝 代码示例

### 创建课程拼团扩展表的 Migration

```prisma
// prisma/schema.prisma

/// 课程拼团扩展表
model CourseGroupBuyExtension {
  id              String   @id @default(cuid())
  instanceId      String   @unique
  groupId         String
  totalLessons    Int
  completedLessons Int    @default(0)
  classAddress    String?
  classStartTime  DateTime?
  classEndTime    DateTime?
  leaderId        String
  leaderDiscount  Decimal  @default(0) @db.Decimal(10, 2)
  createTime      DateTime @default(now())
  updateTime      DateTime @updatedAt
  
  instance        PlayInstance @relation(fields: [instanceId], references: [id])
  schedules       CourseSchedule[]
  attendances     CourseAttendance[]
  
  @@index([groupId])
  @@index([leaderId])
  @@map("mkt_course_group_buy_ext")
}

model CourseSchedule {
  id          String   @id @default(cuid())
  extensionId String
  date        DateTime
  startTime   String
  endTime     String
  lessons     Int
  status      String   @default("SCHEDULED")
  createTime  DateTime @default(now())
  updateTime  DateTime @updatedAt
  
  extension   CourseGroupBuyExtension @relation(fields: [extensionId], references: [id])
  
  @@index([extensionId, date])
  @@map("mkt_course_schedule")
}

model CourseAttendance {
  id          String   @id @default(cuid())
  extensionId String
  scheduleId  String?
  memberId    String
  date        DateTime
  attended    Boolean  @default(false)
  remark      String?
  createTime  DateTime @default(now())
  updateTime  DateTime @updatedAt
  
  extension   CourseGroupBuyExtension @relation(fields: [extensionId], references: [id])
  
  @@unique([extensionId, memberId, date])
  @@index([memberId])
  @@map("mkt_course_attendance")
}
```

---

**文档版本**: v1.0  
**创建时间**: 2024-02-06  
**负责人**: 开发团队  
**最后更新**: 2024-02-06
