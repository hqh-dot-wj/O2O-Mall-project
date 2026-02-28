<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { createReusableTemplate } from '@vueuse/core';
import { fetchGetFinanceDashboard } from '@/service/api/store/finance';
import { useThemeStore } from '@/store/modules/theme';

defineOptions({
  name: 'FinanceCardData'
});

const themeStore = useThemeStore();

interface CardData {
  key: string;
  title: string;
  value: number;
  unit: string;
  color: {
    start: string;
    end: string;
  };
  icon: string;
}

const dashboardData = ref<Api.Finance.Dashboard | null>(null);
const loading = ref(false);

async function loadData() {
  loading.value = true;
  try {
    const { data } = await fetchGetFinanceDashboard();
    dashboardData.value = data;
  } catch (error: any) {
    console.error('加载统计数据失败:', error);
    const errorMsg = error?.response?.data?.msg || error?.message || '加载统计数据失败';
    window.$message?.error(errorMsg);
  } finally {
    loading.value = false;
  }
}

const cardData = computed<CardData[]>(() => {
  if (!dashboardData.value) {
    return [
      {
        key: 'todayGMV',
        title: '今日成交额',
        value: 0,
        unit: '¥',
        color: { start: '#865ec0', end: '#5144b4' },
        icon: 'ant-design:money-collect-outlined'
      },
      {
        key: 'todayOrderCount',
        title: '今日订单数',
        value: 0,
        unit: '单',
        color: { start: '#56cdf3', end: '#719de3' },
        icon: 'ant-design:shopping-cart-outlined'
      },
      {
        key: 'pendingCommission',
        title: '待结算佣金',
        value: 0,
        unit: '¥',
        color: { start: '#f7b731', end: '#fa8231' },
        icon: 'ant-design:clock-circle-outlined'
      },
      {
        key: 'pendingWithdrawals',
        title: '待审核提现',
        value: 0,
        unit: '笔',
        color: { start: '#ec4786', end: '#b955a4' },
        icon: 'ant-design:audit-outlined'
      }
    ];
  }

  return [
    {
      key: 'todayGMV',
      title: '今日成交额',
      value: dashboardData.value.todayGMV,
      unit: '¥',
      color: { start: '#865ec0', end: '#5144b4' },
      icon: 'ant-design:money-collect-outlined'
    },
    {
      key: 'todayOrderCount',
      title: '今日订单数',
      value: dashboardData.value.todayOrderCount,
      unit: '单',
      color: { start: '#56cdf3', end: '#719de3' },
      icon: 'ant-design:shopping-cart-outlined'
    },
    {
      key: 'pendingCommission',
      title: '待结算佣金',
      value: dashboardData.value.pendingCommission,
      unit: '¥',
      color: { start: '#f7b731', end: '#fa8231' },
      icon: 'ant-design:clock-circle-outlined'
    },
    {
      key: 'pendingWithdrawals',
      title: '待审核提现',
      value: dashboardData.value.pendingWithdrawals,
      unit: '笔',
      color: { start: '#ec4786', end: '#b955a4' },
      icon: 'ant-design:audit-outlined'
    }
  ];
});

onMounted(() => {
  loadData();
});

interface GradientBgProps {
  gradientColor: string;
}

const [DefineGradientBg, GradientBg] = createReusableTemplate<GradientBgProps>();

function getGradientColor(color: CardData['color']) {
  return `linear-gradient(to bottom right, ${color.start}, ${color.end})`;
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <template #header>
      <div class="flex items-center justify-between">
        <span class="font-semibold">核心指标</span>
        <NButton text :loading="loading" @click="loadData">
          <template #icon>
            <icon-mdi-refresh class="text-icon" />
          </template>
          刷新
        </NButton>
      </div>
    </template>

    <DefineGradientBg v-slot="{ $slots, gradientColor }">
      <div
        class="px-16px pb-4px pt-8px text-white"
        :style="{ backgroundImage: gradientColor, borderRadius: themeStore.themeRadius + 'px' }"
      >
        <component :is="$slots.default" />
      </div>
    </DefineGradientBg>

    <NSpin :show="loading">
      <NGrid cols="s:1 m:2 l:4" responsive="screen" :x-gap="16" :y-gap="16">
        <NGi v-for="item in cardData" :key="item.key">
          <GradientBg :gradient-color="getGradientColor(item.color)" class="flex-1">
            <h3 class="text-16px">{{ item.title }}</h3>
            <div class="flex justify-between pt-12px">
              <SvgIcon :icon="item.icon" class="text-32px" />
              <CountTo
                :prefix="item.unit === '¥' ? '¥' : ''"
                :suffix="item.unit !== '¥' ? item.unit : ''"
                :start-value="0"
                :end-value="item.value"
                :duration="1000"
                class="text-30px text-white dark:text-dark"
              />
            </div>
          </GradientBg>
        </NGi>
      </NGrid>
    </NSpin>
  </NCard>
</template>

<style scoped></style>
