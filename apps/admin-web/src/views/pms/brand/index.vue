<script setup lang="tsx">
import { h } from 'vue';
import { NAvatar, NButton, NCard, NDataTable, NPopconfirm, NSpace } from 'naive-ui';
import { fetchDeleteBrand, fetchGetBrandList } from '@/service/api/pms/brand';
import { useAppStore } from '@/store/modules/app';
import { useTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import BrandOperateDrawer from './modules/brand-operate-drawer.vue';
import BrandSearch from './modules/brand-search.vue';

const appStore = useAppStore();

defineOptions({
  name: 'PmsBrand'
});

const { columns, data, getData, loading, mobilePagination, searchParams, resetSearchParams, columnChecks } = useTable({
  apiFn: fetchGetBrandList,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    name: null
  },
  columns: () => [
    {
      type: 'selection',
      align: 'center',
      width: 48
    },
    {
      key: 'brandId',
      title: 'ID',
      width: 80,
      align: 'center'
    },
    {
      key: 'logo',
      title: 'Logo',
      align: 'center',
      width: 100,
      render: row => {
        if (row.logo) {
          return h(NAvatar, { src: row.logo, size: 40 });
        }
        return null;
      }
    },
    {
      key: 'name',
      title: $t('page.pms.brand.brandName'),
      align: 'left',
      minWidth: 120
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 150,
      render: row => (
        <NSpace justify="center">
          <NButton size="tiny" type="primary" ghost onClick={() => edit(row)}>
            {$t('common.edit')}
          </NButton>
          <NPopconfirm onPositiveClick={() => handleDelete(row.brandId)}>
            {{
              default: () => $t('common.confirmDelete'),
              trigger: () => (
                <NButton size="tiny" type="error" ghost>
                  {$t('common.delete')}
                </NButton>
              )
            }}
          </NPopconfirm>
        </NSpace>
      )
    }
  ]
});

const {
  drawerVisible,
  operateType,
  editingData,
  handleAdd,
  handleEdit,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
} = useTableOperate(data, getData);

async function handleDelete(id: number) {
  const { error } = await fetchDeleteBrand(id);
  if (!error) {
    window.$message?.success($t('common.deleteSuccess'));
    onDeleted();
  }
}

async function handleBatchDelete() {
  // request
  // await fetchBatchDeleteBrand(checkedRowKeys.value);
  // onBatchDeleted();
  window.$message?.info('Batch delete not implemented in backend yet');
}

function edit(row: Api.Pms.Brand) {
  handleEdit('brandId', row.brandId);
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <BrandSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getData" />
    <NCard :title="$t('page.pms.brand.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @add="handleAdd"
          @delete="handleBatchDelete"
          @refresh="getData"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        :flex-height="!appStore.isMobile"
        :loading="loading"
        remote
        :row-key="row => row.brandId"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <BrandOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getData"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
