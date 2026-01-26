import { http } from '@/http/http'

/** 升级申请参数 */
export interface ApplyUpgradeParams {
    targetLevel: number
    applyType?: string
    referralCode?: string
}

/** 推荐码信息 */
export interface ReferralCodeInfo {
    code: string
    qrCodeUrl: string | null
    usageCount: number
}

/** 团队统计 */
export interface TeamStats {
    myLevel: number
    directCount: number
    indirectCount: number
    totalTeamSales: number
}

/** 申请升级 */
export function applyUpgrade(data: ApplyUpgradeParams) {
    return http.post('/client/upgrade/apply', data)
}

/** 获取升级状态 */
export function getUpgradeStatus() {
    return http.get('/client/upgrade/status')
}

/** 获取我的推荐码 */
export function getMyReferralCode() {
    return http.get<ReferralCodeInfo>('/client/upgrade/referral-code')
}

/** 获取团队统计 */
export function getTeamStats() {
    return http.get<TeamStats>('/client/upgrade/team/stats')
}

/** 获取团队列表 */
export function getTeamList(params: { type: 'direct' | 'indirect', pageNum: number, pageSize: number }) {
    return http.get('/client/upgrade/team/list', params)
}
