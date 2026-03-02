# Coupon/Points 与 Integration 对接契约

## 0-Meta

- 领域: `integration` / `coupon` / `points`
- 目标: 明确订单营销集成层与优惠券、积分模块的边界与调用契约
- 适用服务: `OrderIntegrationService`

## 1-模块边界

- `integration` 负责订单营销编排（锁券、核销、冻结/解冻/扣减/返还积分、发放消费积分）。
- `coupon` 负责优惠券状态机与使用记录，外部只通过 `CouponUsageService` 访问。
- `points` 负责积分账户与交易，外部只通过 `PointsAccountService` / `PointsRuleService` 访问。
- `integration` 不直接改写 coupon 业务规则与 points 规则，只消费公开服务契约。

## 2-调用契约（同步）

| 场景     | Integration 调用                                       | 入参                                      | 成功语义                       | 失败语义                       |
| -------- | ------------------------------------------------------ | ----------------------------------------- | ------------------------------ | ------------------------------ |
| 订单创建 | `couponUsageService.lockCoupon`                        | `userCouponId, orderId`                   | 优惠券状态变为 `LOCKED`        | 抛业务异常，创建流程失败       |
| 订单创建 | `pointsAccountService.freezePoints`                    | `memberId, pointsUsed, orderId`           | 可用积分冻结                   | 抛业务异常，创建流程失败       |
| 订单支付 | `couponUsageService.useCoupon`                         | `userCouponId, orderId, discountAmount`   | 券核销并写使用记录             | 抛业务异常，支付营销流程失败   |
| 订单支付 | `pointsAccountService.unfreezePoints` + `deductPoints` | `memberId, pointsUsed, orderId`           | 冻结积分转为已使用             | 抛业务异常，支付营销流程失败   |
| 订单支付 | `pointsAccountService.addPoints`                       | `memberId, totalPointsToEarn, EARN_ORDER` | 发放消费积分                   | 记录降级重试，不阻塞支付主流程 |
| 订单取消 | `couponUsageService.unlockCoupon`                      | `userCouponId`                            | 券解锁可复用                   | 抛业务异常，取消营销流程失败   |
| 订单取消 | `pointsAccountService.unfreezePoints`                  | `memberId, pointsUsed, orderId`           | 积分解冻                       | 抛业务异常，取消营销流程失败   |
| 订单退款 | `couponUsageService.refundCoupon`                      | `userCouponId`                            | 已用券返还为可用（未过期前提） | 抛业务异常，退款营销流程失败   |
| 订单退款 | `pointsAccountService.addPoints`                       | `memberId, pointsUsed, REFUND`            | 返还已抵扣积分                 | 抛业务异常，退款营销流程失败   |
| 订单退款 | `pointsAccountService.deductPoints`                    | `memberId, earnedPoints, DEDUCT_ADMIN`    | 回收消费赠送积分               | 余额不足时跳过并告警           |

## 3-幂等与并发契约

- 幂等键（Redis SetNX）：
  - `idempotency:order:marketing:created:{orderId}`
  - `idempotency:order:marketing:paid:{orderId}`
  - `idempotency:order:marketing:cancelled:{orderId}`
  - `idempotency:order:marketing:refunded:{orderId}`
- 分布式锁键：
  - `lock:order:marketing:{eventType}:{orderId}`
- 契约要求：
  - 同一 `orderId + eventType` 重复事件必须被忽略；
  - 未获取锁时直接跳过，避免并发重复处理。

## 4-事件契约（异步）

| 事件类型                                | 触发节点                 | 必备字段                                 | payload 约定                                                                            |
| --------------------------------------- | ------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `integration.order.discount_calculated` | `calculateOrderDiscount` | `tenantId, instanceId, memberId`         | `originalAmount, couponDiscount, pointsDiscount, totalDiscount, finalAmount, itemCount` |
| `integration.order.created`             | `handleOrderCreated`     | `tenantId, instanceId=orderId, memberId` | `userCouponId, pointsUsed`                                                              |
| `integration.order.paid`                | `handleOrderPaid`        | `tenantId, instanceId=orderId, memberId` | `payAmount, userCouponId, pointsUsed, earnedPoints`                                     |
| `integration.order.cancelled`           | `handleOrderCancelled`   | `tenantId, instanceId=orderId, memberId` | `userCouponId, pointsUsed`                                                              |
| `integration.order.refunded`            | `handleOrderRefunded`    | `tenantId, instanceId=orderId, memberId` | `userCouponId, refundPoints`                                                            |

## 5-测试映射

| 契约点             | 测试文件                                                       | 代表用例                                |
| ------------------ | -------------------------------------------------------------- | --------------------------------------- |
| 订单创建编排与幂等 | `src/module/marketing/integration/integration.service.spec.ts` | 锁券+冻结积分、幂等键命中忽略           |
| 订单支付编排       | `src/module/marketing/integration/integration.service.spec.ts` | 核销券+解冻扣减+发放消费积分            |
| 退款分支降级       | `src/module/marketing/integration/integration.service.spec.ts` | 余额不足跳过消费积分回收                |
| 集成事件监听       | `src/module/marketing/events/marketing-event.listener.spec.ts` | `integration.order.paid` 事件入统计缓存 |
