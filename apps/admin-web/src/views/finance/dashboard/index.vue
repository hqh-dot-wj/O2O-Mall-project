<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { NCard, NGrid, NGridItem, NProgress, NSkeleton, NStatistic } from 'naive-ui';
import { fetchGetDashboard } from '@/service/api/finance';

defineOptions({
  name: 'FinanceDashboard'
});

// 数据状态
const loading = ref(true);
const dashboardData = ref({
  todayGMV: 0,
  todayOrderCount: 0,
  monthGMV: 0,
  pendingCommission: 0,
  settledCommission: 0,
  pendingWithdrawals: 0
});

// 加载看板数据
async function loadDashboard() {
  loading.value = true;
  try {
    const { data } = await fetchGetDashboard();
    if (data) {
      dashboardData.value = data;
    }
  } catch (error) {
    window.$message?.error('加载看板数据失败');
  } finally {
    loading.value = false;
  }
}

// 计算总佣金
const totalCommission = computed(() => {
  return Number(dashboardData.value.pendingCommission) + Number(dashboardData.value.settledCommission);
});

// 计算结算进度
const settleProgress = computed(() => {
  if (totalCommission.value === 0) return 0;
  return Math.round((Number(dashboardData.value.settledCommission) / totalCommission.value) * 100);
});

onMounted(() => {
  loadDashboard();
});
</script>

<template>
  <div class="flex-col-stretch gap-16px">
    <!-- 核心指标 -->
    <NGrid :cols="4" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
      <NGridItem span="24 s:12 m:6">
        <NCard :bordered="false" class="h-full">
          <NSkeleton v-if="loading" text :repeat="2" />
          <template v-else>
            <NStatistic label="今日 GMV">
              <template #prefix>¥</template>
              {{ dashboardData.todayGMV }}
            </NStatistic>
            <div class="mt-8px text-xs text-gray-500">订单数: {{ dashboardData.todayOrderCount }} 单</div>
          </template>
        </NCard>
      </NGridItem>

      <NGridItem span="24 s:12 m:6">
        <NCard :bordered="false" class="h-full">
          <NSkeleton v-if="loading" text :repeat="2" />
          <template v-else>
            <NStatistic label="本月 GMV">
              <template #prefix>¥</template>
              {{ dashboardData.monthGMV }}
            </NStatistic>
          </template>
        </NCard>
      </NGridItem>

      <NGridItem span="24 s:12 m:6">
        <NCard :bordered="false" class="h-full">
          <NSkeleton v-if="loading" text :repeat="2" />
          <template v-else>
            <NStatistic label="待结算佣金">
              <template #prefix>¥</template>
              {{ dashboardData.pendingCommission }}
            </NStatistic>
            <div class="mt-8px text-xs text-warning">冻结中，等待解冻</div>
          </template>
        </NCard>
      </NGridItem>

      <NGridItem span="24 s:12 m:6">
        <NCard :bordered="false" class="h-full">
          <NSkeleton v-if="loading" text :repeat="2" />
          <template v-else>
            <NStatistic label="待审核提现">
              {{ dashboardData.pendingWithdrawals }}
              <template #suffix>笔</template>
            </NStatistic>
            <div v-if="dashboardData.pendingWithdrawals > 0" class="mt-8px text-xs text-error">需要及时处理</div>
          </template>
        </NCard>
      </NGridItem>
    </NGrid>

    <!-- 资金池状态 -->
    <NCard title="资金池状态" :bordered="false">
      <div class="flex flex-col gap-16px">
        <div>
          <div class="mb-8px flex justify-between">
            <span>佣金结算进度</span>
            <span>{{ settleProgress }}%</span>
          </div>
          <NProgress type="line" :percentage="settleProgress" :height="12" color="#18a058" rail-color="#f0f0f0" />
        </div>

        <NGrid :cols="2" :x-gap="16">
          <NGridItem>
            <div class="rounded-lg bg-gray-50 p-16px">
              <div class="mb-4px text-sm text-gray-500">已结算</div>
              <div class="text-xl text-success font-bold">¥{{ dashboardData.settledCommission }}</div>
            </div>
          </NGridItem>
          <NGridItem>
            <div class="rounded-lg bg-gray-50 p-16px">
              <div class="mb-4px text-sm text-gray-500">冻结中</div>
              <div class="text-xl text-warning font-bold">¥{{ dashboardData.pendingCommission }}</div>
            </div>
          </NGridItem>
        </NGrid>
      </div>
    </NCard>

    <!-- 快捷入口 -->
    <NCard title="快捷入口" :bordered="false">
      <NGrid :cols="4" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
        <NGridItem span="24 s:12 m:6">
          <RouterLink to="/finance/commission">
            <div
              class="cursor-pointer rounded-lg bg-primary-50 p-16px text-center transition-colors hover:bg-primary-100"
            >
              <div class="mb-4px text-xl text-primary">📊</div>
              <div>佣金明细</div>
            </div>
          </RouterLink>
        </NGridItem>
        <NGridItem span="24 s:12 m:6">
          <RouterLink to="/finance/withdrawal">
            <div
              class="cursor-pointer rounded-lg bg-warning-50 p-16px text-center transition-colors hover:bg-warning-100"
            >
              <div class="mb-4px text-xl text-warning">💳</div>
              <div>提现审核</div>
            </div>
          </RouterLink>
        </NGridItem>
        <NGridItem span="24 s:12 m:6">
          <RouterLink to="/finance/ledger">
            <div
              class="cursor-pointer rounded-lg bg-success-50 p-16px text-center transition-colors hover:bg-success-100"
            >
              <div class="mb-4px text-xl text-success">📒</div>
              <div>门店流水</div>
            </div>
          </RouterLink>
        </NGridItem>
        <NGridItem span="24 s:12 m:6">
          <RouterLink to="/order/list">
            <div class="cursor-pointer rounded-lg bg-info-50 p-16px text-center transition-colors hover:bg-info-100">
              <div class="mb-4px text-xl text-info">📦</div>
              <div>订单管理</div>
            </div>
          </RouterLink>
        </NGridItem>
      </NGrid>
    </NCard>
  </div>
</template>

<style scoped>
.text-success {
  color: #18a058;
}
.text-warning {
  color: #f0a020;
}
.text-error {
  color: #d03050;
}
.text-primary {
  color: #2080f0;
}
.text-info {
  color: #2080f0;
}
.bg-primary-50 {
  background-color: #e8f4ff;
}
.bg-primary-100 {
  background-color: #d1e9ff;
}
.bg-warning-50 {
  background-color: #fff7e6;
}
.bg-warning-100 {
  background-color: #ffefcc;
}
.bg-success-50 {
  background-color: #e8f8ef;
}
.bg-success-100 {
  background-color: #d1f1df;
}
.bg-info-50 {
  background-color: #e8f4ff;
}
.bg-info-100 {
  background-color: #d1e9ff;
}
</style>
