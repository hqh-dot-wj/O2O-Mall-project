<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { fetchGetDistributionDashboard } from '@/service/api/distribution';
import { $t } from '@/locales';
import DistributorStats from './modules/distributor-stats.vue';
import OrderStats from './modules/order-stats.vue';
import CommissionTrend from './modules/commission-trend.vue';

defineOptions({
  name: 'DistributionDashboard'
});

const loading = ref(false);
const dashboardData = ref<Api.Store.Dashboard | undefined>(undefined);

const dateRange = reactive<{ start: number | null; end: number | null }>({
  start: null,
  end: null
});

function buildQueryParams(): Api.Store.GetDashboardDto {
  const params: Api.Store.GetDashboardDto = {};
  if (dateRange.start) {
    params.startDate = new Date(dateRange.start).toISOString().slice(0, 10);
  }
  if (dateRange.end) {
    params.endDate = new Date(dateRange.end).toISOString().slice(0, 10);
  }
  return params;
}

async function getDashboardData(): Promise<void> {
  loading.value = true;
  try {
    const res = await fetchGetDistributionDashboard(buildQueryParams());
    if (res.data) {
      dashboardData.value = res.data;
    }
  } catch {
    window.$message?.error($t('common.error'));
  } finally {
    loading.value = false;
  }
}

function handleDateChange(): void {
  getDashboardData();
}

onMounted(() => {
  getDashboardData();
});
</script>

<template>
  <div class="flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <!-- 时间筛选 -->
    <NCard :bordered="false" size="small" class="card-wrapper">
      <div class="flex items-center gap-16px">
        <span class="text-gray-500">时间范围</span>
        <NDatePicker
          v-model:value="dateRange.start"
          type="date"
          placeholder="开始日期"
          clearable
          @update:value="handleDateChange"
        />
        <span class="text-gray-400">至</span>
        <NDatePicker
          v-model:value="dateRange.end"
          type="date"
          placeholder="结束日期"
          clearable
          @update:value="handleDateChange"
        />
        <NButton type="primary" :loading="loading" @click="getDashboardData">
          {{ $t('common.search') }}
        </NButton>
      </div>
    </NCard>
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
