<script lang="ts" setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getProductDetail } from '@/api/product'
import { useCartStore } from '@/store/cart'
import { useAuthStore } from '@/store/auth'
import { useLocationStore } from '@/store/location'

definePage({
  style: {
    navigationBarTitleText: '商品详情',
  },
})

// Stores
const cartStore = useCartStore()
const authStore = useAuthStore()
const locationStore = useLocationStore()

// 商品数据
const product = ref<any>(null)
const loading = ref(true)
const selectedSku = ref<any>(null)
const quantity = ref(1)

// 商品类型判断
const isService = computed(() => product.value?.type === 'SERVICE')
const isReal = computed(() => product.value?.type === 'REAL')

// 当前选中的价格
const currentPrice = computed(() => {
  if (selectedSku.value) {
    return selectedSku.value.price
  }
  return product.value?.price || 0
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

// 修改数量
function onQuantityChange(value: number) {
  quantity.value = value
}

// 加入购物车 (实物和服务商品通用)
async function addToCart() {
  if (!selectedSku.value) {
    uni.showToast({ title: isService.value ? '请选择服务类型' : '请选择规格', icon: 'none' })
    return
  }

  if (selectedSku.value.stock <= 0) {
    uni.showToast({ title: '该规格已售罄', icon: 'none' })
    return
  }

  // 登录检测
  if (!authStore.requireAuth(() => addToCart())) {
    return
  }

  // 检查门店
  if (!locationStore.currentTenantId) {
    uni.showToast({ title: '请先选择门店', icon: 'none' })
    return
  }

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
  if (!selectedSku.value) {
    uni.showToast({ title: isService.value ? '请选择服务类型' : '请选择规格', icon: 'none' })
    return
  }

  if (selectedSku.value.stock <= 0) {
    uni.showToast({ title: '该规格已售罄', icon: 'none' })
    return
  }

  // 登录检测
  if (!authStore.requireAuth(() => buyNow())) {
    return
  }

  // 检查门店
  if (!locationStore.currentTenantId) {
    uni.showToast({ title: '请先选择门店', icon: 'none' })
    return
  }

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
  // 服务商品立即预约等同于立即购买
  buyNow()
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
  if (!minutes) return ''
  if (minutes < 60) {
    return `${minutes}分钟`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
}

// 格式化服务范围
function formatRadius(meters?: number): string {
  if (!meters) return ''
  if (meters < 1000) {
    return `${meters}米`
  }
  return `${(meters / 1000).toFixed(1)}公里`
}
</script>

<template>
  <view class="product-detail">
    <!-- 加载中 -->
    <view v-if="loading" class="loading-container">
      <wd-loading />
    </view>

    <template v-else-if="product">
      <!-- 轮播图 -->
      <swiper class="product-swiper" indicator-dots autoplay circular>
        <swiper-item v-for="(img, index) in product.mainImages" :key="index">
          <image class="swiper-image" :src="img" mode="aspectFill" />
        </swiper-item>
        <swiper-item v-if="!product.mainImages?.length">
          <image class="swiper-image" src="/static/images/placeholder.png" mode="aspectFill" />
        </swiper-item>
      </swiper>

      <!-- 商品基础信息 -->
      <view class="product-info">
        <view class="price-row">
          <text class="price">¥{{ currentPrice }}</text>
          <text v-if="isService" class="product-type-tag service">服务</text>
          <text v-else class="product-type-tag real">实物</text>
        </view>
        <text class="product-name">{{ product.name }}</text>
        <text v-if="product.subTitle" class="product-subtitle">{{ product.subTitle }}</text>
      </view>

      <!-- 服务商品特有信息 -->
      <view v-if="isService" class="service-info">
        <view class="info-item">
          <text class="label">服务时长</text>
          <text class="value">{{ formatDuration(product.serviceDuration) }}</text>
        </view>
        <view class="info-item">
          <text class="label">服务范围</text>
          <text class="value">{{ formatRadius(product.serviceRadius) }}</text>
        </view>
        <view v-if="product.needBooking" class="info-item">
          <text class="label">预约须知</text>
          <text class="value">需提前预约</text>
        </view>
      </view>

      <!-- 实物商品特有信息 -->
      <view v-if="isReal" class="real-info">
        <view class="info-item">
          <text class="label">配送</text>
          <text class="value">{{ product.isFreeShip ? '免运费' : '运费另计' }}</text>
        </view>
      </view>

      <!-- SKU 选择 -->
      <view v-if="product.skus?.length > 0" class="sku-section">
        <view class="section-title">{{ isService ? '选择服务类型' : '选择规格' }}</view>
        <view class="sku-list">
          <view
            v-for="sku in product.skus"
            :key="sku.skuId"
            class="sku-item"
            :class="{ 
              active: selectedSku?.skuId === sku.skuId,
              disabled: sku.stock <= 0
            }"
            @click="onSelectSku(sku)"
          >
            <view class="sku-item-content">
              <text>{{ Object.values(sku.specValues || {}).join(' / ') || '默认' }}</text>
              <text class="sku-price">¥{{ sku.price }}</text>
            </view>
            <text v-if="sku.stock <= 0" class="sold-out-badge">已售罄</text>
          </view>
        </view>
      </view>

      <!-- 商品详情 -->
      <view class="detail-section">
        <view class="section-title">商品详情</view>
        <rich-text :nodes="product.detailHtml || '<p>暂无详情</p>'" />
      </view>

      <!-- 底部操作栏 -->
      <view class="action-bar safe-area-bottom">
        <!-- 实物商品操作 -->
        <template v-if="isReal">
          <view class="action-left">
            <view class="action-icon" @click="goHome">
              <view class="i-carbon-home text-40rpx" />
              <text>首页</text>
            </view>
            <view class="action-icon" @click="goCart">
              <view class="i-carbon-shopping-cart text-40rpx" />
              <text>购物车</text>
            </view>
          </view>
          <view class="action-buttons">
            <button 
              class="btn-cart" 
              :class="{ disabled: selectedSku?.stock <= 0 }"
              @click="addToCart"
            >
              加入购物车
            </button>
            <button 
              class="btn-buy" 
              :class="{ disabled: selectedSku?.stock <= 0 }"
              @click="buyNow"
            >
              {{ selectedSku?.stock <= 0 ? '已售罄' : '立即购买' }}
            </button>
          </view>
        </template>

        <!-- 服务商品操作 -->
        <template v-else-if="isService">
          <view class="action-left">
            <view class="action-icon" @click="goHome">
              <view class="i-carbon-home text-40rpx" />
              <text>首页</text>
            </view>
            <view class="action-icon" @click="goCart">
              <view class="i-carbon-shopping-cart text-40rpx" />
              <text>购物车</text>
            </view>
          </view>
          <view class="action-buttons">
            <button 
              class="btn-cart" 
              :class="{ disabled: selectedSku?.stock <= 0 }"
              @click="addToCart"
            >
              加入购物车
            </button>
            <button 
              class="btn-book" 
              :class="{ disabled: selectedSku?.stock <= 0 }"
              @click="bookNow"
            >
              {{ selectedSku?.stock <= 0 ? '已售罄' : '立即预约' }}
            </button>
          </view>
        </template>
      </view>

      <!-- 底部占位 -->
      <view class="action-bar-placeholder" />
    </template>

    <!-- 商品不存在 -->
    <view v-else class="empty-container">
      <text>商品不存在或已下架</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.product-detail {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: env(safe-area-inset-bottom);
}

.loading-container,
.empty-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60vh;
  color: #999;
}

// 轮播图
.product-swiper {
  width: 100%;
  height: 750rpx;

  .swiper-image {
    width: 100%;
    height: 100%;
  }
}

// 商品信息
.product-info {
  padding: 30rpx;
  background-color: #fff;
  margin-bottom: 20rpx;

  .price-row {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 16rpx;

    .price {
      font-size: 48rpx;
      font-weight: 600;
      color: #ff4d4f;
    }

    .product-type-tag {
      font-size: 22rpx;
      padding: 6rpx 16rpx;
      border-radius: 6rpx;

      &.service {
        color: #1890ff;
        background-color: rgba(24, 144, 255, 0.1);
      }

      &.real {
        color: #52c41a;
        background-color: rgba(82, 196, 26, 0.1);
      }
    }
  }

  .product-name {
    font-size: 32rpx;
    font-weight: 500;
    color: #333;
    line-height: 1.5;
  }

  .product-subtitle {
    display: block;
    margin-top: 12rpx;
    font-size: 26rpx;
    color: #999;
  }
}

// 服务/实物信息
.service-info,
.real-info {
  padding: 20rpx 30rpx;
  background-color: #fff;
  margin-bottom: 20rpx;

  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 16rpx 0;
    border-bottom: 1rpx solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    .label {
      font-size: 28rpx;
      color: #666;
    }

    .value {
      font-size: 28rpx;
      color: #333;
    }
  }
}

// SKU 选择
.sku-section {
  padding: 30rpx;
  background-color: #fff;
  margin-bottom: 20rpx;

  .section-title {
    font-size: 30rpx;
    font-weight: 500;
    color: #333;
    margin-bottom: 20rpx;
  }

  .sku-list {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;

    .sku-item {
      display: flex;
      align-items: center;
      gap: 12rpx;
      padding: 16rpx 24rpx;
      border: 2rpx solid #e0e0e0;
      border-radius: 8rpx;
      font-size: 26rpx;
      color: #333;

      &.active {
        border-color: #1890ff;
        background-color: rgba(24, 144, 255, 0.05);
        color: #1890ff;
      }

      .sku-price {
        color: #ff4d4f;
        font-weight: 500;
      }
    }
  }
}

// 商品详情
.detail-section {
  padding: 30rpx;
  background-color: #fff;
  margin-bottom: 120rpx;

  .section-title {
    font-size: 30rpx;
    font-weight: 500;
    color: #333;
    margin-bottom: 20rpx;
    padding-bottom: 20rpx;
    border-bottom: 1rpx solid #f0f0f0;
  }
}

// 底部操作栏
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 16rpx 30rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background-color: #fff;
  box-shadow: 0 -2rpx 20rpx rgba(0, 0, 0, 0.05);
  z-index: 100;

  .action-left {
    display: flex;
    gap: 30rpx;

    .action-icon {
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 20rpx;
      color: #666;
    }
  }

  .action-buttons {
    flex: 1;
    display: flex;
    gap: 20rpx;
    margin-left: 30rpx;

    button {
      flex: 1;
      height: 80rpx;
      line-height: 80rpx;
      font-size: 28rpx;
      border-radius: 40rpx;
      border: none;
    }

    .btn-cart {
      background-color: #ffc53d;
      color: #fff;

      &.disabled {
        background-color: #ffd666;
        opacity: 0.6;
      }
    }

    .btn-buy {
      background-color: #ff4d4f;
      color: #fff;

      &.disabled {
        background-color: #ffa39e;
      }
    }

    .btn-book {
      background: linear-gradient(135deg, #1890ff, #096dd9);
      color: #fff;

      &.disabled {
        background: #91d5ff;
      }
    }
  }
}

.sku-item {
  position: relative;
  
  &.disabled {
    background-color: #f5f5f5;
    color: #ccc !important;
    border-color: #e8e8e8 !important;

    .sku-price {
      color: #ccc !important;
    }
  }

  .sku-item-content {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  .sold-out-badge {
    position: absolute;
    top: -10rpx;
    right: -10rpx;
    background-color: #999;
    color: #fff;
    font-size: 18rpx;
    padding: 2rpx 8rpx;
    border-radius: 4rpx;
    transform: scale(0.9);
  }
}

.action-bar-placeholder {
  height: 120rpx;
}

.safe-area-bottom {
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
}
</style>
