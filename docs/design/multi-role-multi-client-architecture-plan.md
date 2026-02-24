# 多角色多端架构设计方案

> **编写日期**: 2026-02-24  
> **文档类型**: 架构规划文档（Plan）  
> **适用范围**: Backend NestJS 服务端 — 支撑 Admin 后台、C 端小程序/H5/App、劳动者端小程序/App  
> **参考文档**: [项目架构全方位分析报告](./architecture-comprehensive-analysis.md)

---

## 1. 背景与目标

### 1.1 背景

当前系统为 O2O 家政/上门服务平台，采用 NestJS Monorepo 单体架构，已上线：

- **Admin 后台**（Vue3）— 面向平台运营和门店管理员（`SysUser`）
- **C 端小程序**（UniApp，微信小程序 `MP_MALL`）— 面向消费者（`UmsMember`）

业务发展需要扩展到更多客户端和角色：

| 新增端         | 角色        | 载体                 | 说明                     |
| -------------- | ----------- | -------------------- | ------------------------ |
| C 端 H5        | 消费者      | 微信 H5 / 浏览器     | 分享裂变、非微信渠道获客 |
| C 端 App       | 消费者      | iOS / Android        | 高频用户留存、推送能力   |
| 劳动者端小程序 | 技师/劳动者 | 微信小程序 `MP_WORK` | 接单、排班、收入查看     |
| 劳动者端 App   | 技师/劳动者 | iOS / Android        | 实时定位上报、语音通话   |

### 1.2 目标

1. 设计一套**按角色组织、按客户端类型分发认证**的后端架构，使单一 NestJS 服务同时服务所有端
2. 明确现有架构的不足，给出具体改进方案
3. 提供竞品对标分析，确保功能覆盖度
4. 输出分阶段实施路线图

### 1.3 核心设计原则

- **按角色（Role）组织，不按客户端类型（Client Type）组织** — `admin/`、`client/`、`worker/` 三个 API 域
- **认证层用策略模式按 `clientType` 分发** — 业务 API 完全共享
- **单一 NestJS 进程** — 不引入 API Gateway 或 BFF，当前规模不需要
- **渐进式改造** — 不破坏现有功能，新增能力逐步叠加

---

## 2. 现有架构分析

### 2.1 当前模块全景

```
apps/backend/src/module/
├── admin/          # 后台管理 (SysUser) — 完整
├── client/         # C端消费者 (UmsMember) — 完整
├── worker/         # 劳动者 (SrvWorker) — ⚠️ 空目录
├── store/          # 门店管理 (admin 视角) — 完整
├── finance/        # 财务 (佣金/钱包/提现) — 完整
├── marketing/      # 营销 (积分/优惠券) — 完整
├── pms/            # 商品管理 (总部视角) — 完整
├── lbs/            # 位置服务 — 完整
├── risk/           # 风控 — 基础
├── common/         # 公共服务 (Redis/OSS/SMS) — 完整
├── main/           # 健康检查等 — 完整
└── backup/         # 数据备份 — 完整
```

### 2.2 当前认证体系

```
请求进入
  │
  ▼
ThrottlerGuard (限流)
  │
  ▼
JwtAuthGuard (admin 的 'jwt' 策略)
  │── 路径包含 /client/ → 直接放行，交给 MemberAuthGuard
  │── @notRequireAuth → 跳过
  │── 白名单 → 跳过
  └── 其他 → 验证 admin JWT
  │
  ▼
TenantGuard (租户上下文)
  │
  ▼
PermissionGuard (权限校验)
  │
  ▼
IdempotentGuard (幂等)
```

**关键问题**：

| 问题                      | 现状                                         | 影响                           |
| ------------------------- | -------------------------------------------- | ------------------------------ |
| Worker 路径无放行         | `JwtAuthGuard` 仅对 `/client/` 放行          | Worker 端接口无法独立认证      |
| 认证策略单一              | Client 仅支持微信小程序 `code2Session`       | H5 OAuth、App 短信登录无法接入 |
| `SocialPlatform` 枚举未用 | `MP_WORK`、`APP_MAIN` 已定义但代码中从未使用 | 多端标识形同虚设               |
| Worker 模块为空           | `module/worker/` 目录存在但无任何代码        | 劳动者端无 API 可用            |
| JWT Payload 信息不足      | 仅含 `uuid` + `memberId`                     | 无法区分客户端类型和角色       |
| WechatService 硬编码      | 只读一组 `wechat.appid/secret`               | 多小程序场景无法区分           |

### 2.3 数据模型关系

```
SysUser (admin)          UmsMember (consumer)         SrvWorker (worker)
  │                         │                            │
  │ 1:1                     │ 1:N                        │ N:1
  │                         │                            │
  └── admin JWT             ├── SysSocialUser            └── UmsMember
      (UserService)         │   (platform: MP_MALL)          (memberId)
                            │
                            ├── FinWallet
                            ├── FinCommission
                            └── OmsOrder
```

**关键关系**：

- `SrvWorker.memberId` → `UmsMember.memberId`（1:N，一个会员可在多个租户做技师）
- `SrvWorker` 有独立的 `tenantId`，与 `UmsMember.tenantId` 可能不同
- `SysSocialUser.platform` 枚举已预留 `MP_WORK`、`APP_MAIN`

---

## 3. 竞品分析

### 3.1 O2O 家政平台多端架构对标

| 功能维度               | 58到家/天鹅到家     | 美团到家      | 好慷在家 | e家洁 | 本系统              |
| ---------------------- | ------------------- | ------------- | -------- | ----- | ------------------- |
| **消费者端**           |                     |               |          |       |                     |
| 微信小程序             | ✅                  | ✅            | ✅       | ✅    | ✅                  |
| H5 (微信内/浏览器)     | ✅                  | ✅            | ✅       | ✅    | ❌                  |
| iOS/Android App        | ✅                  | ✅            | ✅       | ✅    | ❌                  |
| 手机号一键登录         | ✅                  | ✅            | ✅       | ✅    | ⚠️ 仅微信授权手机号 |
| 短信验证码登录         | ✅                  | ✅            | ✅       | ✅    | ❌                  |
| 微信 H5 OAuth          | ✅                  | ✅            | ✅       | ❌    | ❌                  |
| **劳动者/师傅端**      |                     |               |          |       |                     |
| 独立工作端 App         | ✅ (58到家工作端)   | ✅ (美团骑手) | ✅       | ✅    | ❌                  |
| 小程序工作端           | ✅                  | ⚠️            | ✅       | ❌    | ❌                  |
| 实时接单推送           | ✅                  | ✅            | ✅       | ✅    | ❌                  |
| 排班/日程管理          | ✅                  | ✅            | ✅       | ⚠️    | ⚠️ 仅数据模型       |
| 收入明细/提现          | ✅                  | ✅            | ✅       | ✅    | ❌                  |
| 实时位置上报           | ✅                  | ✅            | ⚠️       | ❌    | ❌                  |
| 服务核销/签到          | ✅                  | ✅            | ✅       | ✅    | ❌                  |
| **商家/管理后台**      |                     |               |          |       |                     |
| Web 管理后台           | ✅                  | ✅            | ✅       | ✅    | ✅                  |
| 派单/调度              | ✅ (智能派单)       | ✅ (智能调度) | ✅       | ✅    | ⚠️ 手动派单         |
| 多租户/多门店          | ✅                  | ✅            | ⚠️ 直营  | ❌    | ✅                  |
| **认证架构**           |                     |               |          |       |                     |
| 多端统一账号 (unionid) | ✅                  | ✅            | ✅       | ⚠️    | ⚠️ 有字段未用       |
| 角色隔离认证           | ✅                  | ✅            | ✅       | ✅    | ⚠️ 仅 admin/client  |
| 多登录方式             | ✅ (微信/手机/密码) | ✅            | ✅       | ✅    | ⚠️ 仅微信           |

### 3.2 竞品架构模式总结

**58到家/天鹅到家**（行业标杆）：

- 三端独立 App：用户端、工作端（师傅端）、商家端
- 工作端核心功能：接单、抢单、排班、收入、评价、培训
- 统一账号体系，手机号为主键，微信/支付宝为辅助登录
- 智能派单引擎：基于距离、评分、技能、负载的综合匹配

**美团到家**：

- 超级 App 内嵌模式，消费者通过美团 App 下单
- 骑手/服务者有独立 App
- 强大的 LBS 调度能力，实时位置追踪
- 多角色认证完全隔离，不同角色不同 JWT 签发逻辑

**好慷在家**：

- 直营模式，劳动者为公司员工
- 三端：用户端小程序/App、阿姨端 App、管理后台
- 标准化服务流程：培训 → 考核 → 上岗 → 服务 → 评价

### 3.3 差距总结

| 差距等级 | 差距描述                            | 影响                       |
| -------- | ----------------------------------- | -------------------------- |
| **P0**   | Worker 模块完全缺失，无劳动者端 API | 无法上线劳动者端           |
| **P0**   | 认证体系仅支持微信小程序一种方式    | H5/App 无法接入            |
| **P1**   | JWT Payload 无 clientType/role 信息 | 无法做端级别的差异化控制   |
| **P1**   | WechatService 不支持多小程序        | 劳动者小程序无法独立认证   |
| **P1**   | 无短信验证码登录                    | App 端无法登录             |
| **P2**   | 无智能派单引擎                      | 仅手动派单，效率低         |
| **P2**   | 无实时位置上报                      | 无法追踪服务进度           |
| **P3**   | 无 unionid 跨端账号合并             | 同一用户多端注册产生多账号 |

---

## 4. 架构设计方案

### 4.1 总体架构：按角色组织 + 策略模式认证

```
                    ┌─────────────────────────────────────────────┐
                    │              NestJS 单体服务                 │
                    │                                             │
  Admin Web ──────► │  /admin/*   ── AdminAuthGuard ── jwt        │
                    │      │                                      │
  C端小程序 ──────► │  /client/*  ── MemberAuthGuard ── member-jwt│
  C端 H5    ──────► │      │         (策略模式分发)               │
  C端 App   ──────► │      │                                      │
                    │      │                                      │
  劳动者小程序 ──► │  /worker/*  ── WorkerAuthGuard ── worker-jwt│
  劳动者 App ────► │      │         (策略模式分发)               │
                    │      │                                      │
                    │      ▼                                      │
                    │  ┌─────────────────────────────────┐        │
                    │  │     共享业务服务层               │        │
                    │  │  finance / marketing / pms /     │        │
                    │  │  store / lbs / risk / common     │        │
                    │  └─────────────────────────────────┘        │
                    └─────────────────────────────────────────────┘
```

### 4.2 认证策略模式设计

#### 4.2.1 策略接口

```typescript
// src/module/client/auth/strategies/client-auth-strategy.interface.ts

export interface IClientAuthStrategy {
  /** 策略标识 */
  readonly clientType: string;

  /** 执行登录/注册，返回 UmsMember */
  authenticate(dto: any): Promise<{
    member: UmsMember;
    isNew: boolean;
    socialUser?: SysSocialUser;
  }>;
}
```

#### 4.2.2 策略实现

| 策略类                   | clientType | 适用端       | 认证方式                |
| ------------------------ | ---------- | ------------ | ----------------------- |
| `WechatMpStrategy`       | `MP_MALL`  | C端小程序    | `code2Session` → openid |
| `WechatH5Strategy`       | `H5_MALL`  | C端 H5       | OAuth2.0 → openid       |
| `SmsStrategy`            | `APP_MAIN` | C端 App      | 短信验证码 → 手机号     |
| `WechatMpWorkerStrategy` | `MP_WORK`  | 劳动者小程序 | `code2Session` → openid |
| `SmsWorkerStrategy`      | `APP_WORK` | 劳动者 App   | 短信验证码 → 手机号     |

#### 4.2.3 策略工厂

```typescript
// src/module/client/auth/strategies/client-auth-strategy.factory.ts

@Injectable()
export class ClientAuthStrategyFactory {
  private strategies: Map<string, IClientAuthStrategy>;

  constructor(
    private wechatMp: WechatMpStrategy,
    private wechatH5: WechatH5Strategy,
    private sms: SmsStrategy,
  ) {
    this.strategies = new Map([
      ['MP_MALL', wechatMp],
      ['H5_MALL', wechatH5],
      ['APP_MAIN', sms],
    ]);
  }

  get(clientType: string): IClientAuthStrategy {
    const strategy = this.strategies.get(clientType);
    if (!strategy) throw new BusinessException(ResponseCode.PARAM_ERROR, `不支持的客户端类型: ${clientType}`);
    return strategy;
  }
}
```

#### 4.2.4 统一登录入口

```typescript
// 改造后的 AuthService.login()
async login(dto: UnifiedLoginDto) {
  const strategy = this.strategyFactory.get(dto.clientType);
  const { member, isNew } = await strategy.authenticate(dto);

  // 统一生成 JWT，payload 包含角色和客户端类型
  const token = await this.genToken(member, {
    clientType: dto.clientType,
    role: 'consumer',
  });

  return Result.ok({ token, isNew, userInfo: member });
}
```

### 4.3 JWT Payload 增强

```typescript
// 当前 payload
{
  uuid: string;
  memberId: string;
}

// 增强后 payload
{
  uuid: string;
  memberId: string; // 或 workerId (劳动者端)
  role: 'admin' | 'consumer' | 'worker';
  clientType: 'MP_MALL' | 'H5_MALL' | 'APP_MAIN' | 'MP_WORK' | 'APP_WORK';
  tenantId: string;
}
```

### 4.4 Guard 链改造

#### 4.4.1 JwtAuthGuard 修改

```typescript
// 当前：仅放行 /client/
if (req.path.includes('/client/')) {
  return true;
}

// 改造后：放行 /client/ 和 /worker/
if (req.path.includes('/client/') || req.path.includes('/worker/')) {
  return true;
}
```

#### 4.4.2 新增 WorkerAuthGuard

```typescript
// src/module/worker/common/guards/worker-auth.guard.ts
@Injectable()
export class WorkerAuthGuard extends AuthGuard('worker-jwt') {}
```

#### 4.4.3 新增 WorkerStrategy (Passport)

```typescript
// src/module/worker/auth/strategies/worker.strategy.ts
@Injectable()
export class WorkerStrategy extends PassportStrategy(Strategy, 'worker-jwt') {
  constructor(config: AppConfigService, redisService: RedisService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.jwt.secretkey,
    });
  }

  async validate(payload: { uuid: string; workerId: number; role: string }) {
    if (payload.role !== 'worker') throw new UnauthorizedException('非劳动者身份');
    const worker = await this.redisService.get(`${CacheEnum.LOGIN_TOKEN_KEY}${payload.uuid}`);
    if (!worker) throw new UnauthorizedException('登录已过期');
    return { ...worker, workerId: payload.workerId };
  }
}
```

### 4.5 WechatService 多小程序支持

```typescript
// 当前：硬编码单一 appid/secret
const appId = this.configService.get('wechat.appid');
const secret = this.configService.get('wechat.secret');

// 改造后：按 clientType 读取不同配置
// .env
WECHAT_MP_MALL_APPID=wx_consumer_appid
WECHAT_MP_MALL_SECRET=wx_consumer_secret
WECHAT_MP_WORK_APPID=wx_worker_appid
WECHAT_MP_WORK_SECRET=wx_worker_secret

// WechatService
async code2Session(code: string, platform: SocialPlatform = SocialPlatform.MP_MALL) {
  const { appId, secret } = this.getWechatConfig(platform);
  // ...
}

private getWechatConfig(platform: SocialPlatform) {
  const configMap = {
    [SocialPlatform.MP_MALL]: { appId: this.config.get('wechat.mpMall.appid'), secret: ... },
    [SocialPlatform.MP_WORK]: { appId: this.config.get('wechat.mpWork.appid'), secret: ... },
  };
  return configMap[platform] || configMap[SocialPlatform.MP_MALL];
}
```

---

## 5. Worker 模块设计

### 5.1 模块结构

```
src/module/worker/
├── auth/
│   ├── auth.controller.ts        # /worker/auth/*
│   ├── auth.service.ts           # 劳动者登录/注册
│   ├── auth.module.ts
│   ├── dto/
│   │   └── worker-auth.dto.ts
│   └── strategies/
│       └── worker.strategy.ts    # worker-jwt Passport 策略
├── order/
│   ├── worker-order.controller.ts  # /worker/order/*
│   ├── worker-order.service.ts     # 我的订单、接单、核销
│   └── dto/
├── schedule/
│   ├── worker-schedule.controller.ts  # /worker/schedule/*
│   ├── worker-schedule.service.ts     # 排班管理
│   └── dto/
├── income/
│   ├── worker-income.controller.ts  # /worker/income/*
│   ├── worker-income.service.ts     # 收入明细、提现
│   └── dto/
├── profile/
│   ├── worker-profile.controller.ts  # /worker/profile/*
│   ├── worker-profile.service.ts     # 个人资料、技能、证书
│   └── dto/
├── common/
│   ├── guards/
│   │   └── worker-auth.guard.ts
│   ├── decorators/
│   │   └── worker.decorator.ts     # @Worker() 参数装饰器
│   └── worker-common.module.ts
└── worker.module.ts
```

### 5.2 Worker 端核心 API

| 模块         | 接口                         | 方法     | 说明                |
| ------------ | ---------------------------- | -------- | ------------------- |
| **auth**     | `/worker/auth/login`         | POST     | 微信登录 (MP_WORK)  |
|              | `/worker/auth/login/sms`     | POST     | 短信登录 (APP_WORK) |
|              | `/worker/auth/register`      | POST     | 劳动者注册申请      |
| **order**    | `/worker/order/list`         | GET      | 我的订单列表        |
|              | `/worker/order/pending`      | GET      | 待接单列表          |
|              | `/worker/order/:id/accept`   | POST     | 接单                |
|              | `/worker/order/:id/start`    | POST     | 开始服务 (签到)     |
|              | `/worker/order/:id/complete` | POST     | 完成服务 (核销)     |
| **schedule** | `/worker/schedule/my`        | GET      | 我的排班            |
|              | `/worker/schedule/update`    | PUT      | 更新可用时间        |
|              | `/worker/schedule/toggle`    | POST     | 开关接单状态        |
| **income**   | `/worker/income/summary`     | GET      | 收入概览            |
|              | `/worker/income/detail`      | GET      | 收入明细            |
|              | `/worker/income/withdraw`    | POST     | 申请提现            |
| **profile**  | `/worker/profile/me`         | GET      | 个人信息            |
|              | `/worker/profile/update`     | PUT      | 更新资料            |
|              | `/worker/profile/skills`     | GET/PUT  | 技能管理            |
|              | `/worker/profile/certs`      | GET/POST | 证书管理            |

### 5.3 Worker 认证流程

```
劳动者小程序                    NestJS Backend                    Redis
    │                              │                               │
    │  POST /worker/auth/login     │                               │
    │  { code, clientType: MP_WORK}│                               │
    │─────────────────────────────►│                               │
    │                              │  code2Session(code, MP_WORK)  │
    │                              │──────► 微信API                │
    │                              │◄────── openid                 │
    │                              │                               │
    │                              │  查 SysSocialUser             │
    │                              │  (platform=MP_WORK, openid)   │
    │                              │                               │
    │                              │  查 SrvWorker                 │
    │                              │  (memberId, tenantId)         │
    │                              │                               │
    │                              │  生成 JWT                     │
    │                              │  { workerId, role: 'worker',  │
    │                              │    clientType: 'MP_WORK' }    │
    │                              │                               │
    │                              │  SET worker_token:{uuid}      │
    │                              │──────────────────────────────►│
    │                              │                               │
    │  { token, workerInfo }       │                               │
    │◄─────────────────────────────│                               │
```

### 5.4 Worker 与 Member 的关系处理

劳动者登录时需要处理 `UmsMember` → `SrvWorker` 的关联：

```typescript
async workerLogin(dto: WorkerLoginDto) {
  // 1. 通过微信 code 获取 openid
  const wxRes = await this.wechatService.code2Session(dto.code, SocialPlatform.MP_WORK);

  // 2. 查找或创建 SysSocialUser (platform = MP_WORK)
  let socialUser = await this.prisma.sysSocialUser.findFirst({
    where: { platform: SocialPlatform.MP_WORK, openid: wxRes.data.openid },
    include: { member: true },
  });

  // 3. 如果没有关联的 Member，需要先注册为 Member
  if (!socialUser) {
    // 创建 Member + SocialUser (MP_WORK)
    // ...
  }

  // 4. 查找该 Member 在当前租户下的 Worker 身份
  const worker = await this.prisma.srvWorker.findFirst({
    where: {
      memberId: socialUser.member.memberId,
      tenantId: dto.tenantId,
      auditStatus: AuditStatus.APPROVED,
    },
  });

  if (!worker) {
    // 未注册为劳动者，或审核未通过
    return Result.ok({ isWorker: false, needRegister: true });
  }

  // 5. 生成 worker JWT
  const token = await this.genWorkerToken(worker);
  return Result.ok({ isWorker: true, token, workerInfo: worker });
}
```

---

## 6. SocialPlatform 枚举扩展

### 6.1 当前枚举

```prisma
enum SocialPlatform {
  MP_MALL    // 消费者小程序 — ✅ 已使用
  MP_WORK    // 劳动者小程序 — ⚠️ 已定义未使用
  APP_MAIN   // 主 App — ⚠️ 已定义未使用
}
```

### 6.2 建议扩展

```prisma
enum SocialPlatform {
  MP_MALL    // 消费者微信小程序
  MP_WORK    // 劳动者微信小程序
  H5_MALL    // 消费者 H5 (微信公众号 OAuth)
  APP_MAIN   // 消费者 App (短信/Apple ID/微信 SDK)
  APP_WORK   // 劳动者 App (短信)
}
```

### 6.3 SysSocialUser 表的使用方式

| 场景                 | platform   | openid 来源             | unionid           |
| -------------------- | ---------- | ----------------------- | ----------------- |
| 消费者微信小程序登录 | `MP_MALL`  | `jscode2session`        | 有 (同一开放平台) |
| 消费者 H5 登录       | `H5_MALL`  | OAuth2.0 网页授权       | 有                |
| 消费者 App 微信登录  | `APP_MAIN` | 微信 SDK `sendAuthReq`  | 有                |
| 消费者 App 短信登录  | `APP_MAIN` | 手机号 (存 mobile 字段) | 无                |
| 劳动者小程序登录     | `MP_WORK`  | `jscode2session`        | 有                |
| 劳动者 App 短信登录  | `APP_WORK` | 手机号                  | 无                |

**跨端账号合并**：通过 `unionid` 字段，同一微信开放平台下的小程序、公众号、App 可以识别为同一用户，实现账号自动合并。

---

## 7. 配置管理改造

### 7.1 环境变量扩展

```env
# 消费者小程序
WECHAT_MP_MALL_APPID=wxabc123
WECHAT_MP_MALL_SECRET=secret123

# 劳动者小程序
WECHAT_MP_WORK_APPID=wxdef456
WECHAT_MP_WORK_SECRET=secret456

# 微信公众号 (H5 OAuth)
WECHAT_H5_APPID=wxghi789
WECHAT_H5_SECRET=secret789

# 短信服务
SMS_PROVIDER=tencent  # tencent | aliyun
SMS_SECRET_ID=xxx
SMS_SECRET_KEY=xxx
SMS_SIGN_NAME=家政平台
SMS_TEMPLATE_LOGIN=123456
```

### 7.2 AppConfigService 扩展

```typescript
// config/types.ts 新增
export interface WechatMultiConfig {
  mpMall: { appid: string; secret: string };
  mpWork: { appid: string; secret: string };
  h5: { appid: string; secret: string };
}

export interface SmsConfig {
  provider: 'tencent' | 'aliyun';
  secretId: string;
  secretKey: string;
  signName: string;
  templates: { login: string; bind: string };
}
```

---

## 8. 性能与稳定性方案

### 8.1 多端并发压力评估

| 端         | 预估 QPS   | 高峰场景   | 风险等级 |
| ---------- | ---------- | ---------- | -------- |
| Admin 后台 | 5-20       | 批量操作   | 低       |
| C 端小程序 | 50-200     | 促销活动   | 中       |
| C 端 H5    | 20-100     | 分享裂变   | 中       |
| 劳动者端   | 10-50      | 早高峰抢单 | 中       |
| **合计**   | **85-370** |            | **中**   |

### 8.2 应对方案

| 方案                    | 适用场景           | 实施难度      | 优先级 |
| ----------------------- | ------------------ | ------------- | ------ |
| PM2 Cluster 模式        | 整体吞吐量提升     | 低 (配置即可) | P0     |
| Redis 缓存热点数据      | 商品列表、门店信息 | 低            | P0     |
| 修复 N+1 查询           | 订单列表、佣金查询 | 中            | P0     |
| 按端限流 (per-endpoint) | 防止单端打满       | 中            | P1     |
| 数据库连接池调优        | 并发连接数不足     | 低            | P1     |
| 读写分离 (PostgreSQL)   | 读 QPS > 500 时    | 高            | P2     |

### 8.3 PM2 Cluster 配置

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'dist/main.js',
      instances: 'max', // CPU 核数
      exec_mode: 'cluster',
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

### 8.4 按端限流策略

```typescript
// 在 ThrottlerGuard 中按路径前缀区分限流
const rateLimits = {
  '/admin/': { ttl: 60000, limit: 200 }, // 后台宽松
  '/client/': { ttl: 60000, limit: 100 }, // C端标准
  '/worker/': { ttl: 60000, limit: 80 }, // 劳动者端标准
};
```

---

## 9. 实施路线图

### 9.1 第一阶段：认证基础设施 (2-3 周)

**目标**：完成多端认证能力，使 H5/App/劳动者端可以登录

| 任务                                        | 工时 | 优先级 | 依赖        |
| ------------------------------------------- | ---- | ------ | ----------- |
| JWT Payload 增强 (加 role/clientType)       | 2d   | P0     | 无          |
| `IClientAuthStrategy` 接口 + 工厂           | 1d   | P0     | 无          |
| WechatService 多小程序配置改造              | 2d   | P0     | 无          |
| JwtAuthGuard 增加 `/worker/` 放行           | 0.5d | P0     | 无          |
| `WechatMpStrategy` (消费者小程序，重构现有) | 1d   | P0     | 策略接口    |
| `WechatH5Strategy` (H5 OAuth)               | 2d   | P1     | 策略接口    |
| `SmsStrategy` (短信验证码)                  | 2d   | P1     | 短信服务    |
| `SocialPlatform` 枚举扩展 + 迁移            | 1d   | P0     | 无          |
| 统一登录 DTO (`UnifiedLoginDto`)            | 1d   | P0     | 策略接口    |
| Worker Passport 策略 (`worker-jwt`)         | 1d   | P0     | JWT 增强    |
| WorkerAuthGuard + @Worker() 装饰器          | 1d   | P0     | Worker 策略 |
| 环境变量 + AppConfigService 扩展            | 1d   | P0     | 无          |
| 单元测试 (策略工厂、各策略)                 | 2d   | P1     | 全部策略    |

**里程碑**：所有端可以完成登录，获取 JWT Token

### 9.2 第二阶段：Worker 模块核心 (3-4 周)

**目标**：劳动者端可以接单、管理排班、查看收入

| 任务                                   | 工时 | 优先级 | 依赖     |
| -------------------------------------- | ---- | ------ | -------- |
| Worker Auth 模块 (登录/注册)           | 3d   | P0     | 第一阶段 |
| Worker Order 模块 (我的订单/接单/核销) | 5d   | P0     | Auth     |
| Worker Schedule 模块 (排班/开关接单)   | 3d   | P1     | Auth     |
| Worker Income 模块 (收入/提现)         | 3d   | P1     | Auth     |
| Worker Profile 模块 (资料/技能/证书)   | 2d   | P1     | Auth     |
| Worker Common (Guard/Decorator/Module) | 1d   | P0     | 第一阶段 |
| 订单状态机增加劳动者操作节点           | 2d   | P0     | Order    |
| 单元测试 + 集成测试                    | 3d   | P1     | 全部模块 |

**里程碑**：劳动者小程序可以完成完整的接单 → 服务 → 核销流程

### 9.3 第三阶段：C 端多端适配 (2-3 周)

**目标**：C 端 H5 和 App 可以完成完整的下单流程

| 任务                         | 工时 | 优先级 | 依赖        |
| ---------------------------- | ---- | ------ | ----------- |
| H5 OAuth 登录完整流程        | 2d   | P1     | 第一阶段    |
| App 短信登录完整流程         | 2d   | P1     | 第一阶段    |
| unionid 跨端账号合并逻辑     | 3d   | P1     | OAuth + SMS |
| Client Auth 重构 (统一入口)  | 2d   | P1     | 策略工厂    |
| H5 支付适配 (微信 JSAPI)     | 3d   | P1     | H5 登录     |
| App 支付适配 (微信 SDK)      | 3d   | P2     | App 登录    |
| 推送通知服务 (WebSocket/FCM) | 3d   | P2     | 无          |
| 端级别限流配置               | 1d   | P2     | 无          |

**里程碑**：H5 和 App 端可以完成下单 → 支付 → 查看订单

### 9.4 第四阶段：增强能力 (4-6 周，按需)

| 任务                           | 工时 | 优先级 |
| ------------------------------ | ---- | ------ |
| 智能派单引擎 (距离+评分+负载)  | 2w   | P2     |
| 劳动者实时位置上报 (Redis GEO) | 1w   | P2     |
| 服务进度追踪 (签到/签退/拍照)  | 1w   | P2     |
| 劳动者培训/考核模块            | 1w   | P3     |
| 劳动者评价体系                 | 3d   | P2     |
| 数据库读写分离                 | 1w   | P3     |

### 9.5 总体时间线

```
第1-3周    第4-7周      第8-10周     第11-16周
  │          │            │            │
  ▼          ▼            ▼            ▼
┌──────┐  ┌──────┐    ┌──────┐    ┌──────┐
│ 认证 │  │Worker│    │ C端  │    │ 增强 │
│ 基础 │→ │ 模块 │ →  │ 多端 │ →  │ 能力 │
│ 设施 │  │ 核心 │    │ 适配 │    │(按需)│
└──────┘  └──────┘    └──────┘    └──────┘
```

---

## 10. 风险与应对

| 风险                          | 可能性 | 影响 | 应对措施                                       |
| ----------------------------- | ------ | ---- | ---------------------------------------------- |
| JWT 改造影响现有登录          | 中     | 高   | 新旧 payload 兼容，validate 方法向后兼容       |
| 多小程序 appid 配置错误       | 中     | 高   | 启动时校验配置完整性，缺失则 warn 日志         |
| Worker 端与 Client 端数据隔离 | 低     | 高   | Guard 层严格校验 role，Repository 层按角色过滤 |
| 短信服务商限流                | 中     | 中   | 本地 Redis 限流 (同一手机号 60s 内不重发)      |
| unionid 合并冲突              | 低     | 中   | 合并前检查，冲突时人工介入                     |
| 并发压力超预期                | 低     | 高   | PM2 cluster + Redis 缓存 + 按端限流            |

---

## 11. 架构决策记录 (ADR)

### ADR-001: 选择单一 API 而非 BFF/API Gateway

- **决策**：保持单一 NestJS 进程服务所有端
- **原因**：当前 QPS < 500，团队规模小，BFF 增加运维复杂度，API Gateway 对单体无意义
- **后果**：部署简单，但需要在代码层面做好角色隔离
- **回退条件**：当 QPS > 2000 或团队 > 10 人时，考虑拆分

### ADR-002: 按角色组织而非按客户端类型组织

- **决策**：API 路径按 `admin/`、`client/`、`worker/` 组织
- **原因**：同一角色的不同客户端（小程序/H5/App）业务逻辑完全相同，仅认证方式不同
- **后果**：避免 API 膨胀（不需要 `/mp/order`、`/h5/order`、`/app/order`），认证差异通过策略模式在 Guard 层解决

### ADR-003: 认证层使用策略模式

- **决策**：`IClientAuthStrategy` 接口 + 工厂模式分发
- **原因**：新增客户端类型只需新增策略实现，不修改现有代码（开闭原则）
- **后果**：扩展性好，但需要维护策略注册表

---

## 12. 与现有架构报告的关系

本文档是 [项目架构全方位分析报告](./architecture-comprehensive-analysis.md) 的延伸，聚焦于多角色多端扩展场景。架构报告中提到的以下问题在本方案中得到针对性解决：

| 架构报告问题          | 本方案对应                              |
| --------------------- | --------------------------------------- |
| 模块边界模糊 (55/100) | Worker 模块独立设计，与 Client 模块平行 |
| 可扩展性 (60/100)     | 策略模式使新端接入成本降至 1-2 天       |
| 安全性 (65/100)       | JWT 增强 + 角色级 Guard + 按端限流      |
| 性能考量 (55/100)     | PM2 cluster + Redis 缓存 + N+1 修复     |

架构报告中推荐的 **Modular Monolith** 演进方向与本方案完全兼容 — Worker 模块作为新的独立模块加入，通过 Module exports 与现有业务模块交互。

---

**文档版本**: 1.0.0  
**编写日期**: 2026-02-24  
**作者**: Kiro  
**状态**: 待评审
