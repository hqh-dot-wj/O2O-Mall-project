<script setup lang="tsx">
import { onMounted, ref } from 'vue';
import {
  NCard,
  NDataTable,
  NGrid,
  NGi,
  NStatistic,
  NSpin,
  NButton,
  NEmpty,
  NDatePicker,
  NForm,
  NFormItem,
  NSpace,
} from 'naive-ui';
import {
  fetchGetPointsBalanceStatistics,
  fetchGetPointsEarnStatistics,
  fetchGetPointsExpireStatistics,
  fetchGetPointsRanking,
  fetchGetPointsUseStatistics,
} from '@/service/api/marketing-points';

defineOptions({
  name: 'PointsStatistics',
});

const loading = ref(false);
const balanceStats = ref<Api.Marketing.PointsBalanceStatistics | null>(null);
const earnStats = ref<Api.Marketing.PointsEarnStatistics | null>(null);
const useStats = ref<Api.Marketing.PointsUseStatistics | null>(null);
const ranking = ref<Api.Marketing.PointsRankingItem[]>([]);
const dateRange = ref<[number, number] | null>(null);

async function loadData() {
  loading.value = true;
  try {
    const [startTime, endTime] = dateRange.value || [];
    const params =
      startTime && endTime
        ? { startTime: new Date(startTime).toISOString(), endTime: new Date(endTime).toISOString() }
        : {};
    const [balanceRes, earnRes, useRes, rankRes] = await Promise.all([
      fetchGetPointsBalanceStatistics(),
      fetchGetPointsEarnStatistics(params),
      fetchGetPointsUseStatistics(params),
      fetchGetPointsRanking({ limit: 10 }),
    ]);
    balanceStats.value = balanceRes.data ?? null;
    earnStats.value = earnRes.data ?? null;
    useStats.value = useRes.data ?? null;
    ranking.value = rankRes.data?.ranking ?? [];
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});

const rankingColumns = [
  { key: 'rank', title: '排名', width: 80, render: (_: any, index: number) => index + 1 },
  { key: 'nickname', title: '昵称', ellipsis: { tooltip: true } },
  { key: 'availablePoints', title: '可用积分', width: 120 },
];
</script>

<template>
  <div class="h-full flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NSpin :show="loading">
      <NForm inline class="mb-16px" label-placement="left" :label-width="80">
        <NFormItem label="时间范围">
          <NDatePicker v-model:value="dateRange" type="datetimerange" clearable />
        </NFormItem>
        <NButton type="primary" @click="loadData">查询</NButton>
      </NForm>

      <NGrid :cols="4" :x-gap="16" :y-gap="16">
        <NGi>
          <NCard title="总积分余额" size="small" :bordered="false" class="card-wrapper">
            <NStatistic :value="balanceStats?.totalBalance ?? 0" />
          </NCard>
        </NGi>
        <NGi>
          <NCard title="账户数" size="small" :bordered="false" class="card-wrapper">
            <NStatistic :value="balanceStats?.accountCount ?? 0" />
          </NCard>
        </NGi>
        <NGi>
          <NCard title="发放统计" size="small" :bordered="false" class="card-wrapper">
            <NStatistic :value="earnStats?.total ?? 0" />
          </NCard>
        </NGi>
        <NGi>
          <NCard title="使用统计" size="small" :bordered="false" class="card-wrapper">
            <NStatistic :value="useStats?.total ?? 0" />
          </NCard>
        </NGi>
      </NGrid>

      <NCard title="积分排行榜" :bordered="false" size="small" class="card-wrapper mt-16px">
        <NDataTable :columns="rankingColumns" :data="ranking" :row-key="(row: any) => row.memberId" max-height="320" />
        <NEmpty v-if="ranking.length === 0 && !loading" description="暂无排行数据" class="py-8" />
      </NCard>
    </NSpin>
  </div>
</template>

<style scoped>
.card-wrapper {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
</style>
