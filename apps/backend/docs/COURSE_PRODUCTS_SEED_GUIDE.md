# 课程商品种子数据指南

## 概述

本指南提供了创建课程类服务商品的种子脚本和使用方法。脚本会自动创建完整的课程分类、商品和 SKU 数据。

## 创建内容

### 1. 课程分类

**一级分类**:
- 教育培训

**二级分类**:
- 艺术培训（音乐、舞蹈、美术等）
- 体育培训（跆拳道、篮球等）
- 语言培训（英语等）

### 2. 课程商品（10个）

| 序号 | 课程名称 | 分类 | 课时 | 特点 |
|-----|---------|------|------|------|
| 1 | 少儿声乐启蒙课 | 艺术培训 | 60分钟 | 小班/一对一，8-32课时包 |
| 2 | 少儿中国舞培训 | 艺术培训 | 90分钟 | 启蒙/初级/中级，12-48课时包 |
| 3 | 少儿拉丁舞培训 | 艺术培训 | 90分钟 | 小班/一对一，12-48课时包 |
| 4 | 钢琴一对一课程 | 艺术培训 | 45分钟 | 启蒙到高级，10-40课时包 |
| 5 | 民谣吉他培训 | 艺术培训 | 60分钟 | 小班/一对一，8-32课时包 |
| 6 | 少儿创意美术 | 艺术培训 | 90分钟 | 3-6岁/7-12岁，12-48课时包 |
| 7 | 少儿硬笔书法 | 艺术培训 | 60分钟 | 小班，12-48课时包 |
| 8 | 少儿英语口语 | 语言培训 | 60分钟 | 小班/一对一，16-64课时包 |
| 9 | 少儿跆拳道 | 体育培训 | 90分钟 | 白带到蓝带，12-48课时包 |
| 10 | 少儿篮球训练 | 体育培训 | 90分钟 | 6-15岁分龄，12-48课时包 |

### 3. SKU 配置

每个课程根据不同的规格组合创建多个 SKU：

**规格维度**:
- 课时包：8/10/12/16/24/32/40/48/64 课时
- 班型：小班/一对一
- 级别：启蒙/初级/中级/高级
- 年龄段：3-6岁/7-12岁/13-15岁

**价格策略**:
- 小班课：约 100元/课时
- 一对一：约 150-200元/课时
- 课时包越大，单价越优惠

## 使用方法

### 方法 1: 直接运行 TypeScript 脚本

```bash
cd apps/backend
npx ts-node prisma/seed-course-products.ts
```

### 方法 2: 使用 Shell 脚本（Linux/Mac）

```bash
cd apps/backend
chmod +x scripts/seed-courses.sh
./scripts/seed-courses.sh
```

### 方法 3: 使用 Batch 脚本（Windows）

```cmd
cd apps\backend
scripts\seed-courses.bat
```

## 执行输出示例

```
🎓 开始创建课程类服务商品...

📂 第一步：创建课程分类...

   ✅ 一级分类: 教育培训
   ✅ 二级分类: 艺术培训
   ✅ 二级分类: 体育培训
   ✅ 二级分类: 语言培训

📝 第二步：创建课程商品...

   ✅ 少儿声乐启蒙课
   ✅ 少儿中国舞培训
   ✅ 少儿拉丁舞培训
   ✅ 钢琴一对一课程
   ✅ 民谣吉他培训
   ✅ 少儿创意美术
   ✅ 少儿硬笔书法
   ✅ 少儿英语口语
   ✅ 少儿跆拳道
   ✅ 少儿篮球训练

   成功创建 10/10 个课程商品

📦 第三步：创建商品 SKU...

   ✅ 成功创建 87 个 SKU

🔍 第四步：验证结果...

📊 创建统计：
   课程分类: 4 个
   课程商品: 10 个
   商品 SKU: 87 个

📋 课程商品列表：

   1. 少儿声乐启蒙课
      分类: 艺术培训
      课时: 60分钟/节
      SKU数: 6 个
      价格区间: ¥800 - ¥5600

   2. 少儿中国舞培训
      分类: 艺术培训
      课时: 90分钟/节
      SKU数: 9 个
      价格区间: ¥1200 - ¥5200

   ...

🎉 课程商品创建完成！
```

## 数据结构

### 商品表 (pms_product)

```typescript
{
  productId: 'course-vocal-001',
  categoryId: 1001,
  name: '少儿声乐启蒙课',
  subTitle: '专业声乐老师，培养音乐素养',
  mainImages: ['https://...'],
  detailHtml: '<h2>课程介绍</h2>...',
  type: 'SERVICE',
  serviceDuration: 60,
  serviceRadius: 10000,
  needBooking: true,
  specDef: {
    specs: [
      { name: '课时包', values: ['8课时', '16课时', '32课时'] },
      { name: '班型', values: ['小班(6-8人)', '一对一'] }
    ]
  },
  publishStatus: 'ON_SHELF'
}
```

### SKU 表 (pms_global_sku)

```typescript
{
  skuId: 'course-vocal-001-8-small',
  productId: 'course-vocal-001',
  specValues: {
    '课时包': '8课时',
    '班型': '小班(6-8人)'
  },
  guidePrice: 800,
  stock: 0  // 服务类商品无库存
}
```

## 与营销活动结合

创建课程商品后，可以为其配置营销活动：

### 1. 课程拼团

适合新课程推广，通过拼团降低价格门槛：

```typescript
{
  templateCode: 'COURSE_GROUP_BUY',
  serviceId: 'course-vocal-001',
  rules: {
    price: 680,              // 拼团价（原价800）
    minCount: 6,             // 最低6人开班
    maxCount: 8,             // 最多8人
    joinDeadline: '2024-03-01 18:00:00',
    classStartTime: '2024-03-10 10:00:00',
    address: { address: '...' },
    totalLessons: 8,
    dayLessons: 2,
    classTime: '周六日 10:00-12:00',
    validDays: 60
  }
}
```

### 2. 限时秒杀

适合体验课或特价课时包：

```typescript
{
  templateCode: 'FLASH_SALE',
  serviceId: 'course-piano-001',
  rules: {
    price: 99,               // 秒杀价（原价150/课时）
    stock: 20,               // 限量20份
    startTime: '2024-03-01 10:00:00',
    endTime: '2024-03-01 12:00:00',
    limitPerUser: 1          // 每人限购1份
  }
}
```

## 注意事项

### 1. 数据冲突

如果数据库中已存在相同 ID 的分类或商品，脚本会跳过创建（使用 upsert）。

### 2. 图片资源

脚本中使用的是 Unsplash 的示例图片，生产环境需要替换为实际的课程图片。

### 3. 价格调整

脚本中的价格仅供参考，实际使用时需要根据市场情况调整。

### 4. 分类 ID

脚本使用固定的分类 ID（1000-1003），确保不与现有分类冲突。

### 5. 服务半径

所有课程的服务半径设置为 10000 米（10公里），可根据实际情况调整。

## 扩展建议

### 1. 添加更多课程

在 `courses` 数组中添加新的课程对象：

```typescript
{
  productId: 'course-xxx-001',
  categoryId: catArt.catId,
  name: '新课程名称',
  // ... 其他字段
}
```

### 2. 调整 SKU 价格

修改 `skuPrices` 对象中的价格配置：

```typescript
'course-xxx-001': {
  '8课时-小班': 800,
  '8课时-一对一': 1600,
  // ...
}
```

### 3. 添加新的规格维度

修改 `specDef` 中的 specs 数组：

```typescript
specDef: {
  specs: [
    { name: '课时包', values: ['8课时', '16课时'] },
    { name: '班型', values: ['小班', '一对一'] },
    { name: '时段', values: ['周末', '工作日'] }  // 新增维度
  ]
}
```

## 常见问题

### Q1: 脚本可以重复执行吗？

**A**: 可以。脚本使用 `upsert` 操作，重复执行不会创建重复数据。

### Q2: 如何删除创建的数据？

**A**: 可以使用以下 SQL：

```sql
-- 删除课程 SKU
DELETE FROM pms_global_sku WHERE sku_id LIKE 'course-%';

-- 删除课程商品
DELETE FROM pms_product WHERE product_id LIKE 'course-%';

-- 删除课程分类
DELETE FROM pms_category WHERE cat_id >= 1000 AND cat_id <= 1003;
```

### Q3: 如何修改课程信息？

**A**: 有两种方式：
1. 修改脚本后重新执行（推荐）
2. 使用 Prisma Studio 或 SQL 直接修改数据库

### Q4: 为什么服务类商品的 stock 是 0？

**A**: 服务类商品没有库存概念，stock 字段设为 0。库存管理通过营销活动的名额控制。

### Q5: 可以只创建部分课程吗？

**A**: 可以。修改脚本中的 `courses` 数组，注释掉不需要的课程。

## 相关文档

- [营销模板重置指南](./MARKETING_RESET_GUIDE.md)
- [营销配置指南](../../admin-web/docs/COURSE_MANAGEMENT_GUIDE.md)
- [商品管理文档](./PRODUCT_MANAGEMENT.md)

## 技术支持

如有问题，请联系开发团队或查看项目文档。
