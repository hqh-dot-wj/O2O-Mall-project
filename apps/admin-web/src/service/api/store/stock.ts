import { request } from '@/service/request';

/** Get Stock List */
export function fetchGetStockList(data: Api.Store.StockSearchParams) {
  return request<Api.Store.StockList>({
    url: '/store/stock/list',
    method: 'post',
    data,
  });
}

/** Update Stock */
export function fetchUpdateStock(data: Api.Store.StockUpdateParams) {
  return request<boolean>({
    url: '/store/stock/update',
    method: 'post',
    data,
  });
}
