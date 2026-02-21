# Marketing 模块全链路测试报告

**执行时间**: 2026-02-17  
**范围**: `marketing/(points|coupon|integration)`  
**命令**: `pnpm --filter @apps/backend test -- --testPathPattern="marketing/(points|coupon|integration)" --passWithNoTests`

---

## 一、关于「数据库错误」日志的说明

控制台里曾出现的 **「数据库错误」「记录积分发放失败时出错」** 等 ERROR 日志，**来自单测里故意构造的失败场景**，不是真实环境故障。

- **来源**：`points/degradation/degradation.service.spec.ts` 中的用例 **「当记录失败时应该记录错误日志」**。
- **目的**：验证当「写失败记录表」也失败（例如数据库不可用）时，服务**不抛错、只打日志**，保证主流程稳定。
- **做法**：单测里对 `mktPointsGrantFailure.create` 做了 `mockRejectedValue(new Error('数据库错误'))`，触发上述逻辑。
- **当前**：已在相关用例中 mock `logger.error`，测试输出中不再打印这些预期内的 ERROR，便于区分真实失败。

---

## 二、测试结果汇总

| 指标            | 结果                  |
| --------------- | --------------------- |
| **Test Suites** | 14 passed, 14 total   |
| **Tests**       | 139 passed, 139 total |
| **Snapshots**   | 0                     |
| **总耗时**      | ~8.7 s                |

**结论**：全部通过，无失败、无跳过。

---

## 三、测试套件与覆盖范围

### 1. Points 积分模块（9 个套件）

| 套件                                               | 类型 | 覆盖内容                                                 |
| -------------------------------------------------- | ---- | -------------------------------------------------------- |
| `points/account/account.service.spec.ts`           | 单元 | 账户创建/获取、余额、加/扣/冻/解冻积分、交易与管理端分页 |
| `points/rule/rule.service.spec.ts`                 | 单元 | 规则 CRUD、消费积分计算、按商品分摊、抵扣计算与校验      |
| `points/rule/rule.service.anti-arbitrage.spec.ts`  | 单元 | 防套利规则与计算                                         |
| `points/rule/rule.controller.spec.ts`              | 单元 | 规则接口                                                 |
| `points/statistics/statistics.service.spec.ts`     | 单元 | 发放/使用/余额/过期统计、排行榜、导出                    |
| `points/task/task.service.spec.ts`                 | 单元 | 任务 CRUD、资格检查、完成任务并发积分                    |
| `points/degradation/degradation.service.spec.ts`   | 单元 | 失败记录、重试队列、状态更新、最终失败标记               |
| `points/degradation/degradation.processor.spec.ts` | 单元 | 重试任务处理（成功/失败/达最大次数）                     |
| `points/points.integration.spec.ts`                | 集成 | 账户→加积分→余额；规则计算；任务→完成→发积分             |

### 2. Coupon 优惠券模块（3 个套件）

| 套件                                               | 类型 | 覆盖内容                                       |
| -------------------------------------------------- | ---- | ---------------------------------------------- |
| `coupon/template/template.service.spec.ts`         | 单元 | 模板列表/详情、创建/更新/停用、配置校验        |
| `coupon/distribution/distribution.service.spec.ts` | 单元 | 领取资格、领取（含锁）、手动发放校验           |
| `coupon/usage/usage.service.spec.ts`               | 单元 | 可用列表、校验、满减/折扣计算、锁/用/解锁/退还 |
| `coupon/coupon.integration.spec.ts`                | 集成 | 创建模板→检查资格→领取→计算抵扣                |

### 3. Integration 订单集成模块（1 个套件）

| 套件                                      | 类型 | 覆盖内容                                                                                                             |
| ----------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------- |
| `integration/integration.service.spec.ts` | 单元 | 订单优惠计算（券+积分）、创建锁券/冻积分、支付用券/扣积分/发消费积分/降级、取消解冻/解锁、退款退券退积分扣回消费积分 |

---

## 四、如何复跑与看结果

```bash
# 在项目根目录执行
cd c:\VueProject\Nest-Admin-Soybean
pnpm --filter @apps/backend test -- --testPathPattern="marketing/(points|coupon|integration)" --passWithNoTests
```

如需安静输出（少日志）：

```bash
pnpm --filter @apps/backend test -- --testPathPattern="marketing/(points|coupon|integration)" --passWithNoTests --silent
```

---

## 五、本次修改摘要

1. **抑制预期内的 ERROR 日志**（便于区分真实失败）：
   - `degradation.service.spec.ts`：写库失败用例、`markAsFinalFailure` 用例中 mock `logger.error`。
   - `degradation.processor.spec.ts`：重试失败的两条用例中 mock `processor.logger.error`。
   - `integration.service.spec.ts`：「订单不存在应抛异常」用例中 mock `service.logger.error`。

2. **测试逻辑未改**：仅减少控制台噪音，断言与用例含义不变。
