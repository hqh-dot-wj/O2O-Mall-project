# P1 任务执行计划

> 创建日期: 2026-02-24  
> 状态: 📝 计划中  
> 预估总工时: 2-3 周

---

## 1. 执行概述

根据架构验证文档,P1 任务包括:

1. **消除其他模块 any 类型** (1 周)
2. **定义核心接口 SLO** (3 天)
3. **完善技术债标记** (2 天)

---

## 2. 任务 1: 消除其他模块 any 类型

### 2.1 现状分析

**已完成**:

- ✅ Finance 模块: 24 处 → 0 处 (100% 消除)

**待处理模块统计**:

| 模块           | any 类型数量 | 优先级 | 预估工时    |
| -------------- | ------------ | ------ | ----------- |
| Store 模块     | ~30 处       | P1     | 2 天        |
| PMS 模块       | ~20 处       | P1     | 1.5 天      |
| Marketing 模块 | ~25 处       | P1     | 1.5 天      |
| Client 模块    | ~20 处       | P1     | 1.5 天      |
| Admin 模块     | ~40 处       | P2     | 2 天        |
| 测试文件       | ~80 处       | P3     | 3 天 (可选) |

**总计**: 约 215 处 any 类型使用

### 2.2 分阶段执行策略

#### 第一阶段: Store 模块 (2 天)

**文件清单**:

1. `store-order.service.ts` - 查询参数类型化
2. `store-finance.service.ts` - 导出参数类型化
3. `ledger.service.ts` - 查询结果类型化
4. `distribution.service.ts` - 日志映射类型化

**改进方案**:

- 使用 Prisma 生成的类型
- 定义专用的查询结果类型
- 使用 `Record<string, unknown>` 替代 any

#### 第二阶段: PMS 模块 (1.5 天)

**文件清单**:

1. `product.service.ts` - SKU 创建/更新类型化
2. `product.repository.ts` - 查询条件类型化
3. `category.service.ts` - 树形结构类型化
4. `create-product.dto.ts` - specDef 类型定义

**改进方案**:

- 定义 SKU 相关类型
- 使用 Prisma WhereInput 类型
- 定义树形节点类型

#### 第三阶段: Marketing 模块 (1.5 天)

**文件清单**:

1. `play.registry.ts` - ruleSchema 类型化
2. `strategy.interface.ts` - 策略接口参数类型化
3. `play.factory.ts` - 注册方法类型化
4. `play-strategy.decorator.ts` - 装饰器类型优化
5. `member-upgrade.service.ts` - 策略实现类型化
6. `group-buy.service.ts` - 策略实现类型化

**改进方案**:

- 定义 RuleSchema 类型
- 定义策略参数类型
- 使用泛型约束

#### 第四阶段: Client 模块 (1.5 天)

**文件清单**:

1. `product.service.ts` - 营销活动类型化
2. `payment.service.ts` - 预支付参数类型化
3. `order-checkout.service.ts` - 营销配置类型化
4. `order.service.ts` - 订单查询类型化
5. `client-finance.service.ts` - 查询条件类型化
6. `address.service.ts` - VO 转换类型化
7. `auth.service.ts` - Token 生成类型化

**改进方案**:

- 定义营销活动类型
- 定义订单相关类型
- 使用 Prisma 类型

### 2.3 类型定义策略

**通用类型库扩展** (`apps/backend/src/common/types/`):

1. **store.types.ts** - Store 模块类型
   - `OrderQueryParams`
   - `LedgerExportParams`
   - `DistributionLogItem`

2. **pms.types.ts** - PMS 模块类型
   - `SkuCreateInput`
   - `SkuUpdateInput`
   - `TreeNode<T>`
   - `SpecDefinition`

3. **marketing.types.ts** - Marketing 模块类型
   - `RuleSchema`
   - `StrategyParams`
   - `PlayConfig`
   - `MarketingActivity`

4. **client.types.ts** - Client 模块类型
   - `CheckoutParams`
   - `OrderListQuery`
   - `AddressData`
   - `TokenPayload`

### 2.4 验收标准

- [ ] Store 模块 any 类型减少 90%+
- [ ] PMS 模块 any 类型减少 90%+
- [ ] Marketing 模块 any 类型减少 90%+
- [ ] Client 模块 any 类型减少 90%+
- [ ] 所有现有测试通过
- [ ] 类型检查无错误
- [ ] 创建改进文档

---

## 3. 任务 2: 定义核心接口 SLO

### 3.1 SLO 分类

根据后端开发规范 §11,接口按业务重要性分为 4 类:

| 类别    | P99 延迟 | 可用性 | 适用场景           |
| ------- | -------- | ------ | ------------------ |
| payment | < 200ms  | 99.99% | 支付、退款         |
| core    | < 500ms  | 99.9%  | 订单创建、佣金计算 |
| list    | < 1000ms | 99.5%  | 列表查询           |
| admin   | < 2000ms | 99%    | 后台管理           |

### 3.2 核心接口识别

#### Payment 级别 (< 200ms, 99.99%)

**Finance 模块**:

- `POST /admin/finance/withdrawal/audit` - 提现审核
- `POST /client/finance/withdrawal/apply` - 申请提现

**Store 模块**:

- `POST /client/payment/prepay` - 发起支付
- `POST /client/payment/notify` - 支付回调

#### Core 级别 (< 500ms, 99.9%)

**Store 模块**:

- `POST /client/order/create` - 创建订单
- `POST /client/order/confirm-payment` - 确认支付

**Finance 模块**:

- `POST /admin/finance/commission/calculate` - 计算佣金
- `POST /admin/finance/commission/settle` - 结算佣金

**Marketing 模块**:

- `POST /client/marketing/play/join` - 参与营销活动
- `GET /client/marketing/play/validate` - 校验参与资格

#### List 级别 (< 1000ms, 99.5%)

**Store 模块**:

- `GET /client/order/list` - 订单列表
- `GET /client/product/list` - 商品列表

**Finance 模块**:

- `GET /client/finance/ledger/list` - 流水列表
- `GET /client/finance/commission/list` - 佣金列表

#### Admin 级别 (< 2000ms, 99%)

**Admin 模块**:

- `GET /admin/system/user/list` - 用户列表
- `POST /admin/system/user/export` - 导出用户

### 3.3 SLO 标注方式

使用 JSDoc 注释标注:

```typescript
/**
 * 创建订单
 * @sloCategory core
 * @sloLatency P99 < 500ms
 * @sloAvailability 99.9%
 */
@Post('create')
async createOrder(@Body() dto: CreateOrderDto) {
  return this.orderService.create(dto);
}
```

### 3.4 实施步骤

1. **识别核心接口** (0.5 天)
   - 遍历所有 Controller
   - 按业务重要性分类
   - 创建接口清单

2. **标注 SLO** (1 天)
   - 在 Controller 方法上添加 JSDoc
   - 标注 sloCategory、sloLatency、sloAvailability
   - 更新 API 文档

3. **建立监控基线** (1 天)
   - 配置 APM 监控
   - 设置告警规则
   - 创建监控大盘

4. **创建 SLO 文档** (0.5 天)
   - 汇总所有接口 SLO
   - 说明监控方法
   - 定义告警策略

### 3.5 验收标准

- [ ] 所有核心接口已标注 SLO
- [ ] 创建 SLO 汇总文档
- [ ] 配置监控告警
- [ ] 建立监控大盘

---

## 4. 任务 3: 完善技术债标记

### 4.1 技术债分类

根据后端开发规范 §16.1,技术债分为 4 类:

| 类型   | 标记格式                          | 说明         |
| ------ | --------------------------------- | ------------ |
| 代码债 | `// TECH-DEBT [代码债] [P1] 描述` | 代码质量问题 |
| 架构债 | `// TECH-DEBT [架构债] [P1] 描述` | 架构设计问题 |
| 测试债 | `// TECH-DEBT [测试债] [P2] 描述` | 测试覆盖不足 |
| 文档债 | `// TECH-DEBT [文档债] [P2] 描述` | 文档缺失     |

### 4.2 技术债识别

#### 代码债

**God Class**:

- ✅ CommissionService (已拆分)
- ⚠️ OrderService (500+ 行,待拆分)
- ⚠️ ProductService (400+ 行,待拆分)

**硬编码**:

- 魔法数字 (如 100、500、1000)
- 硬编码配置 (如超时时间、限额)

**重复代码**:

- 相似的查询逻辑
- 相似的校验逻辑

#### 架构债

**模块间直接依赖**:

- OrderService → CommissionService (应使用事件)
- PaymentService → OrderService (应使用事件)

**缺少抽象**:

- 支付渠道未抽象 (微信、支付宝硬编码)
- 营销策略未完全抽象

#### 测试债

**测试覆盖不足**:

- Store 模块测试覆盖率 < 60%
- Marketing 模块测试覆盖率 < 50%

**缺少集成测试**:

- 订单支付流程
- 佣金计算流程

#### 文档债

**缺少设计文档**:

- Store 模块设计文档
- Marketing 模块设计文档

**缺少 API 文档**:

- 部分接口缺少 Swagger 注释

### 4.3 实施步骤

1. **扫描代码库** (0.5 天)
   - 使用工具扫描 God Class
   - 识别硬编码和魔法数字
   - 检查测试覆盖率

2. **标记技术债** (1 天)
   - 在代码中添加 TECH-DEBT 注释
   - 按优先级分类
   - 记录位置和描述

3. **创建技术债清单** (0.5 天)
   - 汇总所有技术债
   - 按模块和类型分类
   - 估算偿还工时

### 4.4 验收标准

- [ ] 所有已知技术债已标记
- [ ] 创建技术债清单文档
- [ ] 按优先级排序
- [ ] 制定偿还计划

---

## 5. 执行时间表

### 第一周 (2026-02-25 ~ 2026-03-03)

| 日期 | 任务                        | 产出     |
| ---- | --------------------------- | -------- |
| 2/25 | Store 模块 any 类型消除     | 改进文档 |
| 2/26 | Store 模块 any 类型消除     | 测试通过 |
| 2/27 | PMS 模块 any 类型消除       | 改进文档 |
| 2/28 | PMS 模块 any 类型消除       | 测试通过 |
| 3/1  | Marketing 模块 any 类型消除 | 改进文档 |
| 3/2  | Marketing 模块 any 类型消除 | 测试通过 |
| 3/3  | Client 模块 any 类型消除    | 改进文档 |

### 第二周 (2026-03-04 ~ 2026-03-10)

| 日期 | 任务                     | 产出       |
| ---- | ------------------------ | ---------- |
| 3/4  | Client 模块 any 类型消除 | 测试通过   |
| 3/5  | 识别核心接口 SLO         | 接口清单   |
| 3/6  | 标注 SLO                 | 代码更新   |
| 3/7  | 标注 SLO                 | 代码更新   |
| 3/8  | 建立监控基线             | 监控配置   |
| 3/9  | 创建 SLO 文档            | SLO 文档   |
| 3/10 | 扫描技术债               | 技术债清单 |

### 第三周 (2026-03-11 ~ 2026-03-17)

| 日期    | 任务           | 产出       |
| ------- | -------------- | ---------- |
| 3/11    | 标记技术债     | 代码标记   |
| 3/12    | 标记技术债     | 代码标记   |
| 3/13    | 创建技术债清单 | 技术债文档 |
| 3/14    | 总结和验收     | 总结报告   |
| 3/15-17 | 缓冲时间       | -          |

---

## 6. 风险与应对

### 6.1 风险识别

| 风险             | 可能性 | 影响 | 应对措施                      |
| ---------------- | ------ | ---- | ----------------------------- |
| 类型定义过于复杂 | 中     | 中   | 保持简洁,优先使用 Prisma 类型 |
| 破坏现有功能     | 低     | 高   | 充分测试,渐进式改造           |
| 工时超出预期     | 中     | 中   | 按优先级执行,P2/P3 可延后     |
| SLO 标准不合理   | 中     | 低   | 参考行业标准,逐步调整         |

### 6.2 应对策略

1. **渐进式改造**: 按模块逐步推进,避免大规模变更
2. **充分测试**: 每个模块改造后运行完整测试
3. **文档先行**: 先定义类型,再修改代码
4. **及时反馈**: 发现问题及时调整方案

---

## 7. 成功标准

### 7.1 量化指标

| 指标                | 当前    | 目标            | 测量方式        |
| ------------------- | ------- | --------------- | --------------- |
| any 类型 (核心模块) | ~215 处 | < 30 处         | grep 统计       |
| 类型覆盖率          | ~85%    | > 95%           | TypeScript 检查 |
| SLO 标注覆盖        | 0%      | 100% (核心接口) | 手动统计        |
| 技术债标记          | 0 处    | 可视化          | grep TECH-DEBT  |

### 7.2 质量标准

- ✅ 所有测试通过
- ✅ TypeScript 严格模式检查通过
- ✅ 无运行时类型错误
- ✅ API 响应格式保持一致
- ✅ 性能无明显下降

---

## 8. 参考文档

- 架构验证报告: `docs/analysis/architecture-validation-and-action-plan.md`
- 后端开发规范: `.kiro/steering/backend-nestjs.md`
- Finance 模块改进: `apps/backend/docs/improvements/p1-eliminate-finance-any-types.md`

---

**文档版本**: 1.0  
**创建日期**: 2026-02-24  
**维护者**: @linlingqin77
