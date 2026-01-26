<template>
  <view v-if="instance" class="group-buy-widget">
    <!-- 1. 进度概览 -->
    <view class="mb-3 flex items-center justify-between">
      <view class="text-sm font-bold">
        {{ instance.role === 'LEADER' ? '我是团长' : '拼团成员' }}
      </view>
      <view class="text-xs text-gray-500">
        {{ statusText }}
      </view>
    </view>

    <!-- 2. 头像坑位区 -->
    <view class="my-4 flex justify-center gap-4">
      <!-- 模拟头像展示 logic needed from instanceData.members list if available, or just mock count -->
      <view
        v-for="i in instance.instanceData.targetCount || 2"
        :key="i"
        class="h-10 w-10 flex items-center justify-center border-2 rounded-full bg-gray-200"
        :class="i <= (instance.instanceData.currentCount || 0) ? 'border-orange-500' : 'border-dashed border-gray-300'"
      >
        <text v-if="i <= (instance.instanceData.currentCount || 0)" class="i-carbon-user text-orange-500" />
        <text v-else class="text-xs text-gray-300">?</text>
      </view>
    </view>

    <!-- 3. 倒计时/提示 -->
    <view class="mb-4 text-center text-sm text-gray-600">
      <text v-if="timeLeft > 0">
        仅剩 <text class="text-red-500 font-bold">{{ instance.instanceData.targetCount - instance.instanceData.currentCount }}</text> 个名额，
        <uni-countdown :show-day="false" :second="timeLeft" color="#ef4444" background-color="#fff" /> 后结束
      </text>
      <text v-else>拼团已结束</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  instance: any // 实际应定义 TypeScript Interface
}>()

const statusText = computed(() => {
  const map: Record<string, string> = {
    PENDING_PAY: '待支付',
    PAID: '拼团中',
    ACTIVE: '待成团',
    SUCCESS: '拼团成功',
    TIMEOUT: '拼团失败',
    REFUNDED: '已退款',
  }
  return map[props.instance?.status] || props.instance?.status
})

// 模拟倒计时 (实际应从 createTime + duration 计算)
const timeLeft = computed(() => 3600)
</script>

<style scoped>
/* UnoCSS handles most styles */
</style>
