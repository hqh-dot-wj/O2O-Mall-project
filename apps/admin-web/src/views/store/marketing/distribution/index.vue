<script setup lang="tsx">
import { onMounted, reactive, ref } from 'vue';
import { NButton, NCard, NForm, NFormItem, NInputNumber, NSpace, NSwitch, NDataTable, NAlert, NGrid, NGridItem, NFormItemGridItem } from 'naive-ui';
import { $t } from '@/locales';
import { fetchGetDistConfig, fetchUpdateDistConfig, fetchGetDistConfigLogs } from '@/service/api/store/distribution';

defineOptions({
  name: 'StoreDistributionConfig',
});

const loading = ref(false);
const submitting = ref(false);

const model = reactive<Api.Store.DistributionConfigUpdateParams>({
  level1Rate: 60,
  level2Rate: 40,
  enableLV0: true,
});

const history = ref<Api.Store.DistributionConfigLog[]>([]);

const columns = [
  { title: $t('page.common.createTime'), key: 'createTime', width: 180 },
  { 
    title: $t('page.store_distribution.level1Rate'), 
    key: 'level1Rate',
    render: (row: any) => `${row.level1Rate}%`
  },
  { 
    title: $t('page.store_distribution.level2Rate'), 
    key: 'level2Rate',
    render: (row: any) => `${row.level2Rate}%`
  },
  { 
    title: $t('page.store_distribution.enableLV0'), 
    key: 'enableLV0',
    render: (row: any) => row.enableLV0 ? $t('common.yesOrNo.yes') : $t('common.yesOrNo.no')
  },
  { title: $t('page.common.createBy'), key: 'operator' },
];

async function init() {
  loading.value = true;
  try {
    const { data } = await fetchGetDistConfig();
    if (data) {
      model.level1Rate = data.level1Rate;
      model.level2Rate = data.level2Rate;
      model.enableLV0 = data.enableLV0;
    }
    const { data: logs } = await fetchGetDistConfigLogs();
    if (logs) {
      history.value = logs;
    }
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  submitting.value = true;
  try {
    await fetchUpdateDistConfig(model);
    window.$message?.success($t('common.updateSuccess'));
    await init();
  } catch (error) {
    console.error(error);
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  init();
});
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-y-auto lt-sm:overflow-auto">
    <NSpace vertical :size="16">
    <NCard :title="$t('page.store_distribution.title')" :bordered="false" size="small" class="card-wrapper">
      <NForm :model="model" label-placement="left" :label-width="200" class="max-w-800px">
        <NGrid :cols="24" :x-gap="24">
          <NFormItemGridItem :span="24" :label="$t('page.store_distribution.level1Rate')" path="level1Rate">
            <NInputNumber v-model:value="model.level1Rate" :min="0" :max="100" class="w-full">
               <template #suffix>%</template>
            </NInputNumber>
          </NFormItemGridItem>
          
          <NFormItemGridItem :span="24" :label="$t('page.store_distribution.level2Rate')" path="level2Rate">
            <NInputNumber v-model:value="model.level2Rate" :min="0" :max="100" class="w-full">
               <template #suffix>%</template>
            </NInputNumber>
          </NFormItemGridItem>

          <NFormItemGridItem :span="24" :label="$t('page.store_distribution.enableLV0')" path="enableLV0">
            <NSwitch v-model:value="model.enableLV0" />
          </NFormItemGridItem>

          <NFormItemGridItem :span="24">
            <NAlert type="info" :show-icon="true" class="w-full">
              <div class="flex-col gap-8px">
                <p><strong>{{ $t('page.store_distribution.lv0Policy') }}:</strong></p>
                <p>{{ $t('page.store_distribution.lv0PolicyDesc') }}</p>
                <p>{{ $t('page.store_distribution.lv1PolicyDesc') }}</p>
              </div>
            </NAlert>
          </NFormItemGridItem>

          <NFormItemGridItem :span="24">
            <NButton type="primary" :loading="submitting" @click="handleSubmit">
              {{ $t('common.save') }}
            </NButton>
          </NFormItemGridItem>
        </NGrid>
      </NForm>
    </NCard>

    <NGrid :cols="24" :x-gap="16" class="mt-16px">
      <NGridItem :span="14">
        <NCard :title="$t('page.store_distribution.historyTitle')" :bordered="false" size="small" class="card-wrapper">
          <NDataTable :columns="columns" :data="history" :loading="loading" :pagination="{ pageSize: 5 }" />
        </NCard>
      </NGridItem>
      <NGridItem :span="10">
        <NCard :title="$t('page.store_distribution.graphTitle')" :bordered="false" size="small" class="card-wrapper">
          <div class="flex-center p-20px bg-gray-50/50 rounded-8px">
             <!-- Placeholder for Mermaid or visual graph -->
             <div class="text-14px leading-6">
                <div class="font-bold text-primary mb-12px text-center">佣金基数 (Commission Base)</div>
                <div class="flex justify-between items-center gap-20px">
                   <div class="border-2 border-dashed border-gray-300 p-12px rounded-lg flex-1 text-center">
                      <div>直接推荐人 (C1)</div>
                      <div class="text-18px font-bold text-success">{{ model.level1Rate }}%</div>
                   </div>
                   <div class="text-20px text-gray-400"> + </div>
                   <div class="border-2 border-dashed border-gray-300 p-12px rounded-lg flex-1 text-center">
                      <div>间接推荐人 (C2)</div>
                      <div class="text-18px font-bold text-orange-500">{{ model.level2Rate }}%</div>
                   </div>
                </div>
                <div class="mt-16px text-gray-500 text-xs text-center border-t pt-8px border-gray-200">
                   注：C3 及以上层级不参与分成
                </div>
             </div>
          </div>
        </NCard>
      </NGridItem>
    </NGrid>
    </NSpace>
  </div>
</template>

<style scoped>

  .card-wrapper {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.card-wrapper:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.control-panel {
  background: linear-gradient(to right, rgba(115, 103, 240, 0.05), rgba(115, 103, 240, 0.01));
}

.info-card {
  position: relative;
  overflow: hidden;
}

.chart-card {
  min-height: 420px;
}

@media (max-width: 768px) {
  .flex-wrap {
    flex-wrap: wrap;
  }

  .chart-card {
    min-height: 360px;
  }
}

@media (max-width: 480px) {
  .chart-card {
    min-height: 300px;
  }
}
</style>
