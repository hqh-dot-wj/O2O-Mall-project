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
        }

        /** Search Params */
        interface MemberSearchParams extends Common.CommonSearchParams {
            nickname?: string;
            mobile?: string;
            [key: string]: unknown;
        }

        /** List Response */
        interface MemberList extends Common.PaginatingQueryRecord<Member> { }

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
    }
}
