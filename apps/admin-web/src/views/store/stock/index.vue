<script setup lang="tsx">
import { h, ref } from 'vue';
import { NAvatar, NButton, NCard, NDataTable, NInput, NInputNumber, NPopover, NSpace } from 'naive-ui';
import { fetchGetStockList, fetchUpdateStock } from '@/service/api/store/stock';
import { useTable } from '@/hooks/common/table';
import { $t } from '@/locales';

defineOptions({
  name: 'StoreStock'
});

const { columns, data, getData, loading, mobilePagination, searchParams, resetSearchParams } = useTable({
  apiFn: fetchGetStockList,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    productName: null
  },
  columns: () => [
    {
      key: 'product',
      title: 'Product',
      width: 200,
      render: row => {
        const img = row.tenantProd.product.mainImages?.[0];
        return (
          <NSpace align="center">
            {img && <NAvatar src={img} size={40} />}
            <span>{row.tenantProd.product.name}</span>
          </NSpace>
        );
      }
    },
    {
      key: 'specs',
      title: 'Specs',
      width: 150,
      render: row => {
        if (!row.globalSku?.specValues) return '-';
        return Object.values(row.globalSku.specValues).join(' / ');
      }
    },
    {
      key: 'currentStock',
      title: 'Current Stock',
      width: 100,
      align: 'center',
      render: row => <span class="text-16px font-bold">{row.stock}</span>
    },
    {
      key: 'operate',
      title: 'Quick Update',
      align: 'center',
      width: 200,
      render: row => (
        <NSpace justify="center">
          <StockUpdatePopover row={row} type="add" onSuccess={getData} />
          <StockUpdatePopover row={row} type="reduce" onSuccess={getData} />
        </NSpace>
      )
    }
  ]
});

// Inline Component for Popover Logic
const StockUpdatePopover = (props: { row: Api.Store.StockSku; type: 'add' | 'reduce'; onSuccess: () => void }) => {
  const amount = ref(0);
  const loading = ref(false);

  async function handleUpdate() {
    if (amount.value <= 0) return;
    loading.value = true;
    try {
      const change = props.type === 'add' ? amount.value : -amount.value;
      await fetchUpdateStock({ skuId: props.row.id, stockChange: change });
      window.$message?.success('Stock updated');
      props.onSuccess();
      amount.value = 0;
    } finally {
      loading.value = false;
    }
  }

  const btnType = props.type === 'add' ? 'primary' : 'warning';
  const btnText = props.type === 'add' ? 'Restock' : 'Destock';

  return (
    <NPopover trigger="click" placement="bottom">
      {{
        trigger: () => (
          <NButton size="small" type={btnType} secondary>
            {btnText}
          </NButton>
        ),
        default: () => (
          <NSpace vertical>
            <span class="text-12px text-gray">Enter amount to {props.type}:</span>
            <NInputNumber v-model:value={amount.value} min={1} />
            <NButton type="primary" size="small" block loading={loading.value} onClick={handleUpdate}>
              Confirm
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
    <NCard title="Stock Management" :bordered="false" class="h-full rounded-8px shadow-sm">
      <div class="h-full flex-col-stretch gap-12px">
        <NSpace justify="space-between">
          <NSpace>
            <NInput
              v-model:value="searchParams.productName"
              placeholder="Search Product Name"
              clearable
              @keydown.enter="getData"
            />
            <NButton type="primary" @click="getData">Search</NButton>
            <NButton @click="resetSearchParams">Reset</NButton>
          </NSpace>
        </NSpace>
        <NDataTable
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
  </div>
</template>

<style scoped></style>
