import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { httpDelete, httpGet, httpPost, httpPut } from '@/http/http'
import { useLocationStore } from './location'

/**
 * 购物车商品项类型
 */
interface CartItem {
  id: string
  skuId: string
  productId: string
  productName: string
  productImg: string
  specData: Record<string, string> | null
  addPrice: number
  currentPrice: number
  priceChanged: boolean
  quantity: number
  stockStatus: 'normal' | 'insufficient' | 'soldOut'
  checked: boolean
  shareUserId?: string
}

/**
 * 购物车列表响应类型
 */
interface CartListResponse {
  items: Omit<CartItem, 'checked'>[]
  invalidItems: Omit<CartItem, 'checked'>[]
}

/**
 * 购物车状态管理
 * 提供购物车的增删改查功能，与后端 API 同步
 */
export const useCartStore = defineStore('cart', () => {
  const locationStore = useLocationStore()

  // 状态
  const items = ref<CartItem[]>([])
  const invalidItems = ref<CartItem[]>([])
  const loading = ref(false)

  // 计算属性：已选中的有效商品
  const selectedItems = computed(() => {
    return items.value.filter(
      i => i.checked && i.stockStatus === 'normal',
    )
  })

  // 计算属性：已选商品总价
  const selectedTotal = computed(() => {
    return selectedItems.value.reduce(
      (sum, i) => sum + i.currentPrice * i.quantity,
      0,
    )
  })

  // 计算属性：已选商品数量
  const selectedCount = computed(() => {
    return selectedItems.value.reduce((sum, i) => sum + i.quantity, 0)
  })

  // 计算属性：购物车总数量 (用于 Tabbar 角标)
  const totalCount = computed(() => {
    return items.value.reduce((sum, i) => sum + i.quantity, 0)
  })

  // 计算属性：是否全选
  const isAllChecked = computed(() => {
    const validItems = items.value.filter(i => i.stockStatus === 'normal')
    return validItems.length > 0 && validItems.every(i => i.checked)
  })

  /**
   * 获取购物车列表
   */
  async function fetchCartList(): Promise<void> {
    if (!locationStore.currentTenantId) {
      items.value = []
      invalidItems.value = []
      return
    }

    loading.value = true
    try {
      const result = await httpGet<CartListResponse>('/client/cart/list', {
        tenantId: locationStore.currentTenantId,
      })

      if (result) {
        // 默认全部选中有效商品
        items.value = (result.items || []).map(i => ({
          ...i,
          checked: true,
        }))
        invalidItems.value = (result.invalidItems || []).map(i => ({
          ...i,
          checked: false,
        }))
      }
    }
    catch (err) {
      console.error('获取购物车列表失败:', err)
    }
    finally {
      loading.value = false
    }
  }

  /**
   * 添加商品到购物车
   * @param skuId SKU ID
   * @param quantity 数量
   * @param shareUserId 分享人ID (可选，用于归因)
   */
  async function addToCart(
    skuId: string,
    quantity: number = 1,
    shareUserId?: string,
  ): Promise<boolean> {
    if (!locationStore.currentTenantId) {
      uni.showToast({ title: '请先选择门店', icon: 'none' })
      return false
    }

    try {
      await httpPost('/client/cart/add', {
        tenantId: locationStore.currentTenantId,
        skuId,
        quantity,
        shareUserId,
      })
      uni.showToast({ title: '已加入购物车', icon: 'success' })
      await fetchCartList()
      return true
    }
    catch (err) {
      console.error('添加购物车失败:', err)
      return false
    }
  }

  /**
   * 更新购物车商品数量
   */
  async function updateQuantity(skuId: string, quantity: number): Promise<void> {
    if (!locationStore.currentTenantId)
      return

    try {
      await httpPut('/client/cart/quantity', {
        skuId,
        quantity,
      }, {
        tenantId: locationStore.currentTenantId,
      })
      // 本地更新
      const item = items.value.find(i => i.skuId === skuId)
      if (item)
        item.quantity = quantity
    }
    catch (err) {
      console.error('更新购物车数量失败:', err)
      // 失败时刷新列表
      await fetchCartList()
    }
  }

  /**
   * 删除购物车商品
   */
  async function removeItem(skuId: string): Promise<void> {
    if (!locationStore.currentTenantId)
      return

    try {
      await httpDelete(`/client/cart/${skuId}`, {
        tenantId: locationStore.currentTenantId,
      })
      // 本地移除
      items.value = items.value.filter(i => i.skuId !== skuId)
      invalidItems.value = invalidItems.value.filter(i => i.skuId !== skuId)
    }
    catch (err) {
      console.error('删除购物车商品失败:', err)
    }
  }

  /**
   * 清空购物车
   */
  async function clearCart(): Promise<void> {
    if (!locationStore.currentTenantId)
      return

    try {
      await httpDelete('/client/cart/clear', {
        tenantId: locationStore.currentTenantId,
      })
      items.value = []
      invalidItems.value = []
    }
    catch (err) {
      console.error('清空购物车失败:', err)
    }
  }

  /**
   * 切换单个商品选中状态
   */
  function toggleCheck(skuId: string): void {
    const item = items.value.find(i => i.skuId === skuId)
    if (item && item.stockStatus === 'normal') {
      item.checked = !item.checked
    }
  }

  /**
   * 全选/取消全选
   */
  function toggleAll(checked: boolean): void {
    items.value.forEach((i) => {
      if (i.stockStatus === 'normal') {
        i.checked = checked
      }
    })
  }

  /**
   * 清除无效商品
   */
  async function clearInvalidItems(): Promise<void> {
    for (const item of invalidItems.value) {
      await removeItem(item.skuId)
    }
    invalidItems.value = []
  }

  /**
   * 获取结算数据 (用于跳转结算页)
   */
  function getCheckoutData() {
    return {
      items: selectedItems.value.map(i => ({
        skuId: i.skuId,
        quantity: i.quantity,
        shareUserId: i.shareUserId,
      })),
      tenantId: locationStore.currentTenantId,
    }
  }

  return {
    // 状态
    items,
    invalidItems,
    loading,
    // 计算属性
    selectedItems,
    selectedTotal,
    selectedCount,
    totalCount,
    isAllChecked,
    // 方法
    fetchCartList,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    toggleCheck,
    toggleAll,
    clearInvalidItems,
    getCheckoutData,
  }
})
