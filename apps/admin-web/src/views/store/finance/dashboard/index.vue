<script setup lang="ts">
import CardData from './modules/card-data.vue';

defineOptions({
  name: 'FinanceDashboard'
});
</script>

<template>
  <div class="flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <CardData />
    <!-- 可以在这里增加趋势图或其他财务概览组件 -->
  </div>
</template>

<style scoped></style>
