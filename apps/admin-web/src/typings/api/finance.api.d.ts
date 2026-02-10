/**
 * Namespace Api.Finance
 *
 * 财务管理 API 类型定义
 */
declare namespace Api {
  namespace Finance {
    /** 资金看板数据 */
    interface Dashboard {
      /** 今日 GMV */
      todayGMV: number;
      /** 今日订单数 */
      todayOrderCount: number;
      /** 本月 GMV */
      monthGMV: number;
      /** 待结算佣金 */
      pendingCommission: number;
      /** 已结算佣金 */
      settledCommission: number;
      /** 待审核提现数 */
      pendingWithdrawals: number;
    }

    /** 佣金搜索参数 */
    interface CommissionSearchParams extends Common.CommonSearchParams {
      /** 订单号 */
      orderSn?: string | null;
      /** 手机号 */
      phone?: string | null;
      /** 状态 */
      status?: CommissionStatus | null;
      /** 会员ID */
      memberId?: string | null;
    }

    /** 佣金状态 */
    type CommissionStatus = 'FROZEN' | 'SETTLED' | 'CANCELLED';

    /** 佣金记录 */
    interface CommissionRecord {
      id: string;
      orderId: string;
      order?: {
        orderSn: string;
        payAmount?: number;
      };
      beneficiaryId: string;
      beneficiary?: {
        nickname: string;
        avatar?: string;
        mobile?: string;
      };
      level: 1 | 2;
      amount: number;
      rateSnapshot: number;
      status: CommissionStatus;
      planSettleTime: string;
      actualSettleTime?: string;
      createTime: string;
      /** 分佣基数类型 */
      commissionBaseType?: 'ORIGINAL_PRICE' | 'ACTUAL_PAID' | 'ZERO';
      /** 优惠券抵扣金额 */
      couponDiscount?: number;
      /** 积分抵扣金额 */
      pointsDiscount?: number;
      /** 是否触发熔断 */
      isCapped?: boolean;
    }

    /** 佣金列表返回 */
    type CommissionListResult = Common.PaginatingQueryRecord<CommissionRecord>;

    /** 佣金统计 */
    interface CommissionStats {
      /** 今日佣金 */
      todayCommission: number;
      /** 本月佣金 */
      monthCommission: number;
      /** 待结算佣金 */
      pendingCommission: number;
    }

    /** 提现搜索参数 */
    interface WithdrawalSearchParams extends Common.CommonSearchParams {
      /** 状态 */
      status?: WithdrawalStatus | null;
      /** 关键词 */
      keyword?: string | null;
    }

    /** 提现状态 */
    type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED';

    /** 提现记录 */
    interface WithdrawalRecord {
      id: string;
      memberId: string;
      /** 申请人昵称 (扁平化) */
      memberName?: string;
      /** 申请人头像 (扁平化) */
      memberAvatar?: string;
      /** 申请人手机号 (扁平化) */
      memberMobile?: string;
      member?: {
        nickname: string;
        mobile?: string;
        avatar?: string;
      };
      amount: number;
      method: 'WECHAT_WALLET' | 'BANK_CARD';
      accountInfo?: string;
      status: WithdrawalStatus;
      auditRemark?: string;
      auditBy?: string;
      auditTime?: string;
      paymentNo?: string;
      paymentTime?: string;
      createTime: string;
    }

    /** 提现列表返回 */
    type WithdrawalListResult = Common.PaginatingQueryRecord<WithdrawalRecord>;

    /** 流水搜索参数 */
    interface LedgerSearchParams extends Common.CommonSearchParams {
      /** 交易类型 */
      type?: TransType | null;
      /** 会员ID */
      memberId?: string;
      /** 订单号/交易ID */
      relatedId?: string;
      /** 用户搜索（姓名/手机号） */
      keyword?: string;
      /** 最小金额 */
      minAmount?: number;
      /** 最大金额 */
      maxAmount?: number;
    }

    /** 交易类型 */
    type TransType = 'COMMISSION_IN' | 'WITHDRAW_OUT' | 'REFUND_DEDUCT' | 'CONSUME_PAY' | 'RECHARGE_IN';

    /** 流水记录 */
    interface LedgerRecord {
      id: string;
      walletId?: string;
      wallet?: {
        member?: {
          nickname: string;
          mobile?: string;
        };
      };
      user?: {
        nickname: string;
        mobile: string;
      };
      type: TransType | 'ORDER_INCOME';
      typeName: string;
      amount: number;
      balanceAfter: number;
      remark?: string;
      relatedId?: string;
      bizId?: string;
      createTime: string;
      distribution?: {
        referrer?: {
          nickname: string;
          mobile: string;
          amount: number;
        };
        indirectReferrer?: {
          nickname: string;
          mobile: string;
          amount: number;
        };
      };
      // UI Column Keys
      referrer?: any;
      indirectReferrer?: any;
    }

    /** 流水列表返回 */
    type LedgerListResult = Common.PaginatingQueryRecord<LedgerRecord>;

    /** 流水统计数据 */
    interface LedgerStats {
      /** 总收入 */
      totalIncome: number;
      /** 总支出 */
      totalExpense: number;
      /** 净利润 */
      netProfit: number;
      /** 待结算佣金 */
      pendingCommission: number;
    }
  }
}
