<script setup lang="ts">
import { $t } from '@/locales';
import { useNaiveForm } from '@/hooks/common/form';
import { NCard, NForm, NGrid, NFormItemGi, NInput, NGi, NButton } from 'naive-ui';

defineOptions({
  name: 'AttributeSearch'
});

interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const model = defineModel<Api.Pms.AttributeSearchParams>('model', { required: true });

const { formRef, validate, restoreValidation } = useNaiveForm();

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
  <NCard :bordered="false" class="card-wrapper" size="small">
    <NForm ref="formRef" :model="model" label-placement="left" :label-width="80">
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi span="24 s:12 m:6" :label="$t('common.name')" path="name">
          <NInput v-model:value="model.name" :placeholder="$t('common.name')" @keyup.enter="search" />
        </NFormItemGi>
        <NGi span="24 s:12 m:6" offset="0 m:12" class="flex justify-end gap-16px">
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
        </NGi>
      </NGrid>
    </NForm>
  </NCard>
</template>

<style scoped></style>
