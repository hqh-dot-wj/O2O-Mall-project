/**
 * 积分交易类型（API 层枚举）
 * @description 与 Prisma PointsTransactionType 值一致，用于 Swagger/OpenAPI 文档，避免 Prisma 枚举导致循环依赖
 */
export enum PointsTransactionTypeApi {
  EARN_ORDER = 'EARN_ORDER',
  EARN_SIGNIN = 'EARN_SIGNIN',
  EARN_TASK = 'EARN_TASK',
  EARN_ADMIN = 'EARN_ADMIN',
  USE_ORDER = 'USE_ORDER',
  USE_COUPON = 'USE_COUPON',
  USE_PRODUCT = 'USE_PRODUCT',
  FREEZE = 'FREEZE',
  UNFREEZE = 'UNFREEZE',
  EXPIRE = 'EXPIRE',
  REFUND = 'REFUND',
  DEDUCT_ADMIN = 'DEDUCT_ADMIN',
}
