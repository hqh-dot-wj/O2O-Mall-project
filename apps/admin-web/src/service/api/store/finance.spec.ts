import { describe, expect, it, vi } from 'vitest';
import {
  fetchAuditWithdrawal,
  fetchExportLedger,
  fetchGetCommissionList,
  fetchGetCommissionStats,
  fetchGetFinanceDashboard,
  fetchGetLedgerList,
  fetchGetLedgerStats,
  fetchGetWithdrawalList
} from './finance';

vi.mock('@/service/request', () => ({
  request: vi.fn((config: unknown) => Promise.resolve({ data: config }))
}));

describe('Store Finance API', () => {
  it('fetchGetFinanceDashboard should have correct config', async () => {
    const res = await fetchGetFinanceDashboard();
    expect(res.data).toMatchObject({
      url: '/store/finance/dashboard',
      method: 'get'
    });
  });

  it('fetchGetCommissionList should have correct config with params', async () => {
    const params: Api.Finance.CommissionSearchParams = {
      pageNum: 1,
      pageSize: 10,
      status: 'FROZEN',
      orderSn: 'O202601001',
      phone: '13800138000',
      memberId: 'm1'
    };
    const res = await fetchGetCommissionList(params);
    expect(res.data).toMatchObject({
      url: '/store/finance/commission/list',
      method: 'get',
      params
    });
  });

  it('fetchGetCommissionStats should have correct config', async () => {
    const res = await fetchGetCommissionStats();
    expect(res.data).toMatchObject({
      url: '/store/finance/commission/stats',
      method: 'get'
    });
  });

  it('fetchGetWithdrawalList should have correct config with params', async () => {
    const params: Api.Finance.WithdrawalSearchParams = {
      pageNum: 1,
      pageSize: 10,
      status: 'PENDING',
      memberId: 'm1'
    };
    const res = await fetchGetWithdrawalList(params);
    expect(res.data).toMatchObject({
      url: '/store/finance/withdrawal/list',
      method: 'get',
      params
    });
  });

  it('fetchAuditWithdrawal should have correct config', async () => {
    const data = { withdrawalId: 'w1', action: 'APPROVE' as const, remark: '通过' };
    const res = await fetchAuditWithdrawal(data);
    expect(res.data).toMatchObject({
      url: '/store/finance/withdrawal/audit',
      method: 'post',
      data
    });
  });

  it('fetchGetLedgerList should have correct config with params', async () => {
    const params: Api.Finance.LedgerSearchParams = {
      pageNum: 1,
      pageSize: 10,
      type: 'ORDER_INCOME',
      keyword: '张三',
      minAmount: 0,
      maxAmount: 1000
    };
    const res = await fetchGetLedgerList(params);
    expect(res.data).toMatchObject({
      url: '/store/finance/ledger',
      method: 'get',
      params
    });
  });

  it('fetchGetLedgerStats should have correct config', async () => {
    const params: Api.Finance.LedgerSearchParams = {
      pageNum: 1,
      pageSize: 10,
      params: { beginTime: '2026-01-01', endTime: '2026-01-31' }
    };
    const res = await fetchGetLedgerStats(params);
    expect(res.data).toMatchObject({
      url: '/store/finance/ledger/stats',
      method: 'get',
      params
    });
  });

  it('fetchExportLedger should have correct config', async () => {
    const data: Api.Finance.LedgerSearchParams = {
      pageNum: 1,
      pageSize: 10000,
      type: 'COMMISSION_IN'
    };
    const res = await fetchExportLedger(data);
    expect(res.data).toMatchObject({
      url: '/store/finance/ledger/export',
      method: 'post',
      data,
      responseType: 'blob'
    });
  });
});
