# 门店订单部分退款功能实现总结

> 任务：T-9 部分退款（按商品维度）
> 完成时间：2026-02-26
> 工时：约 3 小时

## 功能概述

实现了按订单项（商品维度）的部分退款功能，支持：

- 按订单项指定退款数量
- 按比例计算退款金额
- 按比例回滚佣金（包括已结算佣金从钱包扣减）
- 按比例退还优惠券和积分
- 自动判断是否全部退款并更新订单状态

## 实现细节

### 1. DTO 定义

**文件**：`apps/backend/src/module/store/order/dto/store-order.dto.ts`

新增两个 DTO：

- `PartialRefundItemDto`：退款订单项（itemId + quantity）
- `PartialRefundOrderDto`：部分退款请求（orderId + items[] + remark）

### 2. Controller 接口

**文件**：`apps/backend/src/module/store/order/store-order.controller.ts`

新增接口：

- 路径：`POST /order/refund/partial`
- 权限：`store:order:refund`
- 操作日志：`BusinessType.UPDATE`

### 3. Service 方法

**文件**：`apps/backend/src/module/store/order/store-order.service.ts`

新增方法：`partialRefundOrder(dto, operatorId)`

**核心逻辑**：

1. 查询订单和订单项（包含有效佣金）
2. 校验订单状态（不允许待支付、已取消、已退款）
3. 校验退款订单项（存在性、数量合法性）
4. 计算退款金额（按订单项价格 × 数量）
5. 计算退款比例（退款金额 / 订单实付金额）
6. 按比例回滚佣金：
   - 更新佣金状态为 CANCELLED
   - 如果佣金已结算，从钱包扣减对应金额
7. 按比例退还优惠券和积分（调用 OrderIntegrationService）
8. 判断是否全部退款：
   - 全部退款：订单状态改为 REFUNDED
   - 部分退款：订单状态保持不变，仅更新备注
9. 记录退款明细到订单 remark

**返回数据**：

- `refundAmount`：退款金额
- `refundRatio`：退款比例（百分比）
- `isFullRefund`：是否全部退款
- `refundDetails`：退款明细（itemId + quantity + amount）

### 4. 单元测试

**文件**：`apps/backend/src/module/store/order/store-order.service.spec.ts`

新增 5 个测试用例：

1. ✅ 部分退款订单项（正常场景）
2. ✅ 全部退款时标记订单为 REFUNDED
3. ✅ 订单不存在时抛出异常
4. ✅ 订单项不存在时抛出异常
5. ✅ 退款数量超过购买数量时抛出异常

**测试结果**：22/22 通过 ✅

## 技术亮点

### 1. 按比例计算

使用 `Prisma.Decimal` 精确计算退款比例，避免浮点数精度问题：

```typescript
const refundRatio = refundAmount.div(order.payAmount).toDecimalPlaces(4);
```

### 2. 佣金回滚

支持两种佣金状态的回滚：

- `FROZEN`（冻结）：仅更新状态为 CANCELLED
- `SETTLED`（已结算）：更新状态 + 从钱包扣减金额

### 3. 全部退款判断

精确判断是否全部退款（所有订单项都退且数量相等）：

```typescript
const isFullRefund =
  dto.items.length === orderItems.length &&
  dto.items.every((refundItem) => {
    const orderItem = orderItems.find((item) => item.id === refundItem.itemId)!;
    return refundItem.quantity === orderItem.quantity;
  });
```

### 4. 事务保证

使用 `@Transactional()` 装饰器确保数据一致性：

- 订单状态更新
- 佣金状态更新
- 钱包余额扣减
- 优惠券/积分退还

## 遵循规范

### 1. 类型安全 ✅

- 禁止 `any`
- 使用 `Prisma.Decimal` 处理金额
- DTO 使用 class-validator 校验

### 2. 异常处理 ✅

- 使用 `BusinessException.throwIfNull`
- 使用 `BusinessException.throwIf`
- 统一返回 `Result<T>`

### 3. 复杂度控制 ✅

- 使用卫语句替代嵌套 if
- 单方法约 80 行（符合规范）

### 4. 测试覆盖 ✅

- 正常场景
- 边界场景（全部退款）
- 异常场景（订单不存在、订单项不存在、数量超限）

## 待优化项

### 1. 微信退款 API 对接（T-7）

当前仅更新数据库状态，未对接微信退款 API。建议流程：

1. 更新订单状态
2. 调用微信退款 API
3. 退款成功后执行佣金回滚和优惠券/积分退还
4. 处理退款回调通知（异步确认）

### 2. 退款记录表

建议新增 `oms_refund` 表记录退款历史：

- 退款单号
- 关联订单
- 退款金额
- 退款原因
- 退款状态（申请中、已退款、退款失败）
- 退款时间

### 3. 库存回滚

当前未实现库存回滚，建议：

- 部分退款时按退款数量恢复库存
- 调用 `StockService.restoreStock()`

## 性能指标

- 单元测试执行时间：< 30 秒 ✅
- 预估 P99 延迟：< 500ms（核心交易级别）
- 数据库操作：
  - 1 次订单查询（含订单项和佣金）
  - N 次佣金更新（N = 佣金数量）
  - M 次钱包更新（M = 已结算佣金数量）
  - 1 次订单更新
  - 1 次优惠券/积分退还

## 文件清单

| 文件                                  | 变更类型 | 说明                                        |
| ------------------------------------- | -------- | ------------------------------------------- |
| `dto/store-order.dto.ts`              | 新增     | PartialRefundItemDto、PartialRefundOrderDto |
| `store-order.controller.ts`           | 新增     | POST /order/refund/partial 接口             |
| `store-order.service.ts`              | 新增     | partialRefundOrder 方法                     |
| `store-order.service.spec.ts`         | 新增     | 5 个测试用例                                |
| `docs/tasks/store-order-task-list.md` | 更新     | 标记 T-9 完成                               |

## 总结

部分退款功能已完整实现并通过所有单元测试。核心逻辑清晰，遵循项目规范，支持按商品维度精确退款。后续可结合微信退款 API（T-7）和退款记录表优化完整退款流程。
