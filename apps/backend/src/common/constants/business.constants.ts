/**
 * 业务常量定义
 * 用于消除代码中的魔法数字(Magic Numbers)
 */
export const BusinessConstants = {
  /**
   * 分销系统默认配置
   */
  DISTRIBUTION: {
    DEFAULT_LEVEL1_RATE: 0.1, // 一级分佣默认 10%
    DEFAULT_LEVEL2_RATE: 0.05, // 二级分佣默认 5%
    DEFAULT_CROSS_TENANT_RATE: 1.0, // 默认跨店折扣 100% (不打折)
    DEFAULT_CROSS_DAILY_LIMIT: 500, // 默认跨店日限额 500元
  },

  /**
   * 财务系统限额
   */
  FINANCE: {
    MIN_WITHDRAWAL_AMOUNT: 1.0, // 最小提现金额 1元
    MAX_SINGLE_AMOUNT: 50000, // 单笔金额上限 5万元
    MAX_DAILY_WITHDRAWAL_COUNT: 3, // 单日提现次数上限
    MAX_DAILY_WITHDRAWAL_AMOUNT: 50000, // 单日提现金额上限 5万元
    WITHDRAWAL_FEE_RATE: 0, // 提现手续费率（0 表示免手续费）
    WITHDRAWAL_FEE_MIN: 0, // 最低手续费
    MAX_PAYMENT_RETRY_COUNT: 3, // 打款失败最大重试次数
    SETTLEMENT_BATCH_SIZE: 100, // S-T9: 结算批量大小
  },

  /**
   * 锁过期时间 (秒)
   */
  REDIS_LOCK: {
    SETTLEMENT_TTL: 300, // 结算任务锁保持 5分钟
  },

  /**
   * 门店商品库存预警
   */
  STOCK_ALERT: {
    DEFAULT_THRESHOLD: 10, // 默认低库存阈值
    CONFIG_KEY: 'store.product.stockAlertThreshold',
  },
};
