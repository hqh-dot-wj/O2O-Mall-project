<script setup lang="tsx">
import { NButton, NCard, NDataTable, NPopconfirm } from 'naive-ui';
import { fetchDeleteAttribute, fetchGetAttributeList } from '@/service/api/pms/attribute';
import { useAppStore } from '@/store/modules/app';
import { useTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import TableHeaderOperation from '@/components/advanced/table-header-operation.vue';
import AttributeSearch from './modules/attribute-search.vue';
import AttributeOperateDrawer from './modules/attribute-operate-drawer.vue';

defineOptions({
  name: 'AttributeList'
});

const appStore = useAppStore();

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
  apiFn: fetchGetAttributeList,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    name: null
  },
  columns: () => [
    {
      key: 'templateId',
      title: 'ID',
      align: 'center',
      width: 64
    },
    {
      key: 'name',
      title: $t('common.name'),
      align: 'center',
      minWidth: 100
    },
    {
      key: '_count',
      title: $t('page.pms.attribute.attributeCount'),
      align: 'center',
      minWidth: 100,
      render: row => row._count?.attributes || 0
    },
    {
      key: 'createTime',
      title: $t('page.common.createTime'),
      align: 'center',
      minWidth: 100
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 130,
      render: row => (
        <div class="flex-center gap-8px">
          <NButton type="primary" ghost size="small" onClick={() => handleEdit('templateId', row.templateId)}>
            {$t('common.edit')}
          </NButton>
          <NPopconfirm onPositiveClick={() => handleDelete(row.templateId)}>
            {{
              default: () => $t('common.confirmDelete'),
              trigger: () => (
                <NButton type="error" ghost size="small">
                  {$t('common.delete')}
                </NButton>
              )
            }}
          </NPopconfirm>
        </div>
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
  // closeDrawer
} = useTableOperate(data, getData);

async function handleDelete(id: number) {
  // request delete
  await fetchDeleteAttribute(id);
  onDeleted();
}

async function handleBatchDelete() {
  if (checkedRowKeys.value.length === 0) return;

  const promises = checkedRowKeys.value.map(id => fetchDeleteAttribute(Number(id)));
  await Promise.all(promises);

  onBatchDeleted();
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <AttributeSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getDataByPage" />
    <NCard :title="$t('page.pms.attribute.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
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
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="640"
        :loading="loading"
        remote
        :row-key="row => row.templateId"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <AttributeOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getData"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
