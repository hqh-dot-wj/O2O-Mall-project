import { describe, expect, it, vi } from 'vitest';
import { request } from '@/service/request';
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
  request: vi.fn((config: { url: string }) => Promise.resolve({ data: config }))
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

  it('fetchGetGlobalProductList should pass all ListProductDto params', async () => {
    const params: Api.Pms.ProductSearchParams = {
      pageNum: 1,
      pageSize: 10,
      name: '测试商品',
      categoryId: 1,
      publishStatus: 'ON_SHELF'
    };
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

  it('fetchBatchDeleteGlobalProduct should loop single deletes', async () => {
    const productIds = ['id1', 'id2', 'id3'];
    vi.mocked(request).mockClear();
    const res = await fetchBatchDeleteGlobalProduct(productIds);
    expect(res.data).toBe(true);
    expect(res.error).toBeUndefined();
    expect(request).toHaveBeenCalledTimes(3);
    expect(request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ url: '/admin/pms/product/id1', method: 'delete' })
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ url: '/admin/pms/product/id2', method: 'delete' })
    );
    expect(request).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ url: '/admin/pms/product/id3', method: 'delete' })
    );
  });
});
