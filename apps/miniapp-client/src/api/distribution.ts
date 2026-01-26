import { httpGet } from '@/http/http'

export interface CommissionPreviewResult {
  tenantName: string
  commissionRate: string
  isLocalReferrer: boolean
  isCrossEnabled: boolean
  estimatedAmount: number
  notice: string
}

/**
 * 佣金预估
 */
export function getCommissionPreview(params: {
  tenantId: string
  shareUserId?: string
}) {
  return httpGet<CommissionPreviewResult>('/store/distribution/commission/preview', params)
}
