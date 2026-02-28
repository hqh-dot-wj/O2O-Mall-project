<script setup lang="tsx">
import { h } from 'vue';
import { NButton, NPopconfirm, NSpace, NTag } from 'naive-ui';
import { fetchDeleteProductConfig, fetchGetProductConfigList } from '@/service/api/distribution';
import { useTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import ProductConfigOperateDrawer from './modules/product-config-operate-drawer.vue';

defineOptions({
  name: 'DistributionProductConfig'
});

const { columns, data, getData, loading, mobilePagination, searchParams, resetSearchParams } = useTable({
  apiFn: fetchGetProductConfigList,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    productId: undefined
  },
  columns: () => [
    {
      key: 'productId',
      title: '商品ID',
      align: 'center',
      width: 150
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
      key: 'commissionBaseType',
      title: '基数类型',
      align: 'center',
      width: 120,
      render: row => {
        const map: Record<string, string> = {
          ORIGINAL_PRICE: '原价',
          ACTUAL_PAID: '实付',
          ZERO: '不分佣'
        };
        return <NTag>{map[row.commissionBaseType] || row.commissionBaseType}</NTag>;
      }
    },
    {
      key: 'createTime',
      title: $t('page.common.createTime'),
      align: 'center',
      width: 170
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 150,
      render: row => (
        <NSpace justify="center">
          <NButton type="primary" ghost size="small" onClick={() => handleEdit(row)}>
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

const { drawerVisible, operateType, editingData, handleAdd, handleEdit } = useTableOperate(data, getData);

async function handleDelete(id: number) {
  try {
    await fetchDeleteProductConfig(id);
    window.$message?.success($t('common.deleteSuccess'));
    getData();
  } catch (error) {
    console.error(error);
  }
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard title="商品独立分佣配置" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
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
      <ProductConfigOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getData"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
