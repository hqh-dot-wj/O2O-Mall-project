/**
 * Namespace Api.Main
 *
 * 主模块 API 类型定义
 */
declare namespace Api {
  namespace Main {
    /** 首页统计数据 */
    interface DashboardStats {
      /** 门店钱包余额 */
      walletBalance: number;
      /** 今日GMV */
      todayGMV: number;
      /** 今日订单数 */
      todayOrderCount: number;
      /** 本月GMV */
      monthGMV: number;
      /** 商品总数 */
      productCount: number;
      /** 会员总数 */
      memberCount: number;
      /** 已结算佣金 */
      settledCommission: number;
      /** 待结算佣金 */
      pendingCommission: number;
    }
  }
}
