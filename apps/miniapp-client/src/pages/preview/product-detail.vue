<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

definePage({
  style: {
    navigationBarTitleText: '商品详情预览',
    navigationBarBackgroundColor: '#ffffff',
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
  // 商品信息
  product?: {
    name: string
    subTitle?: string
    mainImages: string[]
    price: number
    skus?: any[]
  }
}

const data = ref<PreviewData>({
  serviceId: '',
  serviceType: 'SERVICE',
  templateCode: '',
  name: '',
  rules: {},
  stockMode: '',
  product: undefined,
})

const isReady = ref(false)

// 计算展示用的属性
const displayTitle = computed(() => {
  return data.value.product?.name || '商品名称'
})

const displayPrice = computed(() => {
  // 优先使用营销活动价格
  return data.value.rules.price || data.value.product?.price || '99.00'
})

const originalPrice = computed(() => {
  // 如果有营销价格，原价就是商品价格
  if (data.value.rules.price && data.value.product?.price) {
    return data.value.product.price
  }
  return null
})

const activityLabel = computed(() => {
  const code = data.value.templateCode
  const labels: Record<string, string> = {
    GROUP_BUY: '拼团',
    SECKILL: '秒杀',
    COURSE: '课程',
    PUNCH_CARD: '打卡',
  }
  return labels[code] || '活动'
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

  // 库存模式
  if (data.value.stockMode === 'STRONG_LOCK') {
    list.push({ icon: 'i-carbon-locked', text: '限量抢购' })
  }

  return list
})

const mainImages = computed(() => {
  return data.value.product?.mainImages || ['https://picsum.photos/400/300']
})

function handleMessage(event: MessageEvent) {
  console.log('[Product Detail Preview] Message received:', event.data);
  
  if (!event.data || !event.data.type) {
    console.log('[Product Detail Preview] Invalid message format');
    return;
  }
  
  if (event.data.type === 'MARKETING_PREVIEW_UPDATE') {
    console.log('[Product Detail Preview] Received Update:', event.data.payload);
    data.value = event.data.payload;
    isReady.value = true;
    console.log('[Product Detail Preview] Preview ready, data:', data.value);
  }
}

onMounted(() => {
  console.log('[Product Detail Preview] Component mounted');
  // #ifdef H5
  window.addEventListener('message', handleMessage);
  console.log('[Product Detail Preview] Message listener added');
  // #endif
})

onUnmounted(() => {
  // #ifdef H5
  window.removeEventListener('message', handleMessage)
  // #endif
})
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <!-- 等待状态 -->
    <div v-if="!isReady" class="flex h-screen flex-col items-center justify-center text-gray-400">
      <div class="i-carbon-presentation-file mb-2 text-4xl" />
      <p>商品详情预览加载中...</p>
    </div>

    <!-- 商品详情预览 -->
    <div v-else class="flex flex-col">
      <!-- 商品图片轮播 -->
      <div class="relative h-96 w-full bg-gray-200">
        <swiper class="h-full w-full" indicator-dots autoplay circular>
          <swiper-item v-for="(img, index) in mainImages" :key="index">
            <image class="h-full w-full" :src="img" mode="aspectFill" />
          </swiper-item>
        </swiper>
      </div>

      <!-- 营销活动卡片 -->
      <div class="mx-4 -mt-6 overflow-hidden rounded-xl bg-white shadow-lg">
        <div class="flex flex-col gap-3 p-4">
          <!-- 活动标签 + 价格 -->
          <div class="flex items-center justify-between">
            <div class="flex items-baseline gap-2">
              <span class="rounded bg-gradient-to-r from-red-500 to-orange-500 px-2 py-1 text-xs text-white font-bold">
                {{ activityLabel }}
              </span>
              <div class="flex items-baseline gap-1 text-red-500">
                <span class="text-xs">¥</span>
                <span class="text-3xl font-bold">{{ displayPrice }}</span>
              </div>
              <span v-if="originalPrice" class="text-sm text-gray-400 line-through">
                ¥{{ originalPrice }}
              </span>
            </div>
          </div>

          <!-- 活动特性 -->
          <div class="flex flex-wrap gap-2">
            <div
              v-for="(item, idx) in displayFeatures"
              :key="idx"
              class="flex items-center gap-1 border border-gray-100 rounded-lg bg-gray-50 px-2 py-1 text-xs text-gray-600"
            >
              <span :class="item.icon" class="text-gray-400" />
              <span>{{ item.text }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 商品基础信息 -->
      <div class="mx-4 mt-4 rounded-xl bg-white p-4 shadow">
        <h3 class="text-lg text-gray-800 font-bold leading-tight">
          {{ displayTitle }}
        </h3>
        <p v-if="data.product?.subTitle" class="mt-2 text-sm text-gray-500">
          {{ data.product.subTitle }}
        </p>

        <!-- 服务/实物标签 -->
        <div class="mt-3 flex items-center gap-2">
          <span
            v-if="data.serviceType === 'SERVICE'"
            class="rounded bg-blue-50 px-3 py-1 text-xs text-blue-600"
          >
            服务
          </span>
          <span v-else class="rounded bg-green-50 px-3 py-1 text-xs text-green-600">
            实物
          </span>
        </div>
      </div>

      <!-- 规格选择（如果有） -->
      <div v-if="data.product?.skus && data.product.skus.length > 1" class="mx-4 mt-4 rounded-xl bg-white p-4 shadow">
        <h4 class="mb-3 text-sm text-gray-700 font-medium">
          选择规格
        </h4>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="(sku, idx) in data.product.skus"
            :key="idx"
            class="cursor-pointer border border-gray-200 rounded-lg px-3 py-2 text-sm transition-colors hover:border-red-500 hover:text-red-500"
          >
            {{ Object.values(sku.specValues || {}).join('/') || '默认' }}
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="fixed bottom-0 left-0 right-0 flex items-center gap-3 border-t border-gray-200 bg-white px-4 py-3 shadow-lg">
        <button class="flex-1 rounded-full bg-gradient-to-r from-red-500 to-orange-500 py-3 text-white font-bold shadow-lg transition-transform active:scale-95">
          立即参与
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* UnoCSS handles most styling */
</style>
