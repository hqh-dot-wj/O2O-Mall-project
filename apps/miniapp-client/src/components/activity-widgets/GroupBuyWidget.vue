<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/store/user'

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'create', activity: Props['activity']): void
}>()

const userStore = useUserStore()

interface Props {
  activity: {
    configId: string
    type: string // e.g. GROUP_BUY
    rules: {
      price: number
      minCount: number
      maxCount: number
      leaderDiscount?: number
      leaderMustBeDistributor?: boolean // New rule
      leaderFree?: boolean // New rule
    }
    displayData?: {
      countText?: string
      lessonSummary?: string
      joinDeadlineText?: string
    }
  }
}

// 计算拼团价
const groupPrice = computed(() => {
  return props.activity.rules.price || 0
})

// 计算团长优惠价
const leaderPrice = computed(() => {
  const rules = props.activity.rules
  if (rules.leaderFree)
    return 0

  const price = rules.price || 0
  const discount = rules.leaderDiscount || 0
  return Math.max(0, price - discount)
})

// 核心权限判断：能否开团
const canStartGroup = computed(() => {
  // 1. 如果没开启身份限制，人人可开团
  if (!props.activity.rules.leaderMustBeDistributor)
    return true

  // 2. 如果开启了限制，校验是否为分销员
  return userStore.isDistributor
})

// 点击开团 -> 抛出事件由父组件处理跳转 (需携带 SKU)
function handleCreateGroup() {
  emit('create', props.activity)
}
</script>

<template>
  <view class="group-buy-widget mt-20rpx bg-white p-30rpx">
    <!-- 头部：活动标识 -->
    <view class="mb-20rpx flex items-center justify-between">
      <view class="flex items-center gap-12rpx">
        <text class="border border-hex-ff4d4f rounded-6rpx px-12rpx py-4rpx text-28rpx text-hex-ff4d4f font-600">拼团特惠</text>
        <text class="text-24rpx text-hex-999">{{ activity.displayData?.countText || '多人成团' }}</text>
      </view>
      <text class="text-24rpx text-hex-999">截止: {{ activity.displayData?.joinDeadlineText || '长期有效' }}</text>
    </view>

    <!-- 内容：价格对比 -->
    <view class="mb-20rpx flex items-end gap-16rpx">
      <view class="text-hex-ff4d4f font-600">
        <text class="text-28rpx">拼团价 ¥</text>
        <text class="text-48rpx">{{ groupPrice }}</text>
      </view>
      <view v-if="activity.rules.leaderDiscount" class="mb-8rpx rounded-full bg-[rgba(250,140,22,0.1)] px-12rpx py-4rpx text-24rpx text-hex-fa8c16">
        团长再减 ¥{{ activity.rules.leaderDiscount }}
      </view>
    </view>

    <!-- 底部：行动按钮 -->
    <button
      v-if="canStartGroup"
      class="h-88rpx w-full flex items-center justify-center gap-12rpx rounded-44rpx border-none from-hex-ff7875 to-hex-ff4d4f bg-gradient-to-r text-30rpx text-white font-500 leading-88rpx shadow-[0_8rpx_20rpx_rgba(255,77,79,0.2)]"
      @click="handleCreateGroup"
    >
      <view class="i-carbon-user-multiple text-36rpx" />
      <text>¥{{ leaderPrice }} 一键开团</text>
    </button>
    <view v-else class="h-88rpx w-full rounded-44rpx bg-hex-f5f5f5 text-center text-26rpx text-hex-999 leading-88rpx">
      仅限推广员发起拼团
    </view>

    <!-- 补充信息 -->
    <view v-if="activity.displayData?.lessonSummary" class="mt-20rpx flex rounded-12rpx bg-hex-f9f9f9 p-20rpx text-24rpx text-hex-666 leading-1.5">
      <view class="mb-8rpx font-600">
        课程安排：
      </view>
      <view class="text-justify">
        {{ activity.displayData.lessonSummary }}
      </view>
    </view>
  </view>
</template>
