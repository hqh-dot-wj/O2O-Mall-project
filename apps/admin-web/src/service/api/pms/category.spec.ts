import { describe, expect, it, vi } from 'vitest';
import {
  fetchAddCategory,
  fetchDeleteCategory,
  fetchGetCategory,
  fetchGetCategoryList,
  fetchGetCategoryTree,
  fetchUpdateCategory
} from './category';

// Mock request
vi.mock('@/service/request', () => ({
  request: vi.fn(config => Promise.resolve({ data: config }))
}));

describe('PMS Category API', () => {
  it('fetchGetCategoryTree should have correct config', async () => {
    const res = await fetchGetCategoryTree();
    expect(res.data).toMatchObject({
      url: '/admin/pms/category/tree',
      method: 'get'
    });
  });

  it('fetchGetCategory should have correct config', async () => {
    const id = 1;
    const res = await fetchGetCategory(id);
    expect(res.data).toMatchObject({
      url: `/admin/pms/category/${id}`,
      method: 'get'
    });
  });

  it('fetchDeleteCategory should have correct config', async () => {
    const id = 1;
    const res = await fetchDeleteCategory(id);
    expect(res.data).toMatchObject({
      url: `/admin/pms/category/${id}`,
      method: 'delete'
    });
  });
});
