<template>
  <view v-if="instance" class="course-widget">
    <!-- 1. 进度与状态 -->
    <view class="mb-3 flex items-center justify-between px-4 pt-4">
      <view class="text-sm text-gray-700 font-bold">
        {{ instance.role === 'LEADER' ? '我的拼课团' : '班级拼团中' }}
      </view>
      <view :class="statusColor">
        {{ statusText }}
      </view>
    </view>

    <!-- 2. 进度条 -->
    <view class="mb-4 px-4">
      <view class="mb-1 flex justify-between text-xs text-gray-500">
        <text>已报 {{ currentCount }} 人</text>
        <text>满 {{ minCount }} 人开班</text>
      </view>
      <view class="h-2 overflow-hidden rounded-full bg-gray-100">
        <view
          class="h-full bg-blue-500 transition-all duration-500"
          :style="{ width: `${progressPercent}%` }"
        />
      </view>
      <view v-if="currentCount < minCount" class="mt-1 text-xs text-orange-500">
        还差 {{ minCount - currentCount }} 人即可开课
      </view>
      <view v-else class="mt-1 text-xs text-green-500">
        已达标，剩余 {{ maxCount - currentCount }} 个名额
      </view>
    </view>

    <!-- 3. 上课信息卡片 -->
    <view class="mx-4 mb-4 rounded-lg bg-blue-50 p-3">
      <view class="mb-2 flex items-start">
        <text class="i-carbon-time mr-2 mt-0.5 text-sm text-blue-600" />
        <view class="text-xs text-blue-900">
          <view class="font-bold">
            上课时间
          </view>
          <view>{{ rules.classTime || '待定' }}</view>
          <view>(共 {{ rules.totalLessons }} 课时，每日 {{ rules.dayLessons }} 节)</view>
        </view>
      </view>
      <view class="flex items-start">
        <text class="i-carbon-location mr-2 mt-0.5 text-sm text-blue-600" />
        <view class="text-xs text-blue-900">
          <view class="font-bold">
            上课地点
          </view>
          <view>{{ rules.address || '线上直播' }}</view>
        </view>
      </view>
    </view>

    <!-- 4. 倒计时 -->
    <view v-if="timeLeft > 0" class="pb-4 text-center">
      <text class="text-xs text-gray-400">距离报名截止仅剩</text>
      <uni-countdown
        :show-day="true"
        :second="timeLeft"
        color="#3b82f6"
        background-color="#eff6ff"
        class="mt-1"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  instance: any
}>()

const rules = computed(() => props.instance?.config?.rules || {})
const currentCount = computed(() => props.instance?.instanceData?.currentCount || 0)
const minCount = computed(() => rules.value.minCount || 1)
const maxCount = computed(() => rules.value.maxCount || 100)

const progressPercent = computed(() => {
  const p = (currentCount.value / minCount.value) * 100
  return Math.min(p, 100)
})

const statusText = computed(() => {
  const map: Record<string, string> = {
    PENDING_PAY: '待支付',
    PAID: '已支付',
    ACTIVE: '拼课中',
    SUCCESS: '开课成功',
    TIMEOUT: '拼课失败',
    REFUNDED: '已退款',
  }
  return map[props.instance?.status] || props.instance?.status
})

const statusColor = computed(() => {
  return props.instance?.status === 'SUCCESS' ? 'text-green-600' : 'text-orange-500'
})

const timeLeft = computed(() => {
  if (!rules.value.joinDeadline)
    return 0
  const end = new Date(rules.value.joinDeadline).getTime()
  const diff = (end - Date.now()) / 1000
  return Math.max(diff, 0)
})
</script>
