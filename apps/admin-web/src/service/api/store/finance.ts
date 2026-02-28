import { request } from '@/service/request';

/**
 * Get finance dashboard data
 */
export function fetchGetFinanceDashboard() {
  return request<Api.Finance.Dashboard>({
    url: '/finance/dashboard',
    method: 'get'
  });
}

/**
 * Get commission records list
 * @param params query params
 */
export function fetchGetCommissionList(params?: Api.Finance.CommissionSearchParams) {
  return request<Api.Finance.CommissionListResult>({
    url: '/finance/commission/list',
    method: 'get',
    params
  });
}

/**
 * Get commission statistics
 */
export function fetchGetCommissionStats() {
  return request<Api.Finance.CommissionStats>({
    url: '/finance/commission/stats',
    method: 'get'
  });
}

/**
 * Get withdrawal records list
 * @param params query params
 */
export function fetchGetWithdrawalList(params?: Api.Finance.WithdrawalSearchParams) {
  return request<Api.Finance.WithdrawalListResult>({
    url: '/finance/withdrawal/list',
    method: 'get',
    params
  });
}

/**
 * Audit withdrawal request
 * @param data audit data
 */
export function fetchAuditWithdrawal(data: { withdrawalId: string; action: 'APPROVE' | 'REJECT'; remark?: string }) {
  return request<boolean>({
    url: '/finance/withdrawal/audit',
    method: 'post',
    data
  });
}

/**
 * Get ledger records list
 * @param params query params
 */
export function fetchGetLedgerList(params?: Api.Finance.LedgerSearchParams) {
  return request<Api.Finance.LedgerListResult>({
    url: '/finance/ledger',
    method: 'get',
    params
  });
}

/**
 * Get ledger statistics
 * @param params query params
 */
export function fetchGetLedgerStats(params?: Api.Finance.LedgerSearchParams) {
  return request<Api.Finance.LedgerStats>({
    url: '/finance/ledger/stats',
    method: 'get',
    params
  });
}

/**
 * Export ledger records
 * @param data query params
 */
export function fetchExportLedger(data?: Api.Finance.LedgerSearchParams) {
  return request<Blob>({
    url: '/finance/ledger/export',
    method: 'post',
    data,
    responseType: 'blob'
  });
}
