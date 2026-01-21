<script lang="ts" setup>
import { computed, watch } from 'vue'
import { useLocationStore } from '@/store/location'

const locationStore = useLocationStore()

// 使用 store 中的状态控制显示
const showPopup = computed({
  get: () => locationStore.showTenantSelector,
  set: (val) => {
    locationStore.showTenantSelector = val
  },
})

// 监听租户变化，发送全局事件通知页面刷新
watch(() => locationStore.currentTenantId, (newVal, oldVal) => {
  // 如果租户发生变化（不是初始化），发送事件
  if (oldVal && newVal !== oldVal) {
    uni.$emit('tenant-changed')
  }
})

// 重新定位
async function handleRelocate() {
  showPopup.value = false
  uni.showLoading({ title: '定位中...' })
  await locationStore.requestLocation()
  uni.hideLoading()
  // 发送事件通知页面刷新
  uni.$emit('tenant-changed')
}

// 选择租户
function handleSelectTenant(tenant: any) {
  locationStore.setTenant(tenant)
  showPopup.value = false
  // 注意：租户变化会被 watch 捕获并发送事件
}

// 格式化距离
function formatDistance(distance?: number): string {
  if (!distance)
    return ''
  if (distance < 1)
    return `${Math.round(distance * 1000)}m`

  return `${distance.toFixed(1)}km`
}
</script>

<template>
  <!-- 租户切换弹窗 - 全局组件 -->
  <!-- z-index 设置为 10001，确保高于 tabbar 的 1000 -->
  <wd-popup
    v-model="showPopup"
    position="bottom"
    :safe-area-inset-bottom="true"
    :z-index="10001"
    :lock-scroll="true"
    :close-on-click-modal="true"
    closable
    custom-style="max-height: 70vh;"
    round
  >
    <view class="tenant-popup">
      <view class="popup-header">
        选择服务区域
      </view>

      <!-- 重新定位按钮 -->
      <view class="relocate-btn" @click="handleRelocate">
        <wd-icon name="location" size="32rpx" />
        <text>重新定位</text>
      </view>

      <!-- 附近租户列表 -->
      <view class="tenant-list">
        <view
          v-for="tenant in locationStore.nearbyTenants"
          :key="tenant.tenantId"
          class="tenant-item"
          :class="{ active: tenant.tenantId === locationStore.currentTenantId }"
          @click="handleSelectTenant(tenant)"
        >
          <view class="tenant-info">
            <text class="tenant-title">{{ tenant.companyName }}</text>
            <text v-if="tenant.distance" class="tenant-distance">{{ formatDistance(tenant.distance) }}</text>
          </view>
          <wd-icon
            v-if="tenant.tenantId === locationStore.currentTenantId"
            name="check"
            size="36rpx"
            color="#1890ff"
          />
        </view>
        <view v-if="locationStore.nearbyTenants.length === 0" class="empty-tenant">
          暂无可用服务区域
        </view>
      </view>
    </view>
  </wd-popup>
</template>

<style lang="scss" scoped>
// 租户切换弹窗
.tenant-popup {
  padding: 30rpx;
  // max-height 由 popup 的 custom-style 控制

  .popup-header {
    font-size: 32rpx;
    font-weight: 600;
    color: #333;
    text-align: center;
    margin-bottom: 30rpx;
  }

  .relocate-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10rpx;
    padding: 24rpx;
    background-color: #f5f5f5;
    border-radius: 12rpx;
    margin-bottom: 30rpx;
    color: #1890ff;
    font-size: 28rpx;
  }

  .tenant-list {
    .tenant-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24rpx 20rpx;
      border-bottom: 1rpx solid #eee;

      &.active {
        background-color: rgba(24, 144, 255, 0.05);
      }

      .tenant-info {
        display: flex;
        flex-direction: column;
        gap: 8rpx;

        .tenant-title {
          font-size: 28rpx;
          color: #333;
        }

        .tenant-distance {
          font-size: 24rpx;
          color: #999;
        }
      }
    }

    .empty-tenant {
      text-align: center;
      padding: 60rpx 0;
      color: #999;
      font-size: 28rpx;
    }
  }
}
</style>
