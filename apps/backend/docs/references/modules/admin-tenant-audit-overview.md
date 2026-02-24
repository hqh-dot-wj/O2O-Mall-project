# 租户访问审计日志模块

## 概述

租户访问审计日志模块提供完整的租户数据访问审计能力,自动记录所有数据访问行为,识别跨租户访问和异常访问模式。

## 功能特性

- ✅ 自动审计所有数据访问
- ✅ 跨租户访问检测
- ✅ 异常访问模式分析
- ✅ 权限隔离
- ✅ 异步写入 (性能影响 < 5ms)

## 快速开始

### 1. 数据库迁移

**注意**: 需要确保 PostgreSQL 数据库服务正在运行。

```bash
# 在 apps/backend 目录下执行
pnpm prisma:migrate --name add_tenant_audit_log

# 或者在项目根目录执行
cd apps/backend
pnpm prisma migrate dev --name add_tenant_audit_log
```

如果数据库未运行，请先启动数据库服务。

### 2. 配置权限

在系统菜单中添加以下权限:

- `system:tenant-audit:list` - 查看审计日志
- `system:tenant-audit:stats` - 查看统计信息
- `system:tenant-audit:anomalies` - 查看异常分析

### 3. 使用 API

#### 查询审计日志

```http
GET /admin/system/tenant-audit/list?pageNum=1&pageSize=20
Authorization: Bearer <token>
```

**查询参数**:

- `userId` - 用户ID
- `requestTenantId` - 请求租户ID
- `accessTenantId` - 访问租户ID
- `isCrossTenant` - 是否跨租户访问
- `startTime` - 开始时间
- `endTime` - 结束时间

#### 跨租户访问统计

```http
GET /admin/system/tenant-audit/cross-tenant-stats
Authorization: Bearer <token>
```

**响应示例**:

```json
{
  "code": 200,
  "data": {
    "totalCount": 1234,
    "todayCount": 56,
    "topUsers": [
      {
        "userId": "user123",
        "userName": "张三",
        "count": 100
      }
    ],
    "topModels": [
      {
        "modelName": "omsOrder",
        "count": 500
      }
    ]
  }
}
```

#### 异常访问分析

```http
GET /admin/system/tenant-audit/anomalies
Authorization: Bearer <token>
```

**响应示例**:

```json
{
  "code": 200,
  "data": {
    "suspiciousAccess": [
      {
        "userId": "user123",
        "userName": "张三",
        "pattern": "high_frequency_cross_tenant",
        "severity": "high",
        "description": "1小时内跨租户访问150次",
        "count": 150,
        "lastOccurrence": "2026-02-23T15:00:00Z"
      }
    ]
  }
}
```

## 工作原理

### 自动审计流程

```
1. 用户请求 → Controller
2. Controller → Service → BaseRepository
3. BaseRepository.applyTenantFilter() 检测访问行为
4. 提取审计数据 (用户、租户、操作)
5. 异步推送到审计队列
6. TenantAuditService 写入数据库
```

### 跨租户检测

系统自动检测以下情况:

1. **跨租户访问**: 请求租户 ≠ 访问租户
2. **超管访问**: `isSuperTenant = true`
3. **绕过过滤**: `isIgnoreTenant = true`

### 异常检测规则

| 规则               | 阈值     | 严重程度 |
| ------------------ | -------- | -------- |
| 1小时内跨租户访问  | > 100次  | low      |
| 1小时内跨租户访问  | > 200次  | medium   |
| 1小时内跨租户访问  | > 500次  | high     |
| 24小时内跨租户访问 | > 500次  | low      |
| 24小时内跨租户访问 | > 1000次 | medium   |
| 24小时内跨租户访问 | > 2000次 | high     |

## 性能优化

### 异步写入

审计日志使用 `setImmediate()` 异步写入,不阻塞主业务流程:

```typescript
setImmediate(() => {
  this.auditService.recordAccess(auditLog);
});
```

### 索引优化

创建了 6 个复合索引优化查询性能:

```sql
CREATE INDEX idx_request_tenant_time ON sys_tenant_audit_log(request_tenant_id, create_time);
CREATE INDEX idx_access_tenant_time ON sys_tenant_audit_log(access_tenant_id, create_time);
CREATE INDEX idx_user_time ON sys_tenant_audit_log(user_id, create_time);
CREATE INDEX idx_cross_tenant ON sys_tenant_audit_log(is_cross_tenant, create_time);
CREATE INDEX idx_status ON sys_tenant_audit_log(status, create_time);
CREATE INDEX idx_trace_id ON sys_tenant_audit_log(trace_id);
```

## 权限控制

### 超级管理员

- 可查看所有租户的审计日志
- 可查看所有统计信息
- 可查看所有异常分析

### 普通管理员

- 仅可查看本租户相关的审计日志
- 仅可查看本租户的统计信息
- 需要 `system:tenant-audit:*` 权限

## 数据归档 (待实施)

建议配置定时任务归档历史数据:

```typescript
// 每天凌晨 2 点执行
@Cron('0 2 * * *')
async archiveOldLogs() {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  // 归档 90 天以上的数据
  await this.archiveService.archive(ninetyDaysAgo);
}
```

## 告警配置 (待实施)

建议配置以下告警规则:

1. 单用户 1 小时内跨租户访问 > 100 次
2. 单租户 1 小时内被跨租户访问 > 500 次
3. 非超管用户使用 `isIgnoreTenant` 绕过
4. 审计日志写入失败率 > 1%

## 故障排查

### 审计日志未记录

1. 检查 `TenantAuditModule` 是否已注册
2. 检查 `TenantAuditService` 是否已注入到 CLS
3. 检查数据库连接是否正常
4. 查看应用日志中的错误信息

### 查询性能慢

1. 检查索引是否已创建
2. 检查查询条件是否使用了索引
3. 考虑添加时间范围限制
4. 考虑数据归档

### 权限问题

1. 检查用户是否有 `system:tenant-audit:*` 权限
2. 检查租户上下文是否正确
3. 检查是否为超级管理员

## 相关文档

- [设计文档](../../../../../docs/design/admin/system/tenant-audit/tenant-audit-design.md)
- [后端开发规范](../../../../../.kiro/steering/backend-nestjs.md)

## 技术栈

- NestJS - 框架
- Prisma - ORM
- PostgreSQL - 数据库
- nestjs-cls - 上下文管理

## 维护者

- @linlingqin77

## 许可证

MIT
