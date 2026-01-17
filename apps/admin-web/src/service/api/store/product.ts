import { request } from '@/service/request';

/** Tenant Product List */
export function fetchGetStoreProductList(data: Pick<Api.Common.PaginatingCommonParams, 'pageNum' | 'pageSize'>) {
    return request<Api.Store.TenantProductList>({
        url: '/store/product/list',
        method: 'post',
        data,
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

/** Update Product Price */
export function fetchUpdateStoreProductPrice(data: Api.Store.ProductPriceUpdateParams) {
    return request<boolean>({
        url: '/store/product/price',
        method: 'post',
        data
    });
}

/** Get Product Market List (Headquarters Pool) */
export function fetchGetProductMarketList(data: Api.Store.MarketSearchParams) {
    return request<Api.Store.MarketProductList>({
        url: '/store/market/list',
        method: 'post',
        data,
    });
}
