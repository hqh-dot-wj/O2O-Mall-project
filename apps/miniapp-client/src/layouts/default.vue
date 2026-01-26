<template>
  <!--
    注意：tabbar 的占位空间由 KuRoot.vue 中的 FgTabbar 组件处理
    页面内容不需要额外处理 tabbar 高度，避免重复计算导致滚动条

    如果页面需要固定底部元素（如结算栏），使用：
    - .fixed-bottom 类 - 定位在 tabbar 上方
    - padding-bottom: calc(var(--tabbar-total-height) + 元素高度) - 预留空间
  -->
  <view class="app-layout">
    <slot />
    <user-agreement-popup />
    <global-auth-modal />
  </view>
</template>

<script setup lang="ts">
import GlobalAuthModal from '@/components/global-auth-modal/global-auth-modal.vue'
import UserAgreementPopup from '@/components/user-agreement-popup/user-agreement-popup.vue'
</script>

<style scoped>

</style>
