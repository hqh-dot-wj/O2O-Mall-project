<script setup lang="tsx">
import { ref, h } from 'vue';
import { NButton, NAvatar, NEllipsis, NDataTable } from 'naive-ui';
import { useBoolean } from '@sa/hooks';
import { useTable, useTableProps } from '@/hooks/common/table';
import { fetchGetStoreProductList } from '@/service/api/store/product';
import { $t } from '@/locales';
import ProductEditModal from './modules/product-edit-modal.vue';
import { useAuth } from '@/hooks/business/auth';

defineOptions({
  name: 'StoreProductList',
});

const { hasAuth } = useAuth();
const tableProps = useTableProps();
const { bool: editVisible, setTrue: openEditModal } = useBoolean();
const editingData = ref<Api.Store.TenantProduct | null>(null);

const {
  columns,
  data,
  getData,
  loading,
  mobilePagination,
} = useTable({
  apiFn: fetchGetStoreProductList,
  apiParams: {
      pageNum: 1,
      pageSize: 10
  },
  columns: () => [
    {
      key: 'index',
      title: $t('common.index'),
      align: 'center',
      width: 48,
    },
    {
      key: 'productId',
      title: 'Product Name',
      align: 'left',
      width: 200,
      render: (row) => {
        const prod = row.product;
        return h('div', { class: 'flex items-center gap-2' }, [
            h(NAvatar, {
                src: prod?.albumPics ? prod.albumPics.split(',')[0] : '',
                class: 'bg-primary',
                fallbackSrc: ''
            }),
            h('div', { class: 'flex flex-col' }, [
                h(NEllipsis, null, { default: () => row.customTitle || prod?.name })
            ])
        ]);
      },
    },

    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 150,
      render: (row) => h(NButton, {
          size: 'small',
          type: 'primary',
          onClick: () => handleEdit(row)
      }, { default: () => 'Adjust Price' }),
    },
  ],
});

function handleEdit(row: Api.Store.TenantProduct) {
  editingData.value = row;
  openEditModal();
}

function handleSubmitted() {
    getData();
}
</script>

<template>
  <div class="h-full overflow-hidden">
    <NCard title="My Products" :bordered="false" class="h-full rounded-8px shadow-sm">
      <div class="h-full flex-col-stretch gap-12px">
        <NDataTable
          :columns="columns"
          :data="data"
          v-bind="tableProps"
          :loading="loading"
          remote
          :row-key="(row) => row.id"
          :pagination="mobilePagination"
          class="flex-1-hidden"
        />
        <ProductEditModal v-model:visible="editVisible" :row-data="editingData" @submitted="handleSubmitted" />
      </div>
    </NCard>
  </div>
</template>

<style scoped></style>
