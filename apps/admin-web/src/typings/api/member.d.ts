declare namespace Api {
  namespace Member {
    /** Member Object */
    interface Member {
      memberId: string;
      nickname: string;
      avatar: string;
      mobile: string;
      status: '1' | '2'; // 1: Normal, 2: Disabled
      createTime: string;
      tenantId: string;
      tenantName: string;
      referrerId?: string;
      referrerName?: string;
      referrerMobile?: string;
      indirectReferrerId?: string;
      indirectReferrerName?: string;
      indirectReferrerMobile?: string;
      balance: number;
      points: number;
      commission: number;
      totalConsumption: number;
      orderCount: number;
      levelId: number;
      levelName: string;
    }

    /** Member Point History */
    interface PointHistory {
      id: string;
      memberId: string;
      /** 变动积分 (正数为增加，负数为减少) */
      changePoints: number;
      /** 变动后积分 */
      afterPoints: number;
      /** 变动原因/场景: SIGN_IN, CONSUMPTION, MANUAL_ADJUST, etc. */
      type: string;
      /** 场景描述 */
      typeName?: string;
      /** 备注/人工调整原因 */
      remark?: string;
      createTime: string;
    }

    /** Point History Search Params */
    interface PointHistorySearchParams extends Common.PaginatingCommonParams {
      memberId?: string;
    }

    /** Point History List */
    type PointHistoryList = Common.PaginatingQueryRecord<PointHistory>;

    /** Manual Point Adjustment */
    interface PointAdjustment {
      memberId: string;
      /** 变动量 */
      amount: number;
      /** 原因 */
      remark: string;
    }

    /** Search Params */
    interface MemberSearchParams extends Common.CommonSearchParams {
      nickname?: string;
      mobile?: string;
      [key: string]: unknown;
    }

    /** List Response */
    type MemberList = Common.PaginatingQueryRecord<Member>;

    /** Update Referrer Params */
    interface UpdateReferrerParams {
      memberId: string;
      referrerId: string;
    }

    /** Update Tenant Params */
    interface UpdateTenantParams {
      memberId: string;
      tenantId: string;
    }

    /** Upgrade Apply Record */
    type UpgradeApply = Common.CommonRecord<{
      id: string;
      tenantId: string;
      memberId: string;
      fromLevel: number;
      toLevel: number;
      applyType: 'PRODUCT_PURCHASE' | 'REFERRAL_CODE' | 'MANUAL_ADJUST';
      referralCode: string | null;
      orderId: string | null;
      referrerId: string | null;
      status: 'PENDING' | 'APPROVED' | 'REJECTED';
      member?: {
        memberId: string;
        nickname: string;
        mobile: string;
        avatar: string;
      };
      fromLevelName: string;
      toLevelName: string;
    }>;

    /** Upgrade Apply Search Params */
    type UpgradeApplySearchParams = Common.CommonSearchParams & {
      memberId?: string;
      status?: string;
      applyType?: string;
    };
  }
}
