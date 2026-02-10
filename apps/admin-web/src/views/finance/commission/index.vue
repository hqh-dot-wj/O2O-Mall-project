<script setup lang="tsx">
import { onMounted, ref } from 'vue';
import { NGrid, NGridItem, NStatistic, NTag } from 'naive-ui';
import { fetchGetCommissionList, fetchGetCommissionStats } from '@/service/api/finance';
import { useAppStore } from '@/store/modules/app';
import { useTable, useTableProps } from '@/hooks/common/table';
import { $t } from '@/locales';
import CommissionSearch from './modules/commission-search.vue';

defineOptions({
  name: 'FinanceCommission'
});

const appStore = useAppStore();
const tableProps = useTableProps();

// 佣金状态映射
const statusRecord: Record<string, { label: string; type: NaiveUI.ThemeColor }> = {
  FROZEN: { label: '冻结中', type: 'warning' },
  SETTLED: { label: '已结算', type: 'success' },
  CANCELLED: { label: '已取消', type: 'error' }
};

// 统计数据
const stats = ref({
  todayCommission: 0,
  monthCommission: 0,
  pendingCommission: 0
});

// 加载统计数据
async function loadStats() {
  try {
    const { data: resData } = await fetchGetCommissionStats();
    if (resData) {
      stats.value = resData;
    }
  } catch {
    // ignore
  }
}

const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
  loading,
  mobilePagination,
  searchParams,
  resetSearchParams
} = useTable({
  apiFn: fetchGetCommissionList,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    orderSn: null,
    phone: null,
    status: null
  },
  columns: () => [
    {
      key: 'index',
      title: $t('common.index'),
      align: 'center',
      width: 64
    },
    {
      key: 'order',
      title: '订单号',
      align: 'center',
      minWidth: 180,
      render: row => row.order?.orderSn || '-'
    },
    {
      key: 'beneficiary',
      title: '受益人',
      align: 'center',
      minWidth: 120,
      render: row => (
        <div class="flex items-center justify-center gap-4px">
          {row.beneficiary?.avatar && <img src={row.beneficiary.avatar} class="h-24px w-24px rounded-full" />}
          <span>{row.beneficiary?.nickname || row.beneficiaryId}</span>
        </div>
      )
    },
    {
      key: 'level',
      title: '佣金类型',
      align: 'center',
      minWidth: 100,
      render: row => (row.level === 1 ? '一级分销' : '二级分销')
    },
    {
      key: 'amount',
      title: '佣金金额',
      align: 'center',
      minWidth: 100,
      render: row => <span class="text-success">¥{row.amount}</span>
    },
    {
      key: 'rateSnapshot',
      title: '分佣比例',
      align: 'center',
      minWidth: 80,
      render: row => `${row.rateSnapshot}%`
    },
    {
      key: 'commissionBaseType',
      title: '分佣基数',
      align: 'center',
      minWidth: 100,
      render: row => {
        const map: Record<string, string> = {
          ORIGINAL_PRICE: '原价',
          ACTUAL_PAID: '实付',
          ZERO: '不分佣'
        };
        const key = row.commissionBaseType;
        return key !== null && key !== undefined ? (map[key] ?? key) : '-';
      }
    },
    {
      key: 'couponDiscount',
      title: '优惠券抵扣',
      align: 'center',
      minWidth: 100,
      render: row => (row.couponDiscount !== null && row.couponDiscount !== undefined ? `¥${row.couponDiscount}` : '-')
    },
    {
      key: 'pointsDiscount',
      title: '积分抵扣',
      align: 'center',
      minWidth: 100,
      render: row => (row.pointsDiscount !== null && row.pointsDiscount !== undefined ? `¥${row.pointsDiscount}` : '-')
    },
    {
      key: 'isCapped',
      title: '熔断',
      align: 'center',
      minWidth: 80,
      render: row => (row.isCapped ? '是' : '否')
    },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      minWidth: 100,
      render: row => {
        const status = statusRecord[row.status];
        return status ? <NTag type={status.type}>{status.label}</NTag> : row.status;
      }
    },
    {
      key: 'createTime',
      title: '创建时间',
      align: 'center',
      minWidth: 160
    },
    {
      key: 'planSettleTime',
      title: '预计结算时间',
      align: 'center',
      minWidth: 160
    }
  ]
});

onMounted(() => {
  loadStats();
});
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <!-- 统计卡片 -->
    <NCard :bordered="false" size="small">
      <NGrid :cols="3" :x-gap="16">
        <NGridItem>
          <NStatistic label="今日佣金" :value="stats.todayCommission">
            <template #prefix>¥</template>
          </NStatistic>
        </NGridItem>
        <NGridItem>
          <NStatistic label="本月累计" :value="stats.monthCommission">
            <template #prefix>¥</template>
          </NStatistic>
        </NGridItem>
        <NGridItem>
          <NStatistic label="待结算" :value="stats.pendingCommission">
            <template #prefix>¥</template>
          </NStatistic>
        </NGridItem>
      </NGrid>
    </NCard>

    <CommissionSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getDataByPage" />

    <NCard title="佣金明细" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :loading="loading"
          :show-add="false"
          :show-delete="false"
          @refresh="getData"
        />
      </template>
      <NDataTable
        :columns="columns"
        :data="data"
        v-bind="tableProps"
        :flex-height="!appStore.isMobile"
        :scroll-x="1200"
        :loading="loading"
        remote
        :row-key="row => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
    </NCard>
  </div>
</template>

<style scoped>
.text-success {
  color: #18a058;
}
</style>
