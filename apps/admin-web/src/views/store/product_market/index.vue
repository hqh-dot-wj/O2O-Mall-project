<template>
  <div class="h-full overflow-hidden flex gap-4 p-4">
    <!-- Left: Category Tree -->
    <NCard class="w-64 h-full flex-shrink-0" title="商品类目" content-style="padding: 0; display: flex; flex-direction: column; height: 100%;">
        <div class="p-2">
            <NInput v-model:value="categoryName" placeholder="搜索分类" clearable size="small" />
        </div>
        <div class="flex-1 overflow-auto">
             <NSpin :show="treeLoading">
                <NTree
                    block-node
                    :data="treeData"
                    key-field="catId"
                    label-field="name"
                    :pattern="categoryName"
                    selectable
                    default-expand-all
                    @update:selected-keys="handleSelectCategory"
                >
                    <template #empty>
                        <NEmpty description="无分类数据" class="pt-8" />
                    </template>
                </NTree>
             </NSpin>
        </div>
    </NCard>

    <!-- Right: Product List -->
    <div class="flex-1 h-full flex flex-col gap-4 overflow-hidden">
        <!-- Search & Filter -->
        <NCard size="small">
            <div class="flex flex-wrap items-center justify-between gap-4">
                <NTabs type="segment" :value="searchParams.type ?? ''" @update:value="handleTypeChange" class="w-64">
                    <NTabPane name="" tab="全部商品" />
                    <NTabPane name="REAL" tab="实物商品" />
                    <NTabPane name="SERVICE" tab="服务商品" />
                </NTabs>
                
                <div class="flex items-center gap-2">
                    <NInput v-model:value="searchParams.name" placeholder="搜索商品名称" clearable @keyup.enter="handleSearch">
                        <template #prefix>
                            <div class="i-icon-park-outline:search" />
                        </template>
                    </NInput>
                    <NButton type="primary" ghost @click="handleSearch">搜索</NButton>
                </div>
            </div>
        </NCard>

        <!-- Product Grid -->
        <div class="flex-1 overflow-y-auto">
            <NSpin :show="loading" class="min-h-full">
                <template v-if="data.length > 0">
                    <NGrid :x-gap="16" :y-gap="16" cols="1 s:2 m:3 l:4 xl:5" responsive="screen">
                        <NGridItem v-for="item in data" :key="item.productId">
                            <ProductMarketCard :product="item" @import="openImportDialog" />
                        </NGridItem>
                    </NGrid>
                    
                     <div class="flex justify-end mt-4">
                        <NPagination
                            v-model:page="searchParams.pageNum"
                            v-model:page-size="searchParams.pageSize"
                            :item-count="total"
                            :page-sizes="[10, 20, 50]"
                            show-size-picker
                            @update:page="getData"
                            @update:page-size="handlePageSizeChange"
                        />
                    </div>
                </template>
                 <NEmpty v-else description="暂无总部商品" class="h-full flex items-center justify-center" />
            </NSpin>
        </div>
    </div>
    
    <ImportDialog
        v-model:show="showImportDialog"
        :product="currentProduct"
        @success="handleImportSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, watch } from 'vue';
import { NCard, NInput, NTree, NTabs, NTabPane, NButton, NGrid, NGridItem, NSpin, NEmpty, NPagination } from 'naive-ui';
import { fetchGetCategoryTree } from '@/service/api/pms/category';
import { fetchGetProductMarketList } from '@/service/api/store/product';
import ProductMarketCard from './components/ProductMarketCard.vue';
import ImportDialog from './components/ImportDialog.vue';

defineOptions({ name: 'ProductSelectionCenter' });

// --- Category Tree ---
const treeLoading = ref(false);
const treeData = ref<Api.Pms.Category[]>([]);
const categoryName = ref('');

async function getCategoryTree() {
    treeLoading.value = true;
    try {
        const { data } = await fetchGetCategoryTree();
        treeData.value = [
            { catId: 0, name: '全部分类', children: data || [] }
        ] as any;
    } finally {
        treeLoading.value = false;
    }
}

function handleSelectCategory(keys: Array<string | number>) {
    const key = keys[0];
    searchParams.categoryId = (!key || key === 0) ? null : Number(key);
    searchParams.pageNum = 1;
    getData();
}

// --- Product List ---
const loading = ref(false);
const data = ref<Api.Store.MarketProduct[]>([]);
const total = ref(0);

const searchParams = reactive<Api.Store.MarketSearchParams>({
    pageNum: 1,
    pageSize: 20,
    name: null,
    categoryId: null,
    type: null // null for ALL
});

async function getData() {
    loading.value = true;
    try {
        // Handle empty string type from tabs
        const params = { ...searchParams };
        if (params.type === '' as any) params.type = null;
        
        const { data: list, error } = await fetchGetProductMarketList(params);
        if (!error && list) {
            data.value = list.rows;
            total.value = list.total;
        }
    } finally {
        loading.value = false;
    }
}

function handleSearch() {
    searchParams.pageNum = 1;
    getData();
}

function handleTypeChange(val: string) {
    searchParams.type = val as any; // Cast empty string to null in getData
    searchParams.pageNum = 1;
    getData();
}

function handlePageSizeChange(val: number) {
    searchParams.pageSize = val;
    searchParams.pageNum = 1;
    getData();
}

// --- Import Dialog ---
const showImportDialog = ref(false);
const currentProduct = ref<Api.Store.MarketProduct | null>(null);

function openImportDialog(product: Api.Store.MarketProduct) {
    currentProduct.value = product;
    showImportDialog.value = true;
}

function handleImportSuccess() {
    // Refresh list to update 'isImported' status
    getData();
}

onMounted(() => {
    getCategoryTree();
    getData();
});

</script>

<style scoped>
/* Custom scrollbar style if needed */
</style>
