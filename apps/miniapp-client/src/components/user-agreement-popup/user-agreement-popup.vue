<template>
  <!-- 防滚动穿透层 -->
  <view
    v-if="show"
    class="fixed inset-0"
    style="background: transparent;"
    @touchmove.stop.prevent="() => {}"
  />
  <wd-popup
    v-model="show"
    position="bottom"
    :close-on-click-modal="false"
    custom-class="rounded-t-xl overflow-hidden"
    :z-index="999"
    :lock-scroll="true"
  >
    <view
      class="bg-white p-4"
      style="padding-bottom: calc(env(safe-area-inset-bottom) + 60px);"
      @touchmove.stop.prevent
    >
      <view class="mb-4 text-center text-lg font-bold">
        用户协议与隐私政策提示
      </view>
      <view class="mb-6 text-sm text-gray-600 leading-relaxed">
        <text>欢迎使用 unibest！在您使用本产品前，请仔细阅读</text>
        <text class="text-blue-500" @click="handleOpenAgreement('user')">《用户协议》</text>
        <text>与</text>
        <text class="text-blue-500" @click="handleOpenAgreement('privacy')">《隐私政策》</text>
        <text>。请您充分理解协议条款，点击“同意并继续”代表您已同意前述协议。</text>
      </view>
      <view class="flex flex-row gap-3">
        <button
          class="flex-1 rounded-full bg-gray-100 py-3 text-base text-gray-500 font-medium active:bg-gray-200"
          @click="handleDisagree"
        >
          暂不同意
        </button>
        <button
          class="flex-1 rounded-full bg-primary py-3 text-base text-white font-medium active:opacity-90"
          :style="{ backgroundColor: '#018d71' }"
          @click="handleAgree"
        >
          同意并继续
        </button>
      </view>
    </view>
  </wd-popup>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useTokenStore } from '@/store/token'

const emit = defineEmits(['agreed'])
const show = ref(false)
// 检查是否已同意
function checkAgreement() {
  const hasAgreed = uni.getStorageSync('hasAgreedPrivacy')
  if (hasAgreed) {
    // 已同意过，直接触发回调（比如自动登录检查）
    emit('agreed')
    return
  }

  // 获取当前页面栈
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const route = currentPage?.route

  // 检查是否是首页的首次访问
  if (route === 'pages/index/index') {
    const hasEnteredHomeOnce = uni.getStorageSync('hasEnteredHomeOnce')
    if (!hasEnteredHomeOnce) {
      // 首次进入首页，标记并跳过弹窗
      uni.setStorageSync('hasEnteredHomeOnce', true)
      show.value = false
      return
    }
  }

  // 其他情况：非首页，或第二次及以后进入首页，都弹窗
  show.value = true
}

async function handleAgree() {
  uni.setStorageSync('hasAgreedPrivacy', true)
  show.value = false
  emit('agreed')

  // #ifdef MP-WEIXIN
  // 微信小程序环境下，同意后尝试静默登录
  try {
    console.log('User agreed, attempting silent login...')
    await useTokenStore().wxLogin()
  }
  catch (e) {
    console.error('Silent login failed:', e)
  }
  // #endif
}

function handleDisagree() {
  show.value = false
}

function handleOpenAgreement(type: 'user' | 'privacy') {
  // TODO: 跳转到具体的协议页面
  uni.showToast({
    title: `查看${type === 'user' ? '用户协议' : '隐私政策'}`,
    icon: 'none',
  })
}

// 暴露给父组件调用
defineExpose({
  checkAgreement,
})

onMounted(() => {
  // 初始检查
  checkAgreement()
  // 监听页面显示事件
  uni.$on('page-show', checkAgreement)
})

onUnmounted(() => {
  // 移除监听
  uni.$off('page-show', checkAgreement)
})
</script>

<style lang="scss" scoped>
.h-safe-bottom {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
}
</style>
