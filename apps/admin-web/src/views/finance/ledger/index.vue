<script setup lang="tsx">
import { ref, watch } from 'vue';
import { NGrid, NGridItem, NSpin, NStatistic, NTag } from 'naive-ui';
import { fetchGetLedger, fetchGetLedgerStats } from '@/service/api/finance';
import { useAppStore } from '@/store/modules/app';
import { useTable, useTableProps } from '@/hooks/common/table';
import { useDownload } from '@/hooks/business/download';
import { $t } from '@/locales';
import LedgerSearch from './modules/ledger-search.vue';

defineOptions({
  name: 'FinanceLedger'
});

const appStore = useAppStore();
const tableProps = useTableProps();
const { download } = useDownload();

// 交易类型映射
const transTypeRecord: Record<string, { label: string; type: NaiveUI.ThemeColor }> = {
  ORDER_INCOME: { label: '订单收入', type: 'primary' },
  COMMISSION_IN: { label: '佣金入账', type: 'success' },
  WITHDRAW_OUT: { label: '提现支出', type: 'error' },
  REFUND_DEDUCT: { label: '退款倒扣', type: 'warning' },
  CONSUME_PAY: { label: '余额支付', type: 'info' },
  RECHARGE_IN: { label: '充值入账', type: 'success' }
};

const {
  columns,
  columnChecks,
  data,
  getData: originalGetData,
  getDataByPage: originalGetDataByPage,
  loading,
  mobilePagination,
  searchParams,
  resetSearchParams
} = useTable({
  apiFn: fetchGetLedger,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    type: null
  },
  columns: () => [
    {
      key: 'index',
      title: $t('common.index'),
      align: 'center',
      width: 64
    },
    {
      key: 'createTime',
      title: '交易时间',
      align: 'center',
      width: 165
    },
    {
      key: 'type',
      title: '交易类型',
      align: 'center',
      width: 120,
      render: row => {
        const type = transTypeRecord[row.type];
        return type ? <NTag type={type.type}>{type.label}</NTag> : row.type;
      }
    },
    {
      key: 'amount',
      title: '交易金额',
      align: 'center',
      width: 130,
      render: row => {
        const amount = Number(row.amount);
        const isPositive = amount > 0;
        const absAmount = Math.abs(amount).toFixed(2);

        return (
          <span class={isPositive ? 'text-success font-medium' : 'text-error font-medium'}>
            {isPositive ? '+' : '-'}¥{absAmount}
          </span>
        );
      }
    },
    {
      key: 'wallet',
      title: '用户',
      align: 'center',
      width: 140,
      render: row => (
        <div class="flex-col-center">
          <span>{row.wallet?.member?.nickname || row.walletId || row.user?.nickname}</span>
          <span class="text-12px text-gray">{row.wallet?.member?.mobile || row.user?.mobile}</span>
        </div>
      )
    },
    {
      key: 'relatedId',
      title: '订单号',
      align: 'center',
      width: 180,
      ellipsis: { tooltip: true },
      render: row => row.relatedId || '-'
    },
    {
      key: 'balanceAfter',
      title: '交易后余额',
      align: 'center',
      width: 120,
      render: row => {
        // 订单收入不影响用户钱包余额
        if (row.type === 'ORDER_INCOME') {
          return <span class="text-gray">-</span>;
        }

        // 佣金待结算
        if (row.type === 'COMMISSION_IN' && (row as any).status === 'FROZEN') {
          return (
            <NTag type="warning" size="small">
              待结算
            </NTag>
          );
        }

        // 显示余额（null或0显示为"-"）
        if (row.balanceAfter === null || row.balanceAfter === undefined || row.balanceAfter === 0) {
          return <span class="text-gray">-</span>;
        }

        return <span class="text-primary font-medium">¥{Number(row.balanceAfter).toFixed(2)}</span>;
      }
    },
    {
      key: 'referrer',
      title: '直接分享人(C1)',
      align: 'center',
      width: 150,
      render: row => {
        // 只有订单收入才显示C1/C2分销信息
        if (row.type !== 'ORDER_INCOME') return <span class="text-gray">-</span>;
        const referrer = (row as any).distribution?.referrer;
        if (!referrer) return <span class="text-gray">-</span>;
        const isFrozen = referrer.status === 'FROZEN';
        return (
          <div class="flex-col-center">
            <span>{referrer.nickname}</span>
            <span class="text-12px text-gray">{referrer.mobile}</span>
            <div class="flex items-center gap-4px">
              <span class={isFrozen ? 'text-warning font-medium' : 'text-success font-medium'}>
                +¥{Number(referrer.amount).toFixed(2)}
              </span>
              {isFrozen && (
                <NTag type="warning" size="small">
                  待结算
                </NTag>
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: 'indirectReferrer',
      title: '间接分享人(C2)',
      align: 'center',
      width: 150,
      render: row => {
        // 只有订单收入才显示C1/C2分销信息
        if (row.type !== 'ORDER_INCOME') return <span class="text-gray">-</span>;
        const indirectReferrer = (row as any).distribution?.indirectReferrer;
        if (!indirectReferrer) return <span class="text-gray">-</span>;
        const isFrozen = indirectReferrer.status === 'FROZEN';
        return (
          <div class="flex-col-center">
            <span>{indirectReferrer.nickname}</span>
            <span class="text-12px text-gray">{indirectReferrer.mobile}</span>
            <div class="flex items-center gap-4px">
              <span class={isFrozen ? 'text-warning font-medium' : 'text-purple font-medium'}>
                +¥{Number(indirectReferrer.amount).toFixed(2)}
              </span>
              {isFrozen && (
                <NTag type="warning" size="small">
                  待结算
                </NTag>
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: 'remark',
      title: '备注',
      align: 'center',
      minWidth: 200,
      ellipsis: { tooltip: true }
    }
  ]
});

// 统计数据
const stats = ref<Api.Finance.LedgerStats>({
  totalIncome: 0,
  totalExpense: 0,
  netProfit: 0,
  pendingCommission: 0
});
const statsLoading = ref(false);

// 获取统计数据
async function getStats() {
  statsLoading.value = true;
  try {
    const { data: statsData } = await fetchGetLedgerStats(searchParams);
    if (statsData) {
      stats.value = statsData;
    }
  } finally {
    statsLoading.value = false;
  }
}

// 包装getData，同时获取统计数据
async function getData() {
  await Promise.all([originalGetData(), getStats()]);
}

// 包装getDataByPage，同时获取统计数据
async function getDataByPage() {
  await Promise.all([originalGetDataByPage(), getStats()]);
}

// 监听搜索参数变化
watch(searchParams, () => {
  getStats();
});

// 导出数据
function handleExport() {
  download('/finance/ledger/export', searchParams, `门店流水_${new Date().getTime()}.xlsx`);
}

// 快捷筛选标签
const quickFilters = [
  { label: '全部', value: null },
  { label: '订单收入', value: 'ORDER_INCOME' },
  { label: '佣金入账', value: 'COMMISSION_IN' },
  { label: '提现支出', value: 'WITHDRAW_OUT' },
  { label: '退款倒扣', value: 'REFUND_DEDUCT' }
];

function handleQuickFilter(typeValue: string | null) {
  searchParams.type = typeValue as any;
  getDataByPage();
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <LedgerSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getDataByPage" />

    <!-- 统计汇总面板 -->
    <NCard :bordered="false" size="small" class="card-wrapper">
      <NSpin :show="statsLoading">
        <NGrid :x-gap="16" :y-gap="16" :cols="4" responsive="screen" item-responsive>
          <NGridItem span="4 s:2 m:1">
            <NStatistic label="总收入" :value="stats.totalIncome" :precision="2" prefix="¥">
              <template #prefix>
                <span class="text-success">¥</span>
              </template>
            </NStatistic>
          </NGridItem>
          <NGridItem span="4 s:2 m:1">
            <NStatistic label="总支出" :value="stats.totalExpense" :precision="2">
              <template #prefix>
                <span class="text-error">¥</span>
              </template>
            </NStatistic>
          </NGridItem>
          <NGridItem span="4 s:2 m:1">
            <NStatistic label="净利润" :value="stats.netProfit" :precision="2">
              <template #prefix>
                <span :class="stats.netProfit >= 0 ? 'text-success' : 'text-error'">¥</span>
              </template>
            </NStatistic>
          </NGridItem>
          <NGridItem span="4 s:2 m:1">
            <NStatistic label="待结算佣金" :value="stats.pendingCommission" :precision="2">
              <template #prefix>
                <span class="text-warning">¥</span>
              </template>
            </NStatistic>
          </NGridItem>
        </NGrid>
      </NSpin>
    </NCard>

    <NCard title="门店流水" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <div class="flex items-center gap-12px">
          <div class="flex items-center gap-8px">
            <NTag
              v-for="filter in quickFilters"
              :key="filter.value || 'all'"
              :type="searchParams.type === filter.value ? 'primary' : 'default'"
              :bordered="searchParams.type !== filter.value"
              class="cursor-pointer"
              @click="handleQuickFilter(filter.value)"
            >
              {{ filter.label }}
            </NTag>
          </div>
          <TableHeaderOperation
            v-model:columns="columnChecks"
            :loading="loading"
            :show-add="false"
            :show-delete="false"
            :show-export="true"
            @refresh="getData"
            @export="handleExport"
          />
        </div>
      </template>
      <NDataTable
        :columns="columns"
        :data="data"
        v-bind="tableProps"
        :flex-height="!appStore.isMobile"
        :scroll-x="1000"
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
.text-error {
  color: #d03050;
}
.text-warning {
  color: #f0a020;
}
.text-primary {
  color: #2080f0;
}
.text-purple {
  color: #7c3aed;
}
.text-gray {
  color: #999;
}
.font-medium {
  font-weight: 500;
}
.cursor-pointer {
  cursor: pointer;
}
</style>
