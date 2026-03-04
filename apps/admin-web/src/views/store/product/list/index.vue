<script setup lang="tsx">
import { computed, ref } from 'vue';
import { NButton, NCard, NDataTable, NPopconfirm, NSpace, NTag, useMessage } from 'naive-ui';
import { fetchGetStoreProductList, fetchRemoveProduct } from '@/service/api/store/product';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { useTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import ProductSearch from './modules/product-search.vue';
import ProductOperateDrawer from './modules/product-operate-drawer.vue';
import StockAlertConfigModal from './modules/stock-alert-config-modal.vue';
import BatchPriceModal from './modules/batch-price-modal.vue';

const appStore = useAppStore();
const message = useMessage();
const { hasAuth } = useAuth();

const stockAlertVisible = ref(false);
const batchPriceVisible = ref(false);
const batchRemoveLoading = ref(false);

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
  apiFn: fetchGetStoreProductList,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    name: null,
    type: null,
    status: null
  },
  columns: () => [
    {
      type: 'selection',
      align: 'center',
      width: 48
    },
    {
      key: 'index',
      title: $t('common.index'),
      align: 'center',
      width: 64
    },
    {
      key: 'name',
      title: '商品信息',
      align: 'left',
      minWidth: 200,
      render: row => (
        <div class="flex items-center gap-2">
          <img src={row.albumPics?.split(',')[0]} class="h-12 w-12 border rounded object-cover" />
          <div class="flex flex-col">
            <span class="font-bold">{row.customTitle || row.name}</span>
            {row.customTitle && <span class="text-xs text-gray-400 italic">原: {row.name}</span>}
          </div>
        </div>
      )
    },
    {
      key: 'type',
      title: '类型',
      align: 'center',
      width: 80,
      render: row => {
        const tagMap: Record<Api.Pms.ProductType, NaiveUI.ThemeColor> = {
          REAL: 'info',
          SERVICE: 'success'
        };
        const labelMap: Record<Api.Pms.ProductType, string> = {
          REAL: '实物',
          SERVICE: '服务'
        };
        return (
          <NTag type={tagMap[row.type]} size="small">
            {labelMap[row.type]}
          </NTag>
        );
      }
    },
    {
      key: 'price',
      title: '售价(起)',
      align: 'center',
      width: 100,
      render: row => `¥${row.price}`
    },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      width: 100,
      render: row => {
        const statusMap: Record<Api.Pms.PublishStatus, NaiveUI.ThemeColor> = {
          ON_SHELF: 'success',
          OFF_SHELF: 'default'
        };
        const labelMap: Record<Api.Pms.PublishStatus, string> = {
          ON_SHELF: '经营中',
          OFF_SHELF: '已下架'
        };
        return (
          <NTag type={statusMap[row.status]} size="small">
            {labelMap[row.status]}
          </NTag>
        );
      }
    },
    {
      key: 'marketing',
      title: '营销配置',
      align: 'center',
      width: 120,
      render: row => (
        <div class="flex-col-center gap-1">
          {row.isPromotionProduct && (
            <NTag type="warning" size="small" bordered={false}>
              营销商品
            </NTag>
          )}
          {typeof row.pointsRatio === 'number' && row.pointsRatio > 0 && (
            <span class="text-xs text-primary">积分: {row.pointsRatio}%</span>
          )}
        </div>
      )
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 180,
      render: row => (
        <NSpace justify="center">
          {hasAuth('store:product:update') && (
            <>
              <NButton type="primary" ghost size="small" onClick={() => edit(row)}>
                经营配置
              </NButton>
              <NPopconfirm onPositiveClick={() => handleRemove(row.id)}>
                {{
                  default: () => '确定从店铺移除此商品？',
                  trigger: () => (
                    <NButton type="error" ghost size="small">
                      移除
                    </NButton>
                  )
                }}
              </NPopconfirm>
            </>
          )}
        </NSpace>
      )
    }
  ]
});

const { drawerVisible, operateType, editingData, edit, checkedRowKeys } = useTableOperate<Api.Store.TenantProduct>(
  data,
  getData
);

const selectedProducts = computed(() => {
  if (!checkedRowKeys.value.length) return [];
  return data.value.filter(row => checkedRowKeys.value.includes(row.id));
});

const hasSelectedWithSkus = computed(() => selectedProducts.value.some(p => p.skus && p.skus.length > 0));

async function handleRemove(id: string) {
  try {
    await fetchRemoveProduct({ id });
    message.success('已移除');
    getData();
  } catch {
    // error handled by request
  }
}

async function handleBatchRemove() {
  const ids = checkedRowKeys.value as string[];
  batchRemoveLoading.value = true;
  let ok = 0;
  let fail = 0;
  for (const id of ids) {
    try {
      await fetchRemoveProduct({ id });
      ok++;
    } catch {
      fail++;
    }
  }
  batchRemoveLoading.value = false;
  if (fail > 0) {
    message.warning(`移除完成: 成功 ${ok} 个, 失败 ${fail} 个`);
  } else {
    message.success(`已移除 ${ok} 个商品`);
  }
  checkedRowKeys.value = [];
  getData();
}

function openBatchPrice() {
  batchPriceVisible.value = true;
}

function handleBatchPriceSubmitted() {
  checkedRowKeys.value = [];
  getData();
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <ProductSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getDataByPage" />
    <NCard title="我的商品" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :loading="loading"
          :show-add="false"
          :show-delete="false"
          @refresh="getData"
        >
          <template #after>
            <NButton v-if="hasAuth('store:product:query')" size="small" ghost @click="stockAlertVisible = true">
              库存预警
            </NButton>
            <template v-if="hasAuth('store:product:update')">
              <NButton size="small" ghost type="primary" :disabled="!hasSelectedWithSkus" @click="openBatchPrice">
                批量调价
              </NButton>
              <NPopconfirm @positive-click="handleBatchRemove">
                <template #trigger>
                  <NButton
                    size="small"
                    ghost
                    type="error"
                    :loading="batchRemoveLoading"
                    :disabled="checkedRowKeys.length === 0"
                  >
                    批量移除
                  </NButton>
                </template>
                确定移除选中的 {{ checkedRowKeys.length }} 个商品？
              </NPopconfirm>
            </template>
          </template>
        </TableHeaderOperation>
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        remote
        striped
        size="small"
        :data="data"
        :columns="columns"
        :flex-height="!appStore.isMobile"
        :loading="loading"
        :pagination="mobilePagination"
        :row-key="row => row.id"
        class="sm:h-full"
      />
      <ProductOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getData"
      />
      <StockAlertConfigModal v-model:visible="stockAlertVisible" />
      <BatchPriceModal
        v-model:visible="batchPriceVisible"
        :products="selectedProducts"
        @submitted="handleBatchPriceSubmitted"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
