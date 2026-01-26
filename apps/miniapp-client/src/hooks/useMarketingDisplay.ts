import { computed } from 'vue'

export function useMarketingDisplay(product: any, selectedSku: any) {
  // 当前命中的活动 (优先取第一个生效的)
  const activeActivity = computed(() => {
    if (!product.value?.marketingActivities?.length)
      return null

    // 1. 获取第一个潜在活动
    const candidate = product.value.marketingActivities[0]
    const rules = candidate.rules || {}

    // 2. 如果已选 SKU，检查该 SKU 是否参与活动
    // 逻辑：如果 rules.skus 存在且不为空，则必须在其中才能参与
    if (selectedSku.value && Array.isArray(rules.skus) && rules.skus.length > 0) {
      const isPart = rules.skus.some((s: any) => s.skuId === selectedSku.value.skuId)
      if (!isPart) {
        return null // 该规格不参与活动
      }
    }

    // 3. 否则认为参与
    return candidate
  })

  // 活动类型标签
  const activityLabel = computed(() => {
    if (!activeActivity.value)
      return '售价'
    switch (activeActivity.value.templateCode) {
      case 'GROUP_BUY': return '拼团价'
      case 'SECKILL': return '秒杀价'
      case 'COURSE_GROUP_BUY': return '拼团价'
      default: return '活动价'
    }
  })

  // 展示价格 (大字)
  const displayPrice = computed(() => {
    // 1. 如果有活动
    if (activeActivity.value) {
      const rules = activeActivity.value.rules || {}

      // 优先从 sku 规则里找
      if (selectedSku.value && Array.isArray(rules.skus)) {
        const skuRule = rules.skus.find((s: any) => s.skuId === selectedSku.value.skuId)
        if (skuRule && skuRule.price) {
          return skuRule.price
        }
      }

      // 否则用基础活动价
      if (rules.price) {
        return rules.price
      }
    }

    // 2. 否则显示原价/SKU价
    if (selectedSku.value) {
      return selectedSku.value.price
    }
    return product.value?.price || 0
  })

  // 划线价格 (原价)
  // 只有在有活动且活动价 != 原价时才显示
  const originalPrice = computed(() => {
    if (!activeActivity.value)
      return null

    let normalPrice = 0
    if (selectedSku.value) {
      normalPrice = selectedSku.value.price
    }
    else {
      normalPrice = product.value?.price || 0
    }

    // 如果活动价和原价一样，就不显示划线价了
    if (Number(displayPrice.value) === Number(normalPrice)) {
      return null
    }

    return normalPrice
  })

  return {
    activeActivity,
    activityLabel,
    displayPrice,
    originalPrice,
  }
}
