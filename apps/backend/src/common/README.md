# Common 模块说明文档

## 📋 概述

`src/common` 是 NestJS 后端应用的核心基础设施层，提供跨模块共享的通用能力，包括异常处理、响应封装、数据访问、租户隔离、装饰器、守卫、拦截器等企业级功能。

**设计原则**：

- 单一职责：每个子模块专注一个领域
- 可复用性：所有业务模块均可依赖
- 类型安全：充分利用 TypeScript 类型系统
- 标准化：统一的编码规范和最佳实践

---

## 📁 目录结构

```
common/
├── cache/              # 缓存服务（租户级缓存）
├── cls/                # CLS (Continuation Local Storage) 上下文管理
├── constant/           # 常量定义（旧）
├── constants/          # 常量定义（新）⚠️ 与 constant 重复
├── crypto/             # 加密解密服务
├── decorators/         # 自定义装饰器
├── dto/                # 通用 DTO（分页、基础实体）
├── entities/           # 实体转换器
├── enum/               # 枚举定义
├── exceptions/         # 异常类定义
├── filters/            # 全局异常过滤器
├── guards/             # 守卫（认证、幂等、限流）
├── interceptors/       # 拦截器（事务）
├── logger/             # 日志模块
├── prisma/             # Prisma 服务
├── repository/         # 仓储基类
├── response/           # 统一响应封装
├── tenant/             # 多租户支持
├── utils/              # 工具函数
└── validators/         # 自定义验证器
```

---

## 🔧 核心模块详解

### 1. 异常处理 (`exceptions/`)

**文件**：`business.exception.ts`

**核心类**：

- `BusinessException` - 业务异常基类（HTTP 200）
- `AuthenticationException` - 认证异常（HTTP 401）
- `AuthorizationException` - 授权异常（HTTP 403）
- `ValidationException` - 参数验证异常（HTTP 400）
- `NotFoundException` - 资源未找到异常（HTTP 404）

**使用示例**：

```typescript
// 抛出业务异常
throw new BusinessException(ResponseCode.USER_NOT_FOUND, '用户不存在');

// 条件抛出
BusinessException.throwIf(age < 18, '未成年用户不允许操作');

// 空值检查
BusinessException.throwIfNull(user, '用户不存在');

// 空数组检查
BusinessException.throwIfEmpty(roles, '角色列表不能为空');
```

**设计亮点**：

- 业务异常统一返回 HTTP 200，通过 `code` 字段区分错误类型
- 提供静态方法简化异常抛出
- 支持携带额外数据（`data` 字段）

---

### 2. 统一响应 (`response/`)

**文件**：`result.ts`, `response.interface.ts`

**核心类**：`Result<T>`

**使用示例**：

```typescript
// 成功响应
return Result.ok(data);
return Result.ok(data, '创建成功');

// 失败响应
return Result.fail(ResponseCode.BUSINESS_ERROR, '操作失败');

// 分页响应
return Result.page(rows, total, pageNum, pageSize);

// 条件响应
return Result.when(isSuccess, data, ResponseCode.OPERATION_FAILED);

// 从 Promise 创建
return Result.fromPromise(asyncOperation(), ResponseCode.OPERATION_FAILED);
```

**响应格式**：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": { ... }
}
```

---

### 3. 数据访问层 (`repository/`)

**文件**：`base.repository.ts`, `soft-delete.repository.ts`

**核心类**：

- `BaseRepository` - 基础仓储抽象类
- `SoftDeleteRepository` - 带软删除的仓储基类

**功能特性**：

- ✅ 自动租户隔离
- ✅ 事务支持（通过 CLS）
- ✅ 软删除支持
- ✅ 分页查询
- ✅ 批量操作
- ✅ 类型安全

**使用示例**：

```typescript
@Injectable()
export class UserRepository extends SoftDeleteRepository<
  SysUser,
  Prisma.SysUserCreateInput,
  Prisma.SysUserUpdateInput,
  Prisma.SysUserDelegate
> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'sysUser', 'userId', 'tenantId');
  }
}

// 使用
const user = await this.userRepo.findById(userId);
const users = await this.userRepo.findPage({ pageNum: 1, pageSize: 10 });
await this.userRepo.create(createDto);
await this.userRepo.softDelete(userId);
```

---

### 4. 通用 DTO (`dto/`)

**文件**：`base.dto.ts`

**核心类**：

- `PageQueryDto` - 分页查询基类
- `PageQueryWithStatusDto` - 带状态筛选的分页
- `IdsDto` / `StringIdsDto` - 批量操作 ID 数组
- `IdParamDto` - 单个 ID 参数
- `BaseEntityDto` - 基础实体（审计字段）
- `TenantEntityDto` - 带租户的基础实体

**使用示例**：

```typescript
export class ListUserDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  userName?: string;
}

// 在 Service 中使用
const { skip, take } = dto; // 自动计算偏移量
const orderBy = dto.getOrderBy('createTime'); // 获取排序配置
const dateRange = dto.getDateRange('createTime'); // 获取时间范围
```

---

### 5. 多租户支持 (`tenant/`)

**文件**：

- `tenant.context.ts` - 租户上下文（AsyncLocalStorage）
- `tenant.middleware.ts` - 租户中间件
- `tenant.guard.ts` - 租户守卫
- `tenant.extension.ts` - Prisma 扩展（自动注入租户条件）
- `tenant.decorator.ts` - 租户装饰器

**核心功能**：

- 从请求头 `tenant-id` 提取租户信息
- 自动在查询条件中注入租户过滤
- 支持超级租户（跨租户访问）
- 支持忽略租户（特定场景）

**使用示例**：

```typescript
// 获取当前租户ID
const tenantId = TenantContext.getTenantId();

// 判断是否超级租户
const isSuper = TenantContext.isSuperTenant();

// 临时忽略租户隔离
TenantContext.run({ tenantId, ignoreTenant: true }, () => {
  // 这里的查询不会自动添加租户过滤
});
```

---

### 6. 装饰器 (`decorators/`)

**文件**：

- `api.decorator.ts` - API 文档装饰器
- `common.decorator.ts` - 通用装饰器
- `idempotent.decorator.ts` - 幂等装饰器
- `transactional.decorator.ts` - 事务装饰器
- `user.decorator.ts` - 用户信息装饰器
- `redis.decorator.ts` - Redis 缓存装饰器

**核心装饰器**：

#### `@Api()` - 统一 API 文档

```typescript
@Api({
  summary: '用户列表',
  type: UserVo,
  isArray: true,
  isPager: true,
})
@Get('list')
findAll(@Query() query: ListUserDto) {
  return this.userService.findAll(query);
}
```

#### `@Transactional()` - 事务管理

```typescript
@Transactional()
async create(dto: CreateUserDto) {
  // 方法内所有数据库操作自动在事务中执行
}
```

#### `@Idempotent()` - 幂等控制

```typescript
@Idempotent({ ttl: 5000 })
@Post('submit')
async submit(@Body() dto: SubmitDto) {
  // 5秒内相同请求会被拦截
}
```

---

### 7. 守卫 (`guards/`)

**文件**：

- `auth.guard.spec.ts` - 认证守卫测试
- `idempotent.guard.ts` - 幂等守卫
- `throttle.guard.ts` - 限流守卫

**幂等守卫**：

- 通过请求头 `X-Idempotent-ID` 校验
- 使用 Redis SetNX 实现
- 防止重复提交

---

### 8. 过滤器 (`filters/`)

**文件**：`global-exception.filter.ts`

**功能**：

- 统一异常处理
- 标准化响应格式
- 敏感信息脱敏
- 错误日志记录
- 开发环境调试信息

**异常处理优先级**：

1. BusinessException → HTTP 200
2. AuthenticationException → HTTP 401
3. AuthorizationException → HTTP 403
4. ValidationException → HTTP 400
5. HttpException → 对应状态码
6. Error → HTTP 500

---

### 9. 工具函数 (`utils/`)

**文件**：

- `pagination.helper.ts` - 分页辅助
- `error.ts` - 错误信息提取
- `result.ts` - 响应结果工具
- `captcha.ts` - 验证码
- `decorator.ts` - 装饰器工具
- `export.ts` - 导出工具

**核心工具**：

#### `PaginationHelper`

```typescript
// 获取分页参数（自动限制 offset ≤ 5000）
const { skip, take, pageNum, pageSize } = PaginationHelper.getPagination(dto);

// 分页查询
const result = await PaginationHelper.paginate(
  () => prisma.user.findMany({ skip, take }),
  () => prisma.user.count(),
);

// 构建时间范围
const dateRange = PaginationHelper.buildDateRange(dto.params);

// 构建字符串过滤（LIKE %value%）
const filter = PaginationHelper.buildStringFilter(keyword);
```

#### 错误信息提取（`error.ts`）

```typescript
import { getErrorMessage, getErrorStack, getErrorInfo } from 'src/common/utils/error';

try {
  // ...
} catch (error) {
  // 安全提取错误信息
  const message = getErrorMessage(error);
  const stack = getErrorStack(error);
  const { message, stack } = getErrorInfo(error);

  this.logger.error(message, stack);
}
```

---

### 10. 枚举 (`enum/`)

**文件**：

- `status.enum.ts` - 状态枚举
- `user.enum.ts` - 用户相关枚举
- `menu.enum.ts` - 菜单枚举
- `cache.enum.ts` - 缓存枚举
- `config.enum.ts` - 配置枚举
- `data-scope.enum.ts` - 数据权限范围
- `notice.enum.ts` - 通知枚举
- `sort.enum.ts` - 排序枚举

**常用枚举**：

```typescript
// 状态枚举
export enum StatusEnum {
  NORMAL = '0', // 正常
  STOP = '1', // 停用
}

// 删除标志
export enum DelFlagEnum {
  NORMAL = '0', // 正常
  DELETE = '2', // 已删除
}
```

---

## ⚠️ 缺陷分析

### 🔴 严重缺陷

#### 1. 常量目录重复（P0）

**问题**：存在 `constant/` 和 `constants/` 两个目录，职责重叠

**影响**：

- 开发者困惑：不知道该用哪个
- 维护成本高：需要同步两处
- 潜在冲突：可能定义相同常量

**位置**：

- `common/constant/` - 包含 `business.constant.ts`
- `common/constants/` - 包含 `business.constants.ts`

**建议**：

```typescript
// 统一迁移到 constants/ 目录
// 删除 constant/ 目录
// 更新所有引用路径
```

---

#### 2. Repository 租户隔离可能失效（P0）

**问题**：`BaseRepository.applyTenantFilter()` 依赖 `TenantContext` 和 CLS，但在某些场景下可能获取不到租户信息

**风险场景**：

- 定时任务
- 消息队列消费者
- 异步任务
- WebSocket 连接

**代码位置**：`repository/base.repository.ts:217-228`

```typescript
protected getTenantWhere(): Record<string, any> {
  const tenantId = TenantContext.getTenantId() || this.cls.get('tenantId');
  const isSuper = TenantContext.isSuperTenant() || false;
  const isIgnore = TenantContext.isIgnoreTenant() || false;

  if (isSuper || isIgnore || !tenantId) {
    return {}; // ⚠️ 没有租户信息时返回空，可能导致跨租户数据泄露
  }

  return { [this.tenantFieldName]: tenantId };
}
```

**建议**：

```typescript
// 1. 在非 HTTP 请求场景强制要求显式传入租户ID
// 2. 添加严格模式：没有租户信息时抛出异常
// 3. 审计日志：记录所有跨租户查询

protected getTenantWhere(options?: { strict?: boolean }): Record<string, any> {
  const tenantId = TenantContext.getTenantId() || this.cls.get('tenantId');
  const isSuper = TenantContext.isSuperTenant() || false;
  const isIgnore = TenantContext.isIgnoreTenant() || false;

  if (isSuper || isIgnore) {
    return {};
  }

  if (!tenantId) {
    if (options?.strict) {
      throw new Error('租户信息缺失，禁止查询');
    }
    this.logger.warn('租户信息缺失，可能导致数据泄露');
    return {};
  }

  return { [this.tenantFieldName]: tenantId };
}
```

---

#### 3. 深分页限制不够严格（P1）

**问题**：`PaginationHelper` 限制 offset ≤ 5000，但仅在调用 `getPagination()` 时检查

**风险**：

- 开发者可能直接使用 Prisma 跳过检查
- 大表深分页导致性能问题

**代码位置**：`utils/pagination.helper.ts:16-25`

**建议**：

```typescript
// 1. 在 BaseRepository 层也添加检查
// 2. 提供游标分页替代方案
// 3. 监控告警：记录所有深分页查询

// 游标分页示例
async findByCursor(cursor?: string, take: number = 10) {
  return this.delegate.findMany({
    take,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { id: 'asc' },
  });
}
```

---

### 🟡 中等缺陷

#### 4. 异常类缺少测试覆盖（P2）

**问题**：`business.exception.ts` 有测试文件但可能不完整

**影响**：

- 静态方法行为未验证
- 边界情况未覆盖

**建议**：

- 补充单元测试
- 覆盖所有静态方法
- 测试异常链传递

---

#### 5. Result 类缺少链式调用（P2）

**问题**：`Result` 类功能完善，但不支持链式操作

**建议**：

```typescript
// 添加链式方法
class Result<T> {
  map<U>(fn: (data: T) => U): Result<U> {
    if (!this.isSuccess()) return this as any;
    return Result.ok(fn(this.data!));
  }

  flatMap<U>(fn: (data: T) => Result<U>): Result<U> {
    if (!this.isSuccess()) return this as any;
    return fn(this.data!);
  }
}

// 使用
return Result.ok(user)
  .map((u) => u.profile)
  .flatMap((p) => validateProfile(p));
```

---

#### 6. 缺少统一的日志上下文（P2）

**问题**：日志模块存在，但缺少统一的 `traceId`、`userId` 注入

**建议**：

```typescript
// 在 CLS 中统一管理
this.cls.set('traceId', uuid());
this.cls.set('userId', user.userId);

// Logger 自动注入
this.logger.log('操作成功', {
  traceId: this.cls.get('traceId'),
  userId: this.cls.get('userId'),
});
```

---

#### 7. 幂等守卫缺少清理机制（P2）

**问题**：`IdempotentGuard` 使用 Redis 存储幂等 key，但没有主动清理机制

**风险**：

- Redis 内存泄漏
- TTL 失效时的兜底

**代码位置**：`guards/idempotent.guard.ts:38-42`

**建议**：

```typescript
// 1. 确保 Redis key 设置了 TTL
// 2. 请求完成后主动删除 key（可选）
// 3. 定期清理过期 key

async canActivate(context: ExecutionContext): Promise<boolean> {
  // ...
  const isSuccess = await this.redisService.tryLock(redisKey, options.ttl || 60000);

  if (isSuccess) {
    // 请求完成后清理（可选）
    const response = context.switchToHttp().getResponse();
    response.on('finish', () => {
      this.redisService.del(redisKey).catch(() => {});
    });
  }

  return isSuccess;
}
```

---

### 🟢 轻微缺陷

#### 8. 类型定义不够严格（P3）

**问题**：部分类型使用 `any`，降低类型安全性

**示例**：

- `BaseRepository` 的 `CreateInput`、`UpdateInput` 默认为 `any`
- `QueryOptions.where` 为 `Record<string, any>`

**建议**：

```typescript
// 使用泛型约束
export interface QueryOptions<T = any> extends PaginationOptions, SortOptions {
  where?: Prisma.Args<T, 'findMany'>['where'];
  include?: Prisma.Args<T, 'findMany'>['include'];
  select?: Prisma.Args<T, 'findMany'>['select'];
}
```

---

#### 9. 缺少性能监控装饰器（P3）

**问题**：没有统一的性能监控装饰器

**建议**：

```typescript
// 添加 @Performance() 装饰器
export function Performance(threshold: number = 1000) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      try {
        return await originalMethod.apply(this, args);
      } finally {
        const duration = Date.now() - start;
        if (duration > threshold) {
          logger.warn(`${propertyKey} 执行耗时 ${duration}ms，超过阈值 ${threshold}ms`);
        }
      }
    };
  };
}
```

---

#### 10. 文档注释不完整（P3）

**问题**：部分类和方法缺少 JSDoc 注释

**建议**：

- 补充所有公共 API 的注释
- 添加使用示例
- 说明参数和返回值

---

## 📊 缺陷统计

| 优先级   | 数量   | 缺陷类型                                 |
| -------- | ------ | ---------------------------------------- |
| P0       | 2      | 常量目录重复、租户隔离风险               |
| P1       | 1      | 深分页限制不严格                         |
| P2       | 4      | 测试覆盖、链式调用、日志上下文、幂等清理 |
| P3       | 3      | 类型安全、性能监控、文档注释             |
| **总计** | **10** |                                          |

---

## 🎯 改进建议优先级

### 立即修复（本周）

1. ✅ 合并 `constant/` 和 `constants/` 目录
2. ✅ 修复租户隔离风险（添加严格模式）
3. ✅ 补充深分页检查

### 短期改进（本月）

4. 补充单元测试覆盖
5. 添加统一日志上下文
6. 优化幂等守卫清理机制

### 长期优化（本季度）

7. 增强类型安全
8. 添加性能监控装饰器
9. 完善文档注释
10. 添加 Result 链式调用

---

## 📚 最佳实践

### 1. 异常处理

```typescript
// ✅ 推荐
BusinessException.throwIfNull(user, '用户不存在');

// ❌ 不推荐
if (!user) {
  throw new BusinessException(ResponseCode.USER_NOT_FOUND, '用户不存在');
}
```

### 2. 响应封装

```typescript
// ✅ 推荐
return Result.ok(data);

// ❌ 不推荐
return { code: 200, msg: '成功', data };
```

### 3. 数据访问

```typescript
// ✅ 推荐：使用 Repository
const users = await this.userRepo.findPage(query);

// ❌ 不推荐：直接使用 Prisma（跳过租户隔离）
const users = await this.prisma.user.findMany();
```

### 4. 事务管理

```typescript
// ✅ 推荐：使用装饰器
@Transactional()
async create(dto: CreateDto) {
  await this.userRepo.create(dto);
  await this.roleRepo.create(dto.role);
}

// ❌ 不推荐：手动管理事务
async create(dto: CreateDto) {
  await this.prisma.$transaction(async (tx) => {
    // ...
  });
}
```

### 5. 错误信息提取

```typescript
// ✅ 推荐：使用工具函数
import { getErrorMessage } from 'src/common/utils/error';

try {
  // ...
} catch (error) {
  this.logger.error(getErrorMessage(error));
}

// ❌ 不推荐：直接访问 error.message
try {
  // ...
} catch (error) {
  this.logger.error(error.message); // TypeScript 报错
}
```

---

## 🔗 相关文档

- [NestJS 后端开发规范](../../.cursor/rules/backend.mdc)
- [多租户设计文档](./tenant/README.md)
- [Repository 使用指南](./repository/README.md)
- [异常处理最佳实践](./exceptions/README.md)

---

## 📝 更新日志

| 日期       | 版本  | 变更内容                             |
| ---------- | ----- | ------------------------------------ |
| 2026-02-22 | 1.0.0 | 初始版本，包含完整模块说明和缺陷分析 |

---

**维护者**：Backend Team  
**最后更新**：2026-02-22
