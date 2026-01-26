<script lang="ts" setup>
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, onMounted, ref } from 'vue'
import { getCategoryTree, getProductList } from '@/api/product'
import TenantSelector from '@/components/tenant-selector/tenant-selector.vue'
import { useLocationStore } from '@/store/location'

definePage({
  style: {
    navigationBarTitleText: '商品分类',
  },
})

// 位置状态
const locationStore = useLocationStore()

// 搜索状态
const keyword = ref('')

// 分类数据
const categories = ref<any[]>([])
const activeCategory = ref<number | null>(null)
const activeSubId = ref<number | null>(null) // 新增：当前选中的二级分类ID
const products = ref<any[]>([])
const loading = ref(false)

// 计算当前的一级分类下的子分类
const subCategories = computed(() => {
  const current = categories.value.find(c => c.catId === activeCategory.value)
  return current?.children || []
})

// 页面加载
onLoad(async () => {
  // 检查位置权限
  if (!locationStore.locationGranted) {
    await locationStore.requestLocation()
  }
  await loadCategories()
})

// 页面显示时刷新数据
onShow(() => {
  if (activeCategory.value) {
    loadProducts(activeSubId.value || activeCategory.value)
  }
})

// 监听租户变化事件
onMounted(() => {
  uni.$on('tenant-changed', handleTenantChanged)
})

// 页面卸载时移除监听
onUnload(() => {
  uni.$off('tenant-changed', handleTenantChanged)
})

// 租户变化回调
function handleTenantChanged() {
  loadCategories()
}

// 加载分类数据
async function loadCategories() {
  try {
    const result = await getCategoryTree()
    if (result && result.length > 0) {
      categories.value = result
      // 如果没有活跃分类或当前分类不在结果中，默认选中第一个
      if (!activeCategory.value || !result.find(c => c.catId === activeCategory.value)) {
        activeCategory.value = result[0].catId
        activeSubId.value = null
      }
      await loadProducts(activeSubId.value || activeCategory.value)
    }
  }
  catch (err) {
    console.error('加载分类失败:', err)
  }
}

// 加载商品列表
async function loadProducts(catId: number | null = null) {
  loading.value = true
  try {
    const params: any = {
      pageNum: 1,
      pageSize: 20,
    }
    if (catId)
      params.categoryId = catId
    if (keyword.value)
      params.name = keyword.value

    const result = await getProductList(params)
    products.value = result?.rows || []
  }
  catch (err) {
    console.error('加载商品失败:', err)
  }
  finally {
    loading.value = false
  }
}

// 搜索处理
function onSearch() {
  loadProducts(activeSubId.value || activeCategory.value)
}

// 搜索清除
function onClear() {
  keyword.value = ''
  loadProducts(activeSubId.value || activeCategory.value)
}

// 切换一级分类
function onCategoryChange(catId: number) {
  if (activeCategory.value === catId)
    return
  activeCategory.value = catId
  activeSubId.value = null // 切换大类时重置子类
  loadProducts(catId)
}

// 切换二级分类
function onSubCategoryChange(catId: number | null) {
  activeSubId.value = catId
  loadProducts(catId || activeCategory.value)
}

// 打开租户切换弹窗
async function openTenantPopup() {
  await locationStore.openTenantSelector()
}

// 跳转商品详情
function goToDetail(productId: string) {
  uni.navigateTo({
    url: `/pages/product/detail?id=${productId}`,
  })
}

// 格式化距离
function formatDistance(distance?: number): string {
  if (!distance)
    return ''
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`
  }
  return `${distance.toFixed(1)}km`
}
</script>

<template>
  <!-- page-meta 必须是页面的第一个节点，用于彻底解决滚动穿透问题 -->
  <page-meta :page-style="`overflow: ${locationStore.showTenantSelector ? 'hidden' : 'visible'};`" />

  <view class="category-page">
    <!-- 顶部租户显示栏 -->
    <view class="tenant-bar" @click="openTenantPopup">
      <wd-icon name="location" size="32rpx" color="#1890ff" />
      <text class="tenant-name">{{ locationStore.currentCompanyName || '定位中...' }}</text>
      <wd-icon name="arrow-down" size="24rpx" color="#999" />
    </view>

    <!-- 搜索栏 -->
    <view class="search-wrap">
      <wd-search
        v-model="keyword"
        placeholder="搜索当前区域商品"
        hide-cancel
        @search="onSearch"
        @clear="onClear"
      />
    </view>

    <!-- 主体内容 -->
    <view class="main-content">
      <!-- 左侧分类导航 -->
      <scroll-view class="category-nav" scroll-y>
        <view
          v-for="cat in categories"
          :key="cat.catId"
          class="category-item"
          :class="{ active: cat.catId === activeCategory }"
          @click="onCategoryChange(cat.catId)"
        >
          <text>{{ cat.name }}</text>
        </view>
      </scroll-view>

      <!-- 右侧商品区域 -->
      <view class="product-view">
        <!-- 二级分类标签栏 (仅在有子类时显示) -->
        <scroll-view v-if="subCategories.length > 0" class="sub-nav" scroll-x>
          <view class="sub-list">
            <view
              class="sub-tab"
              :class="{ active: activeSubId === null }"
              @click="onSubCategoryChange(null)"
            >
              全部
            </view>
            <view
              v-for="sub in subCategories"
              :key="sub.catId"
              class="sub-tab"
              :class="{ active: activeSubId === sub.catId }"
              @click="onSubCategoryChange(sub.catId)"
            >
              {{ sub.name }}
            </view>
          </view>
        </scroll-view>

        <!-- 商品列表 -->
        <scroll-view class="product-list" scroll-y>
          <view v-if="loading" class="loading-tip">
            <wd-loading />
          </view>
          <view v-else-if="products.length === 0" class="empty-tip">
            暂无商品
          </view>
          <view v-else class="product-grid">
            <view
              v-for="product in products"
              :key="product.productId"
              class="product-card"
              :class="{ 'sold-out': product.stock <= 0 }"
              @click="goToDetail(product.productId)"
            >
              <view class="image-wrap">
                <image
                  class="product-image"
                  :src="product.coverImage || '/static/images/placeholder.png'"
                  mode="aspectFill"
                />
                <view v-if="product.stock <= 0" class="sold-out-overlay">
                  <text>SOLD OUT</text>
                </view>
              </view>
              <view class="product-info">
                <text class="product-name">{{ product.name }}</text>
                <view class="product-meta">
                  <view class="price-box">
                    <text class="product-price">¥{{ product.price }}</text>
                    <text v-if="product.stock <= 0" class="sold-out-text">已售罄</text>
                  </view>
                  <text v-if="product.type === 'SERVICE'" class="product-tag">服务</text>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 全局租户选择器组件 -->
    <TenantSelector />
  </view>
</template>

<style lang="scss" scoped>
.category-page {
  display: flex;
  flex-direction: column;
  height: 100vh; // 固定页面高度为视口高度
  overflow: hidden; // 防止页面整体滚动
  background-color: #f5f5f5;
}

// 顶部租户栏
.tenant-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #eee;

  .tenant-name {
    flex: 1;
    margin-left: 10rpx;
    font-size: 28rpx;
    color: #333;
  }
}

// 搜索栏
.search-wrap {
  background-color: #fff;
  padding-bottom: 20rpx;
}

// 主体内容
.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

// 左侧分类导航
.category-nav {
  width: 180rpx;
  height: 100%;
  background-color: #f8f8f8;

  .category-item {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100rpx;
    font-size: 26rpx;
    color: #666;
    border-left: 6rpx solid transparent;

    &.active {
      background-color: #fff;
      color: #1890ff;
      font-weight: 500;
      border-left-color: #1890ff;
    }
  }
}

// 右侧内容区域
.product-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

// 二级分类导航
.sub-nav {
  width: 100%;
  background-color: #fff;
  white-space: nowrap;
  padding: 15rpx 0;
  border-bottom: 1rpx solid #f0f0f0;

  .sub-list {
    display: inline-flex;
    padding: 0 20rpx;

    .sub-tab {
      padding: 10rpx 24rpx;
      margin-right: 15rpx;
      font-size: 24rpx;
      color: #666;
      background-color: #f5f5f5;
      border-radius: 30rpx;
      transition: all 0.2s;

      &.active {
        color: #fff;
        background-color: #1890ff;
        font-weight: 500;
      }
    }
  }
}

// 右侧商品列表
.product-list {
  flex: 1;
  height: 0; // 必须配合 flex:1 使用，确保在 flex 容器内滚动
  padding: 20rpx;
  box-sizing: border-box;
}

.loading-tip,
.empty-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300rpx;
  color: #999;
  font-size: 28rpx;
}

.product-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.product-card {
  width: calc(50% - 10rpx);
  background-color: #fff;
  border-radius: 16rpx;
  overflow: hidden;

  &.sold-out {
    opacity: 0.7;
  }

  .image-wrap {
    position: relative;
    width: 100%;
    height: 200rpx;

    .product-image {
      width: 100%;
      height: 100%;
    }

    .sold-out-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 24rpx;
      font-weight: bold;
      letter-spacing: 2rpx;
    }
  }

  .product-info {
    padding: 16rpx;

    .product-name {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      font-size: 26rpx;
      color: #333;
      line-height: 1.4;
    }

    .product-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 12rpx;

      .price-box {
        display: flex;
        flex-direction: column;
      }

      .product-price {
        font-size: 30rpx;
        font-weight: 600;
        color: #ff4d4f;
      }

      .sold-out-text {
        font-size: 20rpx;
        color: #999;
        text-decoration: line-through;
      }

      .product-tag {
        font-size: 20rpx;
        color: #1890ff;
        background-color: rgba(24, 144, 255, 0.1);
        padding: 4rpx 12rpx;
        border-radius: 4rpx;
      }
    }
  }
}
</style>
