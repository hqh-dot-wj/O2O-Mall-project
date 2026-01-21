import { httpGet, httpPost } from '@/http/http'

/**
 * 商品分类树
 */
export function getCategoryTree() {
    return httpGet<any[]>('/client/product/category/tree')
}

/**
 * 商品列表
 */
export function getProductList(params: {
    categoryId?: number
    name?: string
    type?: string
    pageNum?: number
    pageSize?: number
}) {
    return httpGet<{ rows: any[], total: number }>('/client/product/list', params)
}

/**
 * 商品详情
 */
export function getProductDetail(id: string) {
    return httpGet<any>(`/client/product/detail/${id}`)
}

/**
 * 匹配位置归属租户
 */
export function matchTenant(lat: number, lng: number) {
    return httpPost<{ tenantId: string, tenantName: string }>(
        '/client/location/match-tenant',
        { lat, lng },
    )
}

/**
 * 获取附近租户列表
 */
export function getNearbyTenants(lat: number, lng: number) {
    return httpGet<any[]>(
        '/client/location/nearby-tenants',
        { lat, lng },
    )
}
