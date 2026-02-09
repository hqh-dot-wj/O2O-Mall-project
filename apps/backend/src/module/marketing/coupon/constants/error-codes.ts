/**
 * 优惠券错误码定义
 * 
 * @description 定义优惠券模块的所有错误码，便于统一管理和国际化
 */
export enum CouponErrorCode {
  // 模板相关错误 (1000-1099)
  TEMPLATE_NOT_FOUND = 'COUPON_1000',
  TEMPLATE_INACTIVE = 'COUPON_1001',
  TEMPLATE_CONFIG_INVALID = 'COUPON_1002',
  TEMPLATE_CANNOT_MODIFY = 'COUPON_1003',
  TEMPLATE_STOCK_INSUFFICIENT = 'COUPON_1004',

  // 发放相关错误 (1100-1199)
  DISTRIBUTION_FAILED = 'COUPON_1100',
  CLAIM_LIMIT_EXCEEDED = 'COUPON_1101',
  CLAIM_NOT_ELIGIBLE = 'COUPON_1102',
  STOCK_INSUFFICIENT = 'COUPON_1103',
  ALREADY_CLAIMED = 'COUPON_1104',
  DISTRIBUTION_TIME_INVALID = 'COUPON_1105',

  // 使用相关错误 (1200-1299)
  USER_COUPON_NOT_FOUND = 'COUPON_1200',
  COUPON_EXPIRED = 'COUPON_1201',
  COUPON_USED = 'COUPON_1202',
  COUPON_LOCKED = 'COUPON_1203',
  COUPON_NOT_APPLICABLE = 'COUPON_1204',
  ORDER_AMOUNT_TOO_LOW = 'COUPON_1205',
  PRODUCT_NOT_APPLICABLE = 'COUPON_1206',
  CATEGORY_NOT_APPLICABLE = 'COUPON_1207',
  MEMBER_LEVEL_NOT_MATCH = 'COUPON_1208',

  // 并发相关错误 (1300-1399)
  LOCK_ACQUIRE_FAILED = 'COUPON_1300',
  CONCURRENT_OPERATION_FAILED = 'COUPON_1301',
  OPTIMISTIC_LOCK_FAILED = 'COUPON_1302',
}

/**
 * 错误码对应的错误消息
 */
export const CouponErrorMessages: Record<CouponErrorCode, string> = {
  // 模板相关
  [CouponErrorCode.TEMPLATE_NOT_FOUND]: '优惠券模板不存在',
  [CouponErrorCode.TEMPLATE_INACTIVE]: '优惠券模板已停用',
  [CouponErrorCode.TEMPLATE_CONFIG_INVALID]: '优惠券模板配置无效',
  [CouponErrorCode.TEMPLATE_CANNOT_MODIFY]: '优惠券模板不可修改',
  [CouponErrorCode.TEMPLATE_STOCK_INSUFFICIENT]: '优惠券模板库存不足',

  // 发放相关
  [CouponErrorCode.DISTRIBUTION_FAILED]: '优惠券发放失败',
  [CouponErrorCode.CLAIM_LIMIT_EXCEEDED]: '已达到领取次数上限',
  [CouponErrorCode.CLAIM_NOT_ELIGIBLE]: '不符合领取条件',
  [CouponErrorCode.STOCK_INSUFFICIENT]: '优惠券库存不足',
  [CouponErrorCode.ALREADY_CLAIMED]: '已领取过该优惠券',
  [CouponErrorCode.DISTRIBUTION_TIME_INVALID]: '不在发放时间范围内',

  // 使用相关
  [CouponErrorCode.USER_COUPON_NOT_FOUND]: '优惠券不存在',
  [CouponErrorCode.COUPON_EXPIRED]: '优惠券已过期',
  [CouponErrorCode.COUPON_USED]: '优惠券已使用',
  [CouponErrorCode.COUPON_LOCKED]: '优惠券已锁定',
  [CouponErrorCode.COUPON_NOT_APPLICABLE]: '优惠券不适用于当前订单',
  [CouponErrorCode.ORDER_AMOUNT_TOO_LOW]: '订单金额未达到使用门槛',
  [CouponErrorCode.PRODUCT_NOT_APPLICABLE]: '优惠券不适用于订单中的商品',
  [CouponErrorCode.CATEGORY_NOT_APPLICABLE]: '优惠券不适用于订单中的商品分类',
  [CouponErrorCode.MEMBER_LEVEL_NOT_MATCH]: '会员等级不符合使用条件',

  // 并发相关
  [CouponErrorCode.LOCK_ACQUIRE_FAILED]: '获取锁失败，请稍后重试',
  [CouponErrorCode.CONCURRENT_OPERATION_FAILED]: '并发操作失败，请稍后重试',
  [CouponErrorCode.OPTIMISTIC_LOCK_FAILED]: '数据已被修改，请刷新后重试',
};
