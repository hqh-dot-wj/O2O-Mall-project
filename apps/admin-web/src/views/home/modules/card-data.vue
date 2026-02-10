<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { createReusableTemplate } from '@vueuse/core';
import { fetchGetDashboardStats } from '@/service/api/main';
import { useThemeStore } from '@/store/modules/theme';
import { $t } from '@/locales';

defineOptions({
  name: 'CardData'
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

// 响应式数据
const statsData = ref<Api.Main.DashboardStats | null>(null);
const loading = ref(false);

// 加载统计数据
async function loadStats() {
  loading.value = true;
  try {
    const { data } = await fetchGetDashboardStats();
    statsData.value = data;
  } catch (error: any) {
    console.error('加载统计数据失败:', error);

    // 如果是401未授权错误，不显示错误提示（路由守卫会处理）
    if (error?.response?.status === 401) {
      console.warn('用户未登录，跳过错误提示');
      return;
    }

    // 其他错误显示提示
    const errorMsg = error?.response?.data?.msg || error?.message || '加载统计数据失败';
    window.$message?.error(errorMsg);
  } finally {
    loading.value = false;
  }
}

// 卡片数据映射
const cardData = computed<CardData[]>(() => {
  if (!statsData.value) {
    return [
      {
        key: 'walletBalance',
        title: $t('page.home.walletBalance'),
        value: 0,
        unit: '¥',
        color: { start: '#ec4786', end: '#b955a4' },
        icon: 'ant-design:wallet-outlined'
      },
      {
        key: 'todayGMV',
        title: $t('page.home.todayGMV'),
        value: 0,
        unit: '¥',
        color: { start: '#865ec0', end: '#5144b4' },
        icon: 'ant-design:money-collect-outlined'
      },
      {
        key: 'todayOrderCount',
        title: $t('page.home.todayOrderCount'),
        value: 0,
        unit: '单',
        color: { start: '#56cdf3', end: '#719de3' },
        icon: 'ant-design:shopping-cart-outlined'
      },
      {
        key: 'monthGMV',
        title: $t('page.home.monthGMV'),
        value: 0,
        unit: '¥',
        color: { start: '#fcbc25', end: '#f68057' },
        icon: 'ant-design:rise-outlined'
      },
      {
        key: 'productCount',
        title: $t('page.home.productCount'),
        value: 0,
        unit: '个',
        color: { start: '#4ecb73', end: '#36a3f7' },
        icon: 'ant-design:appstore-outlined'
      },
      {
        key: 'memberCount',
        title: $t('page.home.memberCount'),
        value: 0,
        unit: '人',
        color: { start: '#ff6b6b', end: '#ee5a6f' },
        icon: 'ant-design:team-outlined'
      },
      {
        key: 'settledCommission',
        title: $t('page.home.settledCommission'),
        value: 0,
        unit: '¥',
        color: { start: '#20bf6b', end: '#01a3a4' },
        icon: 'ant-design:check-circle-outlined'
      },
      {
        key: 'pendingCommission',
        title: $t('page.home.pendingCommission'),
        value: 0,
        unit: '¥',
        color: { start: '#f7b731', end: '#fa8231' },
        icon: 'ant-design:clock-circle-outlined'
      }
    ];
  }

  return [
    {
      key: 'walletBalance',
      title: $t('page.home.walletBalance'),
      value: statsData.value.walletBalance,
      unit: '¥',
      color: { start: '#ec4786', end: '#b955a4' },
      icon: 'ant-design:wallet-outlined'
    },
    {
      key: 'todayGMV',
      title: $t('page.home.todayGMV'),
      value: statsData.value.todayGMV,
      unit: '¥',
      color: { start: '#865ec0', end: '#5144b4' },
      icon: 'ant-design:money-collect-outlined'
    },
    {
      key: 'todayOrderCount',
      title: $t('page.home.todayOrderCount'),
      value: statsData.value.todayOrderCount,
      unit: '单',
      color: { start: '#56cdf3', end: '#719de3' },
      icon: 'ant-design:shopping-cart-outlined'
    },
    {
      key: 'monthGMV',
      title: $t('page.home.monthGMV'),
      value: statsData.value.monthGMV,
      unit: '¥',
      color: { start: '#fcbc25', end: '#f68057' },
      icon: 'ant-design:rise-outlined'
    },
    {
      key: 'productCount',
      title: $t('page.home.productCount'),
      value: statsData.value.productCount,
      unit: '个',
      color: { start: '#4ecb73', end: '#36a3f7' },
      icon: 'ant-design:appstore-outlined'
    },
    {
      key: 'memberCount',
      title: $t('page.home.memberCount'),
      value: statsData.value.memberCount,
      unit: '人',
      color: { start: '#ff6b6b', end: '#ee5a6f' },
      icon: 'ant-design:team-outlined'
    },
    {
      key: 'settledCommission',
      title: $t('page.home.settledCommission'),
      value: statsData.value.settledCommission,
      unit: '¥',
      color: { start: '#20bf6b', end: '#01a3a4' },
      icon: 'ant-design:check-circle-outlined'
    },
    {
      key: 'pendingCommission',
      title: $t('page.home.pendingCommission'),
      value: statsData.value.pendingCommission,
      unit: '¥',
      color: { start: '#f7b731', end: '#fa8231' },
      icon: 'ant-design:clock-circle-outlined'
    }
  ];
});

// 组件挂载时加载数据
onMounted(() => {
  // 延迟一小段时间，确保用户状态已初始化
  setTimeout(() => {
    loadStats();
  }, 100);
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
        <span class="font-semibold">数据概览</span>
        <NButton text :loading="loading" @click="loadStats">
          <template #icon>
            <icon-mdi-refresh class="text-icon" />
          </template>
          刷新
        </NButton>
      </div>
    </template>

    <!-- define component start: GradientBg -->
    <DefineGradientBg v-slot="{ $slots, gradientColor }">
      <div
        class="px-16px pb-4px pt-8px text-white"
        :style="{ backgroundImage: gradientColor, borderRadius: themeStore.themeRadius + 'px' }"
      >
        <component :is="$slots.default" />
      </div>
    </DefineGradientBg>
    <!-- define component end: GradientBg -->

    <NSpin :show="loading">
      <NGrid cols="s:1 m:2 l:4" responsive="screen" :x-gap="16" :y-gap="16">
        <NGi v-for="item in cardData" :key="item.key">
          <GradientBg :gradient-color="getGradientColor(item.color)" class="flex-1">
            <h3 class="text-16px">{{ item.title }}</h3>
            <div class="flex justify-between pt-12px">
              <SvgIcon :icon="item.icon" class="text-32px" />
              <CountTo
                :prefix="item.unit"
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
