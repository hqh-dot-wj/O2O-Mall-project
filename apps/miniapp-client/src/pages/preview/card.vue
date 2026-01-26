<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

definePage({
  style: {
    navigationBarTitleText: '营销商品预览',
    navigationBarBackgroundColor: '#f5f5f5',
    backgroundColor: '#f5f5f5',
  },
})

interface PreviewData {
  serviceId: string
  serviceType: string
  templateCode: string
  name?: string
  rules: Record<string, any>
  stockMode: string
}

const data = ref<PreviewData>({
  serviceId: '',
  serviceType: 'SERVICE',
  templateCode: '',
  name: '',
  rules: {},
  stockMode: '',
})

const isReady = ref(false)

// 计算展示用的属性
const displayTitle = computed(() => {
  return data.value.name || data.value.templateCode || '营销活动'
})

const displayPrice = computed(() => {
  return data.value.rules.price || '99.00'
})

const displayFeatures = computed(() => {
  const list = []
  const rules = data.value.rules

  // 拼团人数
  if (rules.minCount) {
    list.push({ icon: 'i-carbon-user-multiple', text: `${rules.minCount}人成团` })
  }

  // 有效期
  if (rules.validDays) {
    list.push({ icon: 'i-carbon-time', text: `有效期${rules.validDays}天` })
  }

  // 课时信息
  if (rules.totalLessons) {
    list.push({ icon: 'i-carbon-education', text: `含${rules.totalLessons}课时` })
  }

  // 通用库存模式
  if (data.value.stockMode === 'STRONG_LOCK') {
    list.push({ icon: 'i-carbon-locked', text: '库存强锁' })
  }

  // 默认兜底
  if (list.length === 0) {
    list.push({ icon: 'i-carbon-information', text: '暂无特殊规则' })
  }

  return list
})

function handleMessage(event: MessageEvent) {
  if (!event.data || !event.data.type)
    return
  if (event.data.type === 'MARKETING_PREVIEW_UPDATE') {
    console.log('[Preview] Received Update:', event.data.payload)
    data.value = event.data.payload
    isReady.value = true
  }
}

onMounted(() => {
  // #ifdef H5
  window.addEventListener('message', handleMessage)
  // #endif
})

onUnmounted(() => {
  // #ifdef H5
  window.removeEventListener('message', handleMessage)
  // #endif
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
    <!-- 等待状态 -->
    <div v-if="!isReady" class="flex flex-col items-center justify-center text-gray-400">
      <div class="i-carbon-presentation-file mb-2 text-4xl" />
      <p>配置预览加载中...</p>
    </div>

    <!-- 预览卡片 (模仿手机端效果) -->
    <div v-else class="max-w-sm w-full flex flex-col overflow-hidden rounded-xl bg-white shadow-lg">
      <!-- 1. 商品图片 -->
      <div class="relative h-48 w-full bg-gray-200">
        <image
          src="https://picsum.photos/400/300"
          mode="aspectFill"
          class="h-full w-full object-cover"
        />
        <!-- 标签 -->
        <div class="absolute left-2 top-2 rounded bg-black/50 px-2 py-1 text-xs text-white backdrop-blur">
          {{ data.serviceType === 'SERVICE' ? '服务' : '实物' }}
        </div>
      </div>

      <div class="flex flex-col gap-3 p-4">
        <!-- 2. 活动名称 -->
        <div>
          <h3 class="line-clamp-2 text-lg text-gray-800 font-bold leading-tight">
            {{ displayTitle }}
          </h3>
          <div class="mt-1 flex items-baseline gap-1 text-red-500">
            <span class="text-xs">¥</span>
            <span class="text-2xl font-bold">{{ displayPrice }}</span>
            <span class="ml-1 text-xs text-gray-400 line-through decoration-auto">¥{{ (Number(displayPrice) * 1.5).toFixed(2) }}</span>
          </div>
        </div>

        <!-- 3. 组合文案 (图标+文字) -->
        <div class="flex flex-wrap gap-2">
          <div
            v-for="(item, idx) in displayFeatures" :key="idx"
            class="flex items-center gap-1 border border-gray-100 rounded-lg bg-gray-50 px-2 py-1 text-xs text-gray-600"
          >
            <span :class="item.icon" class="text-gray-400" />
            <span>{{ item.text }}</span>
          </div>
        </div>

        <div class="h-2" /> <!-- Spacer -->

        <!-- 4. 按钮 -->
        <button class="w-full flex items-center justify-center gap-2 rounded-full from-red-500 to-orange-500 bg-gradient-to-r py-3 text-white font-bold shadow-lg shadow-orange-500/30 transition-transform active:scale-95">
          <span>立即参与</span>
          <span class="i-carbon-arrow-right" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
  Unibest 使用 UnoCSS (Atomic CSS)，尽量避免手写 CSS。
  这里的 scoped 样式留空，符合项目规范。
*/
</style>
