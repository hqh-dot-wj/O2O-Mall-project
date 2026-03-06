<script setup lang="ts">
/**
 * 分销配置重定向：门店→财务下的分销配置已废弃，
 * 统一跳转到 门店→分销→分销员 页面（store/distribution/distribution）
 */
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

defineOptions({
  name: 'FinanceDistributionConfigRedirect'
});

const router = useRouter();

onMounted(() => {
  router.replace('/store/distribution/distribution');
});
</script>

<template>
  <div class="min-h-200px flex-center">
    <span class="text-gray-500">跳转中...</span>
  </div>
</template>
