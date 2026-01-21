import { defineStore } from 'pinia'
import { ref } from 'vue'
import { httpGet, httpPost } from '@/http/http'

interface TenantInfo {
    tenantId: string
    companyName: string
    distance?: number
}

/**
 * 位置与租户状态管理
 * 用于分类页面的位置授权和租户切换
 */
export const useLocationStore = defineStore('location', () => {
    const latitude = ref<number | null>(null)
    const longitude = ref<number | null>(null)
    const currentTenantId = ref<string | null>(null)
    const currentCompanyName = ref<string | null>(null)
    const locationGranted = ref(false)
    const nearbyTenants = ref<TenantInfo[]>([])
    // 控制租户选择器弹窗显示
    const showTenantSelector = ref(false)

    /**
     * 根据当前位置匹配归属租户
     */
    async function matchTenant(): Promise<void> {
        if (latitude.value === null || longitude.value === null) {
            return
        }

        try {
            const result = await httpPost<{ tenantId: string, companyName: string }>(
                '/client/location/match-tenant',
                { lat: latitude.value, lng: longitude.value },
            )

            if (result) {
                currentTenantId.value = result.tenantId
                currentCompanyName.value = result.companyName
            }
        }
        catch (err: any) {
            console.error('匹配租户失败:', err)
            // 如果是 404 (DATA_NOT_FOUND)，表示该位置无服务
            if (err.code === 404 || err.message?.includes('暂未开通服务')) {
                currentTenantId.value = null
                currentCompanyName.value = '暂无服务商家'
            }
            else {
                uni.showToast({ title: '定位服务暂不可用', icon: 'none' })
            }
        }
    }

    /**
     * 请求用户位置授权并获取位置
     */
    async function requestLocation(): Promise<boolean> {
        const success = await new Promise<boolean>((resolve) => {
            uni.getLocation({
                type: 'gcj02', // 使用国测局坐标
                success: (res) => {
                    latitude.value = res.latitude
                    longitude.value = res.longitude
                    locationGranted.value = true
                    resolve(true)
                },
                fail: (err) => {
                    console.error('获取位置失败:', err)

                    // 检查是否是用户拒绝授权
                    if (err.errMsg?.includes('deny') || err.errMsg?.includes('auth')) {
                        uni.showModal({
                            title: '位置授权',
                            content: '需要获取您的位置信息以匹配附近的服务商家，请在设置中开启位置权限',
                            confirmText: '去设置',
                            success: (modalRes) => {
                                if (modalRes.confirm) {
                                    uni.openSetting({})
                                }
                            },
                        })
                    }
                    resolve(false)
                },
            })
        })

        if (success) {
            await matchTenant()
        }

        return success
    }

    /**
     * 获取附近租户列表 (用于手动切换)
     */
    async function fetchNearbyTenants(): Promise<void> {
        if (latitude.value === null || longitude.value === null) {
            return
        }

        try {
            const result = await httpGet<TenantInfo[]>(
                '/client/location/nearby-tenants',
                { lat: latitude.value, lng: longitude.value },
            )

            if (result) {
                nearbyTenants.value = result
            }
        }
        catch (err) {
            console.error('获取附近租户失败:', err)
        }
    }

    /**
     * 手动切换租户
     */
    function setTenant(tenant: TenantInfo): void {
        currentTenantId.value = tenant.tenantId
        currentCompanyName.value = tenant.companyName
    }

    /**
     * 清除位置信息
     */
    function clearLocation(): void {
        latitude.value = null
        longitude.value = null
        currentTenantId.value = null
        currentCompanyName.value = null
        locationGranted.value = false
        nearbyTenants.value = []
    }

    /**
     * 打开租户选择器
     */
    async function openTenantSelector(): Promise<void> {
        await fetchNearbyTenants()
        showTenantSelector.value = true
    }

    return {
        latitude,
        longitude,
        currentTenantId,
        currentCompanyName,
        locationGranted,
        nearbyTenants,
        showTenantSelector,
        requestLocation,
        matchTenant,
        fetchNearbyTenants,
        setTenant,
        clearLocation,
        openTenantSelector,
    }
}, {
    persist: {
        paths: ['currentTenantId', 'currentCompanyName', 'locationGranted', 'latitude', 'longitude'],
    },
})
