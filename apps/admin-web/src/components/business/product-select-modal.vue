<script setup lang="tsx">
import { computed, h, reactive, ref, watch } from 'vue';
import { NAvatar, NButton, NCard, NDataTable, NInput, NModal, NPagination, NSpace, NTag } from 'naive-ui';
import { fetchGetStoreProductList } from '@/service/api/store/product';

defineOptions({ name: 'ProductSelectModal' });

interface Props {
  visible: boolean;
  type?: 'SERVICE' | 'REAL';
}

const props = defineProps<Props>();

interface Emits {
  (e: 'update:visible', val: boolean): void;
  (e: 'select', row: any): void;
}

const emit = defineEmits<Emits>();

const show = computed({
  get: () => props.visible,
  set: val => emit('update:visible', val)
});

// --- Search & Data ---
const loading = ref(false);
const searchForm = reactive({
  name: '',
  type: props.type || 'SERVICE'
});

watch(
  () => props.type,
  newType => {
    if (newType) {
      searchForm.type = newType;
      handleSearch();
    }
  }
);

const data = ref<any[]>([]);
const pagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0
});

// Columns
const columns: any[] = [
  { type: 'expand', renderExpand: (row: any) => renderSkus(row) },
  {
    title: '商品名称',
    key: 'name',
    minWidth: 200,
    render: (row: any) => (
      <div class="flex items-center gap-2">
        {row.mainImages?.[0] && <NAvatar src={row.mainImages[0]} size="small" />}
        <div class="flex-col">
          <span>{row.name}</span>
          <span class="text-xs text-gray-400">ID: {row.productId}</span>
        </div>
      </div>
    )
  },
  {
    title: '类型',
    key: 'type',
    width: 100,
    render: (row: any) => h(NTag, { type: row.type === 'SERVICE' ? 'success' : 'info' }, { default: () => row.type })
  },
  {
    title: '指导价',
    key: 'price',
    width: 100,
    render: (row: any) => `¥${row.price}`
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render: (row: any) =>
      h(
        NButton,
        {
          size: 'small',
          type: 'primary',
          ghost: true,
          onClick: () => handleSelect(row)
        },
        { default: () => '选择商品' }
      )
  }
];

// Render SKUs Sub-table
function renderSkus(row: any) {
  const skus = row.skus || row.globalSkus || [];
  if (skus.length === 0) return '暂无 SKU 信息';

  return h(NDataTable, {
    size: 'small',
    columns: [
      { title: 'SKU ID', key: 'skuId', width: 150 },
      {
        title: '规格',
        key: 'specValues',
        render: (s: any) => {
          // Display spec values nicely
          const specs = typeof s.specValues === 'string' ? JSON.parse(s.specValues) : s.specValues;
          return Object.values(specs || {}).join(' / ');
        }
      },
      { title: '价格', key: 'guidePrice', width: 100, render: (s: any) => `¥${s.guidePrice}` },
      {
        title: '操作',
        key: 'action',
        width: 100,
        render: (sku: any) =>
          h(
            NButton,
            {
              size: 'tiny',
              type: 'primary',
              onClick: () =>
                handleSelect({
                  ...sku,
                  name: `${row.name} - ${JSON.stringify(sku.specValues)}`,
                  type: row.type,
                  id: sku.skuId
                })
            },
            { default: () => '选择此规格' }
          )
      }
    ],
    data: skus
  });
}

async function fetchData() {
  loading.value = true;
  try {
    const { data: res, error } = await fetchGetStoreProductList({
      pageNum: pagination.page,
      pageSize: pagination.pageSize,
      name: searchForm.name,
      type: searchForm.type
    });

    if (!error && res) {
      data.value = res.rows || [];
      pagination.itemCount = res.total || 0;
    }
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  fetchData();
}

function handlePageChange(page: number) {
  pagination.page = page;
  fetchData();
}

function handleSelect(row: any) {
  // Try to use the correct ID field
  const id = row.skuId || row.productId || row.id;
  emit('select', { ...row, id });
  show.value = false;
}

watch(show, val => {
  if (val) {
    searchForm.type = props.type || 'SERVICE';
    handleSearch();
  }
});
</script>

<template>
  <NModal v-model:show="show" preset="card" title="选择商品/服务" class="w-800px">
    <div class="flex flex-col gap-4">
      <NSpace>
        <NInput v-model:value="searchForm.name" placeholder="输入名称搜索" clearable @keypress.enter="handleSearch" />
        <NButton type="primary" @click="handleSearch">搜索</NButton>
      </NSpace>

      <NDataTable
        remote
        :loading="loading"
        :columns="columns"
        :data="data"
        :pagination="pagination"
        size="small"
        :max-height="400"
        :row-key="(row: any) => row.productId"
        @update:page="handlePageChange"
      />
    </div>
  </NModal>
</template>
