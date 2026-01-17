<script setup lang="ts">
import { computed } from 'vue';
import { $t } from '@/locales';
import { useNaiveForm } from '@/hooks/common/form';
import { useDict } from '@/hooks/business/dict';

defineOptions({
  name: 'GlobalProductSearch',
});

interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const { formRef, validate, restoreValidation } = useNaiveForm();

const model = defineModel<Api.Pms.ProductSearchParams>('model', { required: true });

// Assuming 'pms_publish_status' is a valid dict key, if not we will fix later
const { options: publishStatusOptions } = useDict('pms_publish_status', true);

async function reset() {
  await restoreValidation();
  emit('reset');
}

async function search() {
  await validate();
  emit('search');
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <NCollapse>
      <NCollapseItem :title="$t('common.search')" name="product-search">
        <NForm ref="formRef" :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi span="24 s:12 m:6" label="商品名称" path="name" class="pr-24px">
              <NInput v-model:value="model.name" placeholder="请输入商品名称" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="发布状态" path="publishStatus" class="pr-24px">
              <NSelect
                v-model:value="model.publishStatus"
                placeholder="请选择发布状态"
                :options="publishStatusOptions"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" class="pr-24px">
              <NSpace class="w-full" justify="end">
                <NButton @click="reset">
                  <template #icon>
                    <icon-ic-round-refresh class="text-icon" />
                  </template>
                  {{ $t('common.reset') }}
                </NButton>
                <NButton type="primary" ghost @click="search">
                  <template #icon>
                    <icon-ic-round-search class="text-icon" />
                  </template>
                  {{ $t('common.search') }}
                </NButton>
              </NSpace>
            </NFormItemGi>
          </NGrid>
        </NForm>
      </NCollapseItem>
    </NCollapse>
  </NCard>
</template>

<style scoped></style>
