# 营销模板更新文档

## 📋 更新概览

本次更新完成了以下三个营销模板的开发：

1. ✅ **修改拼班课程模板** - 添加上课时间、地址、报名截止时间
2. ✅ **新增限时秒杀模板** - 支持高并发抢购场景
3. ✅ **新增满减活动模板** - 支持多档位满减优惠

---

## 1️⃣ 拼班课程模板 (COURSE_GROUP_BUY) - 已更新

### 新增字段

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `joinDeadline` | datetime | 否 | 报名截止时间 |
| `classStartTime` | datetime | 否 | 上课开始时间 |
| `classEndTime` | datetime | 否 | 上课结束时间 |
| `classAddress` | string | 否 | 上课地址 |

### 新增校验规则

- ✅ 上课结束时间必须晚于开始时间
- ✅ 报名截止时间必须早于上课开始时间
- ✅ 报名截止时间校验（用户参与时检查）

### 前端展示增强

新增返回字段：
```typescript
{
  scheduleText: "上课时间：2024-03-01 ~ 2024-03-10",
  addressText: "上课地址：长沙市天心区芙蓉中路XX号",
  deadlineText: "报名截止：2024-02-25 18:00"
}
```

### 示例配置

```typescript
{
  name: '瑜伽体验课 3人拼班',
  price: 199,
  minCount: 3,
  maxCount: 10,
  totalLessons: 8,
  dayLessons: 1,
  validDays: 60,
  joinDeadline: '2024-02-25T18:00:00Z',
  classStartTime: '2024-03-01T09:00:00Z',
  classEndTime: '2024-03-10T18:00:00Z',
  classAddress: '长沙市天心区芙蓉中路二段XX号瑜伽馆3楼',
  leaderDiscount: 20
}
```

---

## 2️⃣ 限时秒杀模板 (FLASH_SALE) - 新增

### 模板信息

- **模板代码**: `FLASH_SALE`
- **模板名称**: 限时秒杀
- **单位**: 件
- **库存模式**: 必须使用 `STRONG_LOCK`（强锁定）

### 规则字段

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `flashPrice` | number | 是 | 秒杀价格（必须 > 0） |
| `totalStock` | number | 是 | 总库存数量（必须 >= 1） |
| `limitPerUser` | number | 否 | 每人限购数量（默认 1） |
| `startTime` | datetime | 是 | 秒杀开始时间 |
| `endTime` | datetime | 是 | 秒杀结束时间 |

### 核心功能

#### 1. 时间控制
- ✅ 秒杀未开始时禁止参与
- ✅ 秒杀结束后禁止参与
- ✅ 前端实时倒计时支持

#### 2. 限购控制
- ✅ 检查用户已购买数量
- ✅ 超出限购数量时拒绝参与
- ✅ 支持多次购买累计计算

#### 3. 库存控制
- ✅ 使用 Redis Lua 脚本原子扣减
- ✅ 支付成功后扣减库存
- ✅ 订单超时/失败/退款时释放库存

#### 4. 状态管理
```typescript
status: 'NOT_STARTED' | 'IN_PROGRESS' | 'ENDED'
```

### 示例配置

```typescript
{
  name: '清洁剂限时秒杀',
  flashPrice: 299,
  totalStock: 100,
  limitPerUser: 2,
  startTime: '2024-02-10T10:00:00Z',
  endTime: '2024-02-11T10:00:00Z'
}
```

### 前端展示数据

```typescript
{
  flashPrice: 299,
  totalStock: 100,
  remainingStock: 85,
  limitPerUser: 2,
  startTime: '2024-02-10T10:00:00Z',
  endTime: '2024-02-11T10:00:00Z',
  status: 'IN_PROGRESS',
  countdown: 82800000 // 剩余毫秒数
}
```

---

## 3️⃣ 满减活动模板 (FULL_REDUCTION) - 新增

### 模板信息

- **模板代码**: `FULL_REDUCTION`
- **模板名称**: 满减活动
- **单位**: 元
- **库存模式**: `LAZY_CHECK`（懒检查）

### 规则字段

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `tiers` | array | 是 | 满减档位配置 |
| `applicableScope` | enum | 是 | 适用范围：ALL/CATEGORY/PRODUCT |
| `categoryIds` | array | 否 | 适用分类ID列表 |
| `productIds` | array | 否 | 适用商品ID列表 |
| `stackable` | boolean | 否 | 是否可与其他优惠叠加（默认 false） |
| `startTime` | datetime | 是 | 活动开始时间 |
| `endTime` | datetime | 是 | 活动结束时间 |

### 满减档位结构

```typescript
interface ReductionTier {
  threshold: number;  // 满足金额门槛
  discount: number;   // 减免金额
}
```

### 核心功能

#### 1. 多档位计算
- ✅ 自动匹配最高满足档位
- ✅ 档位必须按金额递增配置
- ✅ 未满足任何档位返回原价

#### 2. 适用范围控制
- ✅ 全场通用（ALL）
- ✅ 指定分类（CATEGORY）
- ✅ 指定商品（PRODUCT）

#### 3. 智能提示
- ✅ 计算当前可享受的优惠金额
- ✅ 提示"再买XX元可享受更多优惠"

### 示例配置

```typescript
{
  name: '全场满减优惠',
  tiers: [
    { threshold: 300, discount: 50 },
    { threshold: 500, discount: 100 },
    { threshold: 1000, discount: 200 }
  ],
  applicableScope: 'ALL',
  stackable: false,
  startTime: '2024-02-01T00:00:00Z',
  endTime: '2024-03-01T23:59:59Z'
}
```

### 前端展示数据

```typescript
{
  tiers: [...],
  tierTexts: ['满300减50', '满500减100', '满1000减200'],
  scopeText: '全场通用',
  applicableScope: 'ALL',
  stackable: false,
  startTime: '2024-02-01T00:00:00Z',
  endTime: '2024-03-01T23:59:59Z',
  status: 'IN_PROGRESS'
}
```

### 辅助方法

#### 计算优惠金额
```typescript
await fullReductionService.calculateDiscount(config, 450);
// 返回: 50 (满足 300-50 档位)
```

#### 获取下一档位提示
```typescript
await fullReductionService.getNextTier(config, 450);
// 返回: {
//   threshold: 500,
//   discount: 100,
//   gap: 50,
//   tipText: '再买50.00元可享受满500减100优惠'
// }
```

---

## 📁 文件清单

### 新增文件

```
apps/backend/src/module/marketing/play/
├── dto/
│   ├── course-group-buy.dto.ts      # 课程拼团 DTO（新增）
│   ├── flash-sale.dto.ts            # 限时秒杀 DTO（新增）
│   └── full-reduction.dto.ts        # 满减活动 DTO（新增）
├── flash-sale.service.ts            # 限时秒杀服务（新增）
└── full-reduction.service.ts        # 满减活动服务（新增）

scripts/
├── seed-new-marketing-templates.ts  # 模板种子数据（新增）
└── seed-new-marketing-configs.ts    # 配置示例数据（新增）
```

### 修改文件

```
apps/backend/src/module/marketing/play/
├── course-group-buy.service.ts      # 更新：添加新字段校验
├── play.module.ts                   # 更新：注册新服务
└── play.factory.ts                  # 更新：注册新策略
```

---

## 🚀 部署步骤

### 1. 运行模板种子数据

```bash
# 创建/更新营销模板
npx ts-node scripts/seed-new-marketing-templates.ts
```

### 2. 运行配置示例数据（可选）

```bash
# 创建示例配置用于测试
npx ts-node scripts/seed-new-marketing-configs.ts
```

### 3. 重启应用

```bash
npm run start:dev
```

---

## 🧪 测试建议

### 拼班课程测试
1. ✅ 创建配置时校验时间逻辑
2. ✅ 报名截止后无法参与
3. ✅ 前端正确显示上课时间和地址

### 限时秒杀测试
1. ✅ 秒杀未开始时无法参与
2. ✅ 限购数量控制
3. ✅ 高并发下库存不超卖
4. ✅ 订单取消后库存正确释放

### 满减活动测试
1. ✅ 多档位计算正确
2. ✅ 适用范围控制生效
3. ✅ 下一档位提示准确
4. ✅ 未满足档位返回原价

---

## 📝 注意事项

### 限时秒杀
- ⚠️ 必须使用 `STRONG_LOCK` 库存模式
- ⚠️ 需要提前初始化 Redis 库存缓存
- ⚠️ 建议配置合理的限购数量

### 满减活动
- ⚠️ 档位必须按金额递增配置
- ⚠️ 选择分类/商品范围时必须指定对应ID
- ⚠️ 通常在订单结算时应用，而非独立购买

### 拼班课程
- ⚠️ 报名截止时间必须早于上课开始时间
- ⚠️ 上课结束时间必须晚于开始时间
- ⚠️ 地址信息建议包含详细位置

---

## 🔗 相关文档

- [营销模块总览](./marketing.md)
- [策略模式接口](../play/strategy.interface.ts)
- [库存服务文档](../stock/stock.md)

---

**更新时间**: 2024-02-06  
**版本**: v1.0.0
