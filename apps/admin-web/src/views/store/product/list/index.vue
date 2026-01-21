<script setup lang="tsx">
import { NButton, NCard, NSpace, NTag, NDataTable } from 'naive-ui';
import { fetchGetStoreProductList } from '@/service/api/store/product';
import { useTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import ProductSearch from './modules/product-search.vue';
import ProductOperateDrawer from './modules/product-operate-drawer.vue';

const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
  loading,
  mobilePagination,
  searchParams,
  resetSearchParams,
} = useTable({
  apiFn: fetchGetStoreProductList,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    name: null,
    type: null,
    status: null,
  },
  columns: () => [
    {
      type: 'selection',
      align: 'center',
      width: 48,
    },
    {
      key: 'index',
      title: $t('common.index'),
      align: 'center',
      width: 64,
    },
    {
      key: 'name',
      title: '商品信息',
      align: 'left',
      minWidth: 200,
      render: (row) => (
        <div class="flex items-center gap-2">
            <img src={row.albumPics?.split(',')[0]} class="w-12 h-12 rounded object-cover border" />
            <div class="flex flex-col">
                <span class="font-bold">{row.customTitle || row.name}</span>
                {row.customTitle && <span class="text-gray-400 text-xs italic">原: {row.name}</span>}
            </div>
        </div>
      )
    },
    {
        key: 'type',
        title: '类型',
        align: 'center',
        width: 80,
        render: (row) => {
            const tagMap: Record<Api.Pms.ProductType, NaiveUI.ThemeColor> = {
                REAL: 'info',
                SERVICE: 'success'
            };
            const labelMap: Record<Api.Pms.ProductType, string> = {
                REAL: '实物',
                SERVICE: '服务'
            };
            return <NTag type={tagMap[row.type]} size="small">{labelMap[row.type]}</NTag>;
        }
    },
    {
      key: 'price',
      title: '售价(起)',
      align: 'center',
      width: 100,
      render: (row) => `¥${row.price}`
    },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      width: 100,
      render: (row) => {
          const statusMap: Record<Api.Pms.PublishStatus, NaiveUI.ThemeColor> = {
              ON_SHELF: 'success',
              OFF_SHELF: 'default'
          };
          const labelMap: Record<Api.Pms.PublishStatus, string> = {
              ON_SHELF: '经营中',
              OFF_SHELF: '已下架'
          };
          return <NTag type={statusMap[row.status]} size="small">{labelMap[row.status]}</NTag>;
      }
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 130,
      render: (row) => (
        <NSpace justify="center">
          <NButton type="primary" ghost size="small" onClick={() => edit(row)}>
            经营配置
          </NButton>
        </NSpace>
      ),
    },
  ],
});

const {
  drawerVisible,
  operateType,
  editingData,
  edit,
} = useTableOperate<Api.Store.TenantProduct>(data, getData);
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <ProductSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getDataByPage" />
    <NCard :title="'我的商品'" :bordered="false" size="small" class="sm:flex-1-hidden card-wrapper">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :loading="loading"
          @refresh="getData"
        />
      </template>
      <NDataTable
        remote
        striped
        size="small"
        class="sm:flex-1-hidden"
        :data="data"
        :columns="columns"
        :flex-height="!mobilePagination"
        :loading="loading"
        :pagination="mobilePagination"
        :row-key="(row) => row.id"
      />
      <ProductOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getData"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
