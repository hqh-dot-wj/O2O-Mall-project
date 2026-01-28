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
      commission: number;
      totalConsumption: number;
      orderCount: number;
      levelId: number;
      levelName: string;
    }

    /** Search Params */
    interface MemberSearchParams extends Common.CommonSearchParams {
      nickname?: string;
      mobile?: string;
      [key: string]: unknown;
    }

    /** List Response */
    interface MemberList extends Common.PaginatingQueryRecord<Member> {}

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
