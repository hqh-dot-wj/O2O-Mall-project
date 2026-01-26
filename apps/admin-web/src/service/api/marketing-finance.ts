import { request } from '@/service/request';

/** 营销API - 结算管理 */
export function fetchGetSettlementList(params?: Api.Marketing.SettlementSearchParams) {
  return request<Api.Marketing.SettlementList>({
    url: '/marketing/settlement/list',
    method: 'get',
    params
  });
}

export function fetchApplySettlement(data: Api.Marketing.SettlementApply) {
  return request({
    url: '/marketing/settlement/apply',
    method: 'post',
    data
  });
}

export function fetchAuditSettlement(id: string, data: Api.Marketing.SettlementAudit) {
  return request({
    url: `/marketing/settlement/${id}/audit`,
    method: 'patch',
    data
  });
}

/** 营销API - 用户资产 */
export function fetchGetUserAssetList(params?: Api.Marketing.UserAssetSearchParams) {
  return request<Api.Marketing.UserAssetList>({
    url: '/marketing/asset/list',
    method: 'get',
    params
  });
}

export function fetchConsumeAsset(id: string, amount: number) {
  return request({
    url: `/marketing/asset/${id}/consume`,
    method: 'post',
    data: { amount }
  });
}
