import { request } from '@/service/request';

/** Get Stock List */
export function fetchGetStockList(data: Api.Store.StockSearchParams) {
  return request<Api.Store.StockList>({
    url: '/store/stock/list',
    method: 'post',
    data
  });
}

/** Update Stock */
export function fetchUpdateStock(data: Api.Store.StockUpdateParams) {
  return request<Api.Store.StockSku>({
    url: '/store/stock/update',
    method: 'post',
    data
  });
}

/** Batch Update Stock */
export function fetchBatchUpdateStock(data: Api.Store.BatchUpdateStockParams) {
  return request<Api.Store.BatchUpdateStockResult>({
    url: '/store/stock/batch/update',
    method: 'post',
    data
  });
}
