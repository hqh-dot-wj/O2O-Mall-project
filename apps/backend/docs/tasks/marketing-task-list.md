# Marketing 模块任务清单

> 来源：`apps/backend/docs/requirements/marketing/` 下 6 份需求文档
> 创建时间：2026-03-01
> 架构审查：🛑 重审（已修正 — 见下方备注）
> 模块相态：成长态（需求确定性 ~60%，月变更 5-8 次）

## 架构审查备注

### 审查结论：原始需求文档存在方向性问题，已修正

**问题 1：优先级倒置**
原始 `marketing-overall-analysis.md` 将"会员等级""用户画像""用户分群"标为 P0 新建，但现有 4 个子模块共有 **12 个 P0 级安全/一致性缺陷**未修复（60+ 端点无权限控制、库存扣减未接入、幂等性缺失、事务缺失）。修正：先修安全 → 再修一致性 → 再对齐规范 → 再增强能力 → 最后建新模块。

**问题 2：5 份文档缺乏全局统筹**
coupon/points/maas/integration/infra 各自独立定义演进计划，导致大量重复任务（如 `@ApiBearerAuth` 在 4 份文档中各出现一次）。修正：合并为跨子模块的统一任务。

**问题 3：基础设施层半成品**
审批服务全是 TODO、缓存装饰器无 AOP 拦截器、灰度配置无 Prisma 字段。修正：基础设施补完纳入阶段三。

**问题 4：整体分析脱离实际**
对标淘宝/京东/拼多多，成本估 160-200 万，不适用当前团队规模。修正：整体分析的新模块建设推迟到阶段五，且需重新校准优先级。

### 子模块文档处理顺序

| 顺序 | 文档                          | 理由                                                         |
| ---- | ----------------------------- | ------------------------------------------------------------ |
| 1    | infra-requirements.md         | 基础设施是底座，分布式锁/审批流/事件系统修好了其他模块才能用 |
| 2    | integration-requirements.md   | 订单集成是交易核心链路，幂等性/事务问题影响资金安全          |
| 3    | maas-requirements.md          | MaaS 引擎有 3 个 P0（库存未接入、批量状态跳校验、无权限）    |
| 4    | coupon-requirements.md        | 核心流程完整，主要是安全基线和规范对齐                       |
| 5    | points-requirements.md        | 核心流程完整，冻结/解冻乐观锁和事务问题需修复                |
| 6    | marketing-overall-analysis.md | 所有现有缺陷修复后再考虑新模块建设                           |

### 上线后监控项

- 权限控制上线后 7 天内，监控是否有被拦截的越权请求（判断是否有前端/C端遗漏配置）
- 幂等性保护上线后，监控 Redis 幂等键的命中率（判断是否有重复调用）
- 分布式锁上线后，监控锁获取失败率（判断锁粒度是否合适）
- MaaS 库存扣减接入后，监控库存与实际参与人数的一致性

---

## 阶段一：安全基线（跨模块统一修复）（1-2 周）

> 跨 coupon / points / maas / integration 统一修复，不按子模块分散执行

- [x] T-1: 所有 Controller 添加 `@ApiBearerAuth` + `@RequirePermission` — 覆盖 coupon(10) + points(15) + maas(21) 共 46+ 端点 (4h)
- [x] T-2: 所有写操作添加 `@Operlog` — 覆盖全部 POST/PUT/PATCH/DELETE 端点 (2h)
- [x] T-3: 所有 Controller 使用 `@Api` 替代 `@ApiOperation` — points(15) + C 端(6) 共 21 端点 (2h)
- [x] T-4: 所有 Service 统一使用已定义的 ErrorCode 替代硬编码字符串 — coupon(20 个错误码) + points(23 个错误码) (4h)

## 阶段二：P0 数据一致性修复（1-2 周）

> 修复会导致数据不一致、资金风险、逻辑失效的 P0 Bug

### MaaS 引擎修复

- [x] T-5: 参与活动流程接入库存扣减 — STRONG_LOCK 模式当前形同虚设 (3h) — maas D-10
- [x] T-6: batchTransitStatus 增加状态机校验 + 事件发送 — 当前跳过 isValidTransition 和分布式锁 (3h) — maas D-7/D-8
- [x] T-7: 互斥矩阵 SECKILL → FLASH_SALE 命名修正 — 秒杀活动互斥检查永远不生效 (0.5h) — maas D-4

### 积分系统修复

- [x] T-8: freezePoints / unfreezePoints 添加乐观锁 — 并发场景余额可能不一致 (3h) — points D-11
- [x] T-9: completeTask 添加 @Transactional 事务包裹 — 发放成功但记录失败时可重复领奖 (1h) — points D-14

### 订单集成修复

- [x] T-10: 4 个 handle\* 方法添加幂等性保护（Redis SetNX） — 网络重试导致重复处理 (4h) — integration D-7
- [x] T-11: handleOrderPaid 积分扣减（解冻+扣减）添加事务包裹 — 解冻成功但扣减失败时状态不一致 (1h) — integration D-4
- [x] T-12: 退款时消费积分扣减添加余额校验 — 用户已消费积分时扣减会失败 (1h) — integration D-6

## 阶段一/二执行拆解（文件级，可直接排期）

> 说明
>
> - 本拆解基于当前 `apps/backend/src/module/marketing` 与 `apps/backend/src/module/client/marketing` 代码扫描结果。
> - `T-10` 文案写的是 5 个 `handle*` 方法，当前代码中实际为 4 个：`handleOrderCreated`、`handleOrderPaid`、`handleOrderCancelled`、`handleOrderRefunded`。
> - 每个任务默认包含「代码修改 + 单测补齐 + 自测命令」三个子项。

### 阶段一：安全基线（T-1 ~ T-4）

#### T-1 所有 Controller 增加 `@ApiBearerAuth` + `@RequirePermission`

- 目标文件（admin 营销 Controller，13 个）
  - `apps/backend/src/module/marketing/asset/asset.controller.ts`
  - `apps/backend/src/module/marketing/config/config.controller.ts`
  - `apps/backend/src/module/marketing/coupon/distribution/distribution.controller.ts`
  - `apps/backend/src/module/marketing/coupon/management/management.controller.ts`
  - `apps/backend/src/module/marketing/coupon/template/template.controller.ts`
  - `apps/backend/src/module/marketing/instance/instance.controller.ts`
  - `apps/backend/src/module/marketing/play/play.controller.ts`
  - `apps/backend/src/module/marketing/points/account/account.controller.ts`
  - `apps/backend/src/module/marketing/points/management/management.controller.ts`
  - `apps/backend/src/module/marketing/points/rule/rule.controller.ts`
  - `apps/backend/src/module/marketing/points/task/task.controller.ts`
  - `apps/backend/src/module/marketing/rule/rule.controller.ts`
  - `apps/backend/src/module/marketing/template/template.controller.ts`
- 开发动作
  - 类级增加 `@ApiBearerAuth('Authorization')`。
  - 方法级按路由语义补齐 `@RequirePermission('marketing:xxx:yyy')`。
  - 同步清理/补全相关 import，避免未使用导入。
- 验收标准
  - admin 营销路由全部需要 Bearer token。
  - 每个 admin 路由至少具备 1 个明确权限点。

#### T-2 所有写操作增加 `@Operlog`

- 目标文件（包含所有含 POST/PUT/PATCH/DELETE 的 Controller）
  - `apps/backend/src/module/marketing/asset/asset.controller.ts`
  - `apps/backend/src/module/marketing/config/config.controller.ts`
  - `apps/backend/src/module/marketing/coupon/distribution/distribution.controller.ts`
  - `apps/backend/src/module/marketing/coupon/template/template.controller.ts`
  - `apps/backend/src/module/marketing/instance/instance.controller.ts`
  - `apps/backend/src/module/marketing/play/play.controller.ts`
  - `apps/backend/src/module/marketing/points/account/account.controller.ts`
  - `apps/backend/src/module/marketing/points/rule/rule.controller.ts`
  - `apps/backend/src/module/marketing/points/task/task.controller.ts`
  - `apps/backend/src/module/marketing/rule/rule.controller.ts`
  - `apps/backend/src/module/marketing/template/template.controller.ts`
  - `apps/backend/src/module/client/marketing/coupon/client-coupon.controller.ts`
  - `apps/backend/src/module/client/marketing/points/client-points-signin.controller.ts`
  - `apps/backend/src/module/client/marketing/points/client-points-task.controller.ts`
- 开发动作
  - 对写接口按业务类型补 `@Operlog({ businessType: ... })`。
  - 优先覆盖 admin 端写接口；C 端按当前审计策略同步补齐。
- 验收标准
  - 所有写接口具备可追踪的操作日志埋点。

#### T-3 `@ApiOperation` 统一替换为 `@Api`

- 目标文件（当前含 `@ApiOperation` 的 7 个 Controller）
  - `apps/backend/src/module/marketing/points/account/account.controller.ts`
  - `apps/backend/src/module/marketing/points/management/management.controller.ts`
  - `apps/backend/src/module/marketing/points/rule/rule.controller.ts`
  - `apps/backend/src/module/marketing/points/task/task.controller.ts`
  - `apps/backend/src/module/client/marketing/points/client-points-account.controller.ts`
  - `apps/backend/src/module/client/marketing/points/client-points-signin.controller.ts`
  - `apps/backend/src/module/client/marketing/points/client-points-task.controller.ts`
- 开发动作
  - 替换 `@ApiOperation({ summary })` -> `@Api({ summary })`。
  - 从 `@nestjs/swagger` 移除 `ApiOperation`，改为引入 `src/common/decorators/api.decorator`。
- 验收标准
  - 扫描结果中不再出现 `@ApiOperation`（marketing/points + client/marketing/points）。

#### T-4 Service 统一改为 ErrorCode（移除硬编码错误文案）

- 目标文件（首批）
  - `apps/backend/src/module/marketing/coupon/template/template.service.ts`
  - `apps/backend/src/module/marketing/coupon/distribution/distribution.service.ts`
  - `apps/backend/src/module/marketing/coupon/distribution/redis-lock.service.ts`
  - `apps/backend/src/module/marketing/coupon/usage/usage.service.ts`
  - `apps/backend/src/module/marketing/points/account/account.service.ts`
  - `apps/backend/src/module/marketing/points/rule/rule.service.ts`
  - `apps/backend/src/module/marketing/points/signin/signin.service.ts`
  - `apps/backend/src/module/marketing/points/task/task.service.ts`
  - `apps/backend/src/module/marketing/coupon/constants/error-codes.ts`
  - `apps/backend/src/module/marketing/points/constants/error-codes.ts`
- 开发动作
  - 统一通过模块错误码常量抛错，避免 Service 内写死文案字符串。
  - 缺失错误码先补 constants，再替换业务抛错点。
- 验收标准
  - coupon/points 相关 Service 不再出现新增硬编码业务错误文案。

### 阶段二：P0 一致性修复（T-5 ~ T-12）

#### T-5 参与流程接入库存扣减（STRONG_LOCK 生效）

- 目标文件
  - `apps/backend/src/module/marketing/instance/instance.service.ts`
  - `apps/backend/src/module/marketing/play/flash-sale.service.ts`
  - `apps/backend/src/module/marketing/stock/stock.service.ts`
- 测试文件
  - 新增 `apps/backend/src/module/marketing/instance/instance.service.spec.ts`
  - 可选新增 `apps/backend/src/module/marketing/play/flash-sale.service.spec.ts`
- 验收标准
  - `STRONG_LOCK` 场景下参与流程实际触发库存原子扣减，失败可回滚/释放。

#### T-6 `batchTransitStatus` 增加状态机校验 + 事件发送 + 锁

- 目标文件
  - `apps/backend/src/module/marketing/instance/instance.service.ts`
  - `apps/backend/src/module/marketing/instance/idempotency.service.ts`
- 测试文件
  - `apps/backend/src/module/marketing/instance/state-machine.config.spec.ts`
  - 新增或更新 `apps/backend/src/module/marketing/instance/instance.service.spec.ts`
- 验收标准
  - 批量流转不允许非法跃迁。
  - 批量流转后可观测到对应营销事件。
  - 并发批量流转不会出现重复处理。

#### T-7 互斥矩阵 `SECKILL` 更名为 `FLASH_SALE`

- 目标文件
  - `apps/backend/src/module/marketing/config/activity-conflict.matrix.ts`
  - `apps/backend/src/module/marketing/play/strategy.interface.ts`
- 测试文件
  - 新增 `apps/backend/src/module/marketing/config/activity-conflict.matrix.spec.ts`
- 验收标准
  - 互斥校验对秒杀活动生效，不再因 code 不一致导致失效。

#### T-8 `freezePoints` / `unfreezePoints` 增加乐观锁

- 目标文件
  - `apps/backend/src/module/marketing/points/account/account.service.ts`
  - `apps/backend/src/module/marketing/points/account/account.repository.ts`
- 测试文件
  - `apps/backend/src/module/marketing/points/account/account.service.spec.ts`
- 验收标准
  - 并发冻结/解冻下余额与冻结额度保持一致。
  - 乐观锁冲突有明确重试或失败语义。

#### T-9 `completeTask` 增加事务包裹

- 目标文件
  - `apps/backend/src/module/marketing/points/task/task.service.ts`
- 测试文件
  - `apps/backend/src/module/marketing/points/task/task.service.spec.ts`
- 验收标准
  - 发放积分与任务完成记录要么同时成功，要么同时回滚。

#### T-10 `handleOrder*` 增加幂等保护（Redis SetNX）

- 目标文件
  - `apps/backend/src/module/marketing/integration/integration.service.ts`
  - `apps/backend/src/module/marketing/integration/integration.module.ts`
  - 新增 `apps/backend/src/module/marketing/integration/integration-idempotency.service.ts`
- 测试文件
  - `apps/backend/src/module/marketing/integration/integration.service.spec.ts`
- 验收标准
  - 对同一订单事件重复调用仅首次生效，其余请求安全返回。

#### T-11 `handleOrderPaid` 积分解冻+扣减事务化

- 目标文件
  - `apps/backend/src/module/marketing/integration/integration.service.ts`
  - `apps/backend/src/module/marketing/points/account/account.service.ts`
- 测试文件
  - `apps/backend/src/module/marketing/integration/integration.service.spec.ts`
- 验收标准
  - 解冻成功但扣减失败时，整体回滚，不产生中间不一致状态。

#### T-12 退款消费积分扣减增加余额校验

- 目标文件
  - `apps/backend/src/module/marketing/integration/integration.service.ts`
  - `apps/backend/src/module/marketing/points/account/account.service.ts`
- 测试文件
  - `apps/backend/src/module/marketing/integration/integration.service.spec.ts`
  - `apps/backend/src/module/marketing/points/account/account.service.spec.ts`
- 验收标准
  - 用户已消耗消费积分时，退款路径可按规则降级处理，不阻塞主退款流程。

### 阶段一/二统一自测命令

- `pnpm --filter @apps/backend lint`
- `pnpm --filter @apps/backend typecheck`
- `pnpm --filter @apps/backend test`
- `pnpm verify-monorepo`

## 阶段三：基础设施补完 + 架构规范对齐（2-3 周）

### 基础设施补完

- [x] T-13: 所有定时任务添加分布式锁（Redis SET NX） — coupon/points/maas/infra 共 4 处调度器 (4h) — infra D-5, coupon D-5, points D-9, maas D-12
- [x] T-14: 审批流完整实现 — 当前所有方法均为 TODO 示例代码，连接数据库 (1.5d) — infra D-12
- [x] T-15: 缓存装饰器实现 AOP 拦截器 — @Cacheable/@CacheEvict 当前仅定义元数据不生效 (1.5d) — infra D-19
- [x] T-16: 实现事件监听器 — 当前 10 种事件类型有发送无消费者，至少覆盖 SUCCESS/FAILED/TIMEOUT (2d) — maas A-7, infra X-1

### 跨模块访问治理

- [x] T-17: 消除对 omsOrder 表的直接访问 — coupon(2 处) + integration(3 处) 共 5 处，改用 OrderService (1d) — coupon D-10/D-11, integration D-2/D-3
- [x] T-18: 消除对 umsMember 表的直接访问 — coupon(1 处) + points(1 处) 共 2 处，改用 MemberService (0.5d) — coupon X-3, points X-1

### 规范对齐

- [x] T-19: C 端 Controller 装饰器规范化 — coupon/points/integration C 端共 7 个 Controller，统一 @Api + @ApiBearerAuth + @tenantScope (0.5d) — coupon X-2, points X-2, integration D-1
- [x] T-20: 定时任务 catch 使用 getErrorMessage 安全提取 + 分批处理 — coupon D-6, points D-10 (0.5d)
- [x] T-21: MaaS creditToStore 资产类型从 rules.giftAssetType 读取，平台费率默认值写入配置表 (0.5d) — maas D-5/D-6
- [x] T-22: MaaS 删除废弃的 checkTransition 方法 + 修复归档任务空 data (0.5h) — maas D-13/D-14
- [x] T-23: Integration 5 个 handle\* 方法添加分布式锁 (2h) — integration D-8
- [x] T-24: Integration 错误日志使用 getErrorStack 记录堆栈 (0.5h) — integration D-9

## 阶段四：性能优化 + 运营能力增强（1-2 月）

### 性能优化

- [x] T-25: coupon 7 日趋势改为单次聚合查询（消除 14 次 DB 查询的 N+1） (0.5d) — coupon D-7
- [x] T-26: points 签到连续天数改为单次查询 + 内存计算（消除最多 100 次 DB 查询） (0.5d) — points D-6
- [x] T-27: points 任务完成记录改为 WHERE IN 批量查询 (0.5d) — points D-7
- [x] T-28: coupon + points 导出接口统一添加数量限制（最大 10000 条或异步导出） (1d) — coupon D-8, points D-8
- [x] T-29: coupon 手动发放添加批量上限（如 500 人） (0.5h) — coupon D-9

### 事件驱动统一改造

- [x] T-30: coupon 添加事件驱动（领取/使用/过期事件） (2d) — coupon A-7
- [x] T-31: points 添加事件驱动（获取/使用/过期事件） (2d) — points X-5
- [x] T-32: integration 5 个关键节点发送事件到 marketing/events (2d) — integration X-4
- [x] T-33: 明确 coupon/points 与 integration 的对接契约文档化 (1d) — coupon X-4, points X-3

### 运营能力增强

- [ ] T-34: coupon 优惠券叠加规则引擎（同类互斥、可叠加规则配置） (3-5d) — coupon A-1
- [ ] T-35: coupon 发放时间窗口（限时抢券场景） (1-2d) — coupon A-2
- [ ] T-36: coupon 预算控制（总预算 + 单日上限） (2-3d) — coupon A-9
- [ ] T-37: points 连续签到递增奖励（规则表新增 signinBonusConfig） (2-3d) — points A-2
- [ ] T-38: points 冻结超时自动解冻（定时任务 + 配置化超时时间） (1-2d) — points A-9
- [ ] T-39: maas 活动数据统计接口（参与人数、转化率、GMV） (3-5d) — maas A-1
- [ ] T-40: integration 优惠叠加规则配置 + 优惠上限配置 (2-3d) — integration A-1/A-2

### 基础设施增强

- [ ] T-41: infra 事件持久化到数据库 (2d) — infra D-3
- [ ] T-42: infra 活动上线接口集成审批流校验 (0.5d) — infra X-4
- [ ] T-43: infra 活动配置接口集成规则校验 (0.5d) — infra X-3
- [ ] T-44: infra 灰度配置持久化（Prisma schema 添加字段） (0.5d) — infra D-16
- [ ] T-45: infra 批量处理添加事务包裹 (1d) — infra D-6

## 阶段五：新模块建设（3-6 月）— 所有现有缺陷修复后启动

> 来源：marketing-overall-analysis.md，优先级已根据架构审查重新校准
> 前置条件：阶段一~四全部完成

### 高优先级（MaaS 已有策略骨架，补全即可）

- [ ] T-46: 满减满折活动完善 — MaaS 已有 FULL_REDUCTION 策略，补全规则配置和前端页面 (2-3w)
- [ ] T-47: 限时折扣活动完善 — MaaS 已有 FLASH_SALE 策略，补全倒计时和库存限制 (2-3w)
- [ ] T-48: 短信/推送通知（触达中心）— 与事件系统对接，技术难度低 (2-3w)

### 中优先级（需先确认业务模型）

- [ ] T-49: 会员等级体系 — 等级配置 + 升降级规则 + 等级权益 (3-4w) — 前置：确认等级划分标准
- [ ] T-50: 会员权益管理 — 权益类型配置 + 等级关联 + 使用追踪 (2-3w) — 前置：T-49 完成
- [ ] T-51: 站内信模块 — 与事件系统对接 (2-3w)

### 低优先级（需 OLAP 等基础设施支撑）

- [ ] T-52: 用户分群模块 — 分群条件配置 + 动态/静态分群 (4-5w) — 前置：T-49 完成
- [ ] T-53: 营销效果分析增强 — 活动效果 + 优惠券效果 + 渠道分析 (4-5w) — 前置：需 ClickHouse
- [ ] T-54: 用户画像模块 — 标签体系 + 自动打标 + 画像查询 (5-6w) — 前置：需 ClickHouse + 行为数据积累
- [ ] T-55: 用户行为分析 — 事件追踪 + 路径分析 + 漏斗 (5-6w) — 前置：需埋点 SDK + ClickHouse

---

## 附录：缺陷来源索引

| 阶段   | 任务数 | 覆盖缺陷来源                                                                                                                                     |
| ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 阶段一 | 4 项   | coupon D-1~D-4, points D-1~D-5, maas D-1~D-3, 跨模块统一                                                                                         |
| 阶段二 | 8 项   | maas D-4/D-7/D-8/D-10, points D-11/D-14, integration D-4/D-6/D-7                                                                                 |
| 阶段三 | 12 项  | infra D-5/D-12/D-19/X-1, coupon D-5/D-6/D-10/D-11/X-2/X-3, points D-9/D-10/X-1/X-2, maas D-5/D-6/D-12/D-13/D-14, integration D-1/D-2/D-3/D-8/D-9 |
| 阶段四 | 21 项  | coupon D-7/D-8/D-9/A-1/A-2/A-7/A-9/X-4, points D-6/D-7/D-8/A-2/A-9/X-3/X-5, maas A-1/A-7, integration A-1/A-2/X-4, infra D-3/D-6/D-16/X-3/X-4    |
| 阶段五 | 10 项  | marketing-overall-analysis.md P0~P2 级缺失模块（优先级已重新校准）                                                                               |

---

**版本**：1.0
**最后更新**：2026-03-01
**适用范围**：Marketing 模块全部 6 个子模块（coupon / points / maas / infra / integration + overall）
