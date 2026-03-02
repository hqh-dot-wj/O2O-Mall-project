# 订单集成事件桥接 Process Spec

## 0-Meta

- 操作集合: `calculateOrderDiscount` / `handleOrderCreated` / `handleOrderPaid` / `handleOrderCancelled` / `handleOrderRefunded`
- 级别: **Lite**
- 领域: `integration`
- 调用方: `client/order` / `client/payment`
- 租户类型: `TenantScoped`

## 2-Input

- 输入:
  - `memberId`
  - `orderId`（除计算优惠外）
  - `payAmount`（支付节点）
- 输出:
  - 对应营销事件发送到 `marketing/events`

## 3-PreConditions

| 条件                                                       | 不满足时                 | Rule ID           |
| ---------------------------------------------------------- | ------------------------ | ----------------- |
| 计算优惠完成后发送 `integration.order.discount_calculated` | 仅记录日志，不影响主流程 | R-FLOW-INT-EVT-01 |
| 创建节点成功后发送 `integration.order.created`             | 仅记录日志，不影响主流程 | R-FLOW-INT-EVT-02 |
| 支付节点成功后发送 `integration.order.paid`                | 仅记录日志，不影响主流程 | R-FLOW-INT-EVT-03 |
| 取消节点成功后发送 `integration.order.cancelled`           | 仅记录日志，不影响主流程 | R-FLOW-INT-EVT-04 |
| 退款节点成功后发送 `integration.order.refunded`            | 仅记录日志，不影响主流程 | R-FLOW-INT-EVT-05 |

## 10-TestMapping

| Rule ID           | 测试文件                                                       | 用例                         |
| ----------------- | -------------------------------------------------------------- | ---------------------------- |
| R-FLOW-INT-EVT-01 | `src/module/marketing/integration/integration.service.spec.ts` | 计算优惠后发送 discount 事件 |
| R-FLOW-INT-EVT-02 | `src/module/marketing/integration/integration.service.spec.ts` | 创建节点发送 created 事件    |
| R-FLOW-INT-EVT-03 | `src/module/marketing/integration/integration.service.spec.ts` | 支付节点发送 paid 事件       |
| R-FLOW-INT-EVT-04 | `src/module/marketing/integration/integration.service.spec.ts` | 取消节点发送 cancelled 事件  |
| R-FLOW-INT-EVT-05 | `src/module/marketing/integration/integration.service.spec.ts` | 退款节点发送 refunded 事件   |
