import { request } from '@/service/request';

/** Fetch current distribution configuration */
export function fetchGetDistConfig() {
    return request<Api.Store.DistributionConfig>({
        url: '/store/distribution/config',
        method: 'get'
    });
}

/** Update distribution configuration */
export function fetchUpdateDistConfig(data: Api.Store.DistributionConfigUpdateParams) {
    return request<boolean>({
        url: '/store/distribution/config',
        method: 'post',
        data
    });
}

/** Get configuration change history */
export function fetchGetDistConfigLogs() {
    return request<Api.Store.DistributionConfigLog[]>({
        url: '/store/distribution/config/logs',
        method: 'get'
    });
}
