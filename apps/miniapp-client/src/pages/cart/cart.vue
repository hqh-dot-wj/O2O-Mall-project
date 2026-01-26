<script lang="ts" setup>
import { onShow } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useCartStore } from '@/store/cart'
import { useLocationStore } from '@/store/location'
import { useTokenStore } from '@/store/token'
import { phone, systemInfo } from '@/utils/systemInfo'

definePage({
  style: {
    navigationBarTitleText: '购物车',
  },
})

const cartStore = useCartStore()
const locationStore = useLocationStore()
const tokenStore = useTokenStore()
const authStore = useAuthStore()

// 编辑模式
const isEditing = ref(false)

// 是否已登录
const isLoggedIn = computed(() => tokenStore.hasLogin)

// 页面显示时刷新数据
onShow(async () => {
  console.log('System Info:', systemInfo)
  console.log('Phone Info:', phone)
  if (isLoggedIn.value && locationStore.currentTenantId) {
    await cartStore.fetchCartList()
  }
})

// 监听租户变化
watch(() => locationStore.currentTenantId, async (newVal) => {
  if (newVal && isLoggedIn.value) {
    await cartStore.fetchCartList()
  }
})

// 格式化价格
function formatPrice(price: number | string | undefined): string {
  if (price === undefined || price === null)
    return '0.00'
  return Number(price).toFixed(2)
}

// 切换编辑模式
function toggleEditMode() {
  isEditing.value = !isEditing.value
}

// 数量变更
async function onQuantityChange(item: any, event: { value: string | number }) {
  const value = typeof event.value === 'string' ? Number.parseInt(event.value) : event.value
  if (value < 1)
    return
  await cartStore.updateQuantity(item.skuId, value)
}

// 删除单个商品
async function onDelete(item: any) {
  const res = await uni.showModal({
    title: '提示',
    content: '确定删除该商品吗？',
  })
  if (res.confirm) {
    await cartStore.removeItem(item.skuId)
  }
}

// 清空无效商品
async function clearInvalid() {
  if (cartStore.invalidItems.length === 0)
    return
  const res = await uni.showModal({
    title: '提示',
    content: '确定清空无效商品吗？',
  })
  if (res.confirm) {
    await cartStore.clearInvalidItems()
  }
}

// 删除选中商品 (编辑模式)
async function deleteSelected() {
  const selected = cartStore.selectedItems
  if (selected.length === 0) {
    uni.showToast({ title: '请选择要删除的商品', icon: 'none' })
    return
  }

  const res = await uni.showModal({
    title: '提示',
    content: `确定删除选中的${selected.length}件商品吗？`,
  })
  if (res.confirm) {
    for (const item of selected) {
      await cartStore.removeItem(item.skuId)
    }
    isEditing.value = false
  }
}

// 全选切换
function onToggleAll() {
  cartStore.toggleAll(!cartStore.isAllChecked)
}

// 去结算
function goCheckout() {
  if (cartStore.selectedCount === 0) {
    uni.showToast({ title: '请选择商品', icon: 'none' })
    return
  }

  // 检查是否有价格变动商品
  const hasChanged = cartStore.selectedItems.some(i => i.priceChanged)
  if (hasChanged) {
    uni.showModal({
      title: '价格变动提示',
      content: '部分商品价格已更新，是否继续结算？',
      success: (res) => {
        if (res.confirm) {
          navigateToCheckout()
        }
      },
    })
  }
  else {
    navigateToCheckout()
  }
}

function navigateToCheckout() {
  // const checkoutData = cartStore.getCheckoutData()
  // TODO: 跳转到结算页
  uni.navigateTo({
    url: '/pages/order/create',
  })
}

// 去登录
function goLogin() {
  // #ifdef MP-WEIXIN
  authStore.openAuthModal()
  // #endif

  // #ifndef MP-WEIXIN
  uni.navigateTo({
    url: '/pages-auth/login',
  })
  // #endif
}

// 跳转商品详情
function goToDetail(productId: string) {
  uni.navigateTo({
    url: `/pages/product/detail?id=${productId}`,
  })
}

// 去逛逛
function goShopping() {
  uni.switchTab({
    url: '/pages/category/category',
  })
}
</script>

<template>
  <view class="min-h-[calc(100vh-var(--tabbar-total-height))] flex flex-col bg-[rgb(245,245,245)] pb-100rpx">
    <!-- 未登录状态 -->
    <view v-if="!isLoggedIn" class="flex flex-1 flex-col items-center justify-center px-60rpx py-100rpx">
      <image class="mb-40rpx h-300rpx w-300rpx" src="/static/images/empty-cart.png" mode="aspectFit" />
      <text class="mb-40rpx text-28rpx text-hex-999">登录后可同步购物车商品</text>
      <wd-button type="primary" size="medium" @click="goLogin">
        去登录
      </wd-button>
    </view>

    <!-- 已登录但购物车为空 -->
    <view v-else-if="cartStore.items.length === 0 && cartStore.invalidItems.length === 0" class="flex flex-1 flex-col items-center justify-center px-60rpx py-100rpx">
      <image class="mb-40rpx h-300rpx w-300rpx" src="/static/images/empty-cart.png" mode="aspectFit" />
      <text class="mb-40rpx text-28rpx text-hex-999">购物车还是空的</text>
      <wd-button type="primary" size="medium" @click="goShopping">
        去逛逛
      </wd-button>
    </view>

    <!-- 购物车列表 -->
    <view v-else class="flex flex-1 flex-col">
      <!-- 门店信息 -->
      <view class="flex items-center bg-white px-30rpx py-24rpx">
        <wd-icon name="shop" size="32rpx" color="#1890ff" />
        <text class="ml-12rpx flex-1 text-28rpx text-hex-333 font-medium">{{ locationStore.currentCompanyName || '当前门店' }}</text>
        <text class="text-26rpx text-hex-1890ff" @click="toggleEditMode">
          {{ isEditing ? '完成' : '编辑' }}
        </text>
      </view>

      <!-- 商品列表 -->
      <view class="flex-1">
        <!-- 有效商品 -->
        <view v-for="item in cartStore.items" :key="item.skuId" class="mt-16rpx bg-white">
          <wd-swipe-action>
            <view class="flex items-start p-24rpx">
              <!-- 选择框 -->
              <wd-checkbox
                :model-value="item.checked"
                :disabled="item.stockStatus !== 'normal'"
                @change="cartStore.toggleCheck(item.skuId)"
              />

              <!-- 商品图片 -->
              <image
                class="mx-20rpx h-160rpx w-160rpx flex-shrink-0 rounded-12rpx"
                :src="item.productImg || '/static/images/placeholder.png'"
                mode="aspectFill"
                @click="goToDetail(item.productId)"
              />

              <!-- 商品信息 -->
              <view class="min-h-160rpx flex flex-1 flex-col" @click="goToDetail(item.productId)">
                <text class="line-clamp-2 text-28rpx text-hex-333 leading-1.4">{{ item.productName }}</text>

                <!-- 规格 -->
                <text v-if="item.specData" class="mt-8rpx text-24rpx text-hex-999">
                  {{ Object.values(item.specData).join(' / ') }}
                </text>

                <!-- 价格变动提示 -->
                <view v-if="item.priceChanged" class="mt-8rpx flex items-center text-22rpx text-hex-ff9800">
                  <wd-icon name="warning" size="24rpx" color="#ff9800" />
                  <text class="ml-6rpx">价格已更新</text>
                </view>

                <!-- 库存状态 -->
                <text v-if="item.stockStatus === 'insufficient'" class="mt-8rpx text-22rpx text-hex-ff9800">
                  库存不足
                </text>
                <text v-else-if="item.stockStatus === 'soldOut'" class="mt-8rpx text-22rpx text-hex-ff4d4f">
                  已售罄
                </text>

                <!-- 价格和数量 -->
                <view class="mt-auto flex items-center justify-between">
                  <view class="flex items-baseline">
                    <text class="text-32rpx text-hex-ff4d4f font-600">¥{{ formatPrice(item.currentPrice) }}</text>
                    <text v-if="item.priceChanged" class="ml-12rpx text-24rpx text-hex-999 line-through">
                      ¥{{ formatPrice(item.addPrice) }}
                    </text>
                  </view>
                  <wd-input-number
                    v-model="item.quantity"
                    :min="1"
                    :max="99"
                    :disabled="item.stockStatus !== 'normal'"
                    size="small"
                    @change="(e: any) => onQuantityChange(item, e)"
                  />
                </view>
              </view>
            </view>

            <template #right>
              <view class="h-full w-150rpx flex items-center justify-center bg-hex-ff4d4f text-28rpx text-white" @click="onDelete(item)">
                删除
              </view>
            </template>
          </wd-swipe-action>
        </view>

        <!-- 无效商品 -->
        <view v-if="cartStore.invalidItems.length > 0" class="mt-30rpx">
          <view class="flex items-center justify-between px-30rpx py-20rpx text-26rpx text-hex-666">
            <text>失效商品 ({{ cartStore.invalidItems.length }})</text>
            <text class="text-hex-1890ff" @click="clearInvalid">清空</text>
          </view>

          <view
            v-for="item in cartStore.invalidItems"
            :key="item.skuId"
            class="mt-16rpx bg-white opacity-60"
          >
            <view class="flex items-start p-24rpx">
              <view class="h-36rpx w-60rpx rounded-4rpx bg-hex-f0f0f0 text-center text-20rpx text-hex-999 leading-36rpx">
                失效
              </view>
              <image
                class="mx-20rpx h-160rpx w-160rpx flex-shrink-0 rounded-12rpx"
                :src="item.productImg || '/static/images/placeholder.png'"
                mode="aspectFill"
              />
              <view class="min-h-160rpx flex flex-1 flex-col">
                <text class="line-clamp-2 text-28rpx text-hex-333 leading-1.4">{{ item.productName }}</text>
                <text class="mt-8rpx text-24rpx text-hex-ff4d4f">商品已下架或不可售</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部结算栏 -->
      <view class="fixed bottom-[var(--tabbar-total-height)] left-0 right-0 z-100 flex items-center justify-between border-t border-hex-eee bg-white px-30rpx py-20rpx">
        <view class="flex items-center text-26rpx text-hex-333" @click="onToggleAll">
          <wd-checkbox :model-value="cartStore.isAllChecked" />
          <text class="ml-8rpx">全选</text>
        </view>

        <view class="flex items-center">
          <view v-if="!isEditing" class="mr-24rpx">
            <text class="text-26rpx text-hex-666">合计:</text>
            <text class="text-36rpx text-hex-ff4d4f font-600">¥{{ formatPrice(cartStore.selectedTotal) }}</text>
          </view>

          <wd-button
            v-if="isEditing"
            type="error"
            size="small"
            :disabled="cartStore.selectedCount === 0"
            @click="deleteSelected"
          >
            删除 ({{ cartStore.selectedCount }})
          </wd-button>

          <wd-button
            v-else
            type="primary"
            size="small"
            :disabled="cartStore.selectedCount === 0"
            @click="goCheckout"
          >
            去结算 ({{ cartStore.selectedCount }})
          </wd-button>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
// UnoCSS handles most styles.
// Preserving complex overrides if needed (currently none).
</style>
