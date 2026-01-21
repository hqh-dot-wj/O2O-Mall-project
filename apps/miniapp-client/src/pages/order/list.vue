<script lang="ts" setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useTokenStore } from '@/store/token'
import { useUserStore } from '@/store/user'
import { useAuthStore } from '@/store/auth'
import { httpGet } from '@/http/http'
import { getWxCode } from '@/api/login'
import { storeToRefs } from 'pinia'
import { prepay, mockPaySuccess } from '@/api/payment'

definePage({
  style: {
    navigationBarTitleText: '我的订单',
  },
})

const tokenStore = useTokenStore()
const userStore = useUserStore()
const authStore = useAuthStore()
const { userInfo } = storeToRefs(userStore)

// 订单状态
interface OrderItem {
  id: string
  orderSn: string
  status: string
  payAmount: number
  itemCount: number
  firstProductImg: string
  createTime: string
}

// 状态tabs
const tabs = [
  { label: '全部', value: '' },
  { label: '待支付', value: 'PENDING_PAY' },
  { label: '已支付', value: 'PAID' },
  { label: '已完成', value: 'COMPLETED' },
]

const activeTab = ref(0)
const loading = ref(false)
const orders = ref<OrderItem[]>([])
const currentPage = ref(1)
const hasMore = ref(true)

// 是否显示手机号绑定提示
const showPhoneBindTip = computed(() => {
  return tokenStore.hasLogin && !userInfo.value?.phone
})

// 状态映射
const statusMap: Record<string, string> = {
  PENDING_PAY: '待支付',
  PAID: '已支付',
  SHIPPED: '已发货',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
}

onLoad(() => {
  if (!tokenStore.hasLogin) {
    authStore.openAuthModal(() => {
      loadOrders()
    })
  } else {
    loadOrders()
  }
})

// 加载订单列表
async function loadOrders(refresh = true) {
  if (loading.value) return

  if (refresh) {
    currentPage.value = 1
    hasMore.value = true
  }

  if (!hasMore.value) return

  loading.value = true
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      limit: 10,
    }
    const status = tabs[activeTab.value].value
    if (status) {
      params.status = status
    }

    const result = await httpGet<{ items: OrderItem[]; total: number }>('/client/order/list', params)
    if (result) {
      if (refresh) {
        orders.value = result.items || []
      } else {
        orders.value.push(...(result.items || []))
      }
      hasMore.value = orders.value.length < result.total
      currentPage.value++
    }
  } catch (err) {
    console.error('加载订单失败:', err)
  } finally {
    loading.value = false
  }
}

// 切换tab
function onTabChange(index: number) {
  activeTab.value = index
  loadOrders()
}

// 绑定手机号
async function onBindPhone(e: any) {
  if (e.detail.errMsg === 'getPhoneNumber:ok') {
    uni.showLoading({ title: '绑定中...' })
    try {
      const loginRes = await getWxCode()
      await tokenStore.mobileLogin({
        loginCode: loginRes.code,
        phoneCode: e.detail.code,
        tenantId: '000000',
        userInfo: {
          nickName: userInfo.value?.nickname || '微信用户',
          avatarUrl: userInfo.value?.avatar || '',
        },
      })
      uni.showToast({ title: '绑定成功', icon: 'success' })
    } catch (err) {
      console.error(err)
    } finally {
      uni.hideLoading()
    }
  }
}

// 跳转订单详情
function goDetail(orderId: string) {
  uni.navigateTo({ url: `/pages/order/detail?id=${orderId}` })
}

// 格式化价格
function formatPrice(price: number): string {
  return price.toFixed(2)
}

// 格式化时间
function formatTime(timeStr: string): string {
  const date = new Date(timeStr)
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}


async function onPay(orderId: string) {
  try {
    uni.showLoading({ title: '发起支付...' })
    
    // ⚠️ 开发模式
    const IS_DEV = true
    if (IS_DEV) {
      await mockPaySuccess(orderId)
      uni.hideLoading()
      uni.redirectTo({ url: `/pages/pay/result?orderId=${orderId}&status=success` })
      return
    }

    const params = await prepay(orderId)
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
        uni.showToast({ title: '支付失败', icon: 'none' })
      }
    })
  } catch (err: any) {
    uni.hideLoading()
    console.error('支付发起失败', err)
    uni.showToast({ title: '支付发起失败', icon: 'none' })
  }
}
</script>

<template>
  <view class="order-list-page">
    <!-- 手机号绑定提示 -->
    <view v-if="showPhoneBindTip" class="phone-bind-tip">
      <wd-icon name="info-circle" size="28rpx" color="#fa8c16" />
      <text class="tip-text">绑定手机号以获得更好的订单通知体验</text>
      <button class="bind-btn" open-type="getPhoneNumber" @getphonenumber="onBindPhone">
        绑定
      </button>
    </view>

    <!-- 状态tabs -->
    <view class="tabs-section">
      <view
        v-for="(tab, index) in tabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: activeTab === index }"
        @click="onTabChange(index)"
      >
        {{ tab.label }}
      </view>
    </view>

    <!-- 订单列表 -->
    <view class="order-list">
      <view v-if="loading && orders.length === 0" class="loading-state">
        <wd-loading />
      </view>

      <view v-else-if="orders.length === 0" class="empty-state">
        <wd-icon name="order" size="120rpx" color="#ccc" />
        <text>暂无订单</text>
      </view>

      <view v-else>
        <view
          v-for="order in orders"
          :key="order.id"
          class="order-card"
          @click="goDetail(order.id)"
        >
          <view class="order-header">
            <text class="order-sn">订单号：{{ order.orderSn }}</text>
            <text class="order-status">{{ statusMap[order.status] || order.status }}</text>
          </view>
          <view class="order-body">
            <image class="product-img" :src="order.firstProductImg" mode="aspectFill" />
            <view class="order-info">
              <text class="item-count">共 {{ order.itemCount }} 件商品</text>
              <view class="order-footer">
                <text class="order-time">{{ formatTime(order.createTime) }}</text>
                <text class="order-amount">¥{{ formatPrice(order.payAmount) }}</text>
              </view>
            </view>
          </view>
          
          <!-- 底部按钮 -->
          <view class="order-actions" @click.stop>
             <wd-button 
               v-if="order.status === 'PENDING_PAY'" 
               size="small" 
               type="primary"
               @click="onPay(order.id)"
             >
               去支付
             </wd-button>
             <wd-button 
               v-else 
               size="small" 
               plain
               @click="goDetail(order.id)"
             >
               查看详情
             </wd-button>
          </view>
        </view>

        <view v-if="loading" class="loading-more">
          <wd-loading size="24rpx" />
          <text>加载中...</text>
        </view>
        <view v-else-if="!hasMore" class="no-more">没有更多了</view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.order-list-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.phone-bind-tip {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  background: #fff7e6;
  border-bottom: 1rpx solid #ffe7ba;

  .tip-text {
    flex: 1;
    margin-left: 12rpx;
    font-size: 24rpx;
    color: #fa8c16;
  }

  .bind-btn {
    font-size: 22rpx;
    padding: 6rpx 20rpx;
    background: #fa8c16;
    color: #fff;
    border-radius: 20rpx;

    &::after {
      display: none;
    }
  }
}

.tabs-section {
  display: flex;
  background: #fff;
  padding: 0 20rpx;
  border-bottom: 1rpx solid #f0f0f0;

  .tab-item {
    flex: 1;
    text-align: center;
    padding: 24rpx 0;
    font-size: 28rpx;
    color: #666;
    position: relative;

    &.active {
      color: #1890ff;
      font-weight: 500;

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 48rpx;
        height: 4rpx;
        background: #1890ff;
        border-radius: 2rpx;
      }
    }
  }
}

.order-list {
  padding: 20rpx;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  color: #999;

  text {
    margin-top: 16rpx;
    font-size: 28rpx;
  }
}

.order-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;

  .order-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20rpx;

    .order-sn {
      font-size: 24rpx;
      color: #999;
    }

    .order-status {
      font-size: 26rpx;
      color: #1890ff;
      font-weight: 500;
    }
  }

  .order-body {
    display: flex;

    .product-img {
      width: 140rpx;
      height: 140rpx;
      border-radius: 12rpx;
      flex-shrink: 0;
    }

    .order-info {
      flex: 1;
      margin-left: 20rpx;
      display: flex;
      flex-direction: column;

      .item-count {
        font-size: 28rpx;
        color: #333;
      }

      .order-footer {
        display: flex;
        justify-content: space-between;
        margin-top: auto;

        .order-time {
          font-size: 24rpx;
          color: #999;
        }

        .order-amount {
          font-size: 30rpx;
          font-weight: 600;
          color: #ff4d4f;
        }
      }
    }
  }

  .order-actions {
    display: flex;
    justify-content: flex-end;
    gap: 20rpx;
    padding-top: 20rpx;
    margin-top: 20rpx;
    border-top: 1rpx solid #f9f9f9;
  }
}


.loading-more, .no-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  color: #999;
  font-size: 24rpx;

  text {
    margin-left: 8rpx;
  }
}
</style>
