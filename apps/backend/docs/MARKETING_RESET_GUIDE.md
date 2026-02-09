# 营销系统重置脚本使用指南

## 概述

本指南提供了重置营销系统的脚本和使用方法。根据不同的需求，提供了两种重置方案：

1. **仅重置模板**：只删除和重建营销玩法模板，不影响现有配置和用户数据
2. **完整重置**：删除所有营销相关数据（模板、配置、实例），完全清空

## 脚本列表

### TypeScript 脚本

| 脚本文件 | 功能 | 影响范围 |
|---------|------|---------|
| `prisma/reset-marketing-templates.ts` | 仅重置模板 | 删除并重建所有营销玩法模板 |
| `prisma/reset-marketing-all.ts` | 完整重置 | 删除所有营销数据（模板+配置+实例） |

### Shell 脚本（Linux/Mac）

| 脚本文件 | 功能 |
|---------|------|
| `scripts/reset-templates-only.sh` | 仅重置模板（带确认） |
| `scripts/reset-marketing-full.sh` | 完整重置（带确认） |

### Batch 脚本（Windows）

| 脚本文件 | 功能 |
|---------|------|
| `scripts/reset-templates-only.bat` | 仅重置模板（带确认） |
| `scripts/reset-marketing-full.bat` | 完整重置（带确认） |

## 使用场景

### 场景 1: 更新模板定义

**需求**：修改了营销玩法模板的字段定义，需要更新数据库中的模板

**推荐方案**：仅重置模板

**影响**：
- ✅ 删除旧模板，创建新模板
- ✅ 现有门店配置保留
- ✅ 用户参与记录保留
- ⚠️ 如果模板字段变化较大，现有配置可能不兼容

### 场景 2: 开发测试

**需求**：开发环境需要清空所有测试数据，重新开始

**推荐方案**：完整重置

**影响**：
- ✅ 删除所有营销数据
- ✅ 重建标准模板
- ⚠️ 所有测试数据丢失

### 场景 3: 生产环境修复

**需求**：生产环境模板损坏，需要修复

**推荐方案**：仅重置模板（谨慎操作）

**注意事项**：
- ⚠️ 提前备份数据库
- ⚠️ 在低峰期操作
- ⚠️ 通知相关人员

## 使用方法

### 方法 1: 直接运行 TypeScript 脚本

#### 仅重置模板

```bash
cd apps/backend
npx ts-node prisma/reset-marketing-templates.ts
```

**输出示例**：
```
🚀 开始重置营销玩法模板...

🗑️  第一步：删除所有现有模板...
   ✅ 已删除 5 个模板

📝 第二步：创建标准营销玩法模板...

   ✅ 普通拼团 (GROUP_BUY)
   ✅ 课程拼团 (COURSE_GROUP_BUY)
   ✅ 限时秒杀 (FLASH_SALE)
   ✅ 满减活动 (FULL_REDUCTION)
   ✅ 会员升级 (MEMBER_UPGRADE)

🎉 营销玩法模板重置完成！

🔍 第三步：验证结果...

📋 当前系统中的营销玩法模板：

   1. 课程拼团 (COURSE_GROUP_BUY)
      单位: 节
      描述: 课程类商品专用拼团，支持开班人数、上课时间等配置
      字段数: 11

   2. 限时秒杀 (FLASH_SALE)
      单位: 个
      描述: 限时限量抢购，适用于促销活动
      字段数: 5

   ...

✨ 总计: 5 个模板
```

#### 完整重置

```bash
cd apps/backend
npx ts-node prisma/reset-marketing-all.ts
```

**交互式确认**：
```
⚠️  营销系统完整重置脚本

此操作将：
  1. 删除所有营销实例（用户参与记录）
  2. 删除所有门店营销配置
  3. 删除所有营销玩法模板
  4. 重新创建标准营销玩法模板

⚠️  确认要继续吗？这将删除所有营销数据！(yes/no): 
```

### 方法 2: 使用 Shell 脚本（Linux/Mac）

#### 仅重置模板

```bash
cd apps/backend
chmod +x scripts/reset-templates-only.sh
./scripts/reset-templates-only.sh
```

#### 完整重置

```bash
cd apps/backend
chmod +x scripts/reset-marketing-full.sh
./scripts/reset-marketing-full.sh
```

### 方法 3: 使用 Batch 脚本（Windows）

#### 仅重置模板

```cmd
cd apps\backend
scripts\reset-templates-only.bat
```

#### 完整重置

```cmd
cd apps\backend
scripts\reset-marketing-full.bat
```

## 标准模板定义

重置后会创建以下 5 个标准营销玩法模板：

### 1. 普通拼团 (GROUP_BUY)

**适用场景**：实物商品和服务的多人拼团

**配置字段**：
- 拼团价 (price) - 必填
- 成团人数 (minCount) - 必填
- 拼团有效时长 (duration) - 必填，单位：小时
- 活动开始时间 (startTime) - 可选
- 活动结束时间 (endTime) - 可选

### 2. 课程拼团 (COURSE_GROUP_BUY)

**适用场景**：课程类商品的拼团开班

**配置字段**：
- 课程价格 (price) - 必填
- 最低开班人数 (minCount) - 必填
- 最高招生人数 (maxCount) - 必填
- 团长优惠金额 (leaderDiscount) - 可选
- 报名截止时间 (joinDeadline) - 必填
- 开课时间 (classStartTime) - 必填
- 上课地址 (address) - 必填，支持地图选点
- 总课时数 (totalLessons) - 必填
- 每日课时 (dayLessons) - 必填
- 上课时间段 (classTime) - 必填
- 课程有效期 (validDays) - 必填，单位：天

### 3. 限时秒杀 (FLASH_SALE)

**适用场景**：限时限量促销活动

**配置字段**：
- 秒杀价 (price) - 必填
- 秒杀库存 (stock) - 必填
- 秒杀开始时间 (startTime) - 必填
- 秒杀结束时间 (endTime) - 必填
- 每人限购数量 (limitPerUser) - 可选

### 4. 满减活动 (FULL_REDUCTION)

**适用场景**：满足金额条件的减免活动

**配置字段**：
- 满减门槛金额 (threshold) - 必填
- 减免金额 (reduction) - 必填
- 活动开始时间 (startTime) - 可选
- 活动结束时间 (endTime) - 可选

### 5. 会员升级 (MEMBER_UPGRADE)

**适用场景**：用户购买会员权益

**配置字段**：
- 会员价格 (price) - 必填
- 会员有效期 (validDays) - 必填，单位：天
- 推荐佣金比例 (commission) - 可选，单位：%
- 会员权益说明 (benefits) - 可选

## 注意事项

### ⚠️ 数据安全

1. **生产环境操作前必须备份数据库**
   ```bash
   # PostgreSQL 备份示例
   pg_dump -U username -d database_name > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **测试环境先验证**
   - 在测试环境执行脚本
   - 验证结果正确后再在生产环境操作

3. **通知相关人员**
   - 运营人员：配置可能受影响
   - 开发人员：API 可能短暂不可用
   - 用户：避免在高峰期操作

### ⚠️ 兼容性问题

**仅重置模板时的潜在问题**：

如果模板字段发生重大变化，现有的门店配置可能不兼容：

```typescript
// 旧模板
{ key: 'targetCount', label: '成团人数', type: 'number' }

// 新模板
{ key: 'minCount', label: '成团人数', type: 'number' }
```

**解决方案**：
1. 使用数据迁移脚本更新现有配置
2. 或者使用完整重置，重新配置

### ⚠️ 回滚方案

如果重置后发现问题：

1. **从备份恢复**
   ```bash
   psql -U username -d database_name < backup_file.sql
   ```

2. **手动重建模板**
   - 参考 `reset-marketing-templates.ts` 中的模板定义
   - 使用 Prisma Studio 或 SQL 手动创建

## 常见问题

### Q1: 重置模板后，现有配置还能用吗？

**A**: 取决于模板字段是否变化：
- 如果字段 key 没变，现有配置可以继续使用
- 如果字段 key 改变，需要更新配置或重新创建

### Q2: 可以只删除某个模板吗？

**A**: 可以，使用 Prisma Studio 或编写自定义脚本：
```typescript
await prisma.playTemplate.delete({
  where: { code: 'GROUP_BUY' }
});
```

### Q3: 如何添加新的模板？

**A**: 修改脚本中的 `templates` 数组，添加新模板定义：
```typescript
{
  code: 'NEW_TEMPLATE',
  name: '新玩法',
  unitName: '个',
  description: '描述',
  ruleSchema: {
    fields: [
      { key: 'field1', label: '字段1', type: 'number', required: true }
    ]
  }
}
```

### Q4: 脚本执行失败怎么办？

**A**: 检查以下几点：
1. 数据库连接是否正常
2. Prisma Client 是否已生成（`npx prisma generate`）
3. 是否有外键约束冲突
4. 查看详细错误信息

### Q5: 可以在生产环境直接运行吗？

**A**: 不推荐！建议：
1. 先在测试环境验证
2. 备份生产数据库
3. 选择低峰期操作
4. 准备回滚方案

## 相关文档

- [营销系统架构文档](./ARCHITECTURE_OPTIMIZATION.md)
- [营销配置指南](../../admin-web/docs/COURSE_MANAGEMENT_GUIDE.md)
- [Prisma 文档](https://www.prisma.io/docs/)

## 技术支持

如有问题，请联系开发团队或查看项目文档。
