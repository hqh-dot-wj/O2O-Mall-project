/**
 * 行政区划 API
 */
import { httpGet } from '@/http/http'

export interface RegionVo {
    code: string
    name: string
    parentId?: string
    level: number
}

/**
 * 获取行政区划列表
 * @param parentId 父级Code，不传则返回一级行政区（省份）
 */
export function getRegionList(parentId?: string) {
    return httpGet<RegionVo[]>('/lbs/region/list', { parentId })
}

/**
 * 获取行政区划名称
 * @param code 行政区划Code
 */
export function getRegionName(code: string) {
    return httpGet<string>(`/lbs/region/name/${code}`)
}
