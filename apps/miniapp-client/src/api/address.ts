/**
 * 地址管理 API
 * 类型来自 @libs/common-types（由 backend openApi.json 生成）
 */
import type { CreateAddressParams, UpdateAddressParams } from '@libs/common-types'
import { httpDelete, httpGet, httpPost, httpPut } from '@/http/http'

/** 向后兼容别名：旧代码中使用的 AddressDto */
export type AddressDto = CreateAddressParams

/**
 * 地址信息（展示用，包含 id 和 fullAddress 等计算字段）
 * backend openApi 中 AddressVo 暂未独立导出，保留本地类型
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

/** 获取地址列表 */
export function getAddressList() {
  return httpGet<{ list: AddressVo[] }>('/client/address/list')
}

/** 获取默认地址 */
export function getDefaultAddress() {
  return httpGet<AddressVo | null>('/client/address/default')
}

/** 获取地址详情 */
export function getAddressDetail(id: string) {
  return httpGet<AddressVo>(`/client/address/${id}`)
}

/** 创建地址 */
export function createAddress(dto: CreateAddressParams) {
  return httpPost<AddressVo>('/client/address', dto)
}

/** 更新地址 */
export function updateAddress(dto: UpdateAddressParams) {
  return httpPut<AddressVo>('/client/address', dto)
}

/** 删除地址 */
export function deleteAddress(id: string) {
  return httpDelete(`/client/address/${id}`)
}

/** 设为默认地址 */
export function setDefaultAddress(id: string) {
  return httpPut(`/client/address/${id}/default`)
}
