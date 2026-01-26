import { request } from '@/service/request';

/** Global Product List */
export function fetchGetGlobalProductList(params?: Api.Pms.ProductSearchParams) {
  return request<Api.Pms.ProductList>({
    url: '/pms/product/list',
    method: 'get',
    params
  });
}

/** Create Global Product */
export function fetchCreateGlobalProduct(data: Api.Pms.ProductOperateParams) {
  return request<boolean>({
    url: '/pms/product',
    method: 'post',
    data
  });
}

/** Get Global Product Detail */
export function fetchGetGlobalProduct(productId: string) {
  return request<any>({
    // Use any or specific type if available, avoiding strict type check block for now
    url: `/pms/product/${productId}`,
    method: 'get'
  });
}

/** Update Global Product */
export function fetchUpdateGlobalProduct(productId: string, data: Api.Pms.ProductOperateParams) {
  return request<boolean>({
    url: `/pms/product/${productId}`,
    method: 'put',
    data
  });
}

/** Batch Delete Global Product */
export function fetchBatchDeleteGlobalProduct(productIds: string[]) {
  return request<boolean>({
    url: `/pms/product/${productIds.join(',')}`,
    method: 'delete'
  });
}
