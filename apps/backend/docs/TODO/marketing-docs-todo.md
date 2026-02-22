# Marketing 模块文档编写待办

> 日期：2026-02-22
> 模块路径：`src/module/marketing`
> 文档目标路径：`docs/requirements/marketing/`、`docs/design/marketing/`

---

## 一、模块结构总览

Marketing 模块采用 MaaS（Marketing as a Service）架构，包含 15 个子模块，按职责可分为 3 层：

### 核心引擎层（MaaS 平台）

| 子模块   | 路径                  | 职责                                     | 复杂度 | 代码文件数 |
| -------- | --------------------- | ---------------------------------------- | ------ | ---------- |
| template | `marketing/template/` | 元数据中心：玩法模板定义（拼团、秒杀等） | 低     | 5          |
| config   | `marketing/config/`   | 配置中心：门店商品与玩法绑定、版本控制   | 中     | 7          |
| instance | `marketing/instance/` | 执行中心：活动参与记录、状态机流转       | 高     | 7          |
| play     | `marketing/play/`     | 策略中心：策略模式实现各玩法逻辑         | 高     | 14         |
| stock    | `marketing/stock/`    | 库存中心：Redis Lua 高并发名额控制       | 中     | 4          |
| asset    | `marketing/asset/`    | 履约中心：核销券、次卡等虚拟资产         | 中     | 5          |

### 独立业务域

| 子模块      | 路径                     | 职责                                      | 复杂度 | 代码文件数 |
| ----------- | ------------------------ | ----------------------------------------- | ------ | ---------- |
| coupon      | `marketing/coupon/`      | 优惠券系统（模板/发放/使用/统计/定时）    | 高     | 15+        |
| points      | `marketing/points/`      | 积分系统（账户/规则/签到/任务/降级/统计） | 高     | 20+        |
| integration | `marketing/integration/` | 订单集成：优惠券+积分与订单结算对接       | 中     | 3          |

### 基础设施层

| 子模块    | 路径                   | 职责                         | 复杂度 | 代码文件数 |
| --------- | ---------------------- | ---------------------------- | ------ | ---------- |
| events    | `marketing/events/`    | 事件驱动：营销事件发布/监听  | 低     | 5          |
| scheduler | `marketing/scheduler/` | 生命周期调度：活动自动上下架 | 低     | 2          |
| rule      | `marketing/rule/`      | 规则校验：运营配置合法性校验 | 低     | 4          |
| approval  | `marketing/approval/`  | 审批流：活动上线审核         | 低     | 3          |
| gray      | `marketing/gray/`      | 灰度发布：按比例/白名单控制  | 低     | 3          |
| common    | `marketing/common/`    | 公共工具：缓存装饰器等       | 低     | 1          |

### 数据流

```
Template(蓝图) → Config(门店应用) → Instance(用户参与/支付) → Asset(履约凭证)
                                                            ↘ Wallet(资金结算)
Coupon(优惠券) ──┐
                 ├→ Integration(订单集成) → Order(订单模块)
Points(积分) ───┘
```

---

## 二、文档清理记录

### 已删除（源码目录内的非正式文档）

| 文件                                           | 原因                             |
| ---------------------------------------------- | -------------------------------- |
| `marketing/COMPLETE_USER_FLOW.md`              | 产品流程草稿，非正式文档         |
| `marketing/IMPLEMENTATION_PLAN.md`             | AI 生成的实施方案 V1，已过时     |
| `marketing/IMPLEMENTATION_PLAN_V2.md`          | AI 生成的实施方案 V2，一次性笔记 |
| `marketing/MAAS_ANALYSIS.md`                   | MaaS 局限性分析，一次性笔记      |
| `marketing/MARKETING_UX_DESIGN.md`             | UX 设计稿，不属于后端源码        |
| `marketing/README.md`                          | 旧 README，引用了不存在的文档    |
| `marketing/approval/IMPLEMENTATION_SUMMARY.md` | 任务实施日志                     |
| `marketing/approval/README.md`                 | 子模块 README，将被正式文档替代  |
| `marketing/gray/IMPLEMENTATION_SUMMARY.md`     | 任务实施日志                     |
| `marketing/gray/README.md`                     | 子模块 README，将被正式文档替代  |
| `marketing/gray/TASK_7.2_IMPLEMENTATION.md`    | 任务实施日志                     |
| `marketing/config/TASK_7.4_IMPLEMENTATION.md`  | 任务实施日志                     |
| `marketing/config/VERSION_CONTROL_README.md`   | 功能 README，将被正式文档替代    |

### 已归档到 `docs/archive/`（docs 根目录的旧文档）

| 文件                                           | 原因                          |
| ---------------------------------------------- | ----------------------------- |
| `COUPON_AND_POINTS_IMPLEMENTATION.md`          | 实施总结，非正式需求/设计文档 |
| `COUPON_AND_POINTS_QUICK_START.md`             | 快速开始指南，归档            |
| `COUPON_AND_POINTS_DEPLOYMENT.md`              | 部署指南，归档                |
| `coupon-and-points-database-schema.md`         | 数据库 schema 说明，归档      |
| `QUICK_START_MARKETING.md`                     | 营销快速开始，归档            |
| `MARKETING_TEMPLATES_AND_EXTENSIONS.md`        | 模板分析，归档                |
| `MARKETING_RESET_GUIDE.md`                     | 重置脚本指南，归档            |
| `MAAS_ARCHITECTURE_IMPROVEMENT.md`             | 架构改进方案，归档            |
| `COURSE_GROUP_BUY_EXTENSION_IMPLEMENTATION.md` | 拼团扩展实施，归档            |
| `COURSE_PRODUCTS_SEED_GUIDE.md`                | 种子数据指南，归档            |
| `POINTS_ANTI_ARBITRAGE_IMPLEMENTATION.md`      | 积分防套利实施，归档          |
| `POINTS_QUICK_START.md`                        | 积分快速开始，归档            |
| `DEGRADATION_STRATEGY.md`                      | 降级策略，归档                |
| `PLATFORM_COMMISSION_GUIDE.md`                 | 平台抽成说明，归档            |
| `PLATFORM_COMMISSION_REALITY_CHECK.md`         | 平台抽成现状，归档            |

### 保留（源码内的模块说明文档）

以下 `*.md` 文件是子模块的内联说明文档，描述文件结构和职责，保留：

- `marketing/marketing.md` — 模块总览
- `marketing/asset/asset.md`
- `marketing/config/config.md`
- `marketing/instance/instance.md`
- `marketing/play/play.md`
- `marketing/stock/stock.md`
- `marketing/template/template.md`

---

## 三、文档编写待办（推荐顺序）

### 编写原则

1. 每个文档组 = 需求文档 + 设计文档
2. 按「核心引擎 → 独立业务域 → 基础设施」的顺序编写
3. 核心引擎层 6 个子模块关联紧密，建议合并为 1 组文档（MaaS 平台整体）
4. coupon 和 points 各自独立且复杂，各出 1 组文档
5. integration 与 coupon/points 关联紧密，可合并到 coupon 或 points 文档中
6. 基础设施层（events/scheduler/rule/approval/gray/common）较简单，合并为 1 组文档

### 编写顺序

| 优先级 | 序号 | 文档组           | 覆盖子模块                                                                    | 输出路径                                            | 预估工时 | 理由                    |
| ------ | ---- | ---------------- | ----------------------------------------------------------------------------- | --------------------------------------------------- | -------- | ----------------------- |
| P0     | 1    | ✅ MaaS 核心引擎 | template, config, instance, play, stock, asset                                | `docs/{requirements,design}/marketing/maas/`        | 大       | ✅ 已完成（2026-02-22） |
| P1     | 2    | ✅ 优惠券系统    | coupon (template/distribution/usage/management/statistics/scheduler)          | `docs/{requirements,design}/marketing/coupon/`      | 中       | ✅ 已完成（2026-02-22） |
| P1     | 3    | ✅ 积分系统      | points (account/rule/signin/task/degradation/management/statistics/scheduler) | `docs/{requirements,design}/marketing/points/`      | 中       | ✅ 已完成（2026-02-22） |
| P2     | 4    | ✅ 订单集成      | integration                                                                   | `docs/{requirements,design}/marketing/integration/` | 小       | ✅ 已完成（2026-02-22） |
| P2     | 5    | ✅ 基础设施      | events, scheduler, rule, approval, gray, common                               | `docs/{requirements,design}/marketing/infra/`       | 小       | ✅ 已完成（2026-02-22） |

### 详细说明

#### 第 1 组：MaaS 核心引擎（最先编写）

理由：这是 marketing 模块的核心骨架，其他所有子模块都围绕它运转。

需要重点分析：

- `PlayTemplate → StorePlayConfig → PlayInstance → MktUserAsset` 四表联动
- 策略模式（`IMarketingStrategy`）的扩展机制
- Redis Lua 库存扣减的并发安全
- 状态机（`state-machine.config.ts`）的状态流转
- 活动冲突矩阵（`activity-conflict.matrix.ts`）
- 版本控制（`rulesHistory`）
- 幂等性（`idempotency.service.ts`）

跨模块关联：

- config → pms（商品关联）
- config → store（门店关联）
- instance → client/order（订单支付回调）
- asset → client（C 端核销）

#### 第 2 组：优惠券系统

需要重点分析：

- 优惠券模板（满减/折扣/兑换 3 种类型）
- 发放机制（Redis 分布式锁防超发）
- 使用/核销流程
- 定时任务（过期处理）
- 统计分析

#### 第 3 组：积分系统

需要重点分析：

- 积分账户（余额/冻结/过期）
- 积分规则（获取/消耗/防套利）
- 签到系统
- 积分任务
- 降级策略（Bull 队列异步重试）
- 统计分析

#### 第 4 组：订单集成

需要重点分析：

- 优惠计算（`calculateDiscount`）
- 优惠券+积分叠加规则
- 与 `client/order` 的对接方式

#### 第 5 组：基础设施

需要重点分析：

- 事件类型定义与监听机制
- 生命周期调度（自动上下架 cron）
- 规则校验器
- 审批流状态机
- 灰度发布策略（白名单/百分比）
