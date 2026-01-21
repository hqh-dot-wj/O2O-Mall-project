<template>
  <NModal v-model:show="visible" preset="dialog" title="确认上架" style="width: 800px">
    <div class="flex flex-col gap-4 py-4" v-if="product">
        <!-- Header Info -->
        <div class="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded">
             <NImage
                :src="product.albumPics?.split(',')[0]"
                class="h-16 w-16 rounded object-cover border"
                fallback-src="https://via.placeholder.com/100"
                preview-disabled
            />
            <div class="flex flex-col">
                <span class="font-bold text-lg">{{ product.name }}</span>
                <span class="text-gray-500 text-sm">
                    类型: <NTag :type="product.type === 'REAL' ? 'info' : 'success'" size="small">{{ product.type === 'REAL' ? '实物' : '服务' }}</NTag>
                </span>
            </div>
        </div>

        <NForm label-placement="left" label-width="120">
            <!-- Service Radius (Only for SERVICE) -->
            <NFormItem label="服务半径 (米)" v-if="product.type === 'SERVICE'">
                <NInputNumber v-model:value="formModel.overrideRadius" :min="0" placeholder="默认使用总部配置">
                    <template #suffix>米</template>
                </NInputNumber>
                <template #feedback>
                    留空则使用总部默认半径: {{ product.serviceRadius || '未设置' }}m
                </template>
            </NFormItem>

            <!-- SKU List -->
            <div class="mt-4">
                <div class="flex items-center justify-between mb-2">
                    <span class="font-bold">规格配置</span>
                    <NAlert type="info" size="small" :bordered="false">
                        {{ product.type === 'SERVICE' ? '库存代表每日最大接单量' : '库存代表实际物理库存' }}
                    </NAlert>
                </div>
                
                <NDataTable
                    :columns="columns"
                    :data="formModel.skus"
                    :row-key="(row) => row.globalSkuId"
                    size="small"
                    :pagination="false"
                />
            </div>
        </NForm>
        
    </div>
    
    <template #action>
        <NButton @click="close">取消</NButton>
        <NButton type="primary" :loading="loading" @click="handleConfirm">确认上架</NButton>
    </template>
  </NModal>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watch, h } from 'vue';
import { NModal, NButton, NImage, NAlert, NForm, NFormItem, NInputNumber, NTag, NDataTable, NInput, useMessage } from 'naive-ui';
import { fetchImportProduct, fetchGetMarketProductDetail } from '@/service/api/store/product';

interface Props {
  show: boolean;
  product: Api.Store.MarketProduct | null;
}

const props = defineProps<Props>();
const emit = defineEmits(['update:show', 'success']);

const visible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val),
});

const loading = ref(false);
const message = useMessage();

const formModel = reactive<Omit<Api.Store.ProductImportParams, 'productId'>>({
    overrideRadius: null,
    skus: []
});

// Watch product changes to initialize form
// Watch product changes to initialize form
watch(() => props.product, async (newVal) => {
    if (newVal) {
        formModel.overrideRadius = newVal.serviceRadius || null; // Default to existing or null
        formModel.skus = []; // reset
        
        // Fetch Details to get SKUs
        try {
            loading.value = true;
            const { data, error } = await fetchGetMarketProductDetail(newVal.productId);
            if (!error && data && data.globalSkus) {
                 formModel.skus = data.globalSkus.map((sku: any) => ({
                    globalSkuId: sku.skuId,
                    _originalSku: sku, 
                    price: Number(sku.guidePrice),
                    stock: 0,
                    distRate: Number(sku.guideRate),
                    distMode: sku.distMode
                }));
                // update service radius if available in detail
                if (data.serviceRadius) {
                     formModel.overrideRadius = data.serviceRadius;
                }
            }
        } finally {
            loading.value = false;
        }
    }
}, { immediate: true });

const columns = [
    {
        title: '规格',
        key: 'spec',
        render(row: any) {
            const specs = row._originalSku?.specValues;
            if (!specs) return '默认规格';
            if (typeof specs === 'object') {
                return Object.values(specs).join(' / ');
            }
            return String(specs);
        }
    },
    {
        title: '成本',
        key: 'costPrice',
        render: (row: any) => `¥${row._originalSku?.costPrice}`
    },
    {
        title: '本店售价',
        key: 'price',
        render(row: any) {
            return h(NInputNumber, {
                value: row.price,
                onUpdateValue(v) { row.price = v || 0; },
                min: 0,
                precision: 2,
                size: 'small',
                showButton: false, 
                style: { width: '100px' }
            });
        }
    },
    {
        title: '库存/日接单',
        key: 'stock',
        render(row: any) {
             return h(NInputNumber, {
                value: row.stock,
                onUpdateValue(v) { row.stock = v || 0; },
                min: 0,
                precision: 0,
                size: 'small',
                style: { width: '100px' }
            });
        }
    },
    {
        title: '分销模式',
        key: 'distMode',
        render: (row: any) => h(NTag, { size: 'small' }, { default: () => row.distMode })
    },
    {
        title: '分销比例/金额',
        key: 'distRate',
        render(row: any) {
             return h(NInputNumber, {
                value: row.distRate,
                onUpdateValue(v) { row.distRate = v || 0; },
                min: 0,
                step: 0.01,
                precision: 2,
                size: 'small',
                style: { width: '100px' }
            });
        }
    },
    {
        title: '预估利润',
        key: 'profit',
        render(row: any) {
            const profit = calculateProfit(row);
            const isLoss = profit < 0;
            return h('span', { class: isLoss ? 'text-red font-bold' : 'text-green font-bold' }, profit.toFixed(2));
        }
    }
];

function calculateProfit(row: any) {
    const cost = Number(row._originalSku?.costPrice || 0);
    const price = Number(row.price || 0);
    const distRate = Number(row.distRate || 0);
    let commission = 0;
    if (row.distMode === 'RATIO') {
        commission = price * distRate;
    } else {
        commission = distRate;
    }
    return price - cost - commission;
}

async function handleConfirm() {
    if (!props.product) return;
    
    // Validate profit risk
    const lossSkus = formModel.skus.filter(sku => calculateProfit(sku) < 0);
    if (lossSkus.length > 0) {
        message.error('存在亏本设置的规格，请调整价格或分佣！');
        return;
    }

    loading.value = true;
    try {
        const payload: Api.Store.ProductImportParams = {
            productId: props.product.productId,
            overrideRadius: formModel.overrideRadius ?? undefined,
            skus: formModel.skus.map(({ _originalSku, ...rest }: any) => rest)
        };

        await fetchImportProduct(payload);
        message.success('上架成功！');
        emit('success');
        close();
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
}

function close() {
    visible.value = false;
}
</script>
