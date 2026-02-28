import { describe, expect, it, vi } from 'vitest';
import {
  fetchBatchDeleteGlobalProduct,
  fetchCreateGlobalProduct,
  fetchDeleteGlobalProduct,
  fetchGetGlobalProduct,
  fetchGetGlobalProductList,
  fetchUpdateGlobalProduct,
  fetchUpdateGlobalProductStatus
} from './product';

// Mock request
vi.mock('@/service/request', () => ({
  request: vi.fn(config => Promise.resolve({ data: config }))
}));

describe('PMS Product API', () => {
  it('fetchGetGlobalProductList should have correct config', async () => {
    const params: Api.Pms.ProductSearchParams = { pageNum: 1, pageSize: 10 };
    const res = await fetchGetGlobalProductList(params);
    expect(res.data).toMatchObject({
      url: '/admin/pms/product/list',
      method: 'get',
      params
    });
  });

  it('fetchCreateGlobalProduct should have correct config', async () => {
    const data: Api.Pms.ProductOperateParams = {
      name: 'Test',
      categoryId: 1,
      type: 'REAL',
      mainImages: [],
      specDef: [],
      skus: [],
      attrs: []
    };
    const res = await fetchCreateGlobalProduct(data);
    expect(res.data).toMatchObject({
      url: '/admin/pms/product',
      method: 'post',
      data
    });
  });

  it('fetchGetGlobalProduct should have correct config', async () => {
    const productId = '123';
    const res = await fetchGetGlobalProduct(productId);
    expect(res.data).toMatchObject({
      url: `/admin/pms/product/${productId}`,
      method: 'get'
    });
  });

  it('fetchUpdateGlobalProduct should have correct config', async () => {
    const productId = '123';
    const data: Api.Pms.ProductOperateParams = {
      name: 'Updated',
      categoryId: 1,
      type: 'REAL',
      mainImages: [],
      specDef: [],
      skus: [],
      attrs: []
    };
    const res = await fetchUpdateGlobalProduct(productId, data);
    expect(res.data).toMatchObject({
      url: `/admin/pms/product/${productId}`,
      method: 'put',
      data
    });
  });

  it('fetchUpdateGlobalProductStatus should have correct config', async () => {
    const productId = '123';
    const status: Api.Pms.PublishStatus = 'ON_SHELF';
    const res = await fetchUpdateGlobalProductStatus(productId, status);
    expect(res.data).toMatchObject({
      url: `/admin/pms/product/${productId}/status`,
      method: 'patch',
      data: { publishStatus: status }
    });
  });

  it('fetchDeleteGlobalProduct should have correct config', async () => {
    const productId = '123';
    const res = await fetchDeleteGlobalProduct(productId);
    expect(res.data).toMatchObject({
      url: `/admin/pms/product/${productId}`,
      method: 'delete'
    });
  });

  it('fetchBatchDeleteGlobalProduct should have correct config', async () => {
    const productIds = ['id1', 'id2', 'id3'];
    const res = await fetchBatchDeleteGlobalProduct(productIds);
    expect(res.data).toMatchObject({
      url: '/admin/pms/product/id1,id2,id3',
      method: 'delete'
    });
  });
});
