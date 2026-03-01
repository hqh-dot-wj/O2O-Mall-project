import { describe, expect, it, vi } from 'vitest';
import {
  fetchBatchImportProducts,
  fetchBatchUpdateProductPrice,
  fetchGetMarketProductDetail,
  fetchGetProductMarketList,
  fetchGetStockAlertConfig,
  fetchGetStoreProductList,
  fetchImportProduct,
  fetchRemoveProduct,
  fetchSetStockAlertConfig,
  fetchUpdateStoreProductBase,
  fetchUpdateStoreProductPrice
} from './product';

vi.mock('@/service/request', () => ({
  request: vi.fn((config: unknown) => Promise.resolve({ data: config }))
}));

describe('Store Product API', () => {
  it('fetchGetStoreProductList should have correct config', async () => {
    const data = { pageNum: 1, pageSize: 10, name: null, type: null, status: null };
    const res = await fetchGetStoreProductList(data);
    expect(res.data).toMatchObject({
      url: '/store/product/list',
      method: 'post',
      data
    });
  });

  it('fetchImportProduct should have correct config', async () => {
    const data: Api.Store.ProductImportParams = {
      productId: 'p1',
      skus: [{ globalSkuId: 's1', price: 100, stock: 10 }]
    };
    const res = await fetchImportProduct(data);
    expect(res.data).toMatchObject({
      url: '/store/product/import',
      method: 'post',
      data
    });
  });

  it('fetchUpdateStoreProductPrice should have correct config', async () => {
    const data: Api.Store.ProductPriceUpdateParams = {
      tenantSkuId: 'ts1',
      price: 99,
      stock: 5,
      distRate: 0.1,
      distMode: 'RATIO'
    };
    const res = await fetchUpdateStoreProductPrice(data);
    expect(res.data).toMatchObject({
      url: '/store/product/update-price',
      method: 'post',
      data
    });
  });

  it('fetchUpdateStoreProductBase should have correct config', async () => {
    const data: Api.Store.ProductBaseUpdateParams = {
      id: 'tp1',
      status: 'ON_SHELF',
      customTitle: '自定义标题'
    };
    const res = await fetchUpdateStoreProductBase(data);
    expect(res.data).toMatchObject({
      url: '/store/product/update-base',
      method: 'post',
      data
    });
  });

  it('fetchGetProductMarketList should have correct config', async () => {
    const data = { pageNum: 1, pageSize: 20, name: null, categoryId: null, type: null };
    const res = await fetchGetProductMarketList(data);
    expect(res.data).toMatchObject({
      url: '/store/market/list',
      method: 'post',
      data
    });
  });

  it('fetchGetMarketProductDetail should have correct config', async () => {
    const productId = 'p1';
    const res = await fetchGetMarketProductDetail(productId);
    expect(res.data).toMatchObject({
      url: `/store/market/detail/${productId}`,
      method: 'get'
    });
  });

  it('fetchBatchImportProducts should have correct config', async () => {
    const data = {
      items: [
        {
          productId: 'p1',
          skus: [{ globalSkuId: 's1', price: 100, stock: 10 }]
        }
      ]
    };
    const res = await fetchBatchImportProducts(data);
    expect(res.data).toMatchObject({
      url: '/store/product/import/batch',
      method: 'post',
      data
    });
  });

  it('fetchBatchUpdateProductPrice should have correct config', async () => {
    const data = {
      items: [
        {
          tenantSkuId: 'ts1',
          price: 99,
          stock: 5,
          distRate: 0.1
        }
      ]
    };
    const res = await fetchBatchUpdateProductPrice(data);
    expect(res.data).toMatchObject({
      url: '/store/product/update-price/batch',
      method: 'post',
      data
    });
  });

  it('fetchRemoveProduct should have correct config', async () => {
    const data = { id: 'tp1' };
    const res = await fetchRemoveProduct(data);
    expect(res.data).toMatchObject({
      url: '/store/product/remove',
      method: 'post',
      data
    });
  });

  it('fetchGetStockAlertConfig should have correct config', async () => {
    const res = await fetchGetStockAlertConfig();
    expect(res.data).toMatchObject({
      url: '/store/product/stock-alert/config',
      method: 'get'
    });
  });

  it('fetchSetStockAlertConfig should have correct config', async () => {
    const data = { threshold: 10 };
    const res = await fetchSetStockAlertConfig(data);
    expect(res.data).toMatchObject({
      url: '/store/product/stock-alert/config',
      method: 'post',
      data
    });
  });
});
