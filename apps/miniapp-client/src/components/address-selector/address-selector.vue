<script lang="ts" setup>
import { ref, watch } from 'vue'
import { getAddressList, type AddressVo } from '@/api/address'

const props = defineProps<{
  modelValue: boolean
  tenantId?: string // 用于 LBS 校验
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'select': [address: AddressVo]
}>()

const loading = ref(false)
const addressList = ref<AddressVo[]>([])

// 监听弹窗显示
watch(() => props.modelValue, async (visible) => {
  if (visible) {
    await loadAddressList()
  }
})

// 加载地址列表
async function loadAddressList() {
  loading.value = true
  try {
    const result = await getAddressList()
    if (result) {
      addressList.value = result.list || []
    }
  }
  catch (err) {
    console.error('加载地址列表失败:', err)
  }
  finally {
    loading.value = false
  }
}

// 选择地址
function selectAddress(addr: AddressVo) {
  emit('select', addr)
  emit('update:modelValue', false)
}

// 新增地址
function goAddAddress() {
  emit('update:modelValue', false)
  uni.navigateTo({
    url: '/pages/address/edit',
  })
}

// 管理地址
function goManageAddress() {
  emit('update:modelValue', false)
  uni.navigateTo({
    url: '/pages/address/list',
  })
}

// 关闭弹窗
function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <wd-popup
    :model-value="modelValue"
    position="bottom"
    :safe-area-inset-bottom="true"
    closable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <view class="address-selector">
      <!-- 头部 -->
      <view class="selector-header">
        <text class="title">选择收货地址</text>
        <text class="manage-btn" @click="goManageAddress">管理</text>
      </view>

      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <wd-loading />
      </view>

      <!-- 地址列表 -->
      <scroll-view v-else-if="addressList.length > 0" scroll-y class="address-list">
        <view
          v-for="addr in addressList"
          :key="addr.id"
          class="address-item"
          @click="selectAddress(addr)"
        >
          <view class="addr-main">
            <view class="addr-header">
              <text class="name">{{ addr.name }}</text>
              <text class="phone">{{ addr.phone }}</text>
              <text v-if="addr.tag" class="tag">{{ addr.tag }}</text>
              <text v-if="addr.isDefault" class="default-tag">默认</text>
            </view>
            <text class="addr-detail">{{ addr.fullAddress }}</text>
          </view>
          <view class="i-carbon-chevron-right text-28rpx text-gray-400" />
        </view>
      </scroll-view>

      <!-- 空状态 -->
      <view v-else class="empty-state">
        <text>暂无收货地址</text>
      </view>

      <!-- 新增按钮 -->
      <view class="add-btn-wrap">
        <wd-button type="primary" block plain @click="goAddAddress">
          <view class="i-carbon-add mr-8rpx" />
          新增收货地址
        </wd-button>
      </view>
    </view>
  </wd-popup>
</template>

<style lang="scss" scoped>
.address-selector {
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.selector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;

  .title {
    font-size: 32rpx;
    font-weight: 500;
    color: #333;
  }

  .manage-btn {
    font-size: 26rpx;
    color: #1890ff;
  }
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300rpx;
}

.address-list {
  flex: 1;
  max-height: 500rpx;
}

.address-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;

  &:active {
    background-color: #f5f5f5;
  }

  .addr-main {
    flex: 1;

    .addr-header {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12rpx;
      margin-bottom: 12rpx;

      .name {
        font-size: 30rpx;
        font-weight: 500;
        color: #333;
      }

      .phone {
        font-size: 26rpx;
        color: #666;
      }

      .tag {
        font-size: 20rpx;
        color: #1890ff;
        background-color: rgba(24, 144, 255, 0.1);
        padding: 4rpx 10rpx;
        border-radius: 4rpx;
      }

      .default-tag {
        font-size: 20rpx;
        color: #ff4d4f;
        background-color: rgba(255, 77, 79, 0.1);
        padding: 4rpx 10rpx;
        border-radius: 4rpx;
      }
    }

    .addr-detail {
      font-size: 24rpx;
      color: #666;
      line-height: 1.4;
    }
  }
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200rpx;
  color: #999;
  font-size: 28rpx;
}

.add-btn-wrap {
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #f0f0f0;
}
</style>
