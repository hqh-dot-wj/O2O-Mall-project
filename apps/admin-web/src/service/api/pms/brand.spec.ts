import { describe, expect, it, vi } from 'vitest';
import { fetchAddBrand, fetchDeleteBrand, fetchGetBrand, fetchGetBrandList, fetchUpdateBrand } from './brand';

// Mock request
vi.mock('@/service/request', () => ({
  request: vi.fn(config => Promise.resolve({ data: config }))
}));

describe('PMS Brand API', () => {
  it('fetchGetBrandList should have correct config', async () => {
    const res = await fetchGetBrandList();
    expect(res.data).toMatchObject({
      url: '/admin/pms/brand/list',
      method: 'get'
    });
  });

  it('fetchGetBrandList should pass params when provided', async () => {
    const params: Api.Pms.BrandSearchParams = { pageNum: 1, pageSize: 20, name: 'Test' };
    const res = await fetchGetBrandList(params);
    expect(res.data).toMatchObject({
      url: '/admin/pms/brand/list',
      method: 'get',
      params
    });
  });

  it('fetchGetBrand should have correct config', async () => {
    const id = 1;
    const res = await fetchGetBrand(id);
    expect(res.data).toMatchObject({
      url: `/admin/pms/brand/${id}`,
      method: 'get'
    });
  });

  it('fetchAddBrand should have correct config', async () => {
    const data: Api.Pms.BrandOperateParams = { brandId: 0, name: 'NewBrand', logo: '' };
    const res = await fetchAddBrand(data);
    expect(res.data).toMatchObject({
      url: '/admin/pms/brand',
      method: 'post',
      data
    });
  });

  it('fetchUpdateBrand should have correct config', async () => {
    const data: Api.Pms.BrandOperateParams = { brandId: 1, name: 'UpdatedBrand', logo: '' };
    const res = await fetchUpdateBrand(data);
    expect(res.data).toMatchObject({
      url: `/admin/pms/brand/${data.brandId}`,
      method: 'put',
      data
    });
  });

  it('fetchDeleteBrand should have correct config', async () => {
    const id = 1;
    const res = await fetchDeleteBrand(id);
    expect(res.data).toMatchObject({
      url: `/admin/pms/brand/${id}`,
      method: 'delete'
    });
  });
});
