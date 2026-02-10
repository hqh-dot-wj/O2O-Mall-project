<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import {
  NAlert,
  NButton,
  NCard,
  NForm,
  NFormItemGridItem,
  NGrid,
  NInputNumber,
  NSelect,
  NSpace,
  NSwitch
} from 'naive-ui';
import { fetchGetDistConfig, fetchUpdateDistConfig } from '@/service/api/store/distribution';
import { $t } from '@/locales';

defineOptions({
  name: 'FinanceDistributionConfig'
});

const loading = ref(false);
const submitting = ref(false);

const model = reactive<Api.Store.DistributionConfigUpdateParams>({
  level1Rate: 60,
  level2Rate: 40,
  enableLV0: true,
  enableCrossTenant: false,
  crossTenantRate: 100,
  crossMaxDaily: 500,
  commissionBaseType: 'ORIGINAL_PRICE',
  maxCommissionRate: 50
});

const commissionBaseTypeOptions = [
  { label: $t('page.finance_distribution_config.commissionBase.ORIGINAL_PRICE'), value: 'ORIGINAL_PRICE' },
  { label: $t('page.finance_distribution_config.commissionBase.ACTUAL_PAID'), value: 'ACTUAL_PAID' },
  { label: $t('page.finance_distribution_config.commissionBase.ZERO'), value: 'ZERO' }
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
      model.crossTenantRate = data.crossTenantRate ?? 100;
      model.crossMaxDaily = data.crossMaxDaily ?? 500;
      model.commissionBaseType = (data.commissionBaseType as Api.Store.DistributionConfigUpdateParams['commissionBaseType']) ?? 'ORIGINAL_PRICE';
      model.maxCommissionRate = data.maxCommissionRate ?? 50;
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
      <NCard
        :title="$t('page.finance_distribution_config.title')"
        :bordered="false"
        size="small"
        class="card-wrapper"
      >
        <NForm :model="model" label-placement="left" :label-width="180" class="max-w-640px">
          <NGrid :cols="24" :x-gap="24">
            <NFormItemGridItem :span="24" :label="$t('page.finance_distribution_config.level1Rate')" path="level1Rate">
              <NInputNumber v-model:value="model.level1Rate" :min="0" :max="100" class="w-full">
                <template #suffix>%</template>
              </NInputNumber>
            </NFormItemGridItem>

            <NFormItemGridItem :span="24" :label="$t('page.finance_distribution_config.level2Rate')" path="level2Rate">
              <NInputNumber v-model:value="model.level2Rate" :min="0" :max="100" class="w-full">
                <template #suffix>%</template>
              </NInputNumber>
            </NFormItemGridItem>

            <NFormItemGridItem :span="24" :label="$t('page.finance_distribution_config.enableLV0')" path="enableLV0">
              <NSwitch v-model:value="model.enableLV0" />
            </NFormItemGridItem>

            <NFormItemGridItem
              :span="24"
              :label="$t('page.finance_distribution_config.commissionBaseType')"
              path="commissionBaseType"
            >
              <NSelect
                v-model:value="model.commissionBaseType"
                :options="commissionBaseTypeOptions"
                :placeholder="$t('page.finance_distribution_config.commissionBasePlaceholder')"
                class="w-full"
              />
            </NFormItemGridItem>

            <NFormItemGridItem
              :span="24"
              :label="$t('page.finance_distribution_config.maxCommissionRate')"
              path="maxCommissionRate"
            >
              <NInputNumber v-model:value="model.maxCommissionRate" :min="0" :max="100" class="w-full">
                <template #suffix>%</template>
              </NInputNumber>
              <div class="ml-8px text-12px text-gray-400">
                {{ $t('page.finance_distribution_config.maxCommissionRateTip') }}
              </div>
            </NFormItemGridItem>

            <NFormItemGridItem :span="24">
              <NAlert type="info" :show-icon="true" class="w-full">
                {{ $t('page.finance_distribution_config.commissionTip') }}
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
    </NSpace>
  </div>
</template>

<style scoped>
.card-wrapper {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}
</style>
