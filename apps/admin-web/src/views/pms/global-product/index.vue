<script setup lang="tsx">
import { h, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NAvatar, NEllipsis, NTag, NDataTable, NTree, NInput, NSpin, NEmpty, NButton, NCard } from 'naive-ui';
import type { TreeOption } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { useTable, useTableOperate, useTableProps } from '@/hooks/common/table';
import { fetchGetGlobalProductList, fetchBatchDeleteGlobalProduct } from '@/service/api/pms/product';
import { fetchGetCategoryTree } from '@/service/api/pms/category';
import { $t } from '@/locales';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import GlobalProductSearch from './modules/global-product-search.vue';

defineOptions({
  name: 'GlobalProductList',
});

const appStore = useAppStore();
const { hasAuth } = useAuth();
const { loading: siderLoading, startLoading: startSiderLoading, endLoading: endSiderLoading } = useLoading();

const tableProps = useTableProps();

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
  apiFn: fetchGetGlobalProductList,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    name: null,
    categoryId: null,
    publishStatus: null,
  } as Api.Pms.ProductSearchParams,
  columns: () => [
    {
      type: 'expand',
      key: 'expand',
      renderExpand: (row) => {
        return h('div', { class: 'p-4 bg-gray-50 dark:bg-gray-800' }, [
            h('h4', { class: 'mb-2 font-bold' }, 'SKU 列表'),
            h(NDataTable, {
                data: row.globalSkus || [],
                columns: [
                    { title: 'SKU 规格', key: 'specValues', render: (sku: any) => JSON.stringify(sku.specValues) },
                    { title: '指导价', key: 'guidePrice' },
                    { title: '成本价', key: 'costPrice' },
                    { 
                        title: '分佣范围 (Min - 建议 - Max)', 
                        key: 'guideRate', 
                        render: (sku: any) => {
                             if (sku.distMode === 'NONE') return '不分销';
                             const unit = sku.distMode === 'RATIO' ? '%' : '元';
                             return `${sku.minDistRate}${unit} - ${sku.guideRate}${unit} - ${sku.maxDistRate}${unit}`;
                        }
                    },
                ],
                pagination: false,
                bordered: false,
                size: 'small'
            } as any)
        ]);
      }
    },
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
      title: '商品名称',
      align: 'left',
      minWidth: 200,
      render: (row) => {
        return (
          <div class="flex items-center gap-2">
            <NAvatar
              src={row.albumPics ? row.albumPics.split(',')[0] : ''}
              class="bg-primary"
              fallback-src="https://via.placeholder.com/40"
            />
            <div class="flex flex-col">
              <NEllipsis>{row.name}</NEllipsis>
            </div>
          </div>
        );
      },
    },
    {
      key: 'categoryId',
      title: '分类ID',
      align: 'center',
      width: 100,
    },
    {
      key: 'publishStatus',
      title: '发布状态',
      align: 'center',
      width: 100,
      render: (row) => {
        const typeMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
          '0': 'default',
          '1': 'success',
        };
        const labelMap: Record<string, string> = {
          '0': '下架',
          '1': '上架',
        };
        return <NTag type={typeMap[row.publishStatus] || 'default'}>{labelMap[row.publishStatus] || row.publishStatus}</NTag>;
      }
    },
    {
      key: 'createTime',
      title: $t('page.common.createTime'),
      align: 'center',
      width: 160,
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 150,
      render: (row) => (
        <div class="flex-center gap-8px">
          <NButton
            size="small"
            type="primary"
            ghost
            onClick={() => editProduct(row.productId)}
          >
            {$t('common.edit')}
          </NButton>
          <NButton
            size="small"
            type="error"
            ghost
            onClick={() => handleDelete(row.productId)}
          >
            {$t('common.delete')}
          </NButton>
        </div>
      ),
    },
  ],
});

const router = useRouter();

const {
  checkedRowKeys,
  onBatchDeleted,
  onDeleted
} = useTableOperate(data, getData);

// Override handleAdd to navigate to create page
function handleAdd() {
  router.push({path:'pms_global-product_create'});
}

function editProduct(id: string) {
  router.push({ path: 'pms_global-product_create', query: { id } });
}


async function handleBatchDelete() {
  try {
    await fetchBatchDeleteGlobalProduct(checkedRowKeys.value as string[]);
    onBatchDeleted();
  } catch {
    // error handled by request interceptor
  }
}

async function handleDelete(productId: string) {
  try {
    await fetchBatchDeleteGlobalProduct([productId]);
    onDeleted();
  } catch {
    // error handled by request interceptor
  }
}

// Category Tree Logic
const categoryName = ref<string>('');
const treeData = ref<Api.Pms.Category[]>([]);
const expandedKeys = ref<number[]>([]);
const selectedKeys = ref<number[]>([]);

async function getCategoryTree() {
  startSiderLoading();
  try {
    const { data } = await fetchGetCategoryTree();
    treeData.value = [
      {
        catId: 0,
        name: '全部商品',
        children: data || []
      }
    ] as any;
    // Expands all keys? Or just root. Let's just expand root/0
     if (expandedKeys.value.length === 0) {
      expandedKeys.value = [0];
    }
    // Select root by default
    if (selectedKeys.value.length === 0) {
      selectedKeys.value = [0];
    }
  } catch (error) {
    console.error(error);
  } finally {
    endSiderLoading();
  }
}

function handleSelectCategory(keys: number[], option: Array<TreeOption | null>) {
  const selectedNode = option[0];
  if (selectedNode) {
    selectedKeys.value = keys;
    // If root (0) is selected, filter by null/undefined to show all? 
    // Or if backend supports 0 as 'all'. 
    // Usually clear param if 0.
    const catId = selectedNode.catId as number;
    searchParams.categoryId = catId === 0 ? null : catId;
    getDataByPage();
  }
}

onMounted(() => {
  getCategoryTree();
});
</script>

<template>
  <div class="h-full overflow-hidden">
    <TableSiderLayout :sider-title="$t('page.pms.category.title')">
      <template #sider>
        <NInput v-model:value="categoryName" placeholder="搜索分类" clearable />
        <NSpin :show="siderLoading" class="tree-spin">
          <NTree
            block-node
            :data="treeData as any"
            key-field="catId"
            label-field="name"
            :pattern="categoryName"
            v-model:expanded-keys="expandedKeys"
            v-model:selected-keys="selectedKeys"
            :show-irrelevant-nodes="false"
            class="h-full"
            selectable
            @update:selected-keys="handleSelectCategory"
          >
            <template #empty>
              <NEmpty description="暂无分类" class="h-full justify-center" />
            </template>
          </NTree>
        </NSpin>
      </template>

      <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto h-full">
        <GlobalProductSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getDataByPage" />
        <NCard title="标准商品库" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
          <template #header-extra>
            <TableHeaderOperation
              v-model:columns="columnChecks"
              :disabled-delete="checkedRowKeys.length === 0"
              :loading="loading"
              :show-add="true"
              :show-delete="true"
              @add="handleAdd"
              @delete="handleBatchDelete"
              @refresh="getData"
            />
          </template>
          <NDataTable
            v-model:checked-row-keys="checkedRowKeys"
            :columns="columns"
            :data="data"
            v-bind="tableProps"
            :flex-height="!appStore.isMobile"
            :scroll-x="1000"
            :loading="loading"
            remote
            :row-key="(row) => row.productId"
            :pagination="mobilePagination"
            class="sm:h-full"
          />
        </NCard>
      </div>
    </TableSiderLayout>
  </div>
</template>

<style scoped>
.tree-spin {
  height: calc(100vh - 228px - var(--calc-footer-height, 0px)) !important;
}
:deep(.n-spin-content) {
  height: 100%;
}
</style>
