<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { fetchGetDistributionDashboard } from '@/service/api/distribution';
import DistributorStats from './modules/distributor-stats.vue';
import OrderStats from './modules/order-stats.vue';
import CommissionTrend from './modules/commission-trend.vue';

defineOptions({
  name: 'DistributionDashboard'
});

const loading = ref(false);
const dashboardData = ref<Api.Store.Dashboard>();

const queryParams = reactive<Api.Store.GetDashboardDto>({
  startDate: undefined,
  endDate: undefined
});

async function getDashboardData() {
  loading.value = true;
  try {
    const { data } = await fetchGetDistributionDashboard(queryParams);
    if (data) {
      dashboardData.value = data;
    }
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  getDashboardData();
});
</script>

<template>
  <div class="flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <!-- 头部统计 -->
    <DistributorStats :data="dashboardData?.distributorStats" :loading="loading" />

    <NGrid :x-gap="16" :y-gap="16" :cols="24" item-responsive>
      <!-- 左侧订单统计 -->
      <NGi span="24 s:24 m:8">
        <OrderStats :data="dashboardData?.orderStats" :loading="loading" />
      </NGi>

      <!-- 右侧佣金趋势 -->
      <NGi span="24 s:24 m:16">
        <CommissionTrend :trend-data="dashboardData?.commissionStats?.trend" :loading="loading" />
      </NGi>
    </NGrid>

    <NGrid :x-gap="16" :y-gap="16" :cols="24" item-responsive>
      <NGi span="24">
        <NCard title="结算分析" :bordered="false" size="small" class="card-wrapper">
          <NGrid :x-gap="16" :y-gap="16" :cols="24">
            <NGi span="12">
              <div class="flex flex-col items-center justify-center gap-8px border-r border-gray-100 p-16px">
                <span class="text-gray-500">待结算佣金</span>
                <span class="text-24px text-warning font-bold">
                  ¥ {{ (dashboardData?.commissionStats?.pendingAmount ?? 0).toFixed(2) }}
                </span>
              </div>
            </NGi>
            <NGi span="12">
              <div class="flex flex-col items-center justify-center gap-8px p-16px">
                <span class="text-gray-500">已结算佣金</span>
                <span class="text-24px text-success font-bold">
                  ¥ {{ (dashboardData?.commissionStats?.settledAmount ?? 0).toFixed(2) }}
                </span>
              </div>
            </NGi>
          </NGrid>
        </NCard>
      </NGi>
    </NGrid>
  </div>
</template>

<style scoped>
.card-wrapper {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
</style>
