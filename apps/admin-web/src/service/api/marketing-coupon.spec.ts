import { describe, expect, it, vi } from 'vitest';
import {
  fetchCouponDistributeManual,
  fetchCreateCouponTemplate,
  fetchDeleteCouponTemplate,
  fetchExportCouponUsage,
  fetchGetCouponStatistics,
  fetchGetCouponTemplate,
  fetchGetCouponTemplateList,
  fetchGetCouponUsageRecords,
  fetchGetUserCoupons,
  fetchUpdateCouponTemplate,
  fetchUpdateCouponTemplateStatus
} from './marketing-coupon';

vi.mock('@/service/request', () => ({
  request: vi.fn((config: unknown) => Promise.resolve({ data: config }))
}));

describe('Marketing Coupon API', () => {
  it('fetchGetCouponTemplateList should have correct config', async () => {
    const params = { pageNum: 1, pageSize: 10, name: null, type: null, status: null };
    const res = await fetchGetCouponTemplateList(params);
    expect(res.data).toMatchObject({
      url: '/admin/marketing/coupon/templates',
      method: 'get',
      params
    });
  });

  it('fetchGetCouponTemplate should have correct config', async () => {
    const id = 'tpl-1';
    const res = await fetchGetCouponTemplate(id);
    expect(res.data).toMatchObject({
      url: `/admin/marketing/coupon/templates/${id}`,
      method: 'get'
    });
  });

  it('fetchCreateCouponTemplate should have correct config', async () => {
    const data = {
      name: '测试券',
      type: 'DISCOUNT' as const,
      discountAmount: 10,
      minOrderAmount: 50,
      totalStock: 100,
      limitPerUser: 1,
      validType: 'FIXED' as const,
      startTime: '2026-01-01T00:00:00Z',
      endTime: '2026-12-31T23:59:59Z'
    };
    const res = await fetchCreateCouponTemplate(data);
    expect(res.data).toMatchObject({
      url: '/admin/marketing/coupon/templates',
      method: 'post',
      data
    });
  });

  it('fetchUpdateCouponTemplate should have correct config', async () => {
    const id = 'tpl-1';
    const data = { name: '新名称', status: 'ACTIVE' as const };
    const res = await fetchUpdateCouponTemplate(id, data);
    expect(res.data).toMatchObject({
      url: `/admin/marketing/coupon/templates/${id}`,
      method: 'put',
      data
    });
  });

  it('fetchDeleteCouponTemplate should have correct config', async () => {
    const id = 'tpl-1';
    const res = await fetchDeleteCouponTemplate(id);
    expect(res.data).toMatchObject({
      url: `/admin/marketing/coupon/templates/${id}`,
      method: 'delete'
    });
  });

  it('fetchUpdateCouponTemplateStatus should have correct config', async () => {
    const id = 'tpl-1';
    const res = await fetchUpdateCouponTemplateStatus(id, 'INACTIVE');
    expect(res.data).toMatchObject({
      url: `/admin/marketing/coupon/templates/${id}/status`,
      method: 'patch',
      data: { status: 'INACTIVE' }
    });
  });

  it('fetchCouponDistributeManual should have correct config', async () => {
    const data = { templateId: 'tpl-1', memberIds: ['m1', 'm2'] };
    const res = await fetchCouponDistributeManual(data);
    expect(res.data).toMatchObject({
      url: '/admin/marketing/coupon/distribute/manual',
      method: 'post',
      data
    });
  });

  it('fetchGetUserCoupons should have correct config', async () => {
    const params = { memberId: 'm1', status: 'UNUSED', pageNum: 1, pageSize: 10 };
    const res = await fetchGetUserCoupons(params);
    expect(res.data).toMatchObject({
      url: '/admin/marketing/coupon/user-coupons',
      method: 'get',
      params
    });
  });

  it('fetchGetCouponUsageRecords should have correct config', async () => {
    const params = {
      memberId: 'm1',
      templateId: 'tpl-1',
      startTime: '2026-01-01',
      endTime: '2026-12-31',
      pageNum: 1,
      pageSize: 10
    };
    const res = await fetchGetCouponUsageRecords(params);
    expect(res.data).toMatchObject({
      url: '/admin/marketing/coupon/usage-records',
      method: 'get',
      params
    });
  });

  it('fetchGetCouponStatistics should have correct config', async () => {
    const params = { templateId: 'tpl-1' };
    const res = await fetchGetCouponStatistics(params);
    expect(res.data).toMatchObject({
      url: '/admin/marketing/coupon/statistics',
      method: 'get',
      params
    });
  });

  it('fetchGetCouponStatistics without params should have correct config', async () => {
    const res = await fetchGetCouponStatistics();
    expect(res.data).toMatchObject({
      url: '/admin/marketing/coupon/statistics',
      method: 'get'
    });
  });

  it('fetchExportCouponUsage should have correct config with responseType blob', async () => {
    const params = { memberId: 'm1', templateId: 'tpl-1', startTime: '2026-01-01', endTime: '2026-12-31' };
    const res = await fetchExportCouponUsage(params);
    expect(res.data).toMatchObject({
      url: '/admin/marketing/coupon/export',
      method: 'get',
      params,
      responseType: 'blob'
    });
  });
});
