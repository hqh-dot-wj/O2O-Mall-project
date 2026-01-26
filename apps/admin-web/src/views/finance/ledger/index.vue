<script setup lang="tsx">
import { ref } from 'vue';
import { NTag } from 'naive-ui';
import { fetchGetLedger } from '@/service/api/finance';
import { useAppStore } from '@/store/modules/app';
import { useTable, useTableProps } from '@/hooks/common/table';
import { $t } from '@/locales';
import LedgerSearch from './modules/ledger-search.vue';

defineOptions({
  name: 'FinanceLedger'
});

const appStore = useAppStore();
const tableProps = useTableProps();

// 交易类型映射
const transTypeRecord: Record<string, { label: string; type: NaiveUI.ThemeColor }> = {
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
  getData,
  getDataByPage,
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
      key: 'type',
      title: '交易类型',
      align: 'center',
      minWidth: 120,
      render: row => {
        const type = transTypeRecord[row.type];
        return type ? <NTag type={type.type}>{type.label}</NTag> : row.type;
      }
    },
    {
      key: 'wallet',
      title: '用户',
      align: 'center',
      minWidth: 120,
      render: row => (
        <div class="flex-col-center">
          <span>{row.wallet?.member?.nickname || row.walletId || row.user?.nickname}</span>
          <span class="text-12px text-gray">{row.wallet?.member?.mobile || row.user?.mobile}</span>
        </div>
      )
    },
    {
      key: 'referrer',
      title: '直接分享人',
      align: 'center',
      minWidth: 140,
      render: row => {
        // @ts-ignore
        const ref = row.distribution?.referrer;
        if (!ref) return '-';
        return (
          <div class="flex-col-center">
            <span>{ref.nickname}</span>
            <span class="text-12px text-gray">{ref.mobile}</span>
            <span class="text-error">+{ref.amount}</span>
          </div>
        );
      }
    },
    {
      key: 'indirectReferrer',
      title: '间接分享人',
      align: 'center',
      minWidth: 140,
      render: row => {
        // @ts-ignore
        const ref = row.distribution?.indirectReferrer;
        if (!ref) return '-';
        return (
          <div class="flex-col-center">
            <span>{ref.nickname}</span>
            <span class="text-12px text-gray">{ref.mobile}</span>
            <span class="text-error">+{ref.amount}</span>
          </div>
        );
      }
    },
    {
      key: 'amount',
      title: '交易金额',
      align: 'center',
      minWidth: 100,
      render: row => {
        const amount = Number(row.amount);
        const isPositive = amount > 0;
        return (
          <span class={isPositive ? 'text-success' : 'text-error'}>
            {isPositive ? '+' : ''}
            {row.amount}
          </span>
        );
      }
    },
    {
      key: 'balanceAfter',
      title: '交易后余额',
      align: 'center',
      minWidth: 100,
      render: row => `¥${row.balanceAfter}`
    },
    {
      key: 'remark',
      title: '备注',
      align: 'center',
      minWidth: 200,
      ellipsis: { tooltip: true }
    },
    {
      key: 'createTime',
      title: '交易时间',
      align: 'center',
      minWidth: 160
    }
  ]
});
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <LedgerSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getDataByPage" />

    <NCard title="门店流水" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
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
</style>
