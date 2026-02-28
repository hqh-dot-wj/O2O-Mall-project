<script setup lang="ts">
import { computed, watch } from 'vue';
import { useEcharts } from '@/hooks/common/echarts';

interface Props {
  trendData?: Array<{ date: string; amount: number }>;
  loading?: boolean;
}

const props = defineProps<Props>();

const { domRef, updateOptions } = useEcharts(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: [],
    axisTick: { alignWithLabel: true }
  },
  yAxis: {
    type: 'value'
  },
  series: [
    {
      name: '佣金支出',
      type: 'line',
      smooth: true,
      data: [],
      areaStyle: {
        opacity: 0.1
      },
      itemStyle: {
        color: '#7367F0'
      }
    }
  ]
}));

watch(
  () => props.trendData,
  val => {
    if (val) {
      updateOptions(opts => {
        opts.xAxis.data = val.map(item => item.date);
        opts.series[0].data = val.map(item => item.amount);
      });
    }
  },
  { immediate: true }
);
</script>

<template>
  <NCard title="佣金支出趋势" :bordered="false" size="small" class="h-full card-wrapper">
    <div ref="domRef" class="h-320px w-full"></div>
  </NCard>
</template>

<style scoped>
.card-wrapper {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
</style>
