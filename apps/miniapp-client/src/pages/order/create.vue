<script lang="ts" setup>
import type { AddressVo } from '@/api/address'
import type { CheckoutPreviewVo, OrderItemDto } from '@/api/order'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { getDefaultAddress } from '@/api/address'
import { createOrder, getCheckoutPreview } from '@/api/order'
import { mockPaySuccess, prepay } from '@/api/payment'
import AddressSelector from '@/components/address-selector/address-selector.vue'
import ServiceTimePicker from '@/components/service-time-picker/service-time-picker.vue'

import { useCartStore } from '@/store/cart'
import { useLocationStore } from '@/store/location'

definePage({
  style: {
    navigationBarTitleText: '确认订单',
  },
})

const cartStore = useCartStore()
const locationStore = useLocationStore()

// 结算模式: 'cart' 从购物车 | 'direct' 直接购买 | 'group_buy' 拼团
const checkoutMode = ref<'cart' | 'direct' | 'group_buy'>('cart')

// 直接购买的商品数据
const directBuyItems = ref<OrderItemDto[]>([])
const directTenantId = ref('')
const marketingConfigId = ref('')

// 页面状态
const loading = ref(true)
const submitting = ref(false)
const preview = ref<CheckoutPreviewVo | null>(null)

// 收货地址
const selectedAddress = ref<AddressVo | null>(null)
const addressSelectorVisible = ref(false)

// 服务时间
const serviceTimeVisible = ref(false)
const selectedTimeText = ref('')
const bookingTime = ref<string | undefined>(undefined)

// 备注
const remark = ref('')

// 获取当前结算数据
const checkoutData = computed(() => {
  if (checkoutMode.value === 'direct' || checkoutMode.value === 'group_buy') {
    return {
      items: directBuyItems.value,
      tenantId: directTenantId.value,
      marketingConfigId: marketingConfigId.value || undefined,
    }
  }
  return cartStore.getCheckoutData()
})

// 页面加载
onLoad(async (options) => {
  // 判断结算模式
  if ((options?.mode === 'direct' || options?.mode === 'group_buy') && options?.skuId && options?.tenantId) {
    // 直接购买/拼团模式
    checkoutMode.value = options.mode as any
    directTenantId.value = options.tenantId
    if (options.marketingConfigId) {
      marketingConfigId.value = options.marketingConfigId
    }
    directBuyItems.value = [{
      skuId: options.skuId,
      quantity: Number.parseInt(options.quantity || '1'),
      shareUserId: options.shareUserId || undefined,
    }]
  }
  else {
    // 购物车结算模式
    checkoutMode.value = 'cart'
  }

  await Promise.all([
    loadCheckoutPreview(),
    loadDefaultAddress(),
  ])
})

// 页面显示时刷新地址（从地址管理页返回后）
onShow(async () => {
  if (!loading.value) {
    await loadDefaultAddress()
  }
})

// 加载结算预览
async function loadCheckoutPreview() {
  const data = checkoutData.value

  if (!data.tenantId || data.items.length === 0) {
    uni.showToast({ title: '请选择商品', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }

  loading.value = true
  try {
    const result = await getCheckoutPreview(data)
    if (result) {
      preview.value = result
    }
  }
  catch (err) {
    console.error('加载结算信息失败:', err)
    uni.showToast({ title: '加载失败，请重试', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

// 加载默认地址
async function loadDefaultAddress() {
  try {
    const result = await getDefaultAddress()
    if (result) {
      selectedAddress.value = result
    }
  }
  catch (err) {
    console.error('加载默认地址失败:', err)
  }
}

// 打开地址选择器
function openAddressSelector() {
  addressSelectorVisible.value = true
}

// 选择地址
function onAddressSelect(address: AddressVo) {
  selectedAddress.value = address
}

// 打开服务时间选择器
function openServiceTimePicker() {
  serviceTimeVisible.value = true
}

// 选择服务时间
function onServiceTimeConfirm(res: { date: string, time: string, fullTime: string }) {
  selectedTimeText.value = res.fullTime
  // 为了兼容性，替换 - 为 /
  const dateStr = res.fullTime.replace(/-/g, '/')
  bookingTime.value = new Date(dateStr).toISOString()
}

// 格式化价格
function formatPrice(price: number): string {
  return price.toFixed(2)
}

// 格式化规格
function formatSpec(specData: Record<string, string> | null): string {
  if (!specData)
    return ''
  return Object.values(specData).join(' / ')
}

// 提交订单
async function submitOrder() {
  if (!preview.value)
    return

  // 校验地址
  if (!selectedAddress.value) {
    uni.showToast({ title: '请选择收货地址', icon: 'none' })
    return
  }

  // 校验服务时间
  if (preview.value.hasService && !bookingTime.value) {
    uni.showToast({ title: '请选择服务时间', icon: 'none' })
    return
  }

  const data = checkoutData.value
  const addr = selectedAddress.value

  submitting.value = true
  try {
    const result = await createOrder({
      tenantId: data.tenantId,
      items: data.items,
      receiverName: addr.name,
      receiverPhone: addr.phone,
      receiverAddress: addr.fullAddress,
      receiverLat: addr.latitude,
      receiverLng: addr.longitude,
      bookingTime: bookingTime.value, // 传递预约时间
      remark: remark.value || undefined,
      marketingConfigId: data.marketingConfigId, // 传递营销ID
    })

    if (result) {
      uni.showToast({ title: '订单创建成功', icon: 'success' })

      // 如果是购物车模式，刷新购物车
      if (checkoutMode.value === 'cart') {
        cartStore.fetchCartList()
      }

      // 跳转到订单详情页或发起支付
      // 自动发起支付
      await payOrder(result.orderId)
    }
  }
  catch (err) {
    console.error('创建订单失败:', err)
  }
  finally {
    submitting.value = false
  }
}

// 支付流程

async function payOrder(orderId: string) {
  try {
    uni.showLoading({ title: '正在发起支付...' })

    // 1. 预下单
    // ⚠️ 开发模式：直接模拟成功
    const IS_DEV = true

    if (IS_DEV) {
      await mockPaySuccess(orderId)
      uni.hideLoading()
      uni.redirectTo({ url: `/pages/pay/result?orderId=${orderId}&status=success` })
      return
    }

    // 2. 真实支付与微信交互
    const params = await prepay(orderId)

    // 3. 唤起微信支付
    uni.requestPayment({
      provider: 'wxpay',
      ...params,
      success: () => {
        uni.hideLoading()
        uni.redirectTo({ url: `/pages/pay/result?orderId=${orderId}&status=success` })
      },
      fail: (err) => {
        uni.hideLoading()
        console.error('支付失败:', err)
        // 支付失败跳到详情页
        uni.redirectTo({ url: `/pages/order/detail?id=${orderId}` })
      },
    })
  }
  catch (err: any) {
    uni.hideLoading()
    console.error('支付发起失败', err)
    uni.showToast({ title: '支付发起失败', icon: 'none' })
    // 失败也跳详情
    setTimeout(() => {
      uni.redirectTo({ url: `/pages/order/detail?id=${orderId}` })
    }, 1500)
  }
}
</script>

<template>
  <view class="checkout-page">
    <!-- 加载中 -->
    <view v-if="loading" class="loading-state">
      <wd-loading />
      <text>加载中...</text>
    </view>

    <template v-else-if="preview">
      <!-- 收货地址 -->
      <view class="section address-section" @click="openAddressSelector">
        <template v-if="selectedAddress">
          <view class="address-content">
            <view class="address-header">
              <text class="name">{{ selectedAddress.name }}</text>
              <text class="phone">{{ selectedAddress.phone }}</text>
              <text v-if="selectedAddress.tag" class="tag">{{ selectedAddress.tag }}</text>
            </view>
            <text class="address-detail">{{ selectedAddress.fullAddress }}</text>
          </view>
        </template>
        <template v-else>
          <view class="add-address">
            <view class="i-carbon-add text-40rpx text-gray-400" />
            <text>添加收货地址</text>
          </view>
        </template>
        <view class="i-carbon-chevron-right text-32rpx text-gray-400" />
      </view>

      <!-- 服务时间 -->
      <view v-if="preview.hasService" class="section time-section" @click="openServiceTimePicker">
        <view class="section-title">
          <view class="i-carbon-time text-32rpx text-blue-500" />
          <text>预约时间</text>
        </view>
        <view class="time-content">
          <text v-if="selectedTimeText" class="time-text">{{ selectedTimeText }}</text>
          <text v-else class="placeholder">请选择服务时间</text>
          <view class="i-carbon-chevron-right text-32rpx text-gray-400" />
        </view>
      </view>

      <!-- 商品列表 -->
      <view class="section goods-section">
        <view class="section-title">
          <view class="i-carbon-store text-32rpx text-blue-500" />
          <text>{{ locationStore.currentCompanyName || '商品信息' }}</text>
        </view>
        <view class="goods-list">
          <view v-for="item in preview.items" :key="item.skuId" class="goods-item">
            <image class="goods-image" :src="item.productImg" mode="aspectFill" />
            <view class="goods-info">
              <text class="goods-name">{{ item.productName }}</text>
              <text v-if="item.specData" class="goods-spec">
                {{ formatSpec(item.specData) }}
              </text>
              <view class="goods-bottom">
                <text class="goods-price">¥{{ formatPrice(item.price) }}</text>
                <text class="goods-qty">x{{ item.quantity }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 备注 -->
      <view class="section remark-section">
        <wd-input
          v-model="remark"
          label="备注"
          placeholder="选填：对本次交易的说明"
        />
      </view>

      <!-- 金额明细 -->
      <view class="section amount-section">
        <view class="amount-row">
          <text class="amount-label">商品金额</text>
          <text class="amount-value">¥{{ formatPrice(preview.totalAmount) }}</text>
        </view>
        <view v-if="preview.freightAmount > 0" class="amount-row">
          <text class="amount-label">运费</text>
          <text class="amount-value">¥{{ formatPrice(preview.freightAmount) }}</text>
        </view>
        <view v-if="preview.discountAmount > 0" class="amount-row discount">
          <text class="amount-label">优惠</text>
          <text class="amount-value">-¥{{ formatPrice(preview.discountAmount) }}</text>
        </view>
      </view>

      <!-- 底部结算栏 -->
      <view class="submit-bar">
        <view class="total-info">
          <text class="total-label">实付款：</text>
          <text class="total-price">¥{{ formatPrice(preview.payAmount) }}</text>
        </view>
        <wd-button
          type="primary"
          size="medium"
          :loading="submitting"
          :disabled="submitting"
          @click="submitOrder"
        >
          提交订单
        </wd-button>
      </view>
    </template>

    <!-- 地址选择器 -->
    <AddressSelector
      v-model="addressSelectorVisible"
      @select="onAddressSelect"
    />

    <!-- 服务时间选择器 -->
    <ServiceTimePicker
      v-model="serviceTimeVisible"
      @confirm="onServiceTimeConfirm"
    />
  </view>
</template>

<style lang="scss" scoped>
.checkout-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 140rpx;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  color: #999;

  text {
    margin-top: 20rpx;
    font-size: 28rpx;
  }
}

.section {
  margin: 20rpx;
  background-color: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.section-title {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
  font-size: 28rpx;
  font-weight: 500;
  color: #333;

  view,
  text {
    display: flex;
    align-items: center;
  }

  text:last-child {
    margin-left: 12rpx;
  }
}

.address-section {
  display: flex;
  align-items: center;
  padding: 30rpx;

  .address-content {
    flex: 1;

    .address-header {
      display: flex;
      align-items: center;
      gap: 16rpx;
      margin-bottom: 12rpx;

      .name {
        font-size: 32rpx;
        font-weight: 500;
        color: #333;
      }

      .phone {
        font-size: 28rpx;
        color: #666;
      }

      .tag {
        font-size: 22rpx;
        color: #1890ff;
        background-color: rgba(24, 144, 255, 0.1);
        padding: 4rpx 12rpx;
        border-radius: 4rpx;
      }
    }

    .address-detail {
      font-size: 26rpx;
      color: #666;
      line-height: 1.5;
    }
  }

  .add-address {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 16rpx;
    color: #999;
    font-size: 28rpx;
  }
}

.time-section {
  .time-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 30rpx;

    .time-text {
      font-size: 30rpx;
      color: #333;
      font-weight: 500;
    }

    .placeholder {
      font-size: 28rpx;
      color: #999;
    }
  }
}

.goods-section {
  .goods-list {
    padding: 0 24rpx;
  }

  .goods-item {
    display: flex;
    padding: 24rpx 0;
    border-bottom: 1rpx solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    .goods-image {
      width: 140rpx;
      height: 140rpx;
      border-radius: 12rpx;
      flex-shrink: 0;
    }

    .goods-info {
      flex: 1;
      margin-left: 20rpx;
      display: flex;
      flex-direction: column;

      .goods-name {
        font-size: 28rpx;
        color: #333;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .goods-spec {
        font-size: 24rpx;
        color: #999;
        margin-top: 8rpx;
      }

      .goods-bottom {
        display: flex;
        justify-content: space-between;
        margin-top: auto;

        .goods-price {
          font-size: 28rpx;
          color: #ff4d4f;
        }

        .goods-qty {
          font-size: 26rpx;
          color: #999;
        }
      }
    }
  }
}

.amount-section {
  padding: 24rpx;

  .amount-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16rpx;

    &:last-child {
      margin-bottom: 0;
    }

    &.discount {
      .amount-value {
        color: #52c41a;
      }
    }

    .amount-label {
      font-size: 26rpx;
      color: #666;
    }

    .amount-value {
      font-size: 26rpx;
      color: #333;
    }
  }
}

.submit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  background-color: #fff;
  border-top: 1rpx solid #eee;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));

  .total-info {
    display: flex;
    align-items: baseline;

    .total-label {
      font-size: 26rpx;
      color: #333;
    }

    .total-price {
      font-size: 40rpx;
      font-weight: 600;
      color: #ff4d4f;
    }
  }
}
</style>
