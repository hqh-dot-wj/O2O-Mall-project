# 活动版本控制功能说明

## 📋 功能概述

活动版本控制功能为营销活动配置提供完整的版本管理能力，支持规则变更历史追踪和版本回滚，确保运营操作的安全性和可追溯性。

**验证需求**: FR-7.1

---

## 🎯 核心功能

### 1. 自动版本保存

当活动规则（`rules` 字段）发生变更时，系统会自动将旧版本保存到 `rulesHistory` 数组中。

**触发条件**:
- 调用 `update()` 方法更新活动配置
- `rules` 字段的内容发生变化

**版本记录格式**:
```typescript
{
  version: number,        // 版本号（从1开始递增）
  rules: any,            // 规则内容快照
  updateTime: string,    // 更新时间（ISO格式）
  operator: string       // 操作人ID
}
```

**特性**:
- 版本号自动递增
- 最新版本在数组开头（倒序排列）
- 最多保留50个历史版本
- 只有规则变更时才保存，状态变更不触发

---

### 2. 版本回滚

支持将活动配置回滚到任意历史版本。

**API 接口**:
```http
POST /api/marketing/config/:id/rollback
Content-Type: application/json

{
  "targetVersion": 3
}
```

**回滚流程**:
1. 验证目标版本是否存在
2. 将当前规则保存到历史版本（作为回滚前的快照）
3. 将目标版本的规则设置为当前规则
4. 更新配置

**安全机制**:
- 回滚前自动保存当前状态
- 记录操作人信息
- 支持再次回滚（可以回滚到回滚前的状态）

---

### 3. 历史版本查询

查询活动配置的所有历史版本。

**API 接口**:
```http
GET /api/marketing/config/:id/history
```

**响应格式**:
```json
{
  "code": 200,
  "data": {
    "configId": "config-123",
    "currentRules": {
      "name": "春节拼团活动 v3",
      "minUsers": 5,
      "maxUsers": 15,
      "price": 89
    },
    "history": [
      {
        "version": 2,
        "rules": {
          "name": "春节拼团活动 v2",
          "minUsers": 4,
          "maxUsers": 12,
          "price": 99
        },
        "updateTime": "2024-02-05T10:00:00Z",
        "operator": "admin-1"
      },
      {
        "version": 1,
        "rules": {
          "name": "春节拼团活动",
          "minUsers": 3,
          "maxUsers": 10,
          "price": 109
        },
        "updateTime": "2024-02-01T15:30:00Z",
        "operator": "admin-2"
      }
    ],
    "totalVersions": 2
  }
}
```

---

### 4. 版本比较

比较当前版本和指定历史版本的差异。

**API 接口**:
```http
GET /api/marketing/config/:id/compare/:version
```

**响应格式**:
```json
{
  "code": 200,
  "data": {
    "currentVersion": {
      "rules": {
        "name": "春节拼团活动 v3",
        "minUsers": 5,
        "maxUsers": 15,
        "price": 89
      },
      "updateTime": "2024-02-06T10:00:00Z"
    },
    "targetVersion": {
      "version": 1,
      "rules": {
        "name": "春节拼团活动",
        "minUsers": 3,
        "maxUsers": 10,
        "price": 109
      },
      "updateTime": "2024-02-01T15:30:00Z",
      "operator": "admin-2"
    },
    "hasChanges": true
  }
}
```

---

## 🔧 使用示例

### 场景1: 更新活动规则（自动保存版本）

```typescript
// 更新活动规则
await configService.update(
  'config-123',
  {
    rules: {
      name: '春节拼团活动 v2',
      minUsers: 5,
      maxUsers: 15,
      price: 89,
    },
  },
  'admin-1', // 操作人ID
);

// 系统会自动：
// 1. 检测到 rules 字段变更
// 2. 将旧规则保存到 rulesHistory
// 3. 更新当前规则
```

### 场景2: 查看历史版本

```typescript
// 查询历史版本列表
const history = await configService.getRulesHistory('config-123');

console.log(history.data.totalVersions); // 2
console.log(history.data.history[0].version); // 2（最新版本）
console.log(history.data.history[1].version); // 1（旧版本）
```

### 场景3: 回滚到历史版本

```typescript
// 回滚到版本1
await configService.rollbackToVersion(
  'config-123',
  1, // 目标版本号
  'admin-1', // 操作人ID
);

// 系统会自动：
// 1. 将当前规则保存到历史版本（作为版本3）
// 2. 将版本1的规则设置为当前规则
// 3. 记录操作人信息
```

### 场景4: 比较版本差异

```typescript
// 比较当前版本和版本1的差异
const diff = await configService.compareVersions('config-123', 1);

if (diff.data.hasChanges) {
  console.log('当前版本和版本1有差异');
  console.log('当前规则:', diff.data.currentVersion.rules);
  console.log('版本1规则:', diff.data.targetVersion.rules);
}
```

---

## 📊 数据库设计

### Prisma Schema

```prisma
model StorePlayConfig {
  id       String @id @default(cuid())
  tenantId String @default("000000") @map("tenant_id")
  storeId  String @map("store_id")

  // 关联物理服务/商品
  serviceId   String      @map("service_id")
  serviceType ProductType @map("service_type")

  // 关联模板
  templateCode String @map("template_code")

  // 营销规则配置
  rules Json // { targetCount: 3, discountPrice: 99 }
  
  // 规则历史版本（用于版本控制和回滚）
  rulesHistory Json[] @default([]) @map("rules_history")

  // 库存策略
  stockMode MarketingStockMode @map("stock_mode")

  status  PublishStatus @default(OFF_SHELF)
  delFlag DelFlag       @default(NORMAL) @map("del_flag")

  createTime    DateTime       @default(now()) @map("create_time")
  updateTime    DateTime       @updatedAt @map("update_time")
  playInstances PlayInstance[]

  @@map("mkt_store_config")
}
```

### 数据库迁移

```bash
# 生成迁移文件
npx prisma migrate dev --name add_rules_history

# 应用迁移
npx prisma migrate deploy
```

---

## 🧪 测试

### 运行单元测试

```bash
# 运行版本控制相关测试
npm test -- config.service.version-control.spec.ts

# 运行所有配置服务测试
npm test -- config.service
```

### 测试覆盖

- ✅ 规则变更时自动保存历史版本
- ✅ 规则未变更时不保存历史版本
- ✅ 版本号正确递增
- ✅ 历史版本数量限制（最多50个）
- ✅ 版本回滚功能
- ✅ 回滚前保存当前状态
- ✅ 历史版本查询
- ✅ 版本比较功能
- ✅ 异常处理（配置不存在、版本不存在）

---

## 🔒 安全机制

### 1. 操作追溯

每个版本记录都包含操作人信息，确保所有变更可追溯。

```typescript
{
  version: 1,
  rules: {...},
  updateTime: "2024-02-01T10:00:00Z",
  operator: "admin-1" // 操作人ID
}
```

### 2. 回滚保护

回滚前自动保存当前状态，防止误操作导致数据丢失。

### 3. 版本数量限制

最多保留50个历史版本，防止数据库膨胀。

### 4. 权限控制

建议在 API 层面添加权限控制：
- 普通运营：只能查看历史版本
- 高级运营：可以回滚到历史版本
- 管理员：完全控制权限

---

## 📈 性能优化

### 1. 历史版本数量限制

```typescript
// 限制历史版本数量（最多保留50个版本）
const maxHistoryCount = 50;
if (updatedHistory.length > maxHistoryCount) {
  updatedHistory.splice(maxHistoryCount);
}
```

### 2. 规则变更检测

```typescript
// 使用 JSON.stringify 比较规则是否变更
const rulesChanged = dto.rules && 
  JSON.stringify(dto.rules) !== JSON.stringify(config.rules);
```

### 3. 数据库索引

建议为 `updateTime` 字段添加索引，优化历史版本查询性能。

---

## 🚀 未来扩展

### 1. 版本标签

支持为重要版本添加标签（如"生产版本"、"测试版本"）。

```typescript
{
  version: 1,
  rules: {...},
  updateTime: "2024-02-01T10:00:00Z",
  operator: "admin-1",
  tag: "production" // 版本标签
}
```

### 2. 版本对比可视化

前端展示版本差异的可视化界面，高亮显示变更内容。

### 3. 批量回滚

支持批量回滚多个活动配置到指定版本。

### 4. 版本审批

重要版本的回滚需要经过审批流程。

---

## 📚 相关文档

- [需求文档](../../../../.kiro/specs/maas-architecture-improvement/requirements.md) - FR-7.1
- [设计文档](../../../../.kiro/specs/maas-architecture-improvement/design.md) - 运营安全机制
- [任务列表](../../../../.kiro/specs/maas-architecture-improvement/tasks.md) - Task 7.4

---

## 🐛 常见问题

### Q1: 为什么只有规则变更才保存历史版本？

**A**: 状态变更（如上下架）不影响活动的核心规则，不需要保存历史版本。只有规则变更才会影响用户参与活动的条件，因此需要版本控制。

### Q2: 历史版本数量限制为什么是50个？

**A**: 50个版本足以覆盖大部分场景，同时避免数据库膨胀。如果需要更多历史版本，可以调整 `maxHistoryCount` 常量。

### Q3: 回滚后能否再次回滚？

**A**: 可以。回滚前会自动保存当前状态，因此可以回滚到回滚前的状态。

### Q4: 如何删除历史版本？

**A**: 当前不支持手动删除历史版本。如果需要清理历史版本，可以通过数据库直接操作 `rulesHistory` 字段。

---

**文档版本**: v1.0  
**创建时间**: 2024-02-06  
**负责人**: 开发团队  
**验证需求**: FR-7.1
