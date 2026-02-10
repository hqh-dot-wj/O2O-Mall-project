import { request } from '../request';

/** Get member list */
export function fetchGetMemberList(params?: Api.Member.MemberSearchParams) {
  return request<Api.Member.MemberList>({
    url: '/admin/member/list',
    method: 'get',
    params
  });
}

/** Update member referrer */
export function fetchUpdateMemberReferrer(data: { memberId: string; referrerId: string }) {
  return request<any>({
    url: '/admin/member/referrer',
    method: 'put',
    data
  });
}

/** Update member tenant */
export function fetchUpdateMemberTenant(data: { memberId: string; tenantId: string }) {
  return request<any>({
    url: '/admin/member/tenant',
    method: 'put',
    data
  });
}

// ... existing code ...
/** Update member status */
export function fetchUpdateMemberStatus(data: { memberId: string; status: string }) {
  return request<any>({
    url: '/admin/member/status',
    method: 'put',
    data
  });
}

/** Update member level */
export function fetchUpdateMemberLevel(data: { memberId: string; levelId: number }) {
  return request<any>({
    url: '/admin/member/level',
    method: 'put',
    data
  });
}

/** Get member point history */
export function fetchGetMemberPointHistory(params: Api.Member.PointHistorySearchParams) {
  return request<Api.Member.PointHistoryList>({
    url: '/admin/member/point/history',
    method: 'get',
    params
  });
}

/** Adjust member points */
export function fetchAdjustMemberPoints(data: Api.Member.PointAdjustment) {
  return request<any>({
    url: '/admin/member/point/adjust',
    method: 'post',
    data
  });
}
