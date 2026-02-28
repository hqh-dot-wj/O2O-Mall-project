import { request } from '@/service/request';

/** Global Product List */
export function fetchGetGlobalProductList(params?: Api.Pms.ProductSearchParams) {
  return request<Api.Pms.ProductList>({
    url: '/admin/pms/product/list',
    method: 'get',
    params
  });
}

/** Create Global Product */
export function fetchCreateGlobalProduct(data: Api.Pms.ProductOperateParams) {
  return request<boolean>({
    url: '/admin/pms/product',
    method: 'post',
    data
  });
}

/** Get Global Product Detail */
export function fetchGetGlobalProduct(productId: string) {
  return request<Api.Pms.Product>({
    url: `/admin/pms/product/${productId}`,
    method: 'get'
  });
}

/** Update Global Product */
export function fetchUpdateGlobalProduct(productId: string, data: Api.Pms.ProductOperateParams) {
  return request<boolean>({
    url: `/admin/pms/product/${productId}`,
    method: 'put',
    data
  });
}

/** Update Global Product Status */
export function fetchUpdateGlobalProductStatus(productId: string, publishStatus: Api.Pms.PublishStatus) {
  return request<boolean>({
    url: `/admin/pms/product/${productId}/status`,
    method: 'patch',
    data: { publishStatus }
  });
}

/** Delete Global Product */
export function fetchDeleteGlobalProduct(productId: string) {
  return request<boolean>({
    url: `/admin/pms/product/${productId}`,
    method: 'delete'
  });
}

/** Batch Delete Global Product */
export function fetchBatchDeleteGlobalProduct(productIds: string[]) {
  // Since backend might only support single delete for now, or we might need to loop/batch
  // If backend supports comma-separated ids in one path:
  return request<boolean>({
    url: `/admin/pms/product/${productIds.join(',')}`,
    method: 'delete'
  });
}
