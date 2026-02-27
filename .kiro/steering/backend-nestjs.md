---
inclusion: fileMatch
fileMatchPattern: 'apps/backend/src/**/*.ts'
---

# NestJS 后端开发规范（详细版）

> 编辑 backend 源码时自动加载。核心原则见 `00-core-principles.md`。

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

## 📊 8. 最佳实践

| 维度 | 坏习惯       | 最佳实践         |
| ---- | ------------ | ---------------- |
| 逻辑 | 层层 if-else | 卫语句、策略模式 |
| 代码 | 魔法值       | 枚举             |
| 事务 | 事务里调 RPC | 事务仅包裹 DB    |
| DB   | 循环查库 N+1 | Where IN 批量    |

---

## 🧪 9. 测试规范（必做）

写完一个模块/功能后必须补充测试：

- **单元测试**：Service、工具函数、核心业务逻辑须有对应 `*.spec.ts`，覆盖主路径与关键边界、异常分支。
- **联合/集成测试**：涉及多模块协作、数据库或外部依赖的流程，在 `test/` 下编写 e2e 或 integration 测试（如 `xxx-flow.e2e-spec.ts`、`integration/xxx.spec.ts`）。

| 类型          | 放置位置                                  | 适用场景                                     |
| ------------- | ----------------------------------------- | -------------------------------------------- |
| 单元测试      | 与源文件同目录 `xxx.spec.ts`              | Service 方法、Repository、工具函数、业务规则 |
| 集成/联合测试 | `test/integration/`、`test/*.e2e-spec.ts` | 多模块联调、完整业务流程、数据库+外部依赖    |

**新增功能最低测试要求**（详见 `.cursor/rules/testing.mdc` §5）：

| 类型              | 最低要求                              |
| ----------------- | ------------------------------------- |
| Service 新方法    | 至少 2 个用例：主路径成功 + 异常/边界 |
| Controller 新端点 | 至少验证 `@RequirePermission` 装饰器  |
| Scheduler         | 至少验证 Cron 元数据 + 调用 Service   |
| 批量操作          | 覆盖全部成功、部分失败                |

PR 时新逻辑应有对应单测或集成测试，核心/资金类逻辑建议二者兼备。

---

## 🚀 10. 接口与大表性能规范（PR 必答）

**原则**：接口要对「数据增长 + 访问增长」负责。

### 10.1 设计三问

1. 会不会高频访问？2. 会不会访问大表？3. 数据/QPS 翻 10 倍是否可控？

### 10.2 QPS 分级（按档位评估即可）

| 档位 | QPS      | 典型           | 要求                           |
| ---- | -------- | -------------- | ------------------------------ |
| 低   | < 20     | 后台、配置     | 简单查询可接受                 |
| 中   | 20 ~ 200 | 列表、详情     | 命中索引、评估缓存、禁止深分页 |
| 高   | > 200    | 首页、核心链路 | 必须缓存/读模型、水平扩展      |

**必评估 QPS**：大表、流水、订单、日志、高频列表。其余可默认「低」。

### 10.3 大表名单（默认按大表设计）

订单、流水（支付/钱包/积分）、操作日志、明细表、历史表、消息表。

### 10.4 数据量级

| 级别 | 数据量           | 要求                              |
| ---- | ---------------- | --------------------------------- |
| D1   | < 10 万          | offset 分页可接受                 |
| D2   | 10 万 ~ 100 万   | 索引、禁止全表扫描                |
| D3   | 100 万 ~ 1000 万 | 禁止 offset > 5000、游标/时间分页 |
| D4   | > 1000 万        | 分表、读写分离、ES、归档          |

### 10.5 禁止项

- offset > 5000
- order by 非索引字段
- 大表 `like %xxx%`（buildStringFilter 用 contains，大表慎用）
- 单接口返回 > 1000 条（导出须分页或异步）

### 10.6 流水表

只允许 insert，禁止 update/delete。查询必须带时间范围。如需状态修正，仅允许新增「状态/修正原因」等审计字段，禁止改金额等核心字段。

### 10.7 升级红线

单表 > 500 万、QPS > 200、P95 > 500ms、全表扫描、offset > 5000。

### 10.8 PR 必答

- QPS 档位（低/中/高）
- 是否大表
- 数据量预估
- 是否命中索引 / 深分页
- 翻 10 倍后的升级方案

---

## 🛡️ 11. 安全与稳定性规范

### 11.1 幂等性（P0）

支付/下单/创建类接口必须幂等。实现：唯一约束、Redis SetNX、分布式锁、状态机。

### 11.2 防重复提交（P0）

表单/下单等短时拦截。后端 Redis 记录 `userId+业务key`，TTL 3–5 秒。

### 11.3 敏感数据脱敏（P0）

日志和接口返回禁止明文：手机号、身份证、银行卡、密码。脱敏示例：`138****1234`。

### 11.4 限流（P1）

高 QPS 接口必须限流。维度：IP、用户、接口。实现：令牌桶、Nginx、Gateway、Redis。

### 11.5 调用超时与弱依赖（P1）

RPC/HTTP 必须设超时（如 3–5s）。非核心依赖做弱依赖：超时/失败不影响主流程。

### 11.6 熔断与降级（P2）

下游异常/超时比例高时熔断。降级：默认值、缓存、简化逻辑。重点：支付、短信、第三方 API。

### 11.7 错误信息隐藏（P1）

生产环境不向前端返回堆栈、SQL、内部路径。统一错误码 + 通用文案，详情写日志。

### 11.8 参数白名单（P2）

orderBy、where 条件白名单，禁止前端随意传入任意字段。防注入、控性能。

### 11.9 签名防篡改（P2）

金额等关键字段签名（参数+时间戳+密钥）。支付/资金类接口建议使用。

### 11.10 可观测性（P3）

核心接口监控：QPS、P95 耗时、错误率。日志含 traceId、userId、关键参数（脱敏）。

---

## 🏢 12. 多租户与接口分类

Backend 同时服务 **Admin 后台**（system/_）与 **Miniapp 小程序**（client/_）。接口分为「按租户隔离」与「不按租户隔离」两类，新增/修改接口时必须先区分并标明。

### 12.1 三种接口类型

| 类型               | 说明                                                                                                                  | 示例                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **TenantScoped**   | 数据按当前租户隔离；租户来自请求头 `tenant-id` 或登录态；Repository 用 BaseRepository/SoftDeleteRepository 自动过滤。 | 用户/角色/部门列表；小程序的订单、购物车、商品、钱包。 |
| **PlatformOnly**   | 不按租户隔离，仅平台或超管可调；必须配 `RequirePermission` 或角色校验。                                               | 租户管理、租户套餐、同步字典、监控。                   |
| **TenantAgnostic** | 不依赖当前登录租户；租户由参数或返回值决定。                                                                          | `client/location/match-tenant`、`nearby-tenants`。     |

### 12.2 路径与调用方约定

- **system/tenant、system/tenant-package** → 一律 **PlatformOnly**。
- **client/location** 下「根据坐标/位置解析或列出租户」的接口 → **TenantAgnostic**。
- **client/** 下订单、购物车、商品、钱包等 → **TenantScoped**（租户来自 header 或 body，与前端约定一致）。
- **system/** 下其余业务（用户、角色、部门等）→ **TenantScoped**。

### 12.3 标明方式（必做）

- 在 Controller 类或方法上用 JSDoc 标明：`/** @tenantScope TenantScoped */` 或 `PlatformOnly` 或 `TenantAgnostic`。
- 与路径约定不一致时必须在类或方法上显式注释。

### 12.4 新增接口前自检

1. 主要调用方：admin / miniapp / both？
2. 是否按租户隔离？→ 是则 TenantScoped，否则 PlatformOnly 或 TenantAgnostic。
3. PlatformOnly 是否已加权限？
4. Miniapp 且 TenantScoped 时，租户来源是 header 还是 body/query？在注释或文档写明。

### 12.5 数据层要求

- 租户内接口：访问租户隔离表必须通过继承 BaseRepository/SoftDeleteRepository 的 Repository；禁止手写 `prisma.xxx.findMany()` 且不加租户条件（除非显式跨租户且已加权限）。
- 创建租户隔离数据：禁止由前端传入 `tenantId` 落库；从 `TenantContext.getTenantId()` 或 `this.cls.get('tenantId')` 取。
- 跨租户/平台查询：用项目约定的忽略租户机制（如 TenantContext.run + setIgnoreTenant），并做权限校验。

---

## 📁 13. Client 与能力域模块职责划分

**通用原则**：`client` 目录 = 小程序 C 端接口全集；能力域目录 = Service、Repository、规则配置，仅通过 admin 暴露配置接口，C 端能力由 `client` 薄 Controller 调用。

### 13.1 通用职责约定

| 角色       | 目录               | 职责                                                                                           | 路径约定           |
| ---------- | ------------------ | ---------------------------------------------------------------------------------------------- | ------------------ |
| **Client** | `module/client/`   | 所有 `client/*` 的 Controller，包含各能力域的 C 端接口（薄 Controller，调用能力域 Service）    | `client/*`         |
| **能力域** | `module/{domain}/` | Service、Repository、规则配置；仅提供 `admin/{domain}/*` 配置接口；**禁止**直接暴露 `client/*` | `admin/{domain}/*` |

适用于：marketing、finance、store 等可被 C 端调用的能力域。依赖方向：`client` → 能力域，**禁止**能力域 → client。

### 13.2 强制规则（通用）

- **client 下必须包含**：所有 `client/*` 路径的 Controller，包括各能力域的 C 端接口。
- **能力域下禁止**：直接使用 `@Controller('client/*')`。C 端能力通过 Service 对外提供，由 `module/client/{domain}/` 的 Controller 调用。
- **依赖方向**：`client` → 能力域，禁止能力域依赖 client。

### 13.3 能力域清单与路径（按需扩展）

| 能力域                            | 目录                | admin 路径          | client 子路径        |
| --------------------------------- | ------------------- | ------------------- | -------------------- |
| Marketing                         | `module/marketing/` | `admin/marketing/*` | `client/marketing/*` |
| （未来可扩展 finance、wallet 等） | —                   | —                   | —                    |

### 13.4 以 Marketing 为例的目录结构

```
module/client/
├── auth/          # 登录、会员认证
├── user/          # 用户信息
├── order/         # 订单
├── cart/          # 购物车
├── product/       # 商品
├── marketing/     # C 端营销接口（薄 Controller，调用 marketing Service）
│   ├── coupon/    # 领券、我的优惠券
│   └── points/    # 签到、积分账户、积分任务
├── ...
└── client.module.ts

module/marketing/
├── coupon/        # 优惠券 Service、Repository、admin 配置接口
├── points/        # 积分 Service、Repository、admin 配置接口
├── integration/   # 订单优惠计算 Service（供 order 调用）
└── ...
```

### 13.5 新增 C 端能力域接口时（通用流程）

1. 在 `module/client/{能力域}/` 下新增或扩展 Controller。
2. 注入并调用对应能力域模块导出的 Service。
3. 路径使用 `client/{能力域}/xxx`，守卫使用 `MemberAuthGuard`，装饰器使用 `@Member()`。

### 13.6 Marketing 迁移指引

若当前 C 端营销接口仍在 `module/marketing` 中，需将 Controller 迁移至 `module/client/marketing/`，使结构符合本节约定。

---

## 🏛️ 14. 架构守护规则

### 14.1 模块依赖方向 (必须遵守)

模块间依赖必须遵循以下方向，禁止反向依赖：

```
client → [finance, marketing, store, pms] → common
              ↓
           admin (仅配置接口)
```

| 允许                                      | 禁止                             |
| ----------------------------------------- | -------------------------------- |
| `client` 调用 `finance.CommissionService` | `finance` 调用 `client` 任何服务 |
| `store` 调用 `pms.ProductService`         | `pms` 调用 `store` 任何服务      |
| 任何模块调用 `common`                     | `common` 调用业务模块            |

**跨模块通信方式**:

- ✅ 通过 Module exports 的 Service
- ✅ 通过事件 (EventEmitter2)
- ❌ 直接 import 其他模块内部文件

### 14.2 Service 复杂度限制

| 指标             | 阈值     | 超限处理           |
| ---------------- | -------- | ------------------ |
| Service 文件行数 | ≤ 300 行 | 必须拆分           |
| 单个方法行数     | ≤ 50 行  | 提取私有方法或拆分 |
| 构造函数依赖数   | ≤ 6 个   | 考虑拆分职责       |
| 圈复杂度         | ≤ 15     | 简化逻辑或拆分     |

**拆分示例**:

```typescript
// ❌ 错误: 500+ 行的 God Class
@Injectable()
export class CommissionService {
  // 10+ 职责混在一起
}

// ✅ 正确: 按职责拆分
@Injectable()
export class CommissionCalculator {} // 计算逻辑
@Injectable()
export class CommissionSettler {} // 结算逻辑
@Injectable()
export class CommissionValidator {} // 校验逻辑
@Injectable()
export class CommissionService {
  // 门面，协调上述服务
  constructor(
    private calculator: CommissionCalculator,
    private settler: CommissionSettler,
    private validator: CommissionValidator,
  ) {}
}
```

### 14.3 禁止的代码模式 (PR 必查)

| 模式                                  | 问题          | 替代方案                |
| ------------------------------------- | ------------- | ----------------------- |
| 循环内单条查询                        | N+1 性能问题  | `WHERE IN` 批量查询     |
| `offset > 5000`                       | 深分页性能差  | 游标分页 / 时间范围分页 |
| 事务内调用外部 API                    | 事务超时/死锁 | 事务外调用，补偿机制    |
| 直接 `prisma.xxx.findMany()` 不加租户 | 数据泄露      | 使用 Repository         |
| 硬编码配置值                          | 难以修改      | 使用 ConfigService      |
| Service 超过 300 行                   | 难以维护      | 拆分职责                |

**N+1 检测示例**:

```typescript
// ❌ 禁止: 循环内查询
for (const item of order.items) {
  const sku = await this.prisma.pmsTenantSku.findUnique({ where: { id: item.skuId } });
}

// ✅ 正确: 批量查询
const skuIds = order.items.map((item) => item.skuId);
const skus = await this.prisma.pmsTenantSku.findMany({ where: { id: { in: skuIds } } });
const skuMap = new Map(skus.map((s) => [s.id, s]));
```

### 14.4 架构守护自动化 (建议)

可通过以下方式自动检测架构违规：

- ESLint 规则检测循环依赖
- 自定义脚本检测 Service 行数
- PR 模板强制填写架构影响

---

## 📊 15. SLO (服务级别目标) 规范

### 15.1 核心概念

| 术语         | 定义             | 示例                                |
| ------------ | ---------------- | ----------------------------------- |
| **SLI**      | 服务级别指标     | P99 延迟、错误率、可用性            |
| **SLO**      | 服务级别目标     | P99 < 500ms、可用性 99.9%           |
| **错误预算** | 允许的不达标时间 | 99.9% 可用 = 每月最多 43 分钟不可用 |

### 15.2 接口 SLO 分级

| 接口类别      | 可用性 | P99 延迟 | 错误率  | 示例接口                     |
| ------------- | ------ | -------- | ------- | ---------------------------- |
| **支付/资金** | 99.99% | ≤ 200ms  | < 0.01% | 支付回调、提现、佣金结算     |
| **核心交易**  | 99.9%  | ≤ 500ms  | < 0.1%  | 下单、佣金计算、库存扣减     |
| **列表查询**  | 99.5%  | ≤ 1000ms | < 0.5%  | 商品列表、订单列表、会员列表 |
| **后台管理**  | 99%    | ≤ 2000ms | < 1%    | 报表、配置、日志查询         |

### 15.3 新接口 SLO 声明 (必做)

新增接口时，必须在 Controller 注释中声明 SLO 类别：

```typescript
/**
 * 佣金结算
 * @sloCategory payment (支付/资金级别)
 * @sloLatency P99 < 200ms
 */
@Post('settle')
async settleCommission() { }

/**
 * 佣金列表查询
 * @sloCategory list (列表查询级别)
 * @sloLatency P99 < 1000ms
 */
@Get('list')
async getCommissionList() { }
```

### 15.4 SLO 违规处理

| P99 延迟超标程度 | 处理方式                |
| ---------------- | ----------------------- |
| 超标 < 20%       | 记录 TODO，下个迭代优化 |
| 超标 20-50%      | 当前迭代必须优化        |
| 超标 > 50%       | 阻塞上线，立即修复      |

### 15.5 PR 必答 (SLO 相关)

新增/修改接口时，PR 描述需包含：

- SLO 类别 (payment / core / list / admin)
- 预估 P99 延迟
- 是否有性能风险 (大表、复杂计算、外部调用)

---

## 🔧 16. 技术债管理规范

### 16.1 技术债分类

| 类型       | 定义                   | 示例                          | 优先级 |
| ---------- | ---------------------- | ----------------------------- | ------ |
| **架构债** | 架构设计导致的长期成本 | God Class、循环依赖、模块耦合 | P0     |
| **代码债** | 代码质量问题           | any、魔法数字、重复代码       | P1     |
| **测试债** | 测试覆盖不足           | 核心逻辑无单测、边界未覆盖    | P1     |
| **文档债** | 文档缺失或过时         | 注释与代码不符、README 过期   | P2     |
| **依赖债** | 依赖版本过时           | 安全漏洞、版本漂移            | P1     |

### 16.2 技术债记录格式

在代码中使用统一格式标记技术债：

```typescript
// TECH-DEBT: [类型] [优先级] [预估工时] 描述
// 示例:
// TECH-DEBT: [架构债] [P0] [3d] CommissionService 超过 500 行，需拆分为 Calculator/Settler/Validator
// TECH-DEBT: [代码债] [P1] [2h] 此处使用 any，需定义正确类型
// TECH-DEBT: [测试债] [P1] [4h] calculateCommission 方法缺少单元测试
```

### 16.3 技术债偿还策略

| 策略         | 时间分配           | 适用场景                   |
| ------------ | ------------------ | -------------------------- |
| **持续偿还** | 每 Sprint 20% 时间 | 常规迭代，债务可控         |
| **集中偿还** | 专门 Sprint        | 债务积累严重，影响开发效率 |
| **顺带偿还** | 改动文件时顺手修   | 小型债务，改动成本低       |

### 16.4 PR 技术债检查 (必做)

PR 时必须回答以下问题：

- [ ] 本次改动是否引入新技术债？如有，已标记 `TECH-DEBT` 注释
- [ ] 本次改动是否顺带偿还了已有技术债？如有，删除对应 `TECH-DEBT` 注释
- [ ] 改动文件中是否有 P0 技术债？如有，是否有计划处理

### 16.5 技术债红线

以下情况必须立即处理，不允许合并：

- 引入循环依赖
- Service 超过 500 行且无拆分计划
- 核心资金逻辑无单元测试
- 安全漏洞 (依赖债)

---

## 🚀 17. 开发者体验 (DX) 规范

### 17.1 本地开发环境目标

| 指标           | 目标值   | 说明                |
| -------------- | -------- | ------------------- |
| 首次启动时间   | < 5 分钟 | 从 clone 到服务启动 |
| 热重载生效时间 | < 3 秒   | 代码修改到生效      |
| 单模块测试时间 | < 30 秒  | 运行单个模块的测试  |
| 全量测试时间   | < 5 分钟 | 运行所有测试        |

### 17.2 新人 Onboarding 检查清单

新人应能在 **1 个工作日内** 完成以下任务：

- [ ] 克隆代码并安装依赖
- [ ] 启动本地开发环境 (数据库、Redis、后端服务)
- [ ] 运行并通过所有测试
- [ ] 理解项目结构和核心模块
- [ ] 完成一个简单的 Bug 修复 PR

如果做不到，说明 DX 有问题，需要改进文档或工具。

### 17.3 减少认知负荷

| 做法           | 原因         | 示例                                   |
| -------------- | ------------ | -------------------------------------- |
| 统一命名规范   | 减少记忆负担 | Service/Repository/Controller 命名一致 |
| 提供代码模板   | 减少决策疲劳 | 新模块可复制 `system/user` 结构        |
| 完善 README    | 减少问人次数 | 每个模块有简要说明                     |
| 自动化重复任务 | 减少手动操作 | 脚本生成 DTO/VO                        |

### 17.4 代码可读性要求

| 要求           | 说明                                                |
| -------------- | --------------------------------------------------- |
| 方法命名清晰   | 看名字就知道做什么，如 `calculateL1Commission`      |
| 复杂逻辑有注释 | 业务规则、算法、边界条件需注释                      |
| 魔法数字用常量 | `14 * 24 * 60 * 60 * 1000` → `SETTLE_DAYS * DAY_MS` |
| 长方法要拆分   | 超过 50 行考虑提取子方法                            |

---

## 18. 文档编写规范

### 18.1 模块文档要求

每个模块必须包含完整的文档，确保代码和文档同步更新。

**必需文档**：

- 需求文档（`docs/requirements/{模块路径}/`）
- 设计文档（`docs/design/{模块路径}/`）

**文档内容要求**：

- 需求文档：用例图、活动图、状态图（若有状态流转）
- 设计文档：类图、时序图、组件图、部署图、状态图（若适用）
- 缺陷分析：P0-P3优先级分类，每个缺陷包含现状、影响、建议

**文档命名规范**：

- 文件名：小写+连字符（如 `user-requirements.md`）
- 目录名：与 `src/module/` 结构对齐
- 示例：`docs/requirements/admin/system/user/user-requirements.md`

### 18.2 文档更新时机

**必须更新文档**（阻塞PR）：

- 新增模块或功能
- 重大功能变更（如改变业务流程）
- 架构调整（如拆分Service、改变依赖关系）
- 接口变更（路径、参数、响应格式）
- 数据模型变更（新增表、修改字段、改变关系）

**建议更新文档**（PR中说明）：

- 性能优化（如添加索引、引入缓存）
- 重要缺陷修复（如修复P0/P1缺陷）
- 代码重构（如拆分God Class、优化算法）

**无需更新文档**：

- 代码格式调整
- 注释修改
- 小型bug修复
- 日志优化

### 18.3 文档质量标准

**基本要求**（必须满足）：

- 术语统一（同一概念使用同一术语）
- 逻辑严谨（因果关系清晰，无矛盾）
- 图文一致（图表与文字描述一致）
- 格式规范（遵循 `.kiro/steering/documentation.md`）

**高级要求**（优秀文档）：

- 缺陷分析深入（识别P0-P3缺陷，提供改进建议）
- 性能指标明确（QPS、P99延迟、数据量级）
- 扩展性考虑（预留扩展点，说明扩展方案）
- 最佳实践总结（提炼可复用的模式和经验）

### 18.4 文档与代码同步

**开发流程**：

1. 设计阶段：编写需求文档和设计文档
2. 开发阶段：按照文档实现代码
3. 测试阶段：验证实现与文档一致
4. Review阶段：检查文档与代码同步
5. 上线后：根据实际情况更新文档

**同步检查**：

- PR时检查文档是否更新
- 接口变更必须更新文档
- 缺陷修复后更新缺陷分析
- 定期review文档准确性

### 18.5 文档Review清单

PR时必须检查以下项目：

**结构完整性**：

- [ ] 包含所有必需章节
- [ ] 包含所有必需图表
- [ ] 章节编号正确

**内容准确性**：

- [ ] 接口路径、参数、响应与代码一致
- [ ] 数据模型与Prisma schema一致
- [ ] 业务流程与代码逻辑一致
- [ ] 缺陷分析与实际代码一致

**规范遵循**：

- [ ] 文件名小写+连字符
- [ ] 目录归类正确
- [ ] Mermaid使用纯ASCII字符
- [ ] 缺陷分析有优先级

### 18.6 文档编写工具和流程

**推荐工具**：

- Mermaid：绘制图表
- Markdown编辑器：编写文档
- Git：版本管理

**批量编写流程**：

- 参考：`.kiro/steering/documentation-workflow.md`
- 第一个模块建立标准（约2小时）
- 后续模块复用标准（约30-45分钟）
- 每5-10个模块验收一次

**效率提升**：

- 使用标准模板
- 批量读取文件
- 分段写入文档
- 简洁的提示词（"继续"）

---

## 19. 文档驱动开发（DDD - Documentation Driven Development）

### 19.1 核心理念

文档先行，代码跟随。通过编写文档来驱动设计和开发，确保：

- 设计充分思考
- 接口定义清晰
- 团队理解一致
- 代码质量可控

### 19.2 开发流程

**1. 需求阶段**：

- 编写需求文档
- 明确功能范围
- 定义验收标准
- 识别非功能需求

**2. 设计阶段**：

- 编写设计文档
- 设计架构和模块
- 定义接口和数据模型
- 识别技术风险

**3. Review阶段**：

- 团队review文档
- 讨论设计方案
- 识别潜在问题
- 达成一致理解

**4. 开发阶段**：

- 按照文档实现
- 保持文档同步
- 遇到问题更新文档
- 记录设计决策

**5. 测试阶段**：

- 按照验收标准测试
- 验证实现与文档一致
- 更新缺陷分析
- 补充测试用例

### 19.3 优势

**设计质量**：

- 提前发现设计问题
- 充分思考边界情况
- 避免返工

**团队协作**：

- 统一理解
- 减少沟通成本
- 便于并行开发

**代码质量**：

- 接口定义清晰
- 职责划分明确
- 易于维护

**知识沉淀**：

- 设计决策有记录
- 新人快速上手
- 便于回顾和改进

### 19.4 注意事项

**避免过度设计**：

- 文档要适度，不要过于详细
- 重点关注核心流程和关键决策
- 细节可以在代码中体现

**保持文档同步**：

- 代码变更时及时更新文档
- 定期review文档准确性
- 使用版本管理追踪变更

**平衡文档和代码**：

- 文档是辅助，代码是核心
- 不要为了文档而文档
- 文档要服务于开发和维护

---

## 20. 第三方 API 对接规范（必做）

> 核心思想：**文档先行** + **Adapter/Port 模式** + **韧性设计** + **务实类型安全** + **正确的 DI Mock**。配置管理是支撑，不是核心。

### 20.0 对接前置要求（强制）

#### 文档先行

对接任何第三方 API 前，**必须先查阅官方文档**，禁止凭经验或猜测编写对接代码：

- 阅读官方 API 文档，确认：接口地址、请求/响应格式、签名方式、错误码、频率限制
- 如有 SDK，优先评估官方 SDK 是否适用（质量、维护状态、NestJS 兼容性）
- 将关键文档链接记录在 Adapter 文件头部注释中

```typescript
/**
 * 微信支付 Adapter
 * @see https://pay.weixin.qq.com/doc/v3/merchant/4012791858
 * @see https://pay.weixin.qq.com/doc/v3/merchant/4012068813 (回调通知)
 */
@Injectable()
export class WechatPayAdapter extends PaymentPort { ... }
```

#### 务实类型安全

第三方返回的数据结构**不完全可控**（可能多字段、少字段、类型不一致），类型策略需务实：

| 层级                           | 策略     | 说明                                                                                                   |
| ------------------------------ | -------- | ------------------------------------------------------------------------------------------------------ |
| Port 出入参                    | 严格类型 | 这是我们自己定义的契约，必须精确                                                                       |
| Adapter 内部（第三方原始响应） | 宽松类型 | 用 `Pick` 只取需要的字段，或定义 `RawXxxResponse` 仅覆盖用到的字段，**不要**试图完整映射第三方所有字段 |
| Adapter → Port 的转换          | 显式映射 | 在 Adapter 内做 `raw → 我方类型` 的转换，隔离第三方数据结构变化                                        |

```typescript
// ✅ 务实：只定义我们用到的字段，其余不管
interface RawWechatOrderResponse {
  prepay_id: string;
  // 微信实际返回更多字段，但我们只用 prepay_id，不需要全部定义
  [key: string]: unknown; // 允许额外字段存在
}

// ✅ Port 出参是我们自己的类型，严格定义
interface CreateOrderResult {
  prepayId: string;
}

// Adapter 内做转换
async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const { data } = await firstValueFrom(this.httpService.post<RawWechatOrderResponse>(url, body));
  return { prepayId: data.prepay_id }; // raw → 我方类型
}
```

```typescript
// ❌ 过度：试图完整定义第三方所有字段，第三方一改就炸
interface WechatOrderResponse {
  prepay_id: string;
  return_code: string;
  return_msg: string;
  appid: string;
  mch_id: string;
  nonce_str: string;
  sign: string;
  result_code: string;
  trade_type: string;
  // ... 20+ 字段，维护成本高，第三方新增字段时 TS 不报错但也没意义
}

// ❌ 摆烂：直接 any
const { data } = await this.httpService.post(url, body); // data: any
```

### 20.1 架构：Adapter/Port 模式（强制）

所有第三方 API 必须通过 **抽象接口（Port）** + **具体实现（Adapter）** 隔离。业务层只依赖 Port，不依赖具体第三方 SDK。

```
业务 Service → Port (abstract) ← Adapter (具体实现)
                                    ↑
                              HttpService / SDK
```

**Port 定义**（abstract class，便于 NestJS DI）：

```typescript
// ports/payment.port.ts
export abstract class PaymentPort {
  abstract createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;
  abstract queryOrder(outTradeNo: string): Promise<OrderQueryResult>;
  abstract refund(params: RefundParams): Promise<RefundResult>;
  abstract verifyCallback(headers: Record<string, string>, body: string): Promise<CallbackPayload>;
}
```

**Adapter 实现**：

```typescript
// adapters/wechat-pay.adapter.ts
@Injectable()
export class WechatPayAdapter extends PaymentPort {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const config = this.getConfig();
    const { data } = await firstValueFrom(
      this.httpService.post(
        'https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi',
        {
          appid: config.appId,
          mchid: config.mchId,
          description: params.description,
          out_trade_no: params.outTradeNo,
          amount: { total: params.amountInCents, currency: 'CNY' },
          notify_url: config.notifyUrl,
        },
        { headers: this.buildHeaders(config) },
      ),
    );
    return { prepayId: data.prepay_id };
  }

  // ... 其他方法
}
```

**Module 注册**（关键：用 Port token 注册 Adapter）：

```typescript
// payment.module.ts
@Module({
  imports: [HttpModule.register({ timeout: 5000 })],
  providers: [
    {
      provide: PaymentPort, // ← token 是抽象类
      useClass: WechatPayAdapter, // ← 实现是具体 Adapter
    },
    OrderService,
  ],
  exports: [PaymentPort],
})
export class PaymentModule {}
```

**业务 Service 只注入 Port**：

```typescript
@Injectable()
export class OrderService {
  constructor(private readonly payment: PaymentPort) {} // ← 不知道具体实现

  async createOrder(dto: CreateOrderDto) {
    const result = await this.payment.createOrder({ ... });
    return Result.ok(result);
  }
}
```

### 20.2 HTTP 客户端层（强制使用 HttpModule）

禁止直接使用 `axios`/`fetch`/`got`。统一使用 NestJS `HttpModule` + `HttpService`（基于 axios，但纳入 DI 体系）。

```typescript
// 在 Adapter 所在 Module 中注册
imports: [
  HttpModule.register({
    timeout: 5000,
    maxRedirects: 3,
  }),
],
```

Adapter 中使用 `HttpService`，配合 `firstValueFrom` 转 Promise：

```typescript
import { firstValueFrom } from 'rxjs';

const { data } = await firstValueFrom(this.httpService.post(url, body, { headers }));
```

### 20.3 韧性设计（P0 级第三方必做）

| 机制 | 适用场景             | 实现方式                                 |
| ---- | -------------------- | ---------------------------------------- |
| 超时 | 所有外部调用         | `HttpModule.register({ timeout: 5000 })` |
| 重试 | 幂等读操作、网络抖动 | RxJS `retry` + 指数退避                  |
| 熔断 | 下游持续异常         | 简易计数器 / `opossum` 库                |
| 降级 | 非核心依赖失败       | 返回缓存/默认值，不阻塞主流程            |

**重试示例**（指数退避）：

```typescript
import { retry, timer } from 'rxjs';

const { data } = await firstValueFrom(
  this.httpService.get(url).pipe(
    retry({
      count: 3,
      delay: (error, retryCount) => timer(Math.pow(2, retryCount) * 1000), // 2s, 4s, 8s
      resetOnSuccess: true,
    }),
  ),
);
```

**降级示例**：

```typescript
async getExchangeRate(currency: string): Promise<number> {
  try {
    return await this.rateAdapter.getRate(currency);
  } catch {
    this.logger.warn(`汇率服务不可用，使用缓存值: ${currency}`);
    return this.cacheManager.get(`rate:${currency}`) ?? DEFAULT_RATES[currency];
  }
}
```

### 20.4 配置管理（支撑层）

配置通过 `ConfigService` + `.env` 管理，启动时校验必填项：

```typescript
// 在 Adapter 构造函数或 onModuleInit 中校验
onModuleInit() {
  const required = ['WECHAT_PAY_APP_ID', 'WECHAT_PAY_MCH_ID', 'WECHAT_PAY_API_KEY'];
  for (const key of required) {
    BusinessException.throwIf(!this.configService.get(key), `缺少配置: ${key}`);
  }
}
```

`.env.example` 必须包含所有第三方配置项（含注释说明获取方式）。

### 20.5 测试：Mock 依赖而非 Service 本身（强制）

核心原则：**测试 OrderService 时，mock 它的依赖 PaymentPort，而不是 mock OrderService 本身**。

```typescript
// ✅ 正确：mock 依赖（PaymentPort），测试真实的 OrderService 逻辑
describe('OrderService', () => {
  let orderService: OrderService;
  let mockPayment: jest.Mocked<PaymentPort>;

  beforeEach(async () => {
    mockPayment = {
      createOrder: jest.fn(),
      queryOrder: jest.fn(),
      refund: jest.fn(),
      verifyCallback: jest.fn(),
    } as any;

    const module = await Test.createTestingModule({
      providers: [
        OrderService, // ← 真实 Service
        { provide: PaymentPort, useValue: mockPayment }, // ← mock 依赖
      ],
    }).compile();

    orderService = module.get(OrderService);
  });

  it('should create order and return prepayId', async () => {
    mockPayment.createOrder.mockResolvedValue({ prepayId: 'px_123' });

    const result = await orderService.createOrder({ amount: 100, description: '测试' });

    expect(result.data.prepayId).toBe('px_123');
    expect(mockPayment.createOrder).toHaveBeenCalledWith(expect.objectContaining({ amount: 100 }));
  });

  it('should throw BusinessException when payment fails', async () => {
    mockPayment.createOrder.mockRejectedValue(new Error('NETWORK_ERROR'));

    await expect(orderService.createOrder({ amount: 100 })).rejects.toThrow(BusinessException);
  });
});
```

```typescript
// ❌ 错误：mock 了 Service 本身，测试的是 mock 而不是业务逻辑
const module = await Test.createTestingModule({
  providers: [
    { provide: OrderService, useValue: mockOrderService }, // ← 这测了个寂寞
  ],
}).compile();
```

**测试 Adapter 本身**时，mock `HttpService`：

```typescript
describe('WechatPayAdapter', () => {
  let adapter: WechatPayAdapter;
  let mockHttpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WechatPayAdapter,
        { provide: HttpService, useValue: { post: jest.fn(), get: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-value') } },
      ],
    }).compile();

    adapter = module.get(WechatPayAdapter);
    mockHttpService = module.get(HttpService);
  });

  it('should call wechat API with correct params', async () => {
    mockHttpService.post.mockReturnValue(of({ data: { prepay_id: 'px_123' } }) as any);

    const result = await adapter.createOrder({ amountInCents: 100, outTradeNo: 'T001' });

    expect(result.prepayId).toBe('px_123');
    expect(mockHttpService.post).toHaveBeenCalledWith(
      expect.stringContaining('weixin.qq.com'),
      expect.objectContaining({ amount: { total: 100 } }),
      expect.any(Object),
    );
  });
});
```

### 20.6 Webhook / 回调处理（强制）

第三方回调（如支付通知、退款通知）必须满足：

| 要求     | 说明                                                    |
| -------- | ------------------------------------------------------- |
| 签名验证 | 先验签再处理，验签失败直接返回错误                      |
| 幂等处理 | 同一通知可能重复推送，用唯一标识（如 outTradeNo）做幂等 |
| 异步处理 | 回调 Controller 只做验签 + 入队，业务逻辑异步处理       |
| 快速响应 | 5 秒内返回成功，避免第三方重试风暴                      |

```typescript
// payment-callback.controller.ts
@Controller('payment')
export class PaymentCallbackController {
  @Post('notify')
  async handleNotify(@Headers() headers: Record<string, string>, @Body() body: string) {
    // 1. 验签（通过 Port 调用 Adapter 的验签逻辑）
    const payload = await this.payment.verifyCallback(headers, body);

    // 2. 幂等检查
    const processed = await this.redis.get(`pay:notify:${payload.outTradeNo}`);
    if (processed) return { code: 'SUCCESS', message: '已处理' };

    // 3. 异步处理业务（EventEmitter 或 Queue）
    this.eventEmitter.emit('payment.success', payload);

    // 4. 标记已处理 + 快速返回
    await this.redis.set(`pay:notify:${payload.outTradeNo}`, '1', 'EX', 86400);
    return { code: 'SUCCESS', message: 'OK' };
  }
}
```

### 20.7 TODO 标记（精简格式）

暂未对接的第三方 API 使用统一格式：

```typescript
// TODO: [第三方] 对接微信退款 API | P1 | 3d | Issue #123
```

格式：`TODO: [第三方] 描述 | 优先级 | 预估工时 | Issue 编号`

方法体内用注释占位：

```typescript
async refundOrder(orderId: string) {
  // TODO: [第三方] 调用 this.payment.refund() | P1 | 2d | Issue #456
  // 当前：仅更新数据库状态
  await this.orderRepo.update(orderId, { status: OrderStatus.REFUND_PENDING });
}
```

### 20.8 PR 检查清单

| 检查项                                                    | 必须         |
| --------------------------------------------------------- | ------------ |
| Port（抽象类）已定义                                      | ✅           |
| Adapter 实现 Port，注入 HttpService                       | ✅           |
| Module 中用 `provide: Port, useClass: Adapter` 注册       | ✅           |
| 业务 Service 只注入 Port，不依赖具体 Adapter              | ✅           |
| 超时已配置（HttpModule.register）                         | ✅           |
| 幂等读操作有重试                                          | P0 级        |
| 回调接口有签名验证 + 幂等                                 | 有回调时     |
| 单测 mock 的是依赖（Port/HttpService），不是 Service 本身 | ✅           |
| `.env.example` 包含所有配置项                             | ✅           |
| TODO 标记含优先级和 Issue 编号                            | 未完成对接时 |

---

## 21. 测试跳过与 TODO 处理（§9 补充）

> 本节是 §9 测试规范的补充，聚焦于「跳过测试」和「未完成测试」的处理。

### 21.1 禁止 `it.skip()` / `describe.skip()`

跳过的测试会被遗忘、覆盖率虚高、隐藏问题。一律禁止。

### 21.2 替代方案

| 场景                            | 做法                                 |
| ------------------------------- | ------------------------------------ |
| 依赖未就绪（第三方 API 未对接） | `it.todo('描述 (原因, Issue #xxx)')` |
| 可以 mock 的                    | 写 mock 测试，正常运行               |
| 临时调试想跳过                  | 本地可以，但禁止提交到 PR            |

```typescript
// ✅ it.todo — 不运行，不影响覆盖率，但在报告中可见
it.todo('should call real Wechat API (需要沙箱环境, Issue #123)');

// ✅ mock 测试 — 正常运行
it('should handle payment failure', async () => {
  mockPayment.createOrder.mockRejectedValue(new Error('TIMEOUT'));
  await expect(orderService.createOrder(dto)).rejects.toThrow(BusinessException);
});

// ❌ 禁止提交
it.skip('should work', async () => { ... });
```

### 21.3 覆盖率要求

| 模块类型               | 最低覆盖率 | 说明                   |
| ---------------------- | ---------- | ---------------------- |
| 核心（订单/支付/佣金） | ≥ 80%      | 关键路径 + 边界 + 异常 |
| 非核心                 | ≥ 60%      | 主要功能即可           |

`it.todo()` 不计入覆盖率，但必须关联 Issue 跟踪。

---

**规范版本**: 1.3
**最后更新**: 2026-02-27
**变更记录**: §20 重写（Adapter/Port 模式 + 韧性设计 + 正确 Mock 模式）、§21 精简为 §9 补充
