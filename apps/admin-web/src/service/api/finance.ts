import { request } from '@/service/request';

/**
 * 获取资金看板
 */
export function fetchGetDashboard() {
  return request<Api.Finance.Dashboard>({
    url: '/finance/dashboard',
    method: 'get'
  });
}

/**
 * 获取佣金列表
 */
export function fetchGetCommissionList(params: Api.Finance.CommissionSearchParams) {
  return request<Api.Finance.CommissionListResult>({
    url: '/finance/commission/list',
    method: 'get',
    params
  });
}

/**
 * 获取佣金统计
 */
export function fetchGetCommissionStats() {
  return request<Api.Finance.CommissionStats>({
    url: '/finance/commission/stats',
    method: 'get'
  });
}

/**
 * 获取提现列表
 */
export function fetchGetWithdrawalList(params: Api.Finance.WithdrawalSearchParams) {
  return request<Api.Finance.WithdrawalListResult>({
    url: '/finance/withdrawal/list',
    method: 'get',
    params
  });
}

/**
 * 审核提现
 */
export function fetchAuditWithdrawal(data: { withdrawalId: string; action: 'APPROVE' | 'REJECT'; remark?: string }) {
  return request<void>({
    url: '/finance/withdrawal/audit',
    method: 'post',
    data
  });
}

/**
 * 获取门店流水
 */
export function fetchGetLedger(params: Api.Finance.LedgerSearchParams) {
  return request<Api.Finance.LedgerListResult>({
    url: '/finance/ledger',
    method: 'get',
    params
  });
}

/**
 * 获取流水统计
 */
export function fetchGetLedgerStats(params: Api.Finance.LedgerSearchParams) {
  return request<Api.Finance.LedgerStats>({
    url: '/finance/ledger/stats',
    method: 'get',
    params
  });
}
