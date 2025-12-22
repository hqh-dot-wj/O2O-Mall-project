# 多租户架构

Nest-Admin-Soybean 内置完善的多租户数据隔离机制，支持 SaaS 模式运营。本文档将详细介绍多租户架构的设计和使用。

## 什么是多租户

多租户（Multi-Tenancy）是一种软件架构，允许单个应用实例为多个客户（租户）提供服务，同时确保每个租户的数据完全隔离和安全。

### 应用场景

- **SaaS 平台**: 为多个企业客户提供独立的管理系统
- **企业集团**: 为各个子公司提供统一的管理平台
- **代理商系统**: 为不同代理商提供独立的运营环境

## 架构设计

### 1. 租户识别

系统通过 HTTP 请求头 `x-tenant-id` 识别租户身份：

```typescript
// 前端请求时自动添加租户 ID
axios.defaults.headers.common['x-tenant-id'] = '000000'
```

### 2. 租户上下文

`TenantGuard` 守卫在请求进入时设置租户上下文：

```typescript
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const tenantId = request.headers['x-tenant-id']
    
    // 设置租户上下文
    TenantContext.setTenantId(tenantId)
    
    return true
  }
}
```

### 3. 自动数据过滤

所有数据库查询自动按租户过滤，无需手动添加条件：

```typescript
// Prisma 扩展自动添加租户过滤
const tenantExtension = Prisma.defineExtension({
  query: {
    $allModels: {
      async findMany({ args, query, model }) {
        // 自动添加 tenantId 过滤条件
        args.where = {
          ...args.where,
          tenantId: TenantContext.getTenantId()
        }
        return query(args)
      }
    }
  }
})
```

## 租户隔离模型

系统采用**共享数据库，共享 Schema** 的隔离模型：

| 隔离级别 | 说明 | 优点 | 缺点 |
|---------|------|------|------|
| 共享数据库，共享 Schema | 所有租户共用一个数据库和表，通过 tenantId 区分 | 资源利用率高，维护成本低 | 需要严格的数据隔离 |

### 为什么选择这种模型

1. **成本效益**: 单个数据库实例即可支持大量租户
2. **维护简单**: 数据库升级和维护只需操作一次
3. **横向扩展**: 可以通过分库分表进一步扩展
4. **性能优异**: Prisma 扩展在 ORM 层面实现，性能损耗极小

## 核心实现

### 1. Prisma 租户扩展

位置：`server/src/common/tenant/tenant.extension.ts`

```typescript
import { Prisma } from '@prisma/client'
import { TenantContext } from './tenant.context'

export function createTenantExtension() {
  return Prisma.defineExtension({
    name: 'tenant',
    query: {
      $allModels: {
        // 查询操作自动添加租户过滤
        async findMany({ args, query, model }) {
          if (shouldApplyTenantFilter(model)) {
            args.where = {
              ...args.where,
              tenantId: TenantContext.getTenantId()
            }
          }
          return query(args)
        },
        
        // 创建操作自动添加租户 ID
        async create({ args, query, model }) {
          if (shouldApplyTenantFilter(model)) {
            args.data = {
              ...args.data,
              tenantId: TenantContext.getTenantId()
            }
          }
          return query(args)
        },
        
        // 其他操作（update, delete）同样处理
        // ...
      }
    }
  })
}
```

### 2. 租户上下文管理

位置：`server/src/common/tenant/tenant.context.ts`

```typescript
import { ClsService } from 'nestjs-cls'

export class TenantContext {
  private static cls: ClsService
  
  static init(cls: ClsService) {
    this.cls = cls
  }
  
  static setTenantId(tenantId: string) {
    this.cls.set('tenantId', tenantId)
  }
  
  static getTenantId(): string {
    return this.cls.get('tenantId') || '000000'
  }
}
```

### 3. 租户守卫

位置：`server/src/common/guards/tenant.guard.ts`

```typescript
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const tenantId = request.headers['x-tenant-id'] || '000000'
    
    // 设置租户上下文
    TenantContext.setTenantId(tenantId)
    
    // 注入到请求对象
    request.tenantId = tenantId
    
    return true
  }
}
```

## 数据库模型

需要租户隔离的表必须包含 `tenantId` 字段：

```prisma
model SysUser {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id") @db.VarChar(20)
  username  String   @db.VarChar(50)
  // ... 其他字段
  
  @@index([tenantId])
  @@map("sys_user")
}
```

### 租户隔离的表

以下表包含租户隔离：

- SysUser - 用户表
- SysRole - 角色表
- SysDept - 部门表
- SysMenu - 菜单表
- SysPost - 岗位表
- SysDictType - 字典类型
- SysDictData - 字典数据
- SysConfig - 系统配置
- SysNotice - 通知公告
- SysJob - 定时任务
- SysOperLog - 操作日志
- SysLogininfor - 登录日志
- SysUpload - 文件上传

### 不需要租户隔离的表

- SysTenant - 租户表（全局）
- SysTenantPackage - 租户套餐（全局）

## 使用方法

### 基础使用

正常编写代码，系统会自动处理租户隔离：

```typescript
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}
  
  // 自动按当前租户过滤
  async findAll() {
    return this.prisma.sysUser.findMany()
  }
  
  // 自动添加当前租户 ID
  async create(data: CreateUserDto) {
    return this.prisma.sysUser.create({
      data: {
        username: data.username,
        // 不需要手动设置 tenantId
      }
    })
  }
}
```

### 跳过租户过滤

某些场景需要跨租户查询（如超级管理员），使用 `@IgnoreTenant()` 装饰器：

```typescript
@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}
  
  // 查询所有租户（跨租户）
  @IgnoreTenant()
  async findAllTenants() {
    return this.prisma.sysTenant.findMany()
  }
}
```

### 手动设置租户

某些特殊场景需要手动切换租户：

```typescript
async processForTenant(tenantId: string) {
  // 保存当前租户
  const currentTenant = TenantContext.getTenantId()
  
  try {
    // 切换到目标租户
    TenantContext.setTenantId(tenantId)
    
    // 处理业务逻辑
    await this.doSomething()
    
  } finally {
    // 恢复原租户
    TenantContext.setTenantId(currentTenant)
  }
}
```

## 超级管理员

租户 ID `000000` 为超级管理员租户，具有特殊权限：

```typescript
// 检查是否为超级管理员
function isSuperAdmin() {
  return TenantContext.getTenantId() === '000000'
}

// 超级管理员可以查看所有租户数据
@RequireRole('admin')
async getAllTenantsUsers() {
  if (isSuperAdmin()) {
    // 使用 @IgnoreTenant() 或手动查询
    return this.prisma.sysUser.findMany()
  }
  
  // 普通租户只能查看自己的
  return this.prisma.sysUser.findMany()
}
```

## 前端集成

### 1. 设置租户 ID

在用户登录后设置租户 ID：

```typescript
// store/modules/auth.ts
export const useAuthStore = defineStore('auth', () => {
  const tenantId = ref('000000')
  
  async function login(credentials) {
    const res = await fetchLogin(credentials)
    
    // 保存租户 ID
    tenantId.value = credentials.tenantId
    setTenantId(credentials.tenantId)
  }
  
  return { tenantId, login }
})
```

### 2. 请求拦截器

自动在所有请求中添加租户 ID：

```typescript
// service/request/instance.ts
axios.interceptors.request.use(config => {
  const tenantId = getTenantId()
  
  if (tenantId) {
    config.headers['x-tenant-id'] = tenantId
  }
  
  return config
})
```

## 注意事项

### 1. 索引优化

所有包含 `tenantId` 的表都应该在该字段上建立索引：

```prisma
model SysUser {
  // ...
  
  @@index([tenantId])
  @@index([tenantId, username]) // 复合索引
}
```

### 2. 关联查询

Prisma 关联查询会自动应用租户过滤：

```typescript
// 自动过滤关联表的租户
const user = await prisma.sysUser.findMany({
  include: {
    roles: true,  // 自动过滤角色表的租户
    dept: true    // 自动过滤部门表的租户
  }
})
```

### 3. 原生 SQL

使用原生 SQL 时需要手动添加租户过滤：

```typescript
const tenantId = TenantContext.getTenantId()

const users = await prisma.$queryRaw`
  SELECT * FROM sys_user 
  WHERE tenant_id = ${tenantId}
`
```

### 4. 事务处理

事务中的所有操作共享相同的租户上下文：

```typescript
await prisma.$transaction(async (tx) => {
  // 所有操作使用相同的租户 ID
  await tx.sysUser.create(userData)
  await tx.sysRole.create(roleData)
})
```

## 性能优化

### 1. 数据库分区

对于大量租户的场景，可以使用 PostgreSQL 分区：

```sql
-- 按租户 ID 范围分区
CREATE TABLE sys_user (
  tenant_id VARCHAR(20),
  -- ...
) PARTITION BY RANGE (tenant_id);

CREATE TABLE sys_user_p1 PARTITION OF sys_user 
  FOR VALUES FROM ('000000') TO ('100000');
```

### 2. 读写分离

为每个租户配置主从数据库：

```typescript
// 根据租户 ID 选择数据源
const db = getTenantDatabase(tenantId)
```

### 3. 缓存策略

租户数据缓存需要包含租户 ID：

```typescript
const cacheKey = `tenant:${tenantId}:users`
```

## 常见问题

### Q: 如何添加新的租户隔离表？

1. 在 Prisma Schema 中添加 `tenantId` 字段
2. 添加索引：`@@index([tenantId])`
3. 运行迁移：`pnpm prisma:migrate`
4. 无需修改代码，Prisma 扩展自动生效

### Q: 某些操作需要跨租户怎么办？

使用 `@IgnoreTenant()` 装饰器：

```typescript
@IgnoreTenant()
async crossTenantOperation() {
  // 这里的操作不会被租户过滤
}
```

### Q: 如何测试多租户功能？

```typescript
// 在测试中手动设置租户
TenantContext.setTenantId('test-tenant')

// 验证数据隔离
const users = await userService.findAll()
expect(users.every(u => u.tenantId === 'test-tenant')).toBe(true)
```

## 下一步

- [RBAC 权限系统](/guide/rbac) - 了解权限控制
- [请求加密](/guide/encryption) - 了解数据加密
- [API 开发](/development/api) - 学习 API 开发
