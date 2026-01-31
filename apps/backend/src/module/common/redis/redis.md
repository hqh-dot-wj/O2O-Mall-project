# Redis 缓存与分布式基础设施 (Redis & Cache Infrastructure)

该模块是全系统的**高性能数据缓冲层**与**分布式协作基石**，通过封装 `ioredis` 实现缓存加速、分布式锁、缓存预热以及防雪崩机制。

### 1. 文件树与作用简述 (File Tree & Architecture)

```text
c:\VueProject\Nest-Admin-Soybean\apps\backend\src\module\common\redis\
├── redis.module.ts              # 核心模块：集成 @songkeys/nestjs-redis，提供动态模块配置
├── redis.service.ts             # 基础服务：封装 Redis 标准操作（String/Hash/List/分布式锁）
└── cache-manager.service.ts     # 策略管理：实现缓存预热、防雪崩（随机时间偏移）、批量刷新
```

- **RedisService**: 提供了极简的 API 封装，支持自动 JSON 序列化、分布式锁（`tryLock/unlock`）以及 Redis 运行时状态监控。
- **CacheManagerService**: 负责核心业务数据（如字典、配置）的“冷启动”预热，并采用 `Jitter` 策略防止大面积缓存同时失效。

---

### 2. 数据库表与逻辑关联 (Database & Relationships)

该模块作为物理数据库（Prisma/PostgreSQL）的**影子副本**与**状态协调器**：

- **影子副本 (Mirroring)**:
  - **sys_dict_type / sys_dict_data**: 映射至 `sys:dict:*`，加速前端枚举查询。
  - **sys_config**: 映射至 `sys:config:*`，提升系统参数读取性能。
- **状态协调 (Coordination)**:
  - **分布式锁**: 逻辑关联到需要保证全局原子性的业务，如 `Order`（防超卖）、`Finance`（并发入账）。
  - **Session/Token**: 存储用户登录凭证（逻辑上由 `AuthService` 驱动）。

---

### 3. 核心接口与业务闭环 (API & Business Closure)

| 核心组件 | 技术关键词 | 业务闭环作用 |
| :--- | :--- | :--- |
| `tryLock(key, ttl)` | `SET NX PX` | **并发控制闭环**: 防止多个 Pod 同时处理同一笔退款或并发更新库存，保障财务与数据严谨性。 |
| `onModuleInit` (预热) | `Warmup`, `Prisma` | **性能平滑闭环**: 系统启动时自动加载热点数据，避免首访业务请求直接穿透到 DB 导致响应抖动。 |
| `addJitter(base)` | `Random TTL Offset` | **雪崩预防闭环**: 给每个 Cache Key 增加 0~5 分钟随机偏移，打破“所有缓存同时失效”的系统瓶颈。 |
| `commandStats()` | `INFO commandstats` | **运维闭环**: 提供命令执行频率统计，支撑监控面板显示 Redis 实时健康度。 |

---

### 4. 安全审计与逻辑严谨性 (Security & Logic Audit)

- **并发安全 (Race Condition)**:
  - **锁实现**: `tryLock` 内部使用 `SET key val PX ttl NX`，是 Redis 分布式锁的标准单节点实现，逻辑严谨。
  - **释放风险**: 目前 `unlock` 直接 `del`。建议优化：应比对锁的值（Token），防止 A 进程因为执行过久导致锁失效后，误删了 B 进程刚获取的锁。
- **缓存一致性**:
  - **双写失效**: 模块提供了 `refresh(name)` 接口，当 DB 数据变更时，应手动触发该接口以保证 Cache 与 DB 同步。
- **极端边界与可用性**:
  - **大 Key 风险**: `reset()` 方法使用了 `keys *` 后跟 `del`。在生产环境海量 Key 场景下，这会引发 Redis 主线程阻塞。建议未来使用 `SCAN` 代替。
  - **序列化健壮性**: `get` 方法集成了 `JSON.parse` 的 `try-catch` 降级，避免了因 Redis 中存入脏数据（非 JSON）引发的服务崩溃。
