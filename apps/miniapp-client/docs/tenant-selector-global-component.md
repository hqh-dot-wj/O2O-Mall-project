# 全局租户选择器实现说明

## 概述
已将租户选择器从页面级别组件重构为可复用组件，解决了以下问题：
1. ✅ **全局复用**：租户选择器通过 Pinia store 控制，可以在任何页面使用
2. ✅ **z-index 层级问题**：弹窗 z-index 设置为 10001，确保完全覆盖 tabbar（z-index: 1000）
3. ✅ **自动刷新**：租户变化后通过事件机制自动刷新页面数据

## 实现细节

### 1. 组件位置
- **文件路径**：`src/components/tenant-selector/tenant-selector.vue`
- **使用方式**：在需要的页面中引入组件（uni-app 的 App.vue 不支持 template）

### 2. 在页面中使用

因为 **uni-app 的 App.vue 不能包含 `<template>`**，所以需要在每个需要租户选择器的页面中单独引入：

```vue
<script setup lang="ts">
import TenantSelector from '@/components/tenant-selector/tenant-selector.vue'
import { useLocationStore } from '@/store/location'

const locationStore = useLocationStore()
</script>

<template>
  <view class="page">
    <!-- 你的页面内容 -->
    
    <!-- 在页面末尾添加租户选择器组件 -->
    <TenantSelector />
  </view>
</template>
```
### 3. z-index 层级设置
```vue
<wd-popup
  v-model="showPopup"
  position="bottom"
  :safe-area-inset-bottom="true"
  :z-index="10001"  <!-- 高于 tabbar 的 1000 -->
  round
>
```

**说明**：
- Tabbar 的 z-index 是 1000
- 租户选择器弹窗的 z-index 是 10001
- 弹窗从底部弹出时**应该完全覆盖 tabbar**，这是符合设计规范的（类似微信小程序的底部弹窗）
- `:safe-area-inset-bottom="true"` 确保安全区域适配

### 4. 状态管理（Pinia Store）

在 `src/store/location.ts` 中新增：

```typescript
// 控制弹窗显示的状态
const showTenantSelector = ref(false)

// 打开租户选择器的方法
async function openTenantSelector(): Promise<void> {
  await fetchNearbyTenants()
  showTenantSelector.value = true
}
```

### 5. 使用方法

#### 在任何页面中调用：
```typescript
import { useLocationStore } from '@/store/location'

const locationStore = useLocationStore()

// 打开租户选择器
async function openTenantPopup() {
  await locationStore.openTenantSelector()
}
```

#### 监听租户变化事件（可选）：
```typescript
import { onMounted, onUnload } from '@dcloudio/uni-app'

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
  // 刷新页面数据
  loadData()
}
```

### 6. 事件机制

全局组件会在以下情况发送 `tenant-changed` 事件：
1. 用户选择了不同的租户
2. 用户点击"重新定位"并定位成功

页面可以监听这个事件来刷新数据，无需手动管理。

## 为什么弹窗要盖住 tabbar？

这是**正确的交互设计**：

1. **模态对话框**：底部弹出的 popup 是模态对话框，应该有遮罩层和最高层级
2. **用户焦点**：当弹窗出现时，用户的注意力应该集中在弹窗上，tabbar 被遮挡是合理的
3. **行业标准**：微信小程序、支付宝小程序等平台的底部弹窗都会覆盖 tabbar
4. **安全区域**：`:safe-area-inset-bottom="true"` 确保在有底部安全区域的设备上显示正常

## 其他页面如何复用

### 示例：在首页使用
```vue
<template>
  <view class="home-page">
    <!-- 顶部租户显示栏 -->
    <view class="tenant-bar" @click="locationStore.openTenantSelector()">
      <wd-icon name="location" size="32rpx" color="#1890ff" />
      <text>{{ locationStore.currentCompanyName || '定位中...' }}</text>
      <wd-icon name="arrow-down" size="24rpx" color="#999" />
    </view>
    
    <!-- 其他内容 -->
  </view>
</template>

<script setup lang="ts">
import { useLocationStore } from '@/store/location'

const locationStore = useLocationStore()
</script>
```

## 文件清单

### 新增文件
- ✅ `src/components/tenant-selector/tenant-selector.vue` - 可复用的租户选择器组件

### 修改文件
- ✅ `src/store/location.ts` - 添加弹窗控制状态和方法
- ✅ `src/pages/category/category.vue` - 简化代码，引入并使用组件

### 代码简化
- ❌ 移除了页面级别的弹窗模板代码（约37行）
- ❌ 移除了页面级别的弹窗样式代码（约65行）
- ❌ 移除了页面级别的弹窗逻辑（handleRelocate、handleSelectTenant 等）
- ✅ 新增了简洁的事件监听机制（约10行）

## 总结

现在租户选择器是一个**可复用组件**，通过 Pinia store 控制状态，可以在任何页面通过以下方式使用：

1. **引入组件**：在页面中 `import TenantSelector from '@/components/tenant-selector/tenant-selector.vue'`
2. **添加到模板**：在页面的 `<template>` 末尾添加 `<TenantSelector />`
3. **调用弹窗**：通过 `locationStore.openTenantSelector()` 打开

z-index 设置为 10001 确保弹窗覆盖 tabbar（这是正确的交互设计）。

**注意**：uni-app 的 `App.vue` 不支持 `<template>` 部分，所以不能在 App.vue 中全局注册组件，需要在每个使用的页面中单独引入。
