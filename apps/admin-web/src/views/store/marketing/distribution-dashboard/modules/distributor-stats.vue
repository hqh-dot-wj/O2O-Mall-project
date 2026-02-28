<script setup lang="ts">
import { computed, watch } from 'vue';
import { useAppStore } from '@/store/modules/app';
import { $t } from '@/locales';

interface Props {
  data?: {
    total: number;
    newCount: number;
    activeCount: number;
  };
  loading?: boolean;
}

const props = defineProps<Props>();

const cardData = computed(() => [
  {
    key: 'total',
    title: '总分销员数',
    value: props.data?.total ?? 0,
    unit: '人',
    color: 'text-primary',
    icon: 'mdi:account-group'
  },
  {
    key: 'newCount',
    title: '新增分销员',
    value: props.data?.newCount ?? 0,
    unit: '人',
    color: 'text-success',
    icon: 'mdi:account-plus'
  },
  {
    key: 'activeCount',
    title: '活跃分销员',
    value: props.data?.activeCount ?? 0,
    unit: '人',
    color: 'text-warning',
    icon: 'mdi:account-check'
  }
]);
</script>

<template>
  <NGrid :x-gap="16" :y-gap="16" :cols="24" item-responsive>
    <NGi v-for="item in cardData" :key="item.key" span="24 s:12 m:8">
      <NCard :bordered="false" size="small" class="card-wrapper">
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-8px">
            <span class="text-gray-500">{{ item.title }}</span>
            <div class="flex items-baseline gap-4px">
              <span class="text-24px font-bold" :class="[item.color]">{{ item.value }}</span>
              <span class="text-12px text-gray-400">{{ item.unit }}</span>
            </div>
          </div>
          <div class="flex-center rounded-8px bg-opacity-10 p-12px" :class="[item.color.replace('text-', 'bg-')]">
            <SvgIcon :icon="item.icon" class="text-24px" />
          </div>
        </div>
      </NCard>
    </NGi>
  </NGrid>
</template>

<style scoped>
.card-wrapper {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
</style>
