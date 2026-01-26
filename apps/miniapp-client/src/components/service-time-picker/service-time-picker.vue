<script lang="ts" setup>
import type { DateVo, TimeSlotVo } from '@/api/service'
import { computed, ref, watch } from 'vue'
import { getAvailableDates, getTimeSlots, lockSlot } from '@/api/service'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': [res: { date: string, time: string, fullTime: string }]
}>()

const loading = ref(false)
const dates = ref<DateVo[]>([])
const currentDateIndex = ref(0)
const timeSlots = ref<TimeSlotVo[]>([])
const selectedSlot = ref<TimeSlotVo | null>(null)

const currentDate = computed(() => dates.value[currentDateIndex.value])

// 监听弹窗打开，初始化数据
watch(() => props.modelValue, async (val) => {
  if (val && dates.value.length === 0) {
    await initData()
  }
})

// 监听日期变化，加载时间段
watch(() => currentDateIndex.value, async () => {
  if (currentDate.value) {
    await loadTimeSlots(currentDate.value.value)
  }
})

// 初始化
async function initData() {
  loading.value = true
  try {
    const res = await getAvailableDates()
    if (res && res.dates) {
      dates.value = res.dates
      // 默认选中第一个
      if (dates.value.length > 0) {
        currentDateIndex.value = 0
        await loadTimeSlots(dates.value[0].value)
      }
    }
  }
  catch (e) {
    console.error(e)
    uni.showToast({ title: '加载日期失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

// 加载时间段
async function loadTimeSlots(dateString: string) {
  loading.value = true
  selectedSlot.value = null // 切换日期重置选中
  try {
    const res = await getTimeSlots(dateString)
    if (res && res.slots) {
      timeSlots.value = res.slots
    }
  }
  catch (e) {
    console.error(e)
    uni.showToast({ title: '加载时间段失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

// 选择时间段
function onSelectSlot(slot: TimeSlotVo) {
  if (!slot.available)
    return
  selectedSlot.value = slot
}

// 确认选择
async function onConfirm() {
  if (!selectedSlot.value || !currentDate.value)
    return

  const date = currentDate.value.value
  const time = selectedSlot.value.time

  uni.showLoading({ title: '锁定中...' })
  try {
    await lockSlot(date, time)
    uni.hideLoading()

    emit('confirm', {
      date,
      time,
      fullTime: `${date} ${time}`,
    })
    emit('update:modelValue', false)
  }
  catch (e) {
    uni.hideLoading()
    console.error(e)
    uni.showToast({ title: '预约失败，请重试', icon: 'none' })
  }
}

function onClose() {
  emit('update:modelValue', false)
}
</script>

<template>
  <wd-popup
    :model-value="modelValue" position="bottom" :safe-area-inset-bottom="true" :close-on-click-modal="false"
    custom-style="border-radius: 24rpx 24rpx 0 0; overflow: hidden;" @close="onClose"
  >
    <view class="picker-container">
      <view class="header">
        <text class="title">选择服务时间</text>
        <view class="close-icon" @click="onClose">
          <view class="i-carbon-close text-40rpx text-gray-400" />
        </view>
      </view>

      <!-- 日期 Tabs -->
      <scroll-view scroll-x class="date-scroll" :show-scrollbar="false">
        <view class="date-tabs">
          <view
            v-for="(date, index) in dates" :key="date.value" class="date-item"
            :class="[{ active: currentDateIndex === index }]" @click="currentDateIndex = index"
          >
            <text class="date-week">{{ date.week }}</text>
            <text class="date-label">{{ date.label }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 时间段 Grid -->
      <scroll-view scroll-y class="time-scroll">
        <view v-if="loading" class="loading-state">
          <wd-loading />
        </view>
        <view v-else class="time-grid">
          <view
            v-for="slot in timeSlots" :key="slot.time" class="time-item" :class="[{
              disabled: !slot.available,
              active: selectedSlot?.time === slot.time,
            }]" @click="onSelectSlot(slot)"
          >
            <text class="time-text">{{ slot.time }}</text>
            <text class="status-text">{{ slot.available ? '可预约' : slot.reason || '不可约' }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 底部按钮 -->
      <view class="footer-bar">
        <wd-button type="primary" block :disabled="!selectedSlot" @click="onConfirm">
          确认预约 {{ selectedSlot ? `(${selectedSlot.time})` : '' }}
        </wd-button>
      </view>
    </view>
  </wd-popup>
</template>

<style lang="scss" scoped>
.picker-container {
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

.header {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 30rpx;
  border-bottom: 1rpx solid #f5f5f5;

  .title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333;
  }

  .close-icon {
    position: absolute;
    right: 30rpx;
    top: 50%;
    transform: translateY(-50%);
  }
}

.date-scroll {
  background-color: #f9f9f9;
  border-bottom: 1rpx solid #eee;

  .date-tabs {
    display: flex;
    padding: 20rpx 10rpx;

    .date-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 140rpx;
      height: 120rpx;
      margin: 0 10rpx;
      border-radius: 12rpx;
      background-color: #fff;
      transition: all 0.2s;
      border: 2rpx solid transparent;

      &.active {
        background-color: #e6f7ff;
        border-color: #1890ff;

        .date-week,
        .date-label {
          color: #1890ff;
        }
      }

      .date-week {
        font-size: 24rpx;
        color: #666;
        margin-bottom: 8rpx;
      }

      .date-label {
        font-size: 28rpx;
        font-weight: 500;
        color: #333;
      }
    }
  }
}

.time-scroll {
  flex: 1;
  padding: 20rpx;
  box-sizing: border-box;
}

.loading-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.time-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
  padding-bottom: 20rpx;

  .time-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 120rpx;
    border-radius: 12rpx;
    background-color: #f5f5f5;
    border: 2rpx solid transparent;

    .time-text {
      font-size: 30rpx;
      font-weight: 500;
      color: #333;
      margin-bottom: 4rpx;
    }

    .status-text {
      font-size: 20rpx;
      color: #999;
    }

    &.disabled {
      opacity: 0.5;
      background-color: #eee;
    }

    &.active {
      background-color: #e6f7ff;
      border-color: #1890ff;

      .time-text {
        color: #1890ff;
      }

      .status-text {
        color: #1890ff;
      }
    }
  }
}

.footer-bar {
  padding: 20rpx 30rpx;
  border-top: 1rpx solid #eee;
  background-color: #fff;
}
</style>
