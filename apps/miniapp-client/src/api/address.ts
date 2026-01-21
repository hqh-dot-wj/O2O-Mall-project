/**
 * 地址管理 API
 */
import { httpGet, httpPost, httpPut, httpDelete } from '@/http/http'

/**
 * 地址信息
 */
export interface AddressVo {
    id: string
    name: string
    phone: string
    province: string
    city: string
    district: string
    detail: string
    fullAddress: string
    latitude?: number
    longitude?: number
    isDefault: boolean
    tag?: string
}

/**
 * 地址列表响应
 */
export interface AddressListVo {
    list: AddressVo[]
}

/**
 * 创建/更新地址参数
 */
export interface AddressDto {
    id?: string // 更新时需要
    name: string
    phone: string
    province: string
    city: string
    district: string
    detail: string
    latitude?: number
    longitude?: number
    isDefault?: boolean
    tag?: string
}

/**
 * 获取地址列表
 */
export function getAddressList() {
    return httpGet<AddressListVo>('/client/address/list')
}

/**
 * 获取默认地址
 */
export function getDefaultAddress() {
    return httpGet<AddressVo | null>('/client/address/default')
}

/**
 * 获取地址详情
 */
export function getAddressDetail(id: string) {
    return httpGet<AddressVo>(`/client/address/${id}`)
}

/**
 * 创建地址
 */
export function createAddress(dto: AddressDto) {
    return httpPost<AddressVo>('/client/address', dto)
}

/**
 * 更新地址
 */
export function updateAddress(dto: AddressDto) {
    return httpPut<AddressVo>('/client/address', dto)
}

/**
 * 删除地址
 */
export function deleteAddress(id: string) {
    return httpDelete(`/client/address/${id}`)
}

/**
 * 设为默认地址
 */
export function setDefaultAddress(id: string) {
    return httpPut(`/client/address/${id}/default`)
}
