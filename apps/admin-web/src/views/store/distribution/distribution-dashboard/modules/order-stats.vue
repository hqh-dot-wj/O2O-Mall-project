<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  data?: Api.Store.OrderStats;
  loading?: boolean;
}

const props = defineProps<Props>();

const stats = computed(() => [
  {
    label: '分销订单总数',
    value: props.data?.totalCount ?? 0,
    unit: '单',
    color: 'text-blue-500'
  },
  {
    label: '分销订单金额',
    value: props.data?.totalAmount ?? 0,
    unit: '元',
    color: 'text-purple-500',
    prefix: '¥'
  },
  {
    label: '分销订单占比',
    value: (props.data?.percentage ?? 0).toFixed(2),
    unit: '%',
    color: 'text-cyan-500'
  }
]);
</script>

<template>
  <NCard title="订单统计" :bordered="false" size="small" class="h-full card-wrapper">
    <div class="flex flex-col gap-24px py-8px">
      <div v-for="item in stats" :key="item.label" class="flex flex-col gap-8px">
        <span class="text-14px text-gray-500">{{ item.label }}</span>
        <div class="flex items-baseline gap-4px">
          <span v-if="item.prefix" class="text-14px text-gray-600 font-semibold">{{ item.prefix }}</span>
          <span class="text-20px font-bold" :class="[item.color]">{{ item.value }}</span>
          <span class="text-12px text-gray-400">{{ item.unit }}</span>
        </div>
      </div>
    </div>
  </NCard>
</template>

<style scoped>
.card-wrapper {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
</style>
