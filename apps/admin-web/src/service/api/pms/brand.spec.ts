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

  it('fetchGetBrand should have correct config', async () => {
    const id = 1;
    const res = await fetchGetBrand(id);
    expect(res.data).toMatchObject({
      url: `/admin/pms/brand/${id}`,
      method: 'get'
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
