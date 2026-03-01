<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  NButton,
  NDrawer,
  NDrawerContent,
  NInputNumber,
  NTable,
  NTag,
  useMessage
} from 'naive-ui';
import { fetchBatchUpdateProductPrice } from '@/service/api/store/product';

defineOptions({
  name: 'BatchPriceModal'
});

interface SkuRow extends Api.Store.TenantSku {
  _productName: string;
  _productId: string;
}

interface Props {
  visible: boolean;
  products: Api.Store.TenantProduct[];
}

const props = defineProps<Props>();

const emit = defineEmits<{ (e: 'update:visible', v: boolean): void; (e: 'submitted'): void }>();

const message = useMessage();
const loading = ref(false);

const visible = computed({
  get: () => props.visible,
  set: v => emit('update:visible', v)
});

/** 可编辑的 SKU 行（用 ref 保持编辑状态） */
const skuRows = ref<SkuRow[]>([]);

watch(
  () => [props.visible, props.products] as const,
  ([visible, products]) => {
    if (visible && products?.length) {
      const rows: SkuRow[] = [];
      for (const prod of products) {
        for (const sku of prod.skus || []) {
          rows.push({
            ...JSON.parse(JSON.stringify(sku)),
            _productName: prod.customTitle || prod.name,
            _productId: prod.id
          });
        }
      }
      skuRows.value = rows;
    }
  },
  { immediate: true }
);

async function handleSubmit() {
  const items = skuRows.value.map(row => ({
    tenantSkuId: row.id,
    price: row.price,
    stock: row.stock,
    distRate: row.distRate,
    distMode: row.distMode
  }));

  if (items.length === 0) {
    message.warning('暂无可调价 SKU');
    return;
  }

  loading.value = true;
  try {
    await fetchBatchUpdateProductPrice({ items });
    message.success('批量调价成功');
    visible.value = false;
    emit('submitted');
  } catch {
    // error handled by request
  } finally {
    loading.value = false;
  }
}

function specsToString(specs: unknown): string {
  if (!specs) return '默认';
  if (typeof specs === 'object') return Object.values(specs as Record<string, string>).join(' / ');
  return String(specs);
}
</script>

<template>
  <NDrawer v-model:show="visible" :width="700" display-directive="show">
    <NDrawerContent title="批量调价" native-scrollbar>
      <div class="flex flex-col gap-4">
        <div class="text-gray-500 text-sm">
          已选 {{ products.length }} 个商品，共 {{ skuRows.length }} 个 SKU。修改后点击保存。
        </div>
        <NTable :bordered="false" :single-line="false" size="small">
          <thead>
            <tr>
              <th>商品</th>
              <th>规格</th>
              <th>售价</th>
              <th>库存</th>
              <th>分佣</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in skuRows" :key="row.id">
              <td>{{ row._productName }}</td>
              <td>{{ specsToString(row.specValues) }}</td>
              <td>
                <NInputNumber
                  v-model:value="row.price"
                  :min="0"
                  :precision="2"
                  size="small"
                  style="width: 100px"
                />
              </td>
              <td>
                <NInputNumber
                  v-model:value="row.stock"
                  :min="0"
                  :precision="0"
                  size="small"
                  style="width: 90px"
                />
              </td>
              <td>
                <NInputNumber
                  v-model:value="row.distRate"
                  :min="0"
                  :precision="2"
                  size="small"
                  style="width: 90px"
                />
                <NTag size="small" class="ml-1">{{ row.distMode }}</NTag>
              </td>
            </tr>
          </tbody>
        </NTable>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton @click="visible = false">取消</NButton>
          <NButton type="primary" :loading="loading" @click="handleSubmit">保存</NButton>
        </div>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
