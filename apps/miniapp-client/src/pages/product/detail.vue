<script lang="ts" setup>
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'
import { getCommissionPreview } from '@/api/distribution'
import { getProductDetail } from '@/api/product'
import ActivityWidgetLoader from '@/components/activity-widgets/ActivityWidgetLoader.vue'
import { useMarketingDisplay } from '@/hooks/useMarketingDisplay'
import { useAuthStore } from '@/store/auth'
import { useCartStore } from '@/store/cart'

import { useLocationStore } from '@/store/location'
import { useUserStore } from '@/store/user'

definePage({
  style: {
    navigationBarTitleText: '商品详情',
  },
})

// Stores
const cartStore = useCartStore()
const authStore = useAuthStore()
const userStore = useUserStore()
const locationStore = useLocationStore()

// 商品数据
const product = ref<any>(null)
const loading = ref(true)
const selectedSku = ref<any>(null)
const quantity = ref(1)

// 商品类型判断
const isService = computed(() => product.value?.type === 'SERVICE')
const isReal = computed(() => product.value?.type === 'REAL')

// 营销展示逻辑 (Price Priority)
const { displayPrice, originalPrice, activityLabel, activeActivity } = useMarketingDisplay(product, selectedSku)

// 分销佣金状态
const commissionHint = ref('')
const canEarnCommission = ref(false)

// 计算预估佣金
async function calculateCommission() {
  // 仅分销员可见佣金
  if (!userStore.isDistributor) {
    commissionHint.value = ''
    canEarnCommission.value = false
    return
  }

  if (!product.value || !locationStore.currentTenantId || !userStore.userInfo) {
    return
  }

  try {
    const res = await getCommissionPreview({
      tenantId: locationStore.currentTenantId,
      shareUserId: String(userStore.userInfo.userId), // 模拟“我”作为推荐人
    })

    if (res) {
      // 跨店检测提示
      if (res.notice) {
        commissionHint.value = res.notice
        canEarnCommission.value = res.isCrossEnabled
      }
      else if (res.commissionRate) {
        const rate = Number.parseFloat(res.commissionRate) / 100
        // 使用展示价格 (活动价) 计算佣金，避免前后端不一致
        const amount = (Number(displayPrice.value) * rate).toFixed(2)
        commissionHint.value = `推广赚 ¥${amount}`
        canEarnCommission.value = true
      }
    }
  }
  catch (e) {
    console.error(e)
  }
}

// 监听价格变化重新计算
watch(displayPrice, () => {
  calculateCommission()
})

// 页面加载
onLoad(async (options) => {
  const productId = options?.id
  if (productId) {
    await loadProductDetail(productId)
  }
})

// 加载商品详情
async function loadProductDetail(id: string) {
  loading.value = true
  try {
    const result = await getProductDetail(id)
    if (result) {
      product.value = result
      // 默认选中第一个 SKU
      if (result.skus && result.skus.length > 0) {
        selectedSku.value = result.skus[0]
      }
      // 计算佣金
      calculateCommission()
    }
  }
  catch (err) {
    console.error('加载商品详情失败:', err)
    uni.showToast({ title: '商品加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

// 选择 SKU
function onSelectSku(sku: any) {
  selectedSku.value = sku
}

// 验证通用条件
function checkPreconditions(actionCallback: () => void): boolean {
  if (!selectedSku.value) {
    uni.showToast({ title: isService.value ? '请选择服务类型' : '请选择规格', icon: 'none' })
    return false
  }

  if (selectedSku.value.stock <= 0) {
    uni.showToast({ title: '该规格已售罄', icon: 'none' })
    return false
  }

  // 登录检测
  if (!authStore.requireAuth(actionCallback)) {
    return false
  }

  // 检查门店
  if (!locationStore.currentTenantId) {
    uni.showToast({ title: '请先选择门店', icon: 'none' })
    return false
  }

  return true
}

// 加入购物车 (实物和服务商品通用)
async function addToCart() {
  if (!checkPreconditions(() => addToCart()))
    return

  // 调用购物车 Store
  const success = await cartStore.addToCart(
    selectedSku.value.skuId,
    quantity.value,
    authStore.getShareUserId() || undefined,
  )

  if (!success) {
    uni.showToast({ title: '加入购物车失败', icon: 'none' })
  }
}

// 立即购买 - 跳转确认订单页
function buyNow() {
  if (!checkPreconditions(() => buyNow()))
    return

  // 跳转确认订单页，携带直接购买参数
  const params: Record<string, string> = {
    mode: 'direct',
    tenantId: locationStore.currentTenantId,
    skuId: selectedSku.value.skuId,
    quantity: String(quantity.value),
  }

  // 携带归因参数
  const shareUserId = authStore.getShareUserId()
  if (shareUserId) {
    params.shareUserId = shareUserId
  }

  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  uni.navigateTo({
    url: `/pages/order/create?${queryString}`,
  })
}

// 立即预约 (服务商品) - 直接跳转确认订单页
function bookNow() {
  buyNow()
}

// 处理开团
function handleGroupBuy(activity: any) {
  if (!checkPreconditions(() => handleGroupBuy(activity)))
    return

  const params: Record<string, string> = {
    mode: 'group_buy',
    tenantId: locationStore.currentTenantId,
    skuId: selectedSku.value.skuId,
    quantity: String(quantity.value),
    marketingConfigId: activity.configId,
  }

  // 携带归因参数
  const shareUserId = authStore.getShareUserId()
  if (shareUserId) {
    params.shareUserId = shareUserId
  }

  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  uni.navigateTo({
    url: `/pages/order/create?${queryString}`,
  })
}

// 跳转购物车
function goCart() {
  uni.switchTab({ url: '/pages/cart/cart' })
}

// 跳转首页
function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

// 格式化服务时长
function formatDuration(minutes?: number): string {
  if (!minutes)
    return ''
  if (minutes < 60) {
    return `${minutes}分钟`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
}

// 格式化服务范围
function formatRadius(meters?: number): string {
  if (!meters)
    return ''
  if (meters < 1000) {
    return `${meters}米`
  }
  return `${(meters / 1000).toFixed(1)}公里`
}
</script>

<template>
  <view class="min-h-100vh bg-[rgb(245,245,245)] pb-[env(safe-area-inset-bottom)]">
    <!-- 加载中 -->
    <view v-if="loading" class="h-60vh flex items-center justify-center text-hex-999">
      <wd-loading />
    </view>

    <template v-else-if="product">
      <!-- 轮播图 -->
      <swiper class="h-750rpx w-full" indicator-dots autoplay circular>
        <swiper-item v-for="(img, index) in product.mainImages" :key="index">
          <image class="h-full w-full" :src="img" mode="aspectFill" />
        </swiper-item>
        <swiper-item v-if="!product.mainImages?.length">
          <image class="h-full w-full" src="/static/images/placeholder.png" mode="aspectFill" />
        </swiper-item>
      </swiper>

      <!-- 营销活动挂载点 -->
      <ActivityWidgetLoader
        v-if="activeActivity"
        :activities="[activeActivity]"
        @create-group="handleGroupBuy"
      />

      <!-- 商品基础信息 -->
      <view class="mb-20rpx bg-white p-30rpx">
        <view class="mb-16rpx flex items-end gap-12rpx">
          <!-- 主价格 (活动价) -->
          <text class="text-48rpx text-hex-ff4d4f font-600">¥{{ displayPrice }}</text>

          <!-- 标签 -->
          <text
            v-if="activityLabel && activeActivity"
            class="md-gradient-to-r mb-8rpx rounded-4rpx from-red-500 to-orange-500 px-8rpx py-2rpx text-20rpx text-white"
          >
            {{ activityLabel }}
          </text>

          <!-- 此处 isService/isReal 标签可以保留或者移动 -->
          <text v-if="!activeActivity && isService" class="mb-6rpx rounded-6rpx bg-[rgba(24,144,255,0.1)] px-16rpx py-6rpx text-22rpx text-hex-1890ff">服务</text>
          <text v-else-if="!activeActivity" class="mb-6rpx rounded-6rpx bg-[rgba(82,196,26,0.1)] px-16rpx py-6rpx text-22rpx text-hex-52c41a">实物</text>

          <!-- 划线原价: 增加“原价”字样并调整大小 -->
          <view v-if="originalPrice" class="mb-6rpx ml-8rpx flex items-baseline text-hex-999">
            <text class="mr-2rpx text-22rpx">原价</text>
            <text class="text-26rpx line-through">¥{{ originalPrice }}</text>
          </view>
        </view>

        <text class="text-32rpx text-hex-333 font-500 leading-1.5">{{ product.name }}</text>
        <text v-if="product.subTitle" class="mt-12rpx block text-26rpx text-hex-999">{{ product.subTitle }}</text>

        <!-- 分销佣金提示 -->
        <view
          v-if="commissionHint"
          class="mt-16rpx flex items-center rounded-8rpx bg-[rgb(255,247,230)] px-20rpx py-12rpx text-24rpx text-hex-fa8c16"
          :class="{ 'bg-hex-f5f5f5 text-hex-999': !canEarnCommission }"
        >
          <view class="i-carbon-currency mr-8rpx text-24rpx" />
          <text>{{ commissionHint }}</text>
        </view>
      </view>

      <!-- 服务/实物信息 -->
      <view v-if="isService || isReal" class="mb-20rpx bg-white p-30rpx px-30rpx">
        <template v-if="isService">
          <view class="flex justify-between border-b border-hex-f0f0f0 py-16rpx last:border-b-0">
            <text class="text-28rpx text-hex-666">服务时长</text>
            <text class="text-28rpx text-hex-333">{{ formatDuration(product.serviceDuration) }}</text>
          </view>
          <view class="flex justify-between border-b border-hex-f0f0f0 py-16rpx last:border-b-0">
            <text class="text-28rpx text-hex-666">服务范围</text>
            <text class="text-28rpx text-hex-333">{{ formatRadius(product.serviceRadius) }}</text>
          </view>
          <view v-if="product.needBooking" class="flex justify-between border-b border-hex-f0f0f0 py-16rpx last:border-b-0">
            <text class="text-28rpx text-hex-666">预约须知</text>
            <text class="text-28rpx text-hex-333">需提前预约</text>
          </view>
        </template>

        <template v-if="isReal">
          <view class="flex justify-between border-b border-hex-f0f0f0 py-16rpx last:border-b-0">
            <text class="text-28rpx text-hex-666">配送</text>
            <text class="text-28rpx text-hex-333">{{ product.isFreeShip ? '免运费' : '运费另计' }}</text>
          </view>
        </template>
      </view>

      <!-- SKU 选择 -->
      <view v-if="product.skus?.length > 0" class="mb-20rpx bg-white p-30rpx">
        <view class="mb-20rpx text-30rpx text-hex-333 font-500">
          {{ isService ? '选择服务类型' : '选择规格' }}
        </view>
        <view class="flex flex-wrap gap-16rpx">
          <view
            v-for="sku in product.skus"
            :key="sku.skuId"
            class="relative flex items-center gap-12rpx border border-hex-e0e0e0 rounded-8rpx px-24rpx py-16rpx text-26rpx text-hex-333"
            :class="[
              selectedSku?.skuId === sku.skuId ? 'border-hex-1890ff bg-[rgba(24,144,255,0.05)] text-hex-1890ff' : '',
              sku.stock <= 0 ? 'bg-hex-f5f5f5 text-gray-400 border-hex-e8e8e8' : '',
            ]"
            @click="onSelectSku(sku)"
          >
            <view class="flex items-center gap-12rpx">
              <text>{{ Object.values(sku.specValues || {}).join(' / ') || '默认' }}</text>
              <text class="font-500" :class="sku.stock <= 0 ? 'text-gray-400' : 'text-hex-ff4d4f'">¥{{ sku.price }}</text>
            </view>
            <text v-if="sku.stock <= 0" class="absolute scale-90 rounded-4rpx bg-hex-999 px-8rpx py-2rpx text-18rpx text-white -right-10rpx -top-10rpx">已售罄</text>
          </view>
        </view>
      </view>

      <!-- 商品详情 -->
      <view class="mb-120rpx bg-white p-30rpx">
        <view class="mb-20rpx border-b border-hex-f0f0f0 pb-20rpx text-30rpx text-hex-333 font-500">
          商品详情
        </view>
        <rich-text :nodes="product.detailHtml || '<p>暂无详情</p>'" />
      </view>

      <!-- 底部操作栏 -->
      <view class="fixed bottom-0 left-0 right-0 z-100 flex items-center bg-white px-30rpx pb-[calc(16rpx+env(safe-area-inset-bottom))] pt-16rpx shadow-[0_-2rpx_20rpx_rgba(0,0,0,0.05)]">
        <!-- 左侧图标 -->
        <view class="flex gap-30rpx">
          <view class="flex flex-col items-center text-20rpx text-hex-666" @click="goHome">
            <view class="i-carbon-home text-40rpx" />
            <text>首页</text>
          </view>
          <view class="flex flex-col items-center text-20rpx text-hex-666" @click="goCart">
            <view class="i-carbon-shopping-cart text-40rpx" />
            <text>购物车</text>
          </view>
        </view>

        <!-- 右侧按钮 -->
        <view class="ml-30rpx flex flex-1 gap-20rpx">
          <button
            class="h-80rpx flex-1 rounded-40rpx border-none bg-hex-ffc53d text-28rpx text-white leading-80rpx"
            :class="{ 'bg-hex-ffd666 opacity-60': selectedSku?.stock <= 0 }"
            @click="addToCart"
          >
            加入购物车
          </button>

          <button
            v-if="isReal"
            class="h-80rpx flex-1 rounded-40rpx border-none bg-hex-ff4d4f text-28rpx text-white leading-80rpx"
            :class="{ 'bg-hex-ffa39e': selectedSku?.stock <= 0 }"
            @click="buyNow"
          >
            {{ selectedSku?.stock <= 0 ? '已售罄' : '立即购买' }}
          </button>

          <button
            v-else-if="isService"
            class="h-80rpx flex-1 rounded-40rpx border-none from-hex-1890ff to-hex-096dd9 bg-gradient-to-br text-28rpx text-white leading-80rpx"
            :class="{ '!bg-hex-91d5ff': selectedSku?.stock <= 0 }"
            @click="bookNow"
          >
            {{ selectedSku?.stock <= 0 ? '已售罄' : '立即预约' }}
          </button>
        </view>
      </view>

      <!-- 底部占位 -->
      <view class="h-120rpx" />
    </template>

    <!-- 商品不存在 -->
    <view v-else class="h-60vh flex items-center justify-center text-hex-999">
      <text>商品不存在或已下架</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
// UnoCSS handles layout
</style>
