import { request } from '@/service/request';

/** Tenant Product List */
export function fetchGetStoreProductList(data: Api.Store.ListStoreProductParams) {
  return request<Api.Store.TenantProductList>({
    url: '/store/product/list',
    method: 'post',
    data
  });
}

/** Import Product */
export function fetchImportProduct(data: Api.Store.ProductImportParams) {
  return request<boolean>({
    url: '/store/product/import',
    method: 'post',
    data
  });
}

/** Update Product Price & Config */
export function fetchUpdateStoreProductPrice(data: Api.Store.ProductPriceUpdateParams) {
  return request<boolean>({
    url: '/store/product/update-price',
    method: 'post',
    data
  });
}

/** Update Product SPU Base Info */
export function fetchUpdateStoreProductBase(data: Api.Store.ProductBaseUpdateParams) {
  return request<boolean>({
    url: '/store/product/update-base',
    method: 'post',
    data
  });
}

/** Get Product Market List (Headquarters Pool) */
export function fetchGetProductMarketList(data: Api.Store.MarketSearchParams) {
  return request<Api.Store.MarketProductList>({
    url: '/store/market/list',
    method: 'post',
    data
  });
}

/** Get Product Market Detail */
export function fetchGetMarketProductDetail(productId: string) {
  return request<Api.Store.MarketProduct>({
    url: `/store/market/detail/${productId}`,
    method: 'get'
  });
}
