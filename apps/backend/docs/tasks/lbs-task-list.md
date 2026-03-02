# LBS 模块任务清单

> 来源：`apps/backend/docs/requirements/lbs/lbs-requirements.md`  
> 创建时间：2026-03-02  
> 架构审查：⚠️ 补充（见下方备注）  
> 模块相态：成长态

## 架构审查备注

- 补充点 1：`client/location` 与 `client/order` 位置准入规则需要统一口径，避免前台匹配成功但下单失败。
- 补充点 2：`sys_geo_fence.geom` 当前缺少空间索引，需要纳入数据库迁移计划并做压测验证。
- 补充点 3：LBS 管理接口需补齐权限体系与 DTO 校验，先保证安全基线再扩展能力。
- 上线后监控项：位置匹配命中率、`match-tenant` P95、`checkLocation` 失败率、围栏命中异常比例。

## 短期任务（1-2 周）

- [x] T-1: 修复站点创建围栏坐标转换与 WKT 入库链路 (1d) ✅ 2026-03-02
- [x] T-2: 对齐 `StationRepository` 与 `SysStation` 软删策略 (0.5d) ✅ 2026-03-02
- [x] T-3: LBS Controller 全量 DTO 化并补齐权限控制 (1d) ✅ 2026-03-02
- [x] T-4: 空间命中查询增加站点状态与租户状态过滤 (1d) ✅ 2026-03-02
- [x] T-5: 区划初始化增加分布式锁与幂等保护 (1d) ✅ 2026-03-02
- [x] T-6: 补齐 geo/station 核心单测与集成测试 (1d) ✅ 2026-03-02

## 短期任务执行拆解（T-1 ~ T-6）

> 说明：
>
> - 每个任务默认包含：代码修改 + 测试补齐 + 自测命令。
> - 文件级拆解以当前目录结构为准，执行时可按实际改动微调。

### T-1 修复站点创建围栏坐标转换与 WKT 入库链路

- 目标文件
  - `apps/backend/src/module/lbs/station/station.service.ts`
  - `apps/backend/src/module/lbs/geo/geo.service.ts`
  - `apps/backend/src/module/lbs/station/station.repository.ts`
- 测试文件
  - `apps/backend/src/module/lbs/station/station.service.spec.ts`
  - `apps/backend/src/module/lbs/geo/geo.service.spec.ts`
- 开发动作
  - 统一围栏点结构：`[{ lng, lat }] -> [[lng, lat], ...]`，避免传入三维数组。
  - 在 `toPolygonWKT` 前增加最小点数与闭合规则校验，明确异常信息。
  - 围栏写入失败时保证事务回滚，不留下脏站点记录。
- 验收标准
  - 多边形围栏可稳定写入并可被命中查询。
  - 不合法围栏输入返回明确业务错误。

### T-2 对齐 `StationRepository` 与 `SysStation` 软删策略

- 目标文件
  - `apps/backend/src/module/lbs/station/station.repository.ts`
  - `apps/backend/prisma/schema.prisma`（若采用字段补齐方案）
- 开发动作
  - 方案 A（推荐）：`StationRepository` 改为继承 `BaseRepository`，移除对 `delFlag` 的隐式依赖。
  - 方案 B（备选）：为 `SysStation` 增加软删字段并补迁移（成本更高）。
  - 同步检查 `findAll/findOne/count` 等查询行为是否符合预期。
- 验收标准
  - 站点查询与统计结果稳定，无隐式软删条件误过滤。
  - 单测覆盖仓储基类切换后的关键查询路径。

### T-3 LBS Controller 全量 DTO 化并补齐权限控制

- 目标文件
  - `apps/backend/src/module/lbs/station/station.controller.ts`
  - `apps/backend/src/module/lbs/region/region.controller.ts`
  - `apps/backend/src/module/lbs/station/dto/station.dto.ts`
  - `apps/backend/src/module/lbs/region/dto/region.dto.ts`
- 开发动作
  - 将 `@Body() any` 改为显式 DTO（`CreateStationDto` 等）。
  - 使用项目标准装饰器：`@Api`、`@ApiBearerAuth('Authorization')`、`@RequirePermission`、`@Operlog`。
  - Query 参数统一 DTO 化，避免裸参数拼接。
- 验收标准
  - LBS 管理接口全部通过 DTO 校验与权限校验。
  - Swagger 文档字段与权限语义一致。

### T-4 空间命中查询增加站点状态与租户状态过滤

- 目标文件
  - `apps/backend/src/module/lbs/geo/geo.service.ts`
  - `apps/backend/src/module/client/location/location.service.ts`
- 测试文件
  - `apps/backend/src/module/lbs/geo/geo.service.spec.ts`
- 开发动作
  - `findStationByPoint` 查询链路增加站点状态过滤（仅 `NORMAL`）。
  - 匹配租户时增加租户状态校验，避免返回不可用租户。
  - 明确“命中失败/租户不可用”错误码与文案边界。
- 验收标准
  - 停用站点与异常租户不会被返回。
  - C 端匹配结果与业务可用性保持一致。

### T-5 区划初始化增加分布式锁与幂等保护

- 目标文件
  - `apps/backend/src/module/lbs/region/region.service.ts`
  - `apps/backend/src/module/lbs/lbs.module.ts`
  - `apps/backend/src/module/common/redis/redis.module.ts`（仅在依赖未满足时）
- 测试文件
  - `apps/backend/src/module/lbs/region/region.service.spec.ts`
- 开发动作
  - 在 `seedRegions` 前增加分布式锁（Redis Set NX + TTL）。
  - 增加双重幂等检查（加锁前后都检查 count）。
  - 锁释放使用 `finally`，保证异常路径可释放。
- 验收标准
  - 多实例并发启动仅一个实例执行种子写入。
  - 锁异常不影响服务可用性，且有清晰日志。

### T-6 补齐 geo/station 核心单测与集成测试

- 目标文件
  - `apps/backend/src/module/lbs/geo/geo.service.spec.ts`
  - `apps/backend/src/module/lbs/station/station.service.spec.ts`
  - `apps/backend/src/module/lbs/region/region.service.spec.ts`
- 开发动作
  - 补齐边界测试：非法围栏、未闭合围栏、站点停用、租户停用。
  - 补齐异常测试：围栏写入失败回滚、加锁失败降级行为。
  - 增加最小集成测试（站点创建 -> 围栏命中）。
- 验收标准
  - 关键规则具备可回归用例，覆盖正常/边界/异常路径。

### 短期阶段统一自测命令

- `pnpm --filter @apps/backend lint`
- `pnpm --filter @apps/backend typecheck`
- `pnpm --filter @apps/backend test -- src/module/lbs`
- `pnpm verify-monorepo`

### 建议提交顺序（短期阶段）

- C-1（T-1）：`fix(backend): 修复站点围栏坐标转换与WKT写入链路`
- C-2（T-2 + T-3）：`refactor(backend): 对齐LBS仓储策略并补齐控制器类型与权限`
- C-3（T-4 + T-5）：`fix(backend): 增强位置命中可用性过滤与区划初始化幂等保护`
- C-4（T-6）：`test(backend): 补齐LBS核心服务单测与集成测试`

## 中期任务（1-2 月）

- [ ] T-7: 统一位置准入模型（围栏与半径规则收敛为单一口径） (2-3d)
- [ ] T-8: 下单链路复用统一准入服务，消除重复逻辑 (1-2d)
- [ ] T-9: 新增 `sys_geo_fence.geom` GIST 空间索引迁移与回滚脚本 (1d)
- [ ] T-10: 区划缓存生效与失效策略落地（含缓存观测） (1d)
- [ ] T-11: 建立位置服务监控（命中率/P95/错误率） (2d)

## 长期任务（3-6 月）

- [ ] T-12: 接入地理编码与逆地理编码能力 (1-2w)
- [ ] T-13: 支持多围栏类型（服务区、禁行区、营业区） (1-2w)
- [ ] T-14: 建设围栏可视化与运营分析工具 (2-4w)
- [ ] T-15: 建立围栏数据质量巡检与自动告警机制 (1-2w)
