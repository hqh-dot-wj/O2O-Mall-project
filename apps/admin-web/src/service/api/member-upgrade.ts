import { request } from '@/service/request';

/** 审批参数 */
export interface ApproveParams {
  action: 'approve' | 'reject';
  reason?: string;
}

/** 手动调级参数 */
export interface ManualLevelParams {
  targetLevel: number;
  reason?: string;
}

/** 统计数据 */
export interface UpgradeStats {
  pendingCount: number;
  totalCount: number;
}

export function fetchGetUpgradeApplyList(params?: Api.Member.UpgradeApplySearchParams) {
  return request<Api.Common.PaginatingQueryRecord<Api.Member.UpgradeApply>>({
    url: '/admin/upgrade/list',
    method: 'get',
    params
  });
}

export function fetchGetUpgradeStats() {
  return request<UpgradeStats>({
    url: '/admin/upgrade/stats',
    method: 'get'
  });
}

export function fetchApproveUpgrade(id: string, data: ApproveParams) {
  return request({
    url: `/admin/upgrade/${id}/approve`,
    method: 'put',
    data
  });
}

export function fetchManualLevel(memberId: string, data: ManualLevelParams) {
  return request({
    url: `/admin/upgrade/member/${memberId}/level`,
    method: 'put',
    data
  });
}
