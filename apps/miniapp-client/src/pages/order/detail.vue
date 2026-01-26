<script lang="ts" setup>
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { mockPaySuccess, prepay } from '@/api/payment'
import { httpGet, httpPost } from '@/http/http'

definePage({
  style: {
    navigationBarTitleText: '订单详情',
  },
})

// 订单详情类型
interface OrderItem {
  productId: string
  productName: string
  productImg: string
  skuId: string
  specData: Record<string, string> | null
  price: number
  quantity: number
  totalAmount: number
}

interface OrderDetail {
  id: string
  orderSn: string
  status: string
  payStatus: string
  orderType: string
  totalAmount: number
  freightAmount: number
  discountAmount: number
  payAmount: number
  receiverName?: string
  receiverPhone?: string
  receiverAddress?: string
  bookingTime?: string
  serviceRemark?: string
  payTime?: string
  createTime: string
  items: OrderItem[]
}

// 状态映射
const statusMap: Record<string, { text: string, color: string }> = {
  PENDING_PAY: { text: '待支付', color: '#ff9800' },
  PAID: { text: '已支付', color: '#1890ff' },
  SHIPPED: { text: '已发货', color: '#52c41a' },
  COMPLETED: { text: '已完成', color: '#52c41a' },
  CANCELLED: { text: '已取消', color: '#999' },
  REFUNDED: { text: '已退款', color: '#ff4d4f' },
}

// 页面状态
const loading = ref(true)
const orderId = ref('')
const order = ref<OrderDetail | null>(null)
const cancelling = ref(false)

// 页面加载
onLoad((query) => {
  orderId.value = query?.id || ''
  if (orderId.value) {
    loadOrderDetail()
  }
})

// 加载订单详情
async function loadOrderDetail() {
  loading.value = true
  try {
    const result = await httpGet<OrderDetail>(`/client/order/${orderId.value}`)
    if (result) {
      order.value = result
    }
  }
  catch (err) {
    console.error('加载订单详情失败:', err)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

// 格式化价格
function formatPrice(price: number): string {
  return price.toFixed(2)
}

// 格式化时间
function formatTime(timeStr: string): string {
  const date = new Date(timeStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 格式化规格
function formatSpec(specData: Record<string, string> | null): string {
  if (!specData)
    return ''
  return Object.values(specData).join(' / ')
}

// 获取状态信息
function getStatusInfo(status: string) {
  return statusMap[status] || { text: status, color: '#999' }
}

// 取消订单
async function cancelOrder() {
  uni.showModal({
    title: '提示',
    content: '确定取消该订单吗？',
    success: async (res) => {
      if (res.confirm) {
        cancelling.value = true
        try {
          await httpPost('/client/order/cancel', { orderId: orderId.value })
          uni.showToast({ title: '订单已取消', icon: 'success' })
          await loadOrderDetail()
        }
        catch (err) {
          console.error('取消订单失败:', err)
        }
        finally {
          cancelling.value = false
        }
      }
    },
  })
}

// 去支付
async function goPay() {
  if (!orderId.value)
    return

  try {
    uni.showLoading({ title: '正在发起支付...' })

    // 1. 预下单
    // ⚠️ 开发模式：直接模拟成功
    const IS_DEV = true

    if (IS_DEV) {
      await mockPaySuccess(orderId.value)
      uni.hideLoading()
      uni.redirectTo({ url: `/pages/pay/result?orderId=${orderId.value}&status=success` })
      return
    }

    // 2. 真实支付与微信交互
    const params = await prepay(orderId.value)

    // 3. 唤起微信支付
    uni.requestPayment({
      provider: 'wxpay',
      ...params,
      success: () => {
        uni.hideLoading()
        uni.redirectTo({ url: `/pages/pay/result?orderId=${orderId.value}&status=success` })
      },
      fail: (err) => {
        uni.hideLoading()
        console.error('支付失败:', err)
        uni.showToast({ title: '支付失败', icon: 'none' })
      },
    })
  }
  catch (err: any) {
    uni.hideLoading()
    console.error('支付发起失败', err)
    uni.showToast({ title: '支付发起失败', icon: 'none' })
  }
}

// 返回订单列表
function goOrderList() {
  uni.navigateTo({ url: '/pages/order/list' })
}
</script>

<template>
  <view class="order-detail-page">
    <!-- 加载中 -->
    <view v-if="loading" class="loading-state">
      <wd-loading />
      <text>加载中...</text>
    </view>

    <template v-else-if="order">
      <!-- 订单状态 -->
      <view class="status-section" :style="{ backgroundColor: getStatusInfo(order.status).color }">
        <view class="status-icon">
          <wd-icon name="check-circle" size="64rpx" color="#fff" />
        </view>
        <view class="status-info">
          <text class="status-text">{{ getStatusInfo(order.status).text }}</text>
          <text class="order-sn">订单编号：{{ order.orderSn }}</text>
        </view>
      </view>

      <!-- 服务预约信息 -->
      <view v-if="order.bookingTime" class="section booking-section">
        <wd-icon name="time" size="36rpx" color="#1890ff" />
        <view class="booking-info">
          <text class="label">预约时间</text>
          <text class="value">{{ formatTime(order.bookingTime) }}</text>
        </view>
      </view>

      <!-- 收货信息 -->
      <view v-if="order.receiverName || order.receiverPhone" class="section address-section">
        <wd-icon name="location" size="36rpx" color="#1890ff" />
        <view class="address-info">
          <view class="receiver">
            <text class="name">{{ order.receiverName }}</text>
            <text class="phone">{{ order.receiverPhone }}</text>
          </view>
          <text v-if="order.receiverAddress" class="address">{{ order.receiverAddress }}</text>
        </view>
      </view>

      <!-- 商品列表 -->
      <view class="section goods-section">
        <view v-for="item in order.items" :key="item.skuId" class="goods-item">
          <image class="goods-image" :src="item.productImg" mode="aspectFill" />
          <view class="goods-info">
            <text class="goods-name">{{ item.productName }}</text>
            <text v-if="item.specData" class="goods-spec">{{ formatSpec(item.specData) }}</text>
            <view class="goods-bottom">
              <text class="goods-price">¥{{ formatPrice(item.price) }}</text>
              <text class="goods-qty">x{{ item.quantity }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 金额明细 -->
      <view class="section amount-section">
        <view class="amount-row">
          <text class="label">商品金额</text>
          <text class="value">¥{{ formatPrice(order.totalAmount) }}</text>
        </view>
        <view v-if="Number(order.freightAmount) > 0" class="amount-row">
          <text class="label">运费</text>
          <text class="value">¥{{ formatPrice(Number(order.freightAmount)) }}</text>
        </view>
        <view v-if="Number(order.discountAmount) > 0" class="amount-row discount">
          <text class="label">优惠</text>
          <text class="value">-¥{{ formatPrice(Number(order.discountAmount)) }}</text>
        </view>
        <view class="amount-row total">
          <text class="label">实付款</text>
          <text class="value">¥{{ formatPrice(Number(order.payAmount)) }}</text>
        </view>
      </view>

      <!-- 订单信息 -->
      <view class="section info-section">
        <view class="info-row">
          <text class="label">订单编号</text>
          <text class="value">{{ order.orderSn }}</text>
        </view>
        <view class="info-row">
          <text class="label">下单时间</text>
          <text class="value">{{ formatTime(order.createTime) }}</text>
        </view>
        <view v-if="order.payTime" class="info-row">
          <text class="label">支付时间</text>
          <text class="value">{{ formatTime(order.payTime) }}</text>
        </view>
      </view>

      <!-- 底部操作栏 -->
      <view v-if="order.status === 'PENDING_PAY'" class="action-bar">
        <wd-button size="medium" plain :loading="cancelling" @click="cancelOrder">
          取消订单
        </wd-button>
        <wd-button type="primary" size="medium" @click="goPay">
          立即支付
        </wd-button>
      </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.order-detail-page {
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

.status-section {
  display: flex;
  align-items: center;
  padding: 40rpx 30rpx;
  color: #fff;

  .status-icon {
    margin-right: 24rpx;
  }

  .status-info {
    .status-text {
      display: block;
      font-size: 36rpx;
      font-weight: 600;
      margin-bottom: 8rpx;
    }

    .order-sn {
      display: block;
      font-size: 24rpx;
      opacity: 0.8;
    }
  }
}

.section {
  margin: 20rpx;
  background-color: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.address-section {
  display: flex;
  padding: 24rpx;

  .address-info {
    flex: 1;
    margin-left: 16rpx;

    .receiver {
      margin-bottom: 8rpx;

      .name {
        font-size: 30rpx;
        font-weight: 500;
        color: #333;
        margin-right: 20rpx;
      }

      .phone {
        font-size: 28rpx;
        color: #666;
      }
    }

    .address {
      font-size: 26rpx;
      color: #999;
    }
  }
}

.goods-section {
  padding: 0 24rpx;

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

.amount-section,
.info-section {
  padding: 24rpx;

  .amount-row,
  .info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16rpx;

    &:last-child {
      margin-bottom: 0;
    }

    .label {
      font-size: 26rpx;
      color: #666;
    }

    .value {
      font-size: 26rpx;
      color: #333;
    }

    &.discount .value {
      color: #52c41a;
    }

    &.total .value {
      font-size: 32rpx;
      font-weight: 600;
      color: #ff4d4f;
    }
  }
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: flex-end;
  gap: 20rpx;
  padding: 20rpx 30rpx;
  background-color: #fff;
  border-top: 1rpx solid #eee;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}

.booking-section {
  display: flex;
  padding: 24rpx;
  align-items: center;

  .booking-info {
    flex: 1;
    display: flex;
    justify-content: space-between;
    margin-left: 16rpx;

    .label {
      font-size: 28rpx;
      color: #666;
    }

    .value {
      font-size: 28rpx;
      font-weight: 500;
      color: #333;
    }
  }
}
</style>
