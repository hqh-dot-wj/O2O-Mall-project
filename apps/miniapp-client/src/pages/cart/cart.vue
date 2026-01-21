<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useCartStore } from '@/store/cart'
import { useLocationStore } from '@/store/location'
import { useTokenStore } from '@/store/token'
import { useAuthStore } from '@/store/auth'

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
  if (price === undefined || price === null) return '0.00'
  return Number(price).toFixed(2)
}

// 切换编辑模式
function toggleEditMode() {
  isEditing.value = !isEditing.value
}

// 数量变更
async function onQuantityChange(item: any, event: { value: string | number }) {
  const value = typeof event.value === 'string' ? parseInt(event.value) : event.value
  if (value < 1) return
  await cartStore.updateQuantity(item.skuId, value)
}

// 删除单个商品
async function onDelete(item: any) {
  uni.showModal({
    title: '提示',
    content: '确定删除该商品吗？',
    success: async (res) => {
      if (res.confirm) {
        await cartStore.removeItem(item.skuId)
      }
    },
  })
}

// 清空无效商品
async function clearInvalid() {
  if (cartStore.invalidItems.length === 0) return
  uni.showModal({
    title: '提示',
    content: '确定清空无效商品吗？',
    success: async (res) => {
      if (res.confirm) {
        await cartStore.clearInvalidItems()
      }
    },
  })
}

// 删除选中商品 (编辑模式)
async function deleteSelected() {
  const selected = cartStore.selectedItems
  if (selected.length === 0) {
    uni.showToast({ title: '请选择要删除的商品', icon: 'none' })
    return
  }

  uni.showModal({
    title: '提示',
    content: `确定删除选中的${selected.length}件商品吗？`,
    success: async (res) => {
      if (res.confirm) {
        for (const item of selected) {
          await cartStore.removeItem(item.skuId)
        }
        isEditing.value = false
      }
    },
  })
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
  const checkoutData = cartStore.getCheckoutData()
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
  <view class="cart-page">
    <!-- 未登录状态 -->
    <view v-if="!isLoggedIn" class="empty-state">
      <image class="empty-icon" src="/static/images/empty-cart.png" mode="aspectFit" />
      <text class="empty-text">登录后可同步购物车商品</text>
      <wd-button type="primary" size="medium" @click="goLogin">
        去登录
      </wd-button>
    </view>

    <!-- 已登录但购物车为空 -->
    <view v-else-if="cartStore.items.length === 0 && cartStore.invalidItems.length === 0" class="empty-state">
      <image class="empty-icon" src="/static/images/empty-cart.png" mode="aspectFit" />
      <text class="empty-text">购物车还是空的</text>
      <wd-button type="primary" size="medium" @click="goShopping">
        去逛逛
      </wd-button>
    </view>

    <!-- 购物车列表 -->
    <view v-else class="cart-content">
      <!-- 门店信息 -->
      <view class="store-header">
        <wd-icon name="shop" size="32rpx" color="#1890ff" />
        <text class="store-name">{{ locationStore.currentCompanyName || '当前门店' }}</text>
        <text class="edit-btn" @click="toggleEditMode">
          {{ isEditing ? '完成' : '编辑' }}
        </text>
      </view>

      <!-- 商品列表 -->
      <view class="cart-list">
        <!-- 有效商品 -->
        <view v-for="item in cartStore.items" :key="item.skuId" class="cart-item">
          <wd-swipe-action>
            <view class="item-content">
              <!-- 选择框 -->
              <wd-checkbox
                :model-value="item.checked"
                :disabled="item.stockStatus !== 'normal'"
                @change="cartStore.toggleCheck(item.skuId)"
              />

              <!-- 商品图片 -->
              <image
                class="item-image"
                :src="item.productImg || '/static/images/placeholder.png'"
                mode="aspectFill"
                @click="goToDetail(item.productId)"
              />

              <!-- 商品信息 -->
              <view class="item-info" @click="goToDetail(item.productId)">
                <text class="item-name">{{ item.productName }}</text>

                <!-- 规格 -->
                <text v-if="item.specData" class="item-spec">
                  {{ Object.values(item.specData).join(' / ') }}
                </text>

                <!-- 价格变动提示 -->
                <view v-if="item.priceChanged" class="price-change-tip">
                  <wd-icon name="warning" size="24rpx" color="#ff9800" />
                  <text>价格已更新</text>
                </view>

                <!-- 库存状态 -->
                <text v-if="item.stockStatus === 'insufficient'" class="stock-tip insufficient">
                  库存不足
                </text>
                <text v-else-if="item.stockStatus === 'soldOut'" class="stock-tip sold-out">
                  已售罄
                </text>

                <!-- 价格和数量 -->
                <view class="item-bottom">
                  <view class="price-wrap">
                    <text class="current-price">¥{{ formatPrice(item.currentPrice) }}</text>
                    <text v-if="item.priceChanged" class="old-price">
                      ¥{{ formatPrice(item.addPrice) }}
                    </text>
                  </view>
                <wd-input-number
                  v-model="item.quantity"
                  :min="1"
                  :max="99"
                  :disabled="item.stockStatus !== 'normal'"
                  size="small"
                  @change="(e: { value: string | number }) => onQuantityChange(item, e)"
                />
                </view>
              </view>
            </view>

            <template #right>
              <view class="swipe-delete" @click="onDelete(item)">
                删除
              </view>
            </template>
          </wd-swipe-action>
        </view>

        <!-- 无效商品 -->
        <view v-if="cartStore.invalidItems.length > 0" class="invalid-section">
          <view class="invalid-header">
            <text>失效商品 ({{ cartStore.invalidItems.length }})</text>
            <text class="clear-btn" @click="clearInvalid">清空</text>
          </view>

          <view
            v-for="item in cartStore.invalidItems"
            :key="item.skuId"
            class="cart-item invalid"
          >
            <view class="item-content">
              <view class="invalid-tag">失效</view>
              <image
                class="item-image"
                :src="item.productImg || '/static/images/placeholder.png'"
                mode="aspectFill"
              />
              <view class="item-info">
                <text class="item-name">{{ item.productName }}</text>
                <text class="item-spec invalid">商品已下架或不可售</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部结算栏 -->
      <view class="checkout-bar">
        <view class="check-all" @click="onToggleAll">
          <wd-checkbox :model-value="cartStore.isAllChecked" />
          <text>全选</text>
        </view>

        <view class="checkout-info">
          <view v-if="!isEditing" class="total-wrap">
            <text class="total-label">合计:</text>
            <text class="total-price">¥{{ formatPrice(cartStore.selectedTotal) }}</text>
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
.cart-page {
  display: flex;
  flex-direction: column;
  // 不要设置 min-height: 100vh！
  // 因为 KuRoot.vue 中 tabbar 占位元素在页面外层，设置 100vh 会导致滚动条
  // 页面内容自然流动，只需为底部结算栏预留空间
  min-height: calc(100vh - var(--tabbar-total-height));
  background-color: #f5f5f5;
  // 为结算栏预留空间（结算栏高度约 100rpx）
}

// 空状态
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 60rpx;

  .empty-icon {
    width: 300rpx;
    height: 300rpx;
    margin-bottom: 40rpx;
  }

  .empty-text {
    font-size: 28rpx;
    color: #999;
    margin-bottom: 40rpx;
  }
}

// 购物车内容
.cart-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

// 门店头部
.store-header {
  display: flex;
  align-items: center;
  padding: 24rpx 30rpx;
  background-color: #fff;

  .store-name {
    flex: 1;
    margin-left: 12rpx;
    font-size: 28rpx;
    color: #333;
    font-weight: 500;
  }

  .edit-btn {
    font-size: 26rpx;
    color: #1890ff;
  }
}

// 购物车列表
.cart-list {
  flex: 1;
}

// 购物车项
.cart-item {
  background-color: #fff;
  margin-top: 16rpx;

  &.invalid {
    opacity: 0.6;
  }

  .item-content {
    display: flex;
    align-items: flex-start;
    padding: 24rpx;

    .item-image {
      width: 160rpx;
      height: 160rpx;
      border-radius: 12rpx;
      margin: 0 20rpx;
      flex-shrink: 0;
    }

    .item-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 160rpx;

      .item-name {
        font-size: 28rpx;
        color: #333;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .item-spec {
        font-size: 24rpx;
        color: #999;
        margin-top: 8rpx;

        &.invalid {
          color: #ff4d4f;
        }
      }

      .price-change-tip {
        display: flex;
        align-items: center;
        font-size: 22rpx;
        color: #ff9800;
        margin-top: 8rpx;

        text {
          margin-left: 6rpx;
        }
      }

      .stock-tip {
        font-size: 22rpx;
        margin-top: 8rpx;

        &.insufficient {
          color: #ff9800;
        }

        &.sold-out {
          color: #ff4d4f;
        }
      }

      .item-bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: auto;

        .price-wrap {
          display: flex;
          align-items: baseline;

          .current-price {
            font-size: 32rpx;
            font-weight: 600;
            color: #ff4d4f;
          }

          .old-price {
            font-size: 24rpx;
            color: #999;
            text-decoration: line-through;
            margin-left: 12rpx;
          }
        }
      }
    }

    .invalid-tag {
      width: 60rpx;
      height: 36rpx;
      line-height: 36rpx;
      text-align: center;
      font-size: 20rpx;
      color: #999;
      background-color: #f0f0f0;
      border-radius: 4rpx;
    }
  }

  .swipe-delete {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 150rpx;
    height: 100%;
    background-color: #ff4d4f;
    color: #fff;
    font-size: 28rpx;
  }
}

// 无效商品区域
.invalid-section {
  margin-top: 30rpx;

  .invalid-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20rpx 30rpx;
    font-size: 26rpx;
    color: #666;

    .clear-btn {
      color: #1890ff;
    }
  }
}

// 底部结算栏
.checkout-bar {
  position: fixed;
  left: 0;
  right: 0;
  // 使用全局变量定位在 tabbar 上方
  bottom: var(--tabbar-total-height);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  background-color: #fff;
  border-top: 1rpx solid #eee;

  .check-all {
    display: flex;
    align-items: center;
    font-size: 26rpx;
    color: #333;

    text {
      margin-left: 8rpx;
    }
  }

  .checkout-info {
    display: flex;
    align-items: center;

    .total-wrap {
      margin-right: 24rpx;

      .total-label {
        font-size: 26rpx;
        color: #666;
      }

      .total-price {
        font-size: 36rpx;
        font-weight: 600;
        color: #ff4d4f;
      }
    }
  }
}
</style>
