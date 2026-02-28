import { request } from '@/service/request';

const BASE = '/store/finance';

/**
 * 获取资金看板
 */
export function fetchGetFinanceDashboard() {
  return request<Api.Finance.Dashboard>({
    url: `${BASE}/dashboard`,
    method: 'get'
  });
}

/**
 * 获取佣金列表
 */
export function fetchGetCommissionList(params?: Api.Finance.CommissionSearchParams) {
  return request<Api.Finance.CommissionListResult>({
    url: `${BASE}/commission/list`,
    method: 'get',
    params
  });
}

/**
 * 获取佣金统计
 */
export function fetchGetCommissionStats() {
  return request<Api.Finance.CommissionStats>({
    url: `${BASE}/commission/stats`,
    method: 'get'
  });
}

/**
 * 获取提现列表
 */
export function fetchGetWithdrawalList(params?: Api.Finance.WithdrawalSearchParams) {
  return request<Api.Finance.WithdrawalListResult>({
    url: `${BASE}/withdrawal/list`,
    method: 'get',
    params
  });
}

/**
 * 审核提现
 */
export function fetchAuditWithdrawal(data: { withdrawalId: string; action: 'APPROVE' | 'REJECT'; remark?: string }) {
  return request<boolean>({
    url: `${BASE}/withdrawal/audit`,
    method: 'post',
    data
  });
}

/**
 * 获取门店流水
 */
export function fetchGetLedgerList(params?: Api.Finance.LedgerSearchParams) {
  return request<Api.Finance.LedgerListResult>({
    url: `${BASE}/ledger`,
    method: 'get',
    params
  });
}

/** 获取门店流水（列表接口，用于 useTable） */
export const fetchGetLedger = fetchGetLedgerList;

/**
 * 获取流水统计
 */
export function fetchGetLedgerStats(params?: Api.Finance.LedgerSearchParams) {
  return request<Api.Finance.LedgerStats>({
    url: `${BASE}/ledger/stats`,
    method: 'get',
    params
  });
}

/**
 * 导出流水
 */
export function fetchExportLedger(data?: Api.Finance.LedgerSearchParams) {
  return request<Blob>({
    url: `${BASE}/ledger/export`,
    method: 'post',
    data,
    responseType: 'blob'
  });
}
