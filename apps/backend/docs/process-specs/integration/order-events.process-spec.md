# 订单营销事件处理 Process Spec

## 0-Meta

- 操作集合: `handleOrderCreated/handleOrderPaid/handleOrderCancelled/handleOrderRefunded`
- 级别: **Full**
- 领域: `integration`
- 调用方: `client/order`、`client/payment`、`store/order`
- 租户类型: `TenantScoped`

## 1-Why

- 防止订单事件重放导致优惠券、积分重复处理。
- 保证“积分解冻 + 扣减”及“退款返还 + 扣减消费积分”的一致性。

## 2-Input

- `orderId: string`（必填）
- `memberId: string`（必填）
- `payAmount?: number`（支付成功流程）

## 3-PreConditions

| 条件                       | 不满足时                 | Rule ID        |
| -------------------------- | ------------------------ | -------------- |
| 订单存在                   | 抛业务异常“订单不存在”   | R-PRE-ORDER-01 |
| 退款扣减前账户可用积分充足 | 不足时跳过扣减并记录警告 | R-PRE-ORDER-02 |

## 4-HappyPath

| 步骤                                      | 说明         | Rule ID         |
| ----------------------------------------- | ------------ | --------------- |
| created 事件：锁券+冻结积分               | 首次事件执行 | R-FLOW-ORDER-01 |
| paid 事件：核销券+解冻扣减+发放积分       | 事务内执行   | R-FLOW-ORDER-02 |
| cancelled 事件：解锁券+解冻积分           | 首次事件执行 | R-FLOW-ORDER-03 |
| refunded 事件：退券+返还积分+回收消费积分 | 首次事件执行 | R-FLOW-ORDER-04 |

## 5-BranchRules

| 分支             | 行为                           | Rule ID           |
| ---------------- | ------------------------------ | ----------------- |
| 积分发放失败     | 写降级记录，不中断支付主流程   | R-BRANCH-ORDER-01 |
| 消费积分余额不足 | 跳过退款扣减，不中断退款主流程 | R-BRANCH-ORDER-02 |

## 6-StateMachine

- 本流程依赖订单状态与营销实例状态，不在本 Service 内定义状态机。
- 与 `instance` 状态机对齐：支付成功/退款均通过上游调用约束。

## 7-ExceptionStrategy

- 订单不存在直接抛业务异常：`R-PRE-ORDER-01`
- 业务主流程失败记录日志并抛出（除降级分支）：`R-LOG-ORDER-01`

## 8-Idempotency

- 四类订单事件统一使用 Redis SetNX 键：
  - `idempotency:order:marketing:created:{orderId}`
  - `idempotency:order:marketing:paid:{orderId}`
  - `idempotency:order:marketing:cancelled:{orderId}`
  - `idempotency:order:marketing:refunded:{orderId}`
- 重复事件直接忽略：`R-CONCUR-ORDER-01`

## 9-Observability

- 关键事件日志：
  - 重复事件忽略
  - 支付流程失败
  - 退款扣减跳过（余额不足）
- Rule ID: `R-LOG-ORDER-01`

## 10-TestMapping

| Rule ID           | 测试文件                                                       | 用例                       |
| ----------------- | -------------------------------------------------------------- | -------------------------- |
| R-CONCUR-ORDER-01 | `src/module/marketing/integration/integration.service.spec.ts` | 幂等键已存在时忽略重复处理 |
| R-PRE-ORDER-01    | `src/module/marketing/integration/integration.service.spec.ts` | 订单不存在抛异常           |
| R-FLOW-ORDER-02   | `src/module/marketing/integration/integration.service.spec.ts` | 支付成功全链路处理         |
| R-BRANCH-ORDER-01 | `src/module/marketing/integration/integration.service.spec.ts` | 发放积分失败走降级         |
| R-BRANCH-ORDER-02 | `src/module/marketing/integration/integration.service.spec.ts` | 退款扣减余额不足时跳过     |
