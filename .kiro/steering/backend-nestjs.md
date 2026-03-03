---
inclusion: fileMatch
fileMatchPattern: 'apps/backend/src/**/*.ts'
---

# NestJS 后端开发规范

编辑 `apps/backend` 时遵循。**参考：`apps/backend/src/module/admin/system/user`**。

## 📦 1. 统一响应 API

```typescript
return Result.ok(data);
return Result.ok(data, '操作成功');
return Result.ok({ rows, total }); // 分页
return Result.fail(ResponseCode.BUSINESS_ERROR, '错误信息');
throw new BusinessException(ResponseCode.BUSINESS_ERROR, '非法操作');
BusinessException.throwIf(condition, '错误信息');
```

## 🚨 2. 异常处理

```typescript
import { BusinessException } from 'src/common/exceptions';
BusinessException.throwIfNull(user, '用户不存在');
BusinessException.throwIf(age < 18, '未成年');
```

### 2.1 catch 中安全获取错误信息（必做）

`catch (error)` 的 `error` 为 `unknown` 类型，禁止直接访问 `error.message` / `error.stack`。统一使用 `src/common/utils/error`：

```typescript
import { getErrorMessage, getErrorStack, getErrorInfo } from 'src/common/utils/error';

try {
  // ...
} catch (error) {
  // 仅需 message
  this.logger.error('操作失败:', getErrorMessage(error));

  // 需 message + stack 打日志
  const { message, stack } = getErrorInfo(error);
  this.logger.error(message, stack);

  // 抛给上游
  throw new BusinessException(ResponseCode.BUSINESS_ERROR, getErrorMessage(error));
}
```

| 函数                     | 用途                                                      |
| ------------------------ | --------------------------------------------------------- |
| `getErrorMessage(error)` | 安全提取错误文案（Error / 带 message 对象 / 其他）        |
| `getErrorStack(error)`   | 安全提取 stack，非 Error 返回 undefined                   |
| `getErrorInfo(error)`    | 返回 `{ message, stack? }`，便于 logger.error(msg, stack) |

## 📄 3. DTO 分页（项目标准）

```typescript
export class ListXxxDto extends PageQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 30)
  userName?: string;

  @ApiProperty({ enum: StatusEnum, required: false })
  @IsOptional()
  @IsEnum(StatusEnum)
  @Transform(({ value }) => (value === '0' ? StatusEnum.NORMAL : value === '1' ? StatusEnum.STOP : value))
  status?: StatusEnum;
}
```

Service 使用 `PaginationHelper.getPagination`、`buildDateRange`、`buildStringFilter`、`paginateWithTransaction`。分页深度限制 offset ≤ 5000（超限抛错）。

## 🏗️ 4. Repository（项目标准）

```typescript
@Injectable()
export class XxxRepository extends SoftDeleteRepository<SysUser, CreateInput, UpdateInput, Delegate> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'sysUser', 'userId');
  }
}
```

## 🔄 5. 事务

```typescript
import { Transactional } from 'src/common/decorators/transactional.decorator';
@Transactional()
async create(dto) { ... }
```

## 🎨 6. Controller

```typescript
@ApiTags('模块名')
@Controller('path')
@ApiBearerAuth('Authorization')
export class XxxController {
  @Api({ summary: 'xxx-列表', type: XxxListVo })
  @RequirePermission('system:xxx:list')
  @Get('list')
  findAll(@Query() query: ListXxxDto, @User() user: UserDto) {
    return this.xxxService.findAll(query, user.user);
  }

  @Operlog({ businessType: BusinessType.INSERT })
  @Post()
  create(@Body() dto: CreateXxxDto) {
    return this.xxxService.create(dto);
  }
}
```

装饰器：`@Api`、`@RequirePermission`、`@RequireRole`、`@Operlog`、`@User()`。

## 📂 7. 模块结构

```
xxx/
  dto/  vo/  services/  xxx.repository.ts  xxx.service.ts  xxx.controller.ts  xxx.module.ts
```

## 🔀 7.1 Service 方法分解约定

业务方法按规则类别分解为 private 子方法，确保每个子方法可独立单测：

| 子方法前缀         | 规则类别 | 示例                                  |
| ------------------ | -------- | ------------------------------------- |
| `validate*`        | 输入校验 | `validateCreateInput(dto)`            |
| `check*`           | 前置条件 | `checkStockAvailable(skuId, qty)`     |
| `do*`              | 主干逻辑 | `doCreateOrder(dto)`                  |
| `apply*Rules`      | 分支规则 | `applyZeroAmountRules(order)`         |
| `transition*State` | 状态机   | `transitionOrderState(order, target)` |

主入口方法仅做协调，不含业务细节。详细规范及 Rule ID 体系见 `process-testing.mdc`。

## 📊 8. 最佳实践

| 维度 | 坏习惯       | 最佳实践         |
| ---- | ------------ | ---------------- |
| 逻辑 | 层层 if-else | 卫语句、策略模式 |
| 代码 | 魔法值       | 枚举             |
| 事务 | 事务里调 RPC | 事务仅包裹 DB    |
| DB   | 循环查库 N+1 | Where IN 批量    |

## 📝 9. 代码注释规范

### 9.1 必须写 JSDoc 的场景

| 场景                                 | 必须包含                                        |
| ------------------------------------ | ----------------------------------------------- |
| Service **public** 方法              | `@description`、`@param`、`@returns`、`@throws` |
| Repository 自定义方法（非基类 CRUD） | `@param`、`@returns`                            |
| 工具函数 / Helper（`common/utils/`） | `@param`、`@returns`                            |
| 废弃方法                             | `@deprecated` + 替代方案                        |

### 9.2 不必写 JSDoc 的场景

| 场景                       | 原因                                               |
| -------------------------- | -------------------------------------------------- |
| Controller 方法            | Swagger 装饰器（`@Api`、`@ApiProperty`）已充当文档 |
| private 方法（命名清晰时） | 好的命名 > 冗余注释；命名不够清晰时仍应补 JSDoc    |
| getter / setter            | 类型签名已说明                                     |
| 逐行翻译代码               | 代码本身应该可读，注释应回答"为什么"而非"做了什么" |

### 9.3 业务逻辑注释：写 Why，不写 What

```typescript
// 先扣库存再创建订单，避免超卖（乐观锁在 Repository 层）
await this.stockRepository.deduct(skuId, qty);
await this.orderRepository.create(orderData);

// 金额为 0 时跳过支付流程，直接标记已支付
// 业务规则：全额优惠券 / 积分全抵 场景
if (order.payableAmount === 0) {
  return this.completeZeroAmountOrder(order);
}
```

### 9.4 TODO / FIXME / HACK 格式

```typescript
// TODO(zhangsan): 2026-Q2 迁移到事件驱动，当前同步调用存在耦合
// FIXME(lisi): 并发场景下可能重复扣款，需加分布式锁
// HACK: 临时绕过第三方 SDK 类型错误，等 v3.0 发布后移除
```

格式：`// 标记(负责人): 描述`。TODO 必须带负责人，建议带目标时间。

### 9.5 速查

| 场景                 | 写什么                                        |
| -------------------- | --------------------------------------------- |
| Service public 方法  | JSDoc：description + param + returns + throws |
| 非显而易见的业务规则 | Why 注释：为什么这么做，而非做了什么          |
| 临时方案 / 已知问题  | TODO/FIXME(负责人): 描述                      |
| 废弃方法             | `@deprecated` + 替代方案                      |
| 代码已经自解释的地方 | **不写**                                      |

---

## 🧪 10. 测试规范

> 详见 `testing.mdc`。对接完 Controller/Service 后必须补测并运行 `pnpm --filter @apps/backend test -- 对应模块` 通过。

---

## 🚀 11. 接口与大表性能规范（PR 必答）

**原则**：接口要对「数据增长 + 访问增长」负责。

### 11.1 设计三问

1. 会不会高频访问？2. 会不会访问大表？3. 数据/QPS 翻 10 倍是否可控？

### 11.2 QPS 分级

| 档位 | QPS      | 典型           | 要求                           |
| ---- | -------- | -------------- | ------------------------------ |
| 低   | < 20     | 后台、配置     | 简单查询可接受                 |
| 中   | 20 ~ 200 | 列表、详情     | 命中索引、评估缓存、禁止深分页 |
| 高   | > 200    | 首页、核心链路 | 必须缓存/读模型、水平扩展      |

### 11.3 大表名单

订单、流水（支付/钱包/积分）、操作日志、明细表、历史表、消息表。

### 11.4 禁止项

- offset > 5000
- order by 非索引字段
- 大表 `like %xxx%`
- 单接口返回 > 1000 条

### 11.5 PR 必答

- QPS 档位（低/中/高）
- 是否大表
- 数据量预估
- 是否命中索引 / 深分页
- 翻 10 倍后的升级方案

## 🛡️ 12. 安全与稳定性规范

### 12.1 幂等性（P0）

支付/下单/创建类接口必须幂等。实现：唯一约束、Redis SetNX、分布式锁、状态机。

### 12.2 防重复提交（P0）

后端 Redis 记录 `userId+业务key`，TTL 3–5 秒。

### 12.3 敏感数据脱敏（P0）

日志和接口返回禁止明文：手机号、身份证、银行卡、密码。脱敏示例：`138****1234`。

### 12.4 限流（P1）

高 QPS 接口必须限流。维度：IP、用户、接口。

### 12.5 调用超时与弱依赖（P1）

RPC/HTTP 必须设超时（如 3–5s）。非核心依赖做弱依赖。

### 12.6 熔断与降级（P2）

下游异常/超时比例高时熔断。降级：默认值、缓存、简化逻辑。

### 12.7 错误信息隐藏（P1）

生产环境不向前端返回堆栈、SQL、内部路径。

### 12.8 参数白名单（P2）

orderBy、where 条件白名单，禁止前端随意传入任意字段。

---

## 🏢 13. 多租户与接口分类

### 13.1 三种接口类型

| 类型               | 说明                           | 示例                                     |
| ------------------ | ------------------------------ | ---------------------------------------- |
| **TenantScoped**   | 数据按当前租户隔离             | 用户/角色/部门列表；小程序的订单、购物车 |
| **PlatformOnly**   | 不按租户隔离，仅平台或超管可调 | 租户管理、租户套餐                       |
| **TenantAgnostic** | 不依赖当前登录租户             | `client/location/match-tenant`           |

### 13.2 标明方式（必做）

在 Controller 类或方法上用 JSDoc 标明：`/** @tenantScope TenantScoped */`。

### 13.3 数据层要求

- 租户内接口：必须通过 Repository；禁止手写 `prisma.xxx.findMany()` 不加租户条件。
- 创建租户隔离数据：禁止由前端传入 `tenantId`；从 `TenantContext.getTenantId()` 或 `this.cls.get('tenantId')` 取。

---

## 📁 14. Client 与能力域模块职责划分

| 角色       | 目录               | 职责                                                               | 路径约定           |
| ---------- | ------------------ | ------------------------------------------------------------------ | ------------------ |
| **Client** | `module/client/`   | 所有 `client/*` 的 Controller（薄 Controller，调用能力域 Service） | `client/*`         |
| **能力域** | `module/{domain}/` | Service、Repository、规则配置；仅提供 `admin/{domain}/*` 配置接口  | `admin/{domain}/*` |

依赖方向：`client` → 能力域，**禁止**能力域 → client。

---

## 🏛️ 15. 架构守护规则

### 15.1 模块依赖方向

```
client → [finance, marketing, store, pms] → common
              ↓
           admin (仅配置接口)
```

### 15.2 Service 复杂度限制

| 指标             | 阈值     |
| ---------------- | -------- |
| Service 文件行数 | ≤ 300 行 |
| 单个方法行数     | ≤ 50 行  |
| 构造函数依赖数   | ≤ 6 个   |

### 15.3 禁止的代码模式

| 模式                             | 替代方案                |
| -------------------------------- | ----------------------- |
| 循环内单条查询（N+1）            | `WHERE IN` 批量查询     |
| `offset > 5000`                  | 游标分页 / 时间范围分页 |
| 事务内调用外部 API               | 事务外调用 + 补偿       |
| `prisma.xxx.findMany()` 不加租户 | 使用 Repository         |
| 硬编码配置值                     | ConfigService           |

---

## 📊 16. SLO 接口分级

| 接口类别  | P99 延迟 | 示例           |
| --------- | -------- | -------------- |
| 支付/资金 | ≤ 200ms  | 支付回调、提现 |
| 核心交易  | ≤ 500ms  | 下单、库存扣减 |
| 列表查询  | ≤ 1000ms | 商品/订单列表  |
| 后台管理  | ≤ 2000ms | 报表、配置     |

新增接口须在 Controller 注释中声明：`@sloCategory payment`。

---

## 🔧 17. 技术债标记

```typescript
// TECH-DEBT: [类型] [优先级] [预估工时] 描述
// TECH-DEBT: [架构债] [P0] [3d] CommissionService 超过 500 行，需拆分
```

---

## 🔌 19. 第三方 API 对接

> 详见 `backend-third-party.md`。核心要求：Adapter/Port 模式隔离、HttpModule 统一 HTTP 客户端、韧性设计（超时/重试/熔断/降级）。

---

**规范版本**: 1.5
**最后更新**: 2026-03-01
