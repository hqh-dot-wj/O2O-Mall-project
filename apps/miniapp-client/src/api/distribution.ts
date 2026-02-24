/**
 * 分销相关 API
 * 类型来自 @libs/common-types（由 backend openApi.json 生成）
 */
import type { CommissionPreview } from '@libs/common-types'
import { httpGet } from '@/http/http'

/** 佣金预估 */
export function getCommissionPreview(params: {
  tenantId: string
  shareUserId?: string
}) {
  return httpGet<CommissionPreview>('/store/distribution/commission/preview', params)
}
