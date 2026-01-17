<script setup lang="tsx">
import { computed, ref, watch, h } from 'vue';
import { NModal, NDataTable, NInputNumber, NTag, NButton, NSpace } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { fetchUpdateStoreProductPrice } from '@/service/api/store/product';

defineOptions({
  name: 'ProductEditModal',
});

interface Props {
  visible: boolean;
  rowData?: Api.Store.TenantProduct | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'update:visible', visible: boolean): void;
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const modalVisible = computed({
  get() {
    return props.visible;
  },
  set(visible) {
    emit('update:visible', visible);
  },
});

const skus = ref<any[]>([]);

watch(
  () => props.rowData,
  (val) => {
    if (val) {
      skus.value = val.skus.map((item) => ({
        ...item,
        editPrice: Number(item.price),
        editDistRate: Number(item.distRate),
        costPrice: Number((item as any).globalSku?.costPrice || 0),
        specValues: (item as any).globalSku?.specValues || {},
      }));
    } else {
      skus.value = [];
    }
  },
  { immediate: true }
);

function calculateCommission(price: number, distRate: number, distMode: string) {
  if (distMode === 'RATIO') {
      return price * distRate;
  }
  return distRate;
}

function calculateProfit(row: any) {
  const comm = calculateCommission(row.editPrice, row.editDistRate, row.distMode);
  return row.editPrice - row.costPrice - comm;
}

async function handleSave(row: any) {
  try {
    await fetchUpdateStoreProductPrice({
      tenantSkuId: row.id,
      price: row.editPrice,
      distRate: row.editDistRate,
    });
    window.$message?.success('Price updated successfully');
    row.price = row.editPrice;
    row.distRate = row.editDistRate;
  } catch (error) {
    // handled by request
  }
}

const columns: DataTableColumns<any> = [
  { title: 'Spec', key: 'specValues', render: (row: any) => JSON.stringify(row.specValues) },
  { title: 'Cost', key: 'costPrice' },
  { 
      title: 'Current Price', 
      key: 'price',
      render: (row: any) => {
          return h(NSpace, { vertical: true, size: 'small' }, {
              default: () => [
                  h('span', `Sell: ${row.editPrice}`),
                  h(NInputNumber, {
                      value: row.editPrice,
                      onUpdateValue: (v: number | null) => { if(v !== null) row.editPrice = v; },
                      size: 'tiny',
                      step: 0.01
                  })
              ]
          });
      }
  },
  { 
      title: 'Dist Mode', 
      key: 'distMode',
      render: (row: any) => h(NTag, null, { default: () => row.distMode })
  },
  { 
      title: 'Commission Rate', 
      key: 'distRate',
      render: (row: any) => {
          return h(NSpace, { vertical: true, size: 'small' }, {
              default: () => [
                  h('span', `Rate: ${row.editDistRate}`),
                  h(NInputNumber, {
                      value: row.editDistRate,
                      onUpdateValue: (v: number | null) => { if(v !== null) row.editDistRate = v; },
                      size: 'tiny',
                      step: 0.01
                  })
              ]
          });
      }
  },
  {
      title: 'Est. Profit',
      key: 'profit',
      render: (row: any) => {
          const profit = calculateProfit(row);
          const isLoss = profit < 0;
          return h('span', { class: isLoss ? 'text-red font-bold' : 'text-green font-bold' }, profit.toFixed(2));
      }
  },
  {
      title: 'Action',
      key: 'action',
      render: (row: any) => {
          return h(NButton, {
              size: 'tiny',
              type: 'primary',
              onClick: () => handleSave(row)
          }, { default: () => 'Sub Save' });
      }
  }
];

function close() {
  modalVisible.value = false;
  emit('submitted');
}
</script>

<template>
  <NModal v-model:show="modalVisible" title="Edit Price & Commission" preset="card" class="w-800px">
    <NDataTable :columns="columns" :data="skus" :single-column="false" />
  </NModal>
</template>

<style scoped></style>
