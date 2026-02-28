<script setup lang="tsx">
import { h } from 'vue';
import { NButton, NPopconfirm, NSpace, NTag } from 'naive-ui';
import { fetchDeleteLevel, fetchGetLevelList } from '@/service/api/distribution';
import { useTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import LevelOperateDrawer from './modules/level-operate-drawer.vue';

defineOptions({
  name: 'DistributionLevel'
});

const { columns, data, getData, loading, mobilePagination, searchParams, resetSearchParams } = useTable({
  apiFn: fetchGetLevelList,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    levelName: undefined
  },
  columns: () => [
    {
      key: 'levelName',
      title: '等级名称',
      align: 'center',
      minWidth: 120
    },
    {
      key: 'levelWeight',
      title: '等级权重',
      align: 'center',
      width: 100
    },
    {
      key: 'level1Rate',
      title: '一级比例',
      align: 'center',
      width: 100,
      render: row => `${row.level1Rate}%`
    },
    {
      key: 'level2Rate',
      title: '二级比例',
      align: 'center',
      width: 100,
      render: row => `${row.level2Rate}%`
    },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      width: 100,
      render: row => (
        <NTag type={row.status === '1' ? 'success' : 'default'}>{row.status === '1' ? '启用' : '禁用'}</NTag>
      )
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 150,
      render: row => (
        <NSpace justify="center">
          <NButton type="primary" ghost size="small" onClick={() => edit(row)}>
            {$t('common.edit')}
          </NButton>
          <NPopconfirm onPositiveClick={() => handleDelete(row.id)}>
            {{
              default: () => $t('common.confirmDelete'),
              trigger: () => (
                <NButton type="error" ghost size="small">
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

const { drawerVisible, operateType, editingData, handleAdd, handleEdit, checkedRowKeys, onBatchDelete } =
  useTableOperate(data, getData);

async function handleDelete(id: number) {
  await fetchDeleteLevel(id);
  window.$message?.success($t('common.deleteSuccess'));
  getData();
}

function edit(row: Api.Store.Level) {
  handleEdit(row);
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard title="分销等级管理" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <NSpace>
          <NButton type="primary" size="small" @click="handleAdd">
            <template #icon>
              <icon-ic-round-plus class="text-icon" />
            </template>
            {{ $t('common.add') }}
          </Button>
        </NSpace>
      </template>
      <NDataTable
        :columns="columns"
        :data="data"
        :loading="loading"
        :pagination="mobilePagination"
        remote
        class="sm:h-full"
      />
      <LevelOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getData"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
