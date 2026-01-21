<script lang="ts" setup>
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'

const orderId = ref('')
const status = ref<'success' | 'fail'>('success')

onLoad((options) => {
  if (options?.orderId) {
    orderId.value = options.orderId
  }
  if (options?.status) {
    status.value = options.status as 'success' | 'fail'
  }
})

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

function viewOrder() {
  uni.redirectTo({ url: `/pages/order/detail?id=${orderId.value}` })
}

function retryPay() {
  // 返回上一页(收银台/详情页)
  uni.navigateBack()
}
</script>

<template>
  <view class="result-page">
    <view class="result-icon">
      <wd-icon 
        v-if="status === 'success'" 
        name="check-circle-filled" 
        size="120rpx" 
        color="#07c160" 
      />
      <wd-icon 
        v-else 
        name="close-circle-filled" 
        size="120rpx" 
        color="#ff4d4f" 
      />
    </view>
    
    <view class="result-title">
      {{ status === 'success' ? '支付成功' : '支付失败' }}
    </view>
    
    <view class="result-desc">
      {{ status === 'success' ? '您的订单已支付成功，我们将尽快为您服务' : '支付遇到问题，请重试' }}
    </view>

    <view class="action-buttons">
      <template v-if="status === 'success'">
        <wd-button type="primary" size="medium" @click="viewOrder">查看订单</wd-button>
        <wd-button size="medium" plain @click="goHome">返回首页</wd-button>
      </template>
      <template v-else>
        <wd-button type="primary" size="medium" @click="retryPay">重新支付</wd-button>
        <wd-button size="medium" plain @click="viewOrder">查看订单</wd-button>
      </template>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.result-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;
  background-color: #fff;
  min-height: 100vh;
}

.result-icon {
  margin-bottom: 40rpx;
}

.result-title {
  font-size: 40rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
}

.result-desc {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 80rpx;
}

.action-buttons {
  display: flex;
  gap: 30rpx;
}
</style>
