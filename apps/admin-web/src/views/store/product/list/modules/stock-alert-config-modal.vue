<script setup lang="ts">
import { ref, watch } from 'vue';
import { NButton, NForm, NFormItem, NInputNumber, NModal, useMessage } from 'naive-ui';
import { fetchGetStockAlertConfig, fetchSetStockAlertConfig } from '@/service/api/store/product';

defineOptions({
  name: 'StockAlertConfigModal'
});

const visible = defineModel<boolean>('visible', { default: false });
const emit = defineEmits<{ (e: 'submitted'): void }>();

const message = useMessage();
const loading = ref(false);
const threshold = ref(0);

async function loadConfig() {
  if (!visible.value) return;
  loading.value = true;
  try {
    const { data } = await fetchGetStockAlertConfig();
    threshold.value = data?.threshold ?? 0;
  } catch {
    threshold.value = 0;
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  loading.value = true;
  try {
    await fetchSetStockAlertConfig({ threshold: threshold.value });
    message.success('库存预警阈值已保存');
    visible.value = false;
    emit('submitted');
  } catch {
    // error handled by request
  } finally {
    loading.value = false;
  }
}

watch(visible, val => {
  if (val) loadConfig();
});
</script>

<template>
  <NModal v-model:show="visible" preset="dialog" title="库存预警配置" :loading="loading" @positive-click="handleSubmit">
    <NForm label-placement="left" :label-width="120">
      <NFormItem label="低库存阈值">
        <NInputNumber
          v-model:value="threshold"
          :min="0"
          :max="99999"
          placeholder="库存低于此值时触发预警"
          style="width: 200px"
        >
          <template #suffix>件</template>
        </NInputNumber>
      </NFormItem>
      <NFormItem>
        <span class="text-gray-500 text-sm">库存低于阈值时，系统将进行预警提示</span>
      </NFormItem>
    </NForm>
  </NModal>
</template>
