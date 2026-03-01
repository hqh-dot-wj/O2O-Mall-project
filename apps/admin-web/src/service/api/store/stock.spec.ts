import { describe, expect, it, vi } from 'vitest';
import {
  fetchBatchUpdateStock,
  fetchGetStockList,
  fetchUpdateStock
} from './stock';

vi.mock('@/service/request', () => ({
  request: vi.fn((config: unknown) => Promise.resolve({ data: config }))
}));

describe('Store Stock API', () => {
  it('fetchGetStockList should have correct config', async () => {
    const data = { pageNum: 1, pageSize: 10, productName: null };
    const res = await fetchGetStockList(data);
    expect(res.data).toMatchObject({
      url: '/store/stock/list',
      method: 'post',
      data
    });
  });

  it('fetchUpdateStock should have correct config', async () => {
    const data: Api.Store.StockUpdateParams = {
      skuId: 'sku1',
      stockChange: 10,
      reason: '进货补货'
    };
    const res = await fetchUpdateStock(data);
    expect(res.data).toMatchObject({
      url: '/store/stock/update',
      method: 'post',
      data
    });
  });

  it('fetchBatchUpdateStock should have correct config', async () => {
    const data: Api.Store.BatchUpdateStockParams = {
      items: [
        { skuId: 'sku1', stockChange: 5, reason: '盘点' },
        { skuId: 'sku2', stockChange: -3 }
      ]
    };
    const res = await fetchBatchUpdateStock(data);
    expect(res.data).toMatchObject({
      url: '/store/stock/batch/update',
      method: 'post',
      data
    });
  });
});
