# 营销模板快速开始指南

## 🎯 快速上手

### 1. 初始化模板数据

```bash
# 进入后端目录
cd apps/backend

# 运行模板种子数据脚本
npx ts-node ../../scripts/seed-new-marketing-templates.ts
```

预期输出：

```
🌱 Seeding New Marketing Templates...
📝 Updating COURSE_GROUP_BUY template...
✅ COURSE_GROUP_BUY template updated
📝 Creating FLASH_SALE template...
✅ FLASH_SALE template created
📝 Creating FULL_REDUCTION template...
✅ FULL_REDUCTION template created

🎉 Marketing templates seeding completed!
```

### 2. 创建测试配置（可选）

```bash
npx ts-node ../../scripts/seed-new-marketing-configs.ts
```

---

## 📖 使用示例

### 示例 1: 创建拼班课程活动

```typescript
// POST /api/marketing/config
{
  "tenantId": "100006",
  "storeId": "100006",
  "serviceId": "prod_xxx",
  "serviceType": "SERVICE",
  "templateCode": "COURSE_GROUP_BUY",
  "stockMode": "LAZY_CHECK",
  "status": "ON_SHELF",
  "rules": {
    "name": "瑜伽体验课 3人拼班",
    "price": 199,
    "minCount": 3,
    "maxCount": 10,
    "totalLessons": 8,
    "dayLessons": 1,
    "validDays": 60,
    "joinDeadline": "2024-03-01T00:00:00Z",
    "classStartTime": "2024-03-05T09:00:00Z",
    "classEndTime": "2024-03-15T18:00:00Z",
    "classAddress": "长沙市天心区芙蓉中路XX号",
    "leaderDiscount": 20
  }
}
```

### 示例 2: 创建限时秒杀活动

```typescript
// POST /api/marketing/config
{
  "tenantId": "100006",
  "storeId": "100006",
  "serviceId": "prod_xxx",
  "serviceType": "REAL",
  "templateCode": "FLASH_SALE",
  "stockMode": "STRONG_LOCK",  // 必须强锁定
  "status": "ON_SHELF",
  "rules": {
    "name": "清洁剂限时秒杀",
    "flashPrice": 299,
    "totalStock": 100,
    "limitPerUser": 2,
    "startTime": "2024-02-10T10:00:00Z",
    "endTime": "2024-02-11T10:00:00Z"
  }
}
```

**重要**: 创建秒杀活动后需要初始化库存：

```typescript
// 在配置创建后调用
await marketingStockService.initStock(configId, 100);
```

### 示例 3: 创建满减活动

```typescript
// POST /api/marketing/config
{
  "tenantId": "100006",
  "storeId": "100006",
  "serviceId": "prod_xxx",
  "serviceType": "REAL",
  "templateCode": "FULL_REDUCTION",
  "stockMode": "LAZY_CHECK",
  "status": "ON_SHELF",
  "rules": {
    "name": "全场满减优惠",
    "tiers": [
      { "threshold": 300, "discount": 50 },
      { "threshold": 500, "discount": 100 },
      { "threshold": 1000, "discount": 200 }
    ],
    "applicableScope": "ALL",
    "stackable": false,
    "startTime": "2024-02-01T00:00:00Z",
    "endTime": "2024-03-01T23:59:59Z"
  }
}
```

---

## 🔍 前端调用示例

### 获取活动展示数据

```typescript
// GET /api/marketing/config/:id/display
const response = await fetch(`/api/marketing/config/${configId}/display`);
const displayData = await response.json();

// 拼班课程返回
{
  countText: "最低3人 ~ 最多10人",
  lessonSummary: "每期课程8节课，一天上1节，一次60分钟",
  scheduleText: "上课时间：2024-03-05 ~ 2024-03-15",
  addressText: "上课地址：长沙市天心区芙蓉中路XX号",
  deadlineText: "报名截止：2024-03-01 00:00"
}

// 限时秒杀返回
{
  flashPrice: 299,
  totalStock: 100,
  remainingStock: 85,
  limitPerUser: 2,
  status: "IN_PROGRESS",
  countdown: 82800000
}

// 满减活动返回
{
  tierTexts: ["满300减50", "满500减100", "满1000减200"],
  scopeText: "全场通用",
  status: "IN_PROGRESS"
}
```

### 用户参与活动

```typescript
// POST /api/marketing/instance/join
{
  "configId": "config_xxx",
  "memberId": "member_xxx",
  "params": {
    // 拼班课程
    "groupId": "group_xxx",  // 参团时传入，开团时不传

    // 限时秒杀
    "quantity": 2,

    // 满减活动
    "originalAmount": 450,
    "productIds": ["prod_1", "prod_2"]
  }
}
```

---

## ⚠️ 常见问题

### Q1: 秒杀活动创建后无法参与？

**A**: 需要先初始化 Redis 库存缓存：

```typescript
await marketingStockService.initStock(configId, totalStock);
```

### Q2: 满减活动如何应用到订单？

**A**: 满减活动通常在订单结算时调用：

```typescript
const finalPrice = await fullReductionService.calculatePrice(config, {
  originalAmount: orderAmount,
  productIds: orderProductIds,
});
```

### Q3: 拼班课程报名截止时间校验失败？

**A**: 确保 `joinDeadline` 早于 `classStartTime`：

```typescript
joinDeadline < classStartTime < classEndTime;
```

### Q4: 如何查看所有可用模板？

**A**: 调用模板列表接口：

```bash
GET /api/marketing/template?status=NORMAL
```

---

## 📚 下一步

- 查看 [完整文档](./marketing-templates-update.md)
- 了解 [策略模式](../play/strategy.interface.ts)
- 学习 [库存管理](../stock/stock.md)

---

**提示**: 所有时间字段使用 ISO 8601 格式（如 `2024-02-10T10:00:00Z`）
