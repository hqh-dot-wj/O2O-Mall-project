<script setup lang="tsx">
import { onMounted, reactive, ref } from 'vue';
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NFormItemGridItem,
  NGrid,
  NGridItem,
  NInputNumber,
  NSelect,
  NSpace,
  NSwitch
} from 'naive-ui';
import { fetchGetDistConfig, fetchGetDistConfigLogs, fetchUpdateDistConfig } from '@/service/api/store/distribution';
import { $t } from '@/locales';

defineOptions({
  name: 'StoreDistributionConfig'
});

const loading = ref(false);
const submitting = ref(false);

const model = reactive<Api.Store.DistributionConfigUpdateParams>({
  level1Rate: 60,
  level2Rate: 40,
  enableLV0: true,
  enableCrossTenant: false,
  crossTenantRate: 1,
  crossMaxDaily: 500,
  commissionBaseType: 'ORIGINAL_PRICE',
  maxCommissionRate: 50
});

const commissionBaseTypeOptions = [
  { label: '原价（优惠由平台承担）', value: 'ORIGINAL_PRICE' },
  { label: '实付（优惠由推广者承担）', value: 'ACTUAL_PAID' },
  { label: '不分佣', value: 'ZERO' }
];

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
    render: (row: any) => (row.enableLV0 ? $t('common.yesOrNo.yes') : $t('common.yesOrNo.no'))
  },
  { title: $t('page.common.createBy'), key: 'operator' }
];

async function init() {
  loading.value = true;
  try {
    const { data } = await fetchGetDistConfig();
    if (data) {
      model.level1Rate = data.level1Rate;
      model.level2Rate = data.level2Rate;
      model.enableLV0 = data.enableLV0;
      model.enableCrossTenant = data.enableCrossTenant ?? false;
      model.crossTenantRate = data.crossTenantRate ?? 1;
      model.crossMaxDaily = data.crossMaxDaily ?? 500;
      model.commissionBaseType = (data.commissionBaseType as any) ?? 'ORIGINAL_PRICE';
      model.maxCommissionRate = data.maxCommissionRate ?? 50;
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

            <NFormItemGridItem :span="24" label="分佣基数类型" path="commissionBaseType">
              <NSelect
                v-model:value="model.commissionBaseType"
                :options="commissionBaseTypeOptions"
                placeholder="选择分佣基数"
                class="w-full"
              />
            </NFormItemGridItem>

            <NFormItemGridItem :span="24" label="熔断保护比例" path="maxCommissionRate">
              <NInputNumber v-model:value="model.maxCommissionRate" :min="0" :max="100" class="w-full">
                <template #suffix>%</template>
              </NInputNumber>
              <div class="ml-8px text-12px text-gray-400">佣金总额超过实付金额此比例时按比例缩减</div>
            </NFormItemGridItem>

            <NFormItemGridItem :span="24">
              <NAlert type="info" :show-icon="true" class="w-full">
                <div class="flex-col gap-8px">
                  <p>
                    <strong>{{ $t('page.store_distribution.lv0Policy') }}:</strong>
                  </p>
                  <p>{{ $t('page.store_distribution.lv0PolicyDesc') }}</p>
                  <p>{{ $t('page.store_distribution.lv1PolicyDesc') }}</p>
                </div>
              </NAlert>
            </NFormItemGridItem>

            <NFormItemGridItem :span="24">
              <div class="my-16px h-1px bg-gray-200"></div>
              <div class="mb-16px text-16px font-bold">{{ $t('page.store_distribution.crossTenantSettings') }}</div>
            </NFormItemGridItem>

            <NFormItemGridItem
              :span="24"
              :label="$t('page.store_distribution.enableCrossTenant')"
              path="enableCrossTenant"
            >
              <div class="flex-col gap-8px">
                <NSwitch v-model:value="model.enableCrossTenant" />
                <div class="text-12px text-gray-400">{{ $t('page.store_distribution.enableCrossTenantDesc') }}</div>
              </div>
            </NFormItemGridItem>

            <NFormItemGridItem
              v-if="model.enableCrossTenant"
              :span="24"
              :label="$t('page.store_distribution.crossTenantRate')"
              path="crossTenantRate"
            >
              <NInputNumber v-model:value="model.crossTenantRate" :min="0" :max="1" :step="0.01" class="w-full">
                <template #suffix>x</template>
              </NInputNumber>
              <div class="ml-8px text-12px text-gray-400">{{ $t('page.store_distribution.crossTenantRateTip') }}</div>
            </NFormItemGridItem>

            <NFormItemGridItem
              v-if="model.enableCrossTenant"
              :span="24"
              :label="$t('page.store_distribution.crossMaxDaily')"
              path="crossMaxDaily"
            >
              <NInputNumber v-model:value="model.crossMaxDaily" :min="0" :step="10" class="w-full">
                <template #prefix>¥</template>
              </NInputNumber>
              <div class="ml-8px text-12px text-gray-400">{{ $t('page.store_distribution.crossMaxDailyTip') }}</div>
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
          <NCard
            :title="$t('page.store_distribution.historyTitle')"
            :bordered="false"
            size="small"
            class="card-wrapper"
          >
            <NDataTable :columns="columns" :data="history" :loading="loading" :pagination="{ pageSize: 5 }" />
          </NCard>
        </NGridItem>
        <NGridItem :span="10">
          <NCard :title="$t('page.store_distribution.graphTitle')" :bordered="false" size="small" class="card-wrapper">
            <div class="flex-center rounded-8px bg-gray-50/50 p-20px">
              <!-- Placeholder for Mermaid or visual graph -->
              <div class="text-14px leading-6">
                <div class="mb-12px text-center text-primary font-bold">佣金基数 (Commission Base)</div>
                <div class="flex items-center justify-between gap-20px">
                  <div class="flex-1 border-2 border-gray-300 rounded-lg border-dashed p-12px text-center">
                    <div>直接推荐人 (C1)</div>
                    <div class="text-18px text-success font-bold">{{ model.level1Rate }}%</div>
                  </div>
                  <div class="text-20px text-gray-400">+</div>
                  <div class="flex-1 border-2 border-gray-300 rounded-lg border-dashed p-12px text-center">
                    <div>间接推荐人 (C2)</div>
                    <div class="text-18px text-orange-500 font-bold">{{ model.level2Rate }}%</div>
                  </div>
                </div>
                <div class="mt-16px border-t border-gray-200 pt-8px text-center text-xs text-gray-500">
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
