import { request } from '../request';

/** Get member list */
export function fetchGetMemberList(params?: Api.Member.MemberSearchParams) {
    return request<Api.Member.MemberList>({
        url: '/admin/member/list',
        method: 'get',
        params,
    });
}

/** Update member referrer */
export function fetchUpdateMemberReferrer(data: { memberId: string; referrerId: string }) {
    return request<any>({
        url: '/admin/member/referrer',
        method: 'put',
        data,
    });
}

/** Update member tenant */
export function fetchUpdateMemberTenant(data: { memberId: string; tenantId: string }) {
    return request<any>({
        url: '/admin/member/tenant',
        method: 'put',
        data,
    });
}

/** Update member status */
export function fetchUpdateMemberStatus(data: { memberId: string; status: string }) {
    return request<any>({
        url: '/admin/member/status',
        method: 'put',
        data,
    });
}
