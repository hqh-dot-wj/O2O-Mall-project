<script setup lang="tsx">
import { ref } from 'vue';
import { NAvatar, NButton, NCard, NDataTable, NInput, NInputNumber, NPopover, NSpace } from 'naive-ui';
import { fetchGetStockList, fetchUpdateStock } from '@/service/api/store/stock';
import { useTable, useTableOperate } from '@/hooks/common/table';
import { useDownload } from '@/hooks/business/download';
import { useBoolean } from '@sa/hooks';
import BatchStockModal from './modules/batch-stock-modal.vue';

defineOptions({
  name: 'StoreStock'
});

const { getDownload } = useDownload();
const { bool: batchModalVisible, setTrue: openBatchModal } = useBoolean();

const { columns, data, getData, loading, mobilePagination, searchParams, resetSearchParams } = useTable({
  apiFn: fetchGetStockList,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    productName: null
  },
  columns: () => [
    {
      type: 'selection',
      align: 'center',
      width: 48
    },
    {
      key: 'product',
      title: '商品',
      width: 200,
      render: row => {
        const img = row.tenantProd?.product?.mainImages?.[0];
        return (
          <NSpace align="center">
            {img && <NAvatar src={img} size={40} />}
            <span>{row.tenantProd?.product?.name ?? '-'}</span>
          </NSpace>
        );
      }
    },
    {
      key: 'specs',
      title: '规格',
      width: 150,
      render: row => {
        if (!row.globalSku?.specValues) return '-';
        return Object.values(row.globalSku.specValues).join(' / ');
      }
    },
    {
      key: 'currentStock',
      title: '当前库存',
      width: 100,
      align: 'center',
      render: row => <span class="text-16px font-bold">{row.stock}</span>
    },
    {
      key: 'operate',
      title: '快捷调整',
      align: 'center',
      width: 240,
      render: row => (
        <NSpace justify="center">
          <StockUpdatePopover row={row} type="add" onSuccess={getData} />
          <StockUpdatePopover row={row} type="reduce" onSuccess={getData} />
        </NSpace>
      )
    }
  ]
});

const { checkedRowKeys } = useTableOperate(data, getData);

const selectedRows = () => {
  if (!checkedRowKeys.value.length) return [];
  return data.value.filter(row => checkedRowKeys.value.includes(row.id));
};

function handleBatchAdjust() {
  const rows = selectedRows();
  if (rows.length === 0) {
    window.$message?.warning('请先选择要调整的 SKU');
    return;
  }
  openBatchModal();
}

function handleBatchSubmitted() {
  checkedRowKeys.value = [];
  getData();
}

function handleExport() {
  const params: Record<string, string | number | null> = {
    productName: searchParams.productName ?? ''
  };
  getDownload(
    '/store/stock/export',
    params,
    `库存数据_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

// Inline Component for Popover Logic
const StockUpdatePopover = (props: { row: Api.Store.StockSku; type: 'add' | 'reduce'; onSuccess: () => void }) => {
  const amount = ref(0);
  const reason = ref('');
  const loading = ref(false);

  async function handleUpdate() {
    if (amount.value <= 0) return;
    loading.value = true;
    try {
      const change = props.type === 'add' ? amount.value : -amount.value;
      await fetchUpdateStock({
        skuId: props.row.id,
        stockChange: change,
        reason: reason.value || undefined
      });
      window.$message?.success('库存已更新');
      props.onSuccess();
      amount.value = 0;
      reason.value = '';
    } finally {
      loading.value = false;
    }
  }

  const btnType = props.type === 'add' ? 'primary' : 'warning';
  const btnText = props.type === 'add' ? '补货' : '减货';

  return (
    <NPopover trigger="click" placement="bottom">
      {{
        trigger: () => (
          <NButton size="small" type={btnType} secondary>
            {btnText}
          </NButton>
        ),
        default: () => (
          <NSpace vertical class="min-w-200px">
            <span class="text-12px text-gray">
              {props.type === 'add' ? '补货' : '减货'}数量:
            </span>
            <NInputNumber v-model:value={amount.value} min={1} class="w-full" />
            <span class="text-12px text-gray">变动原因（选填）:</span>
            <NInput v-model:value={reason.value} placeholder="如：进货补货、盘点调整" clearable />
            <NButton type="primary" size="small" block loading={loading.value} onClick={handleUpdate}>
              确认
            </NButton>
          </NSpace>
        )
      }}
    </NPopover>
  );
};
</script>

<template>
  <div class="h-full overflow-hidden">
    <NCard title="库存管理" :bordered="false" class="h-full rounded-8px shadow-sm">
      <div class="h-full flex-col-stretch gap-12px">
        <NSpace justify="space-between" wrap>
          <NSpace wrap>
            <NInput
              v-model:value="searchParams.productName"
              placeholder="按商品名称搜索"
              clearable
              style="width: 200px"
              @keydown.enter="getData"
            />
            <NButton type="primary" @click="getData">搜索</NButton>
            <NButton @click="resetSearchParams">重置</NButton>
            <NButton :disabled="checkedRowKeys.length === 0" @click="handleBatchAdjust">
              批量调整
              <template v-if="checkedRowKeys.length > 0">
                ({{ checkedRowKeys.length }})
              </template>
            </NButton>
            <NButton @click="handleExport">导出</NButton>
          </NSpace>
        </NSpace>
        <NDataTable
          v-model:checked-row-keys="checkedRowKeys"
          :columns="columns"
          :data="data"
          :loading="loading"
          remote
          :row-key="row => row.id"
          :pagination="mobilePagination"
          class="flex-1-hidden"
        />
      </div>
    </NCard>
    <BatchStockModal
      v-model:visible="batchModalVisible"
      :rows="selectedRows()"
      @submitted="handleBatchSubmitted"
    />
  </div>
</template>

<style scoped></style>
