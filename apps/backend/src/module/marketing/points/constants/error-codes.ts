/**
 * 积分错误码定义
 * 
 * @description 定义积分模块的所有错误码，便于统一管理和国际化
 */
export enum PointsErrorCode {
  // 规则相关错误 (2000-2099)
  RULE_NOT_FOUND = 'POINTS_2000',
  RULE_CONFIG_INVALID = 'POINTS_2001',
  RULE_DISABLED = 'POINTS_2002',
  REDEMPTION_DISABLED = 'POINTS_2003',
  SIGNIN_DISABLED = 'POINTS_2004',

  // 账户相关错误 (2100-2199)
  ACCOUNT_NOT_FOUND = 'POINTS_2100',
  INSUFFICIENT_BALANCE = 'POINTS_2101',
  INSUFFICIENT_FROZEN = 'POINTS_2102',
  ACCOUNT_LOCKED = 'POINTS_2103',
  TRANSACTION_FAILED = 'POINTS_2104',

  // 使用相关错误 (2200-2299)
  POINTS_TOO_LOW = 'POINTS_2200',
  POINTS_EXCEED_LIMIT = 'POINTS_2201',
  DISCOUNT_EXCEED_LIMIT = 'POINTS_2202',
  POINTS_EXPIRED = 'POINTS_2203',
  POINTS_NOT_ENOUGH = 'POINTS_2204',

  // 签到相关错误 (2300-2399)
  ALREADY_SIGNED_TODAY = 'POINTS_2300',
  SIGNIN_FAILED = 'POINTS_2301',

  // 任务相关错误 (2400-2499)
  TASK_NOT_FOUND = 'POINTS_2400',
  TASK_DISABLED = 'POINTS_2401',
  TASK_NOT_REPEATABLE = 'POINTS_2402',
  TASK_COMPLETION_LIMIT = 'POINTS_2403',
  TASK_NOT_ELIGIBLE = 'POINTS_2404',
  TASK_KEY_EXISTS = 'POINTS_2405',

  // 并发相关错误 (2500-2599)
  OPTIMISTIC_LOCK_FAILED = 'POINTS_2500',
  CONCURRENT_OPERATION_FAILED = 'POINTS_2501',
  VERSION_CONFLICT = 'POINTS_2502',
}

/**
 * 错误码对应的错误消息
 */
export const PointsErrorMessages: Record<PointsErrorCode, string> = {
  // 规则相关
  [PointsErrorCode.RULE_NOT_FOUND]: '积分规则不存在',
  [PointsErrorCode.RULE_CONFIG_INVALID]: '积分规则配置无效',
  [PointsErrorCode.RULE_DISABLED]: '积分系统已停用',
  [PointsErrorCode.REDEMPTION_DISABLED]: '积分抵扣功能未启用',
  [PointsErrorCode.SIGNIN_DISABLED]: '签到功能未启用',

  // 账户相关
  [PointsErrorCode.ACCOUNT_NOT_FOUND]: '积分账户不存在',
  [PointsErrorCode.INSUFFICIENT_BALANCE]: '积分余额不足',
  [PointsErrorCode.INSUFFICIENT_FROZEN]: '冻结积分不足',
  [PointsErrorCode.ACCOUNT_LOCKED]: '积分账户已锁定',
  [PointsErrorCode.TRANSACTION_FAILED]: '积分交易失败',

  // 使用相关
  [PointsErrorCode.POINTS_TOO_LOW]: '使用积分数量过低',
  [PointsErrorCode.POINTS_EXCEED_LIMIT]: '超过单笔订单最多可使用积分数量',
  [PointsErrorCode.DISCOUNT_EXCEED_LIMIT]: '积分抵扣金额超过订单金额限制',
  [PointsErrorCode.POINTS_EXPIRED]: '积分已过期',
  [PointsErrorCode.POINTS_NOT_ENOUGH]: '积分不足',

  // 签到相关
  [PointsErrorCode.ALREADY_SIGNED_TODAY]: '今日已签到',
  [PointsErrorCode.SIGNIN_FAILED]: '签到失败',

  // 任务相关
  [PointsErrorCode.TASK_NOT_FOUND]: '任务不存在',
  [PointsErrorCode.TASK_DISABLED]: '任务已停用',
  [PointsErrorCode.TASK_NOT_REPEATABLE]: '任务已完成，不可重复',
  [PointsErrorCode.TASK_COMPLETION_LIMIT]: '已达到最大完成次数',
  [PointsErrorCode.TASK_NOT_ELIGIBLE]: '不符合任务完成条件',
  [PointsErrorCode.TASK_KEY_EXISTS]: '任务标识已存在',

  // 并发相关
  [PointsErrorCode.OPTIMISTIC_LOCK_FAILED]: '数据已被修改，请刷新后重试',
  [PointsErrorCode.CONCURRENT_OPERATION_FAILED]: '并发操作失败，请稍后重试',
  [PointsErrorCode.VERSION_CONFLICT]: '版本冲突，请刷新后重试',
};
