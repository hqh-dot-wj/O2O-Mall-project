<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NButton, NDrawer, NDrawerContent, NInput, NInputNumber, NTable, useMessage } from 'naive-ui';
import { fetchBatchUpdateStock } from '@/service/api/store/stock';

defineOptions({
  name: 'BatchStockModal'
});

interface BatchRow extends Api.Store.StockSku {
  _stockChange: number;
  _reason: string;
}

interface Props {
  visible: boolean;
  rows: Api.Store.StockSku[];
}

const props = defineProps<Props>();

const emit = defineEmits<{ (e: 'update:visible', v: boolean): void; (e: 'submitted'): void }>();

const message = useMessage();
const loading = ref(false);

const visible = computed({
  get: () => props.visible,
  set: v => emit('update:visible', v)
});

const batchRows = ref<BatchRow[]>([]);

watch(
  () => [props.visible, props.rows] as const,
  ([visible, rows]) => {
    if (visible && rows?.length) {
      batchRows.value = rows.map(r => ({
        ...JSON.parse(JSON.stringify(r)),
        _stockChange: 0,
        _reason: ''
      }));
    }
  },
  { immediate: true }
);

function specsToString(specs: unknown): string {
  if (!specs) return '-';
  if (typeof specs === 'object') return Object.values(specs as Record<string, string>).join(' / ');
  return String(specs);
}

async function handleSubmit() {
  const items = batchRows.value
    .filter(r => r._stockChange !== 0)
    .map(r => ({
      skuId: r.id,
      stockChange: r._stockChange,
      reason: r._reason || undefined
    }));

  if (items.length === 0) {
    message.warning('请至少填写一条有效的库存变动');
    return;
  }

  loading.value = true;
  try {
    const res = await fetchBatchUpdateStock({ items });
    const { successCount, failCount, details } = res.data!;
    if (failCount > 0) {
      const failed = details.filter(d => !d.success);
      message.warning(
        `批量调整完成: 成功 ${successCount} 个, 失败 ${failCount} 个。失败项: ${failed.map(f => f.error).join('; ')}`
      );
    } else {
      message.success(`批量调整成功, 共 ${successCount} 条`);
    }
    visible.value = false;
    emit('submitted');
  } catch {
    // error handled by request
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <NDrawer v-model:show="visible" :width="700" display-directive="show">
    <NDrawerContent title="批量调整库存" native-scrollbar>
      <div class="flex flex-col gap-4">
        <div class="text-gray-500 text-sm">
          已选 {{ rows.length }} 个 SKU。填写库存变动值（正数增加、负数减少），修改后点击保存。
        </div>
        <NTable :bordered="false" :single-line="false" size="small">
          <thead>
            <tr>
              <th>商品</th>
              <th>规格</th>
              <th>当前库存</th>
              <th>变动数量</th>
              <th>变动原因</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in batchRows" :key="row.id">
              <td>{{ row.tenantProd?.product?.name ?? '-' }}</td>
              <td>{{ specsToString(row.globalSku?.specValues) }}</td>
              <td>{{ row.stock }}</td>
              <td>
                <NInputNumber
                  v-model:value="row._stockChange"
                  :min="-9999"
                  :max="9999"
                  :precision="0"
                  size="small"
                  placeholder="0 表示不变"
                  style="width: 120px"
                />
              </td>
              <td>
                <NInput
                  v-model:value="row._reason"
                  size="small"
                  placeholder="选填"
                  clearable
                  style="width: 140px"
                />
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
