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

/** Batch Import Products */
export function fetchBatchImportProducts(data: { items: Api.Store.ProductImportParams[] }) {
  return request<boolean>({
    url: '/store/product/import/batch',
    method: 'post',
    data
  });
}

/** Batch Update Product Price */
export function fetchBatchUpdateProductPrice(data: {
  items: Array<{
    tenantSkuId: string;
    price: number;
    stock: number;
    distRate: number;
    distMode?: Api.Pms.DistributionMode;
    pointsRatio?: number;
    isPromotionProduct?: boolean;
  }>;
}) {
  return request<boolean>({
    url: '/store/product/update-price/batch',
    method: 'post',
    data
  });
}

/** Remove Product from Store */
export function fetchRemoveProduct(data: { id: string }) {
  return request<boolean>({
    url: '/store/product/remove',
    method: 'post',
    data
  });
}

/** Get Stock Alert Config */
export function fetchGetStockAlertConfig() {
  return request<{ threshold: number }>({
    url: '/store/product/stock-alert/config',
    method: 'get'
  });
}

/** Set Stock Alert Config */
export function fetchSetStockAlertConfig(data: { threshold: number }) {
  return request<boolean>({
    url: '/store/product/stock-alert/config',
    method: 'post',
    data
  });
}
