import { describe, expect, it, vi } from 'vitest';
import {
  fetchGetDistributionConfig,
  fetchUpdateDistributionConfig,
  fetchGetDistributionConfigLogs,
  fetchGetCommissionPreview,
  fetchGetProductConfigList,
  fetchGetDistributionDashboard,
  fetchGetLevelList,
  fetchGetApplicationList,
  fetchGetReviewConfig,
} from './distribution';

vi.mock('@/service/request', () => ({
  request: vi.fn((config: unknown) => Promise.resolve({ data: config }))
}));

describe('Distribution API', () => {
  it('fetchGetDistributionConfig should have correct config', async () => {
    const res = await fetchGetDistributionConfig();
    expect(res.data).toMatchObject({
      url: '/store/distribution/config',
      method: 'get'
    });
  });

  it('fetchUpdateDistributionConfig should have correct config', async () => {
    const data: Api.Store.DistributionConfigUpdateParams = {
      level1Rate: 10,
      level2Rate: 5,
      enableLV0: true,
      enableCrossTenant: false,
      crossTenantRate: 80,
      crossMaxDaily: 500,
      commissionBaseType: 'ORIGINAL_PRICE',
      maxCommissionRate: 50
    };
    const res = await fetchUpdateDistributionConfig(data);
    expect(res.data).toMatchObject({
      url: '/store/distribution/config',
      method: 'post',
      data
    });
  });

  it('fetchGetDistributionConfigLogs should have correct config with pagination', async () => {
    const params = { pageNum: 1, pageSize: 10 };
    const res = await fetchGetDistributionConfigLogs(params);
    expect(res.data).toMatchObject({
      url: '/store/distribution/config/logs',
      method: 'get',
      params
    });
  });

  it('fetchGetCommissionPreview should have correct config', async () => {
    const data: Api.Store.CommissionPreviewDto = {
      tenantId: 'T001',
      items: [{ skuId: 'sku1', quantity: 2 }],
      shareUserId: 'user1'
    };
    const res = await fetchGetCommissionPreview(data);
    expect(res.data).toMatchObject({
      url: '/store/distribution/commission/preview',
      method: 'post',
      data
    });
  });

  it('fetchGetProductConfigList should have correct config', async () => {
    const params: Api.Store.ProductConfigSearchParams = { pageNum: 1, pageSize: 10 };
    const res = await fetchGetProductConfigList(params);
    expect(res.data).toMatchObject({
      url: '/store/distribution/product-config/list',
      method: 'get',
      params
    });
  });

  it('fetchGetDistributionDashboard should have correct config', async () => {
    const params: Api.Store.GetDashboardDto = { startDate: '2026-01-01', endDate: '2026-01-31' };
    const res = await fetchGetDistributionDashboard(params);
    expect(res.data).toMatchObject({
      url: '/store/distribution/dashboard',
      method: 'get',
      params
    });
  });

  it('fetchGetLevelList should have correct config', async () => {
    const params: Api.Store.LevelSearchParams = {};
    const res = await fetchGetLevelList(params);
    expect(res.data).toMatchObject({
      url: '/store/distribution/level/list',
      method: 'get'
    });
  });

  it('fetchGetApplicationList should have correct config', async () => {
    const params: Api.Store.ListApplicationDto = { pageNum: 1, pageSize: 10 };
    const res = await fetchGetApplicationList(params);
    expect(res.data).toMatchObject({
      url: '/store/distribution/application/list',
      method: 'get',
      params
    });
  });

  it('fetchGetReviewConfig should have correct config', async () => {
    const res = await fetchGetReviewConfig();
    expect(res.data).toMatchObject({
      url: '/store/distribution/application/config',
      method: 'get'
    });
  });
});
